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

    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    // Get task to check permissions
    const getQuery = `
      query GetTask($id: uuid!) {
        tasks_by_pk(id: $id) {
          id
          department_id
        }
      }
    `;

    const taskResult = await executeGraphQL(getQuery, { id }, process.env.HASURA_ADMIN_SECRET!);
    const task = taskResult.data.tasks_by_pk;

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Permission check: Only admin and dept person can delete
    if (userRole === 'admin') {
      // Admin can delete any task
    } else if (userRole === 'department_person') {
      // Dept person can only delete their department tasks
      if (task.department_id !== departmentId) {
        return NextResponse.json({ error: 'Cannot delete tasks in other departments' }, { status: 403 });
      }
    } else {
      // Interns cannot delete tasks
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const mutation = `
      mutation DeleteTask($id: uuid!) {
        delete_tasks_by_pk(id: $id) {
          id
          title
        }
      }
    `;

    await executeGraphQL(mutation, { id }, process.env.HASURA_ADMIN_SECRET!);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Task deletion error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
