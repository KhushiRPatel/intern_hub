"""
train_agent.py
==============
Training script for the InternHub Vanna agent.
Expects that environment variables (GROQ, DB_*, CHROMA_PATH) are set.
"""

import logging
from vanna_setup import vn, connect_to_postgres

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── DDL (Data Definition Language) ─────────────────────────────────────
DDL_STATEMENTS = [
    # departments
    """
    CREATE TABLE departments (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        max_interns INT DEFAULT 20,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    """,
    # users
    """
    CREATE TABLE users (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        email CITEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin','department_person','intern')),
        department_id UUID REFERENCES departments(id),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    """,
    # interns
    """
    CREATE TABLE interns (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        email CITEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        college TEXT NOT NULL,
        degree TEXT NOT NULL,
        branch TEXT NOT NULL,
        department_id UUID NOT NULL REFERENCES departments(id),
        start_date DATE NOT NULL,
        end_date DATE,
        status TEXT NOT NULL DEFAULT 'active'
            CHECK (status IN ('applied','selected','active','completed','terminated','on_leave')),
        work_mode TEXT DEFAULT 'onsite' CHECK (work_mode IN ('onsite','remote','hybrid')),
        stipend NUMERIC(10,2),
        mentor_id UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    """,
    # tasks + task_interns
    """
    CREATE TABLE tasks (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','on_hold','cancelled')),
        assigned_by UUID NOT NULL REFERENCES users(id),
        department_id UUID NOT NULL REFERENCES departments(id),
        due_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE task_interns (
        id UUID PRIMARY KEY,
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
        intern_status TEXT NOT NULL DEFAULT 'pending' CHECK (intern_status IN ('pending','completed')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (task_id, intern_id)
    );
    """
]

# ── Documentation ──────────────────────────────────────────────────────
DOCUMENTATION = [
    """
    An 'active intern' is defined as someone whose 'status' column is exactly 'active'
    and their 'end_date' is in the future. In SQL, this means:
    WHERE status = 'active' AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    """,
    """
    Task assignment is many-to-many:
    - tasks.status is managed by admin/department users.
    - task_interns.intern_status tracks each intern's own completion for a task.
    """
]

# ── Golden Queries ───────────────────────────────────────────────────
GOLDEN_QUERIES = [
    {
        "question": "Show all active interns in the Artificial Intelligence department.",
        "sql": """
            SELECT
                i.*
            FROM interns i
            JOIN departments d ON i.department_id = d.id
            WHERE d.code = 'AI'
              AND i.status = 'active'
              AND (i.end_date IS NULL OR i.end_date >= CURRENT_DATE);
        """
    },
    {
        "question": "What is the total stipend amount by department for active interns?",
        "sql": """
            SELECT
                d.name AS department_name,
                COALESCE(SUM(i.stipend), 0) AS total_stipend
            FROM interns i
            JOIN departments d ON i.department_id = d.id
            WHERE i.status = 'active'
            GROUP BY d.name;
        """
    },
    {
        "question": "List interns ending their internship in March 2026.",
        "sql": """
            SELECT *
            FROM interns
            WHERE end_date >= '2026-03-01' AND end_date <= '2026-03-31';
        """
    },
    {
        "question": "Show open tasks and each assigned intern completion status.",
        "sql": """
            SELECT
                t.title,
                t.status AS task_status,
                i.name AS intern_name,
                ti.intern_status
            FROM tasks t
            JOIN task_interns ti ON ti.task_id = t.id
            JOIN interns i ON i.id = ti.intern_id
            WHERE t.status IN ('open', 'in_progress')
            ORDER BY t.created_at DESC;
        """
    },
    {
        "question": "How many interns are currently active in each department?",
        "sql": """
            SELECT
                d.name AS department_name,
                COUNT(i.id) AS active_intern_count
            FROM departments d
            LEFT JOIN interns i
                ON i.department_id = d.id
               AND i.status = 'active'
               AND (i.end_date IS NULL OR i.end_date >= CURRENT_DATE)
            GROUP BY d.name
            ORDER BY active_intern_count DESC;
        """
    },
    {
        "question": "Which departments are exceeding their max intern capacity?",
        "sql": """
            SELECT
                d.name AS department_name,
                d.max_interns,
                COUNT(i.id) AS active_intern_count
            FROM departments d
            LEFT JOIN interns i
                ON i.department_id = d.id
               AND i.status = 'active'
               AND (i.end_date IS NULL OR i.end_date >= CURRENT_DATE)
            GROUP BY d.id, d.name, d.max_interns
            HAVING COUNT(i.id) > d.max_interns
            ORDER BY active_intern_count DESC;
        """
    },
    {
        "question": "Show interns who are on leave with their department names.",
        "sql": """
            SELECT
                i.name,
                i.email,
                d.name AS department_name,
                i.end_date
            FROM interns i
            JOIN departments d ON d.id = i.department_id
            WHERE i.status = 'on_leave'
            ORDER BY i.name;
        """
    },
    {
        "question": "List tasks that are overdue and still not completed.",
        "sql": """
            SELECT
                t.title,
                d.name AS department_name,
                t.status,
                t.due_date
            FROM tasks t
            JOIN departments d ON d.id = t.department_id
            WHERE t.due_date < CURRENT_DATE
              AND t.status NOT IN ('completed', 'cancelled')
            ORDER BY t.due_date ASC;
        """
    },
    {
        "question": "What is the task completion percentage per intern?",
        "sql": """
            SELECT
                i.name AS intern_name,
                COUNT(ti.id) AS total_assigned,
                COUNT(*) FILTER (WHERE ti.intern_status = 'completed') AS completed_count,
                ROUND(
                    100.0 * COUNT(*) FILTER (WHERE ti.intern_status = 'completed')
                    / NULLIF(COUNT(ti.id), 0),
                    2
                ) AS completion_percentage
            FROM interns i
            LEFT JOIN task_interns ti ON ti.intern_id = i.id
            GROUP BY i.id, i.name
            ORDER BY completion_percentage DESC NULLS LAST, total_assigned DESC;
        """
    },
    {
        "question": "How many active interns are there by work mode?",
        "sql": """
            SELECT
                i.work_mode,
                COUNT(i.id) AS intern_count
            FROM interns i
            WHERE i.status = 'active'
              AND (i.end_date IS NULL OR i.end_date >= CURRENT_DATE)
            GROUP BY i.work_mode
            ORDER BY intern_count DESC;
        """
    },
    {
        "question": "Show mentors and how many interns are assigned to each mentor.",
        "sql": """
            SELECT
                u.name AS mentor_name,
                u.email AS mentor_email,
                COUNT(i.id) AS assigned_interns
            FROM users u
            LEFT JOIN interns i ON i.mentor_id = u.id
            WHERE u.role IN ('admin', 'department_person')
            GROUP BY u.id, u.name, u.email
            ORDER BY assigned_interns DESC, mentor_name;
        """
    },
    {
        "question": "List interns who are active but do not have a mentor assigned.",
        "sql": """
            SELECT
                i.name,
                i.email,
                d.name AS department_name
            FROM interns i
            JOIN departments d ON d.id = i.department_id
            WHERE i.status = 'active'
              AND (i.end_date IS NULL OR i.end_date >= CURRENT_DATE)
              AND i.mentor_id IS NULL
            ORDER BY d.name, i.name;
        """
    },
    {
        "question": "Show internship starts per month in 2026.",
        "sql": """
            SELECT
                DATE_TRUNC('month', i.start_date) AS month,
                COUNT(i.id) AS internship_starts
            FROM interns i
            WHERE i.start_date >= '2026-01-01'
              AND i.start_date < '2027-01-01'
            GROUP BY DATE_TRUNC('month', i.start_date)
            ORDER BY month;
        """
    },
    {
        "question": "Show average stipend by department for active interns.",
        "sql": """
            SELECT
                d.name AS department_name,
                ROUND(AVG(i.stipend), 2) AS avg_stipend
            FROM interns i
            JOIN departments d ON d.id = i.department_id
            WHERE i.status = 'active'
              AND i.stipend IS NOT NULL
            GROUP BY d.name
            ORDER BY avg_stipend DESC;
        """
    },
    {
        "question": "Admin: show all departments with total interns and active interns.",
        "sql": """
            SELECT
                d.name AS department_name,
                COUNT(i.id) AS total_interns,
                COUNT(*) FILTER (WHERE i.status = 'active') AS active_interns
            FROM departments d
            LEFT JOIN interns i ON i.department_id = d.id
            GROUP BY d.id, d.name
            ORDER BY d.name;
        """
    },
    {
        "question": "Admin: list inactive departments.",
        "sql": """
            SELECT
                id,
                name,
                code,
                is_active
            FROM departments
            WHERE is_active = FALSE
            ORDER BY name;
        """
    },
    {
        "question": "Admin: show all users by role count.",
        "sql": """
            SELECT
                role,
                COUNT(id) AS user_count
            FROM users
            WHERE is_active = TRUE
            GROUP BY role
            ORDER BY user_count DESC;
        """
    },
    {
        "question": "Admin: show interns created in the last 30 days.",
        "sql": """
            SELECT
                i.id,
                i.name,
                i.email,
                d.name AS department_name,
                i.created_at
            FROM interns i
            JOIN departments d ON d.id = i.department_id
            WHERE i.created_at >= NOW() - INTERVAL '30 days'
            ORDER BY i.created_at DESC;
        """
    },
    {
        "question": "Admin: list tasks by priority and status counts.",
        "sql": """
            SELECT
                priority,
                status,
                COUNT(id) AS task_count
            FROM tasks
            GROUP BY priority, status
            ORDER BY priority, status;
        """
    },
    {
        "question": "Admin: find interns without linked user accounts.",
        "sql": """
            SELECT
                i.id,
                i.name,
                i.email,
                d.name AS department_name
            FROM interns i
            JOIN departments d ON d.id = i.department_id
            WHERE i.user_id IS NULL
            ORDER BY d.name, i.name;
        """
    },
    {
        "question": "Admin: show department task load with pending intern assignments.",
        "sql": """
            SELECT
                d.name AS department_name,
                COUNT(DISTINCT t.id) AS total_tasks,
                COUNT(ti.id) FILTER (WHERE ti.intern_status = 'pending') AS pending_assignments
            FROM departments d
            LEFT JOIN tasks t ON t.department_id = d.id
            LEFT JOIN task_interns ti ON ti.task_id = t.id
            GROUP BY d.id, d.name
            ORDER BY pending_assignments DESC, total_tasks DESC;
        """
    },
    {
        "question": "Department person: show all interns in my department.",
        "sql": """
            SELECT
                i.id,
                i.name,
                i.email,
                i.status,
                i.start_date,
                i.end_date
            FROM interns i
            WHERE i.department_id = :department_id
            ORDER BY i.name;
        """
    },
    {
        "question": "Department person: show active interns in my department.",
        "sql": """
            SELECT
                i.id,
                i.name,
                i.email,
                i.work_mode
            FROM interns i
            WHERE i.department_id = :department_id
              AND i.status = 'active'
              AND (i.end_date IS NULL OR i.end_date >= CURRENT_DATE)
            ORDER BY i.name;
        """
    },
    {
        "question": "Department person: show interns ending in next 15 days in my department.",
        "sql": """
            SELECT
                i.name,
                i.email,
                i.end_date
            FROM interns i
            WHERE i.department_id = :department_id
              AND i.end_date IS NOT NULL
              AND i.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '15 days'
            ORDER BY i.end_date;
        """
    },
    {
        "question": "Department person: show open tasks in my department.",
        "sql": """
            SELECT
                t.id,
                t.title,
                t.priority,
                t.status,
                t.due_date
            FROM tasks t
            WHERE t.department_id = :department_id
              AND t.status IN ('open', 'in_progress', 'on_hold')
            ORDER BY t.due_date NULLS LAST, t.created_at DESC;
        """
    },
    {
        "question": "Department person: show task assignment count per intern in my department.",
        "sql": """
            SELECT
                i.name AS intern_name,
                COUNT(ti.id) AS assigned_tasks
            FROM interns i
            LEFT JOIN task_interns ti ON ti.intern_id = i.id
            WHERE i.department_id = :department_id
            GROUP BY i.id, i.name
            ORDER BY assigned_tasks DESC, intern_name;
        """
    },
    {
        "question": "Department person: show overdue tasks in my department.",
        "sql": """
            SELECT
                t.title,
                t.status,
                t.priority,
                t.due_date
            FROM tasks t
            WHERE t.department_id = :department_id
              AND t.due_date < CURRENT_DATE
              AND t.status NOT IN ('completed', 'cancelled')
            ORDER BY t.due_date ASC;
        """
    },
    {
        "question": "Department person: show pending vs completed intern task statuses in my department.",
        "sql": """
            SELECT
                ti.intern_status,
                COUNT(ti.id) AS assignment_count
            FROM task_interns ti
            JOIN tasks t ON t.id = ti.task_id
            WHERE t.department_id = :department_id
            GROUP BY ti.intern_status
            ORDER BY assignment_count DESC;
        """
    },
    {
        "question": "Intern: show my profile details.",
        "sql": """
            SELECT
                i.id,
                i.name,
                i.email,
                i.phone,
                i.college,
                i.degree,
                i.branch,
                i.status,
                i.start_date,
                i.end_date
            FROM interns i
            WHERE i.user_id = :intern_user_id;
        """
    },
    {
        "question": "Intern: show my assigned tasks with my completion status.",
        "sql": """
            SELECT
                t.title,
                t.status AS task_status,
                t.priority,
                t.due_date,
                ti.intern_status
            FROM interns i
            JOIN task_interns ti ON ti.intern_id = i.id
            JOIN tasks t ON t.id = ti.task_id
            WHERE i.user_id = :intern_user_id
            ORDER BY t.due_date NULLS LAST, t.created_at DESC;
        """
    },
    {
        "question": "Intern: show my pending tasks.",
        "sql": """
            SELECT
                t.id,
                t.title,
                t.priority,
                t.due_date
            FROM interns i
            JOIN task_interns ti ON ti.intern_id = i.id
            JOIN tasks t ON t.id = ti.task_id
            WHERE i.user_id = :intern_user_id
              AND ti.intern_status = 'pending'
              AND t.status IN ('open', 'in_progress', 'on_hold')
            ORDER BY t.due_date NULLS LAST;
        """
    },
    {
        "question": "Intern: show my completed tasks.",
        "sql": """
            SELECT
                t.id,
                t.title,
                t.completed_date,
                ti.updated_at AS intern_completed_at
            FROM interns i
            JOIN task_interns ti ON ti.intern_id = i.id
            JOIN tasks t ON t.id = ti.task_id
            WHERE i.user_id = :intern_user_id
              AND ti.intern_status = 'completed'
            ORDER BY ti.updated_at DESC;
        """
    },
    {
        "question": "Intern: show my task completion percentage.",
        "sql": """
            SELECT
                i.name,
                COUNT(ti.id) AS total_tasks,
                COUNT(*) FILTER (WHERE ti.intern_status = 'completed') AS completed_tasks,
                ROUND(
                    100.0 * COUNT(*) FILTER (WHERE ti.intern_status = 'completed')
                    / NULLIF(COUNT(ti.id), 0),
                    2
                ) AS completion_percentage
            FROM interns i
            LEFT JOIN task_interns ti ON ti.intern_id = i.id
            WHERE i.user_id = :intern_user_id
            GROUP BY i.id, i.name;
        """
    },
    {
        "question": "Intern: show my department and mentor information.",
        "sql": """
            SELECT
                i.name AS intern_name,
                d.name AS department_name,
                u.name AS mentor_name,
                u.email AS mentor_email
            FROM interns i
            JOIN departments d ON d.id = i.department_id
            LEFT JOIN users u ON u.id = i.mentor_id
            WHERE i.user_id = :intern_user_id;
        """
    }
]

def run_training():
    logger.info("Starting training of InternHub AI...")

    # Ensure the trainer is connected before embedding samples.
    connect_to_postgres()

    # 1. DDL
    for ddl in DDL_STATEMENTS:
        vn.train(ddl=ddl)
    
    # 2. Docs
    for doc in DOCUMENTATION:
        vn.train(documentation=doc)
    
    # 3. Golden Queries
    for query in GOLDEN_QUERIES:
        vn.train(question=query['question'], sql=query['sql'])

    logger.info("Training complete! ChromaDB seed successful.")

if __name__ == "__main__":
    run_training()
