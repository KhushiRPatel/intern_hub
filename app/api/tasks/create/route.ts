import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN = process.env.HASURA_ADMIN_SECRET || '';

interface DecodedToken {
  sub: string;
  name: string;
  email: string;
  'https://hasura.io/jwt/claims': {
    'x-hasura-user-id': string;
    'x-hasura-role': string;
    'x-hasura-department-id'?: string;
  };
}

async function executeGraphQL(query: string, variables: any, adminSecret: string) {
  const response = await fetch(HASURA_ENDPOINT, {
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

// Ensure user exists before creating task
async function ensureUserExists(userId: string, email: string, name: string, role: string, departmentId?: string) {
  try {
    console.log('[task/create] ensureUserExists start:', { userId, email });
    
    // Try to upsert with conflict on email constraint
    const mutation = `
      mutation UpsertUser($id: uuid!, $name: String!, $email: citext!, $role: String!, $password_hash: String!, $department_id: uuid) {
        insert_users_one(
          object: { 
            id: $id
            name: $name
            email: $email
            role: $role
            password_hash: $password_hash
            department_id: $department_id
          }
          on_conflict: { 
            constraint: users_email_key
            update_columns: [name, role, department_id, id]
          }
        ) {
          id
        }
      }
    `;
    
    const result = await executeGraphQL(mutation, {
      id: userId,
      name,
      email,
      role,
      password_hash: '$2a$10$placeholder.hash.for.demo.users.only',
      department_id: departmentId || null,
    }, HASURA_ADMIN);
    
    if (!result.data?.insert_users_one?.id) {
      throw new Error('Upsert failed - no id returned');
    }
    
    console.log('[task/create] User upserted successfully:', userId);
  } catch (error) {
    console.error('[task/create] Failed to ensure user exists:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.decode(token) as DecodedToken;
    
    if (!decoded || !decoded['https://hasura.io/jwt/claims']) {
      console.error('Token decode failed:', { decoded, token: token?.substring(0, 50) });
      return NextResponse.json({ error: 'Invalid token structure' }, { status: 401 });
    }
    
    const userId = decoded['https://hasura.io/jwt/claims']['x-hasura-user-id'];
    const userRole = decoded['https://hasura.io/jwt/claims']['x-hasura-role'];
    const departmentId = decoded['https://hasura.io/jwt/claims']['x-hasura-department-id'];
    
    console.log('Create task - Auth:', { 
      userId, 
      userRole, 
      departmentId,
      tokenClaims: decoded['https://hasura.io/jwt/claims']
    });

    const { title, description, priority, status, intern_ids, department_id, due_date, start_date, estimated_hours, tags, notes } = body;

    // Validate required fields
    if (!title || !intern_ids || !Array.isArray(intern_ids) || intern_ids.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: title and at least one intern_id' }, { status: 400 });
    }

    // Permission check: Only admin and dept person can create tasks
    if (userRole !== 'admin' && userRole !== 'department_person') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Dept person can only create for their department
    if (userRole === 'department_person' && department_id !== departmentId) {
      return NextResponse.json({ error: 'Cannot create tasks in other departments' }, { status: 403 });
    }

    // Ensure user exists before creating task
    console.log('[task/create] Ensuring user exists before task creation');
    await ensureUserExists(userId, decoded.email, decoded.name, userRole, departmentId);

    // Create task with first intern (for backward compatibility) or NULL
    const createTaskMutation = `
      mutation InsertTask($object: tasks_insert_input!) {
        insert_tasks_one(object: $object) {
          id
          title
          status
          priority
          due_date
        }
      }
    `;

    const taskResult = await executeGraphQL(createTaskMutation, {
      object: {
        title,
        description: description || null,
        priority: priority || 'medium',
        status: status || 'open',
        intern_id: intern_ids[0] || null,
        assigned_by: userId,
        department_id,
        due_date: due_date || null,
        start_date: start_date || new Date().toISOString().split('T')[0],
        estimated_hours: estimated_hours || null,
        tags: tags && tags.length > 0 ? tags : null,
        notes: notes || null,
      },
    }, HASURA_ADMIN);

    const taskId = taskResult.data.insert_tasks_one.id;

    // Insert task_interns relationships for all interns
    const taskInternsInserts = intern_ids.map((internId: string) => ({
      task_id: taskId,
      intern_id: internId,
    }));

    const insertTaskInternsMutation = `
      mutation InsertTaskInterns($objects: [task_interns_insert_input!]!) {
        insert_task_interns(objects: $objects) {
          affected_rows
        }
      }
    `;

    await executeGraphQL(insertTaskInternsMutation, {
      objects: taskInternsInserts,
    }, HASURA_ADMIN);

    return NextResponse.json({ success: true, task: taskResult.data.insert_tasks_one });
  } catch (error) {
    console.error('Task creation error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
