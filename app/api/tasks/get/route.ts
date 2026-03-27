import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

interface DecodedToken {
  sub: string;
  'https://hasura.io/jwt/claims': {
    'x-hasura-user-id': string;
    'x-hasura-role': string;
    'x-hasura-department-id'?: string;
  };
}

async function executeGraphQL(query: string, variables: any, adminSecret: string) {
  const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
  const response = await fetch(`${HASURA_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hasura-Admin-Secret': adminSecret,
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();
  if (data.errors) {
    throw new Error(data.errors[0].message);
  }
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'intern-mgmt-jwt-secret-change-in-prod';
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    const userRole = decoded['https://hasura.io/jwt/claims']['x-hasura-role'];
    const departmentId = decoded['https://hasura.io/jwt/claims']['x-hasura-department-id'];
    const userId = decoded['https://hasura.io/jwt/claims']['x-hasura-user-id'];

    // Build where clause based on role
    let where: any = {};

    if (userRole === 'admin') {
      // Admin sees all tasks
      where = {};
    } else if (userRole === 'department_person') {
      // Dept person sees only their department tasks
      where = { department_id: { _eq: departmentId } };
    } else if (userRole === 'intern') {
      // Intern sees only tasks they are assigned to via task_interns table
      where = { task_interns: { intern_id: { _eq: userId } } };
    }

    const query = `
      query GetTasks($where: tasks_bool_exp) {
        tasks(where: $where, order_by: [{ due_date: asc }, { created_at: desc }]) {
          id
          title
          description
          priority
          status
          due_date
          start_date
          completed_date
          estimated_hours
          intern_id
          assigned_by
          assigned_to
          department_id
          tags
          created_at
          updated_at
        }
      }
    `;

    const result = await executeGraphQL(query, { where }, process.env.HASURA_ADMIN_SECRET!);

    // Fetch task_interns mapping separately
    const internMapQuery = `
      query GetTaskInterns {
        task_interns {
          task_id
          intern_id
        }
      }
    `;

    const internMapResult = await executeGraphQL(internMapQuery, {}, process.env.HASURA_ADMIN_SECRET!);

    // Build task_id -> intern_ids map
    const taskInternMap = new Map<string, string[]>();
    for (const ti of internMapResult.data.task_interns) {
      if (!taskInternMap.has(ti.task_id)) {
        taskInternMap.set(ti.task_id, []);
      }
      taskInternMap.get(ti.task_id)!.push(ti.intern_id);
    }

    // Transform tasks to include intern_ids array
    const tasks = result.data.tasks.map((task: any) => {
      const intern_ids = taskInternMap.get(task.id) || (task.intern_id ? [task.intern_id] : []);
      return {
        ...task,
        intern_ids,
      };
    });

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error('Tasks fetch error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
