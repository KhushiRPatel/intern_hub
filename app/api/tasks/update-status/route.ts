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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'intern-mgmt-jwt-secret-change-in-prod';
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    const userRole = decoded['https://hasura.io/jwt/claims']['x-hasura-role'];
    const departmentId = decoded['https://hasura.io/jwt/claims']['x-hasura-department-id'];

    const { id, status, completed_date } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Task ID and status required' }, { status: 400 });
    }

    // Get task to check permissions
    const getQuery = `
      query GetTask($id: uuid!) {
        tasks_by_pk(id: $id) {
          id
          department_id
          intern_id
        }
      }
    `;

    const taskResult = await executeGraphQL(getQuery, { id }, process.env.HASURA_ADMIN_SECRET!);
    const task = taskResult.data.tasks_by_pk;

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Permission check
    if (userRole === 'admin') {
      // Admin can update any task
    } else if (userRole === 'department_person') {
      // Dept person can only update their department tasks
      if (task.department_id !== departmentId) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
    } else if (userRole === 'intern') {
      // Interns can only mark their own tasks as complete
      if (status !== 'completed') {
        return NextResponse.json({ error: 'Interns can only mark tasks as complete' }, { status: 403 });
      }
      // ✅ Verify task is assigned to this intern
      const userId = decoded['https://hasura.io/jwt/claims']['x-hasura-user-id'];
      const checkQuery = `
    query CheckTaskIntern($task_id: uuid!, $intern_id: uuid!) {
      task_interns(where: { task_id: { _eq: $task_id }, intern_id: { _eq: $intern_id } }) {
        task_id
      }
    }
  `;
      const checkResult = await executeGraphQL(checkQuery, { task_id: id, intern_id: userId }, process.env.HASURA_ADMIN_SECRET!);
      if (checkResult.data.task_interns.length === 0) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const mutation = `
      mutation UpdateTaskStatus($id: uuid!, $set: tasks_set_input!) {
        update_tasks_by_pk(pk_columns: { id: $id }, _set: $set) {
          id
          status
          completed_date
          updated_at
        }
      }
    `;

    const completionDate = status === 'completed'
      ? (completed_date || new Date().toISOString().split('T')[0])
      : null;

    const result = await executeGraphQL(mutation, {
      id,
      set: {
        status,
        ...(completionDate && { completed_date: completionDate }),
      },
    }, process.env.HASURA_ADMIN_SECRET!);

    return NextResponse.json({
      success: true,
      status: result.data.update_tasks_by_pk.status,
      completed_date: result.data.update_tasks_by_pk.completed_date,
    });
  } catch (error) {
    console.error('Task status update error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
