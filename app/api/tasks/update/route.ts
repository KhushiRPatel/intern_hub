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

    const { id, intern_ids, ...updates } = body;

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

    // Permission check
    if (userRole === 'admin') {
      // Admin can update any task
    } else if (userRole === 'department_person') {
      // Dept person can only update their department tasks
      if (task.department_id !== departmentId) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
    } else if (userRole === 'intern') {
      // Interns can only update their own tasks
      // This check would need intern_id from task
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    } else {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Update task fields
    const mutation = `
      mutation UpdateTask($id: uuid!, $set: tasks_set_input!) {
        update_tasks_by_pk(pk_columns: { id: $id }, _set: $set) {
          id
          title
          status
          priority
          due_date
          updated_at
        }
      }
    `;

    const result = await executeGraphQL(mutation, { id, set: updates }, process.env.HASURA_ADMIN_SECRET!);

    // Handle intern_ids update if provided
    if (intern_ids && Array.isArray(intern_ids)) {
      // Delete existing task_interns entries
      const deleteQuery = `
        mutation DeleteTaskInterns($task_id: uuid!) {
          delete_task_interns(where: { task_id: { _eq: $task_id } }) {
            affected_rows
          }
        }
      `;

      await executeGraphQL(deleteQuery, { task_id: id }, process.env.HASURA_ADMIN_SECRET!);

      // Insert new task_interns entries
      if (intern_ids.length > 0) {
        const taskInternsInserts = intern_ids.map((internId: string) => ({
          task_id: id,
          intern_id: internId,
        }));

        const insertQuery = `
          mutation InsertTaskInterns($objects: [task_interns_insert_input!]!) {
            insert_task_interns(objects: $objects) {
              affected_rows
            }
          }
        `;

        await executeGraphQL(insertQuery, { objects: taskInternsInserts }, process.env.HASURA_ADMIN_SECRET!);

        // Also update the intern_id field to the first intern for backward compatibility
        const updateFirstInternQuery = `
          mutation UpdateTaskIntern($id: uuid!, $intern_id: uuid!) {
            update_tasks_by_pk(pk_columns: { id: $id }, _set: { intern_id: $intern_id }) {
              id
            }
          }
        `;

        await executeGraphQL(updateFirstInternQuery, { id, intern_id: intern_ids[0] }, process.env.HASURA_ADMIN_SECRET!);
      }
    }

    return NextResponse.json({ success: true, task: result.data.update_tasks_by_pk });
  } catch (error) {
    console.error('Task update error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
