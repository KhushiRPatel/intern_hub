import { gql } from '@apollo/client';

export const INSERT_INTERN = gql`
  mutation InsertIntern($object: interns_insert_input!) {
    insert_interns_one(object: $object) {
      id
      name
      email
    }
  }
`;

export const UPDATE_INTERN = gql`
  mutation UpdateIntern($id: uuid!, $set: interns_set_input!) {
    update_interns_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
      name
      email
      status
    }
  }
`;

export const DELETE_INTERN = gql`
  mutation DeleteIntern($id: uuid!) {
    delete_interns_by_pk(id: $id) {
      id
      name
    }
  }
`;

export const INSERT_DEPARTMENT_PERSON = gql`
  mutation InsertDepartmentPerson($object: users_insert_input!) {
    insert_users_one(object: $object) {
      id
      name
      email
      department_id
    }
  }
`;

export const UPDATE_DEPARTMENT_PERSON = gql`
  mutation UpdateDepartmentPerson($id: uuid!, $set: users_set_input!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
      name
      email
      phone
      department_id
    }
  }
`;

export const DELETE_DEPARTMENT_PERSON = gql`
  mutation DeleteDepartmentPerson($id: uuid!) {
    delete_users_by_pk(id: $id) {
      id
      name
    }
  }
`;

// TASK MUTATIONS
export const INSERT_TASK = gql`
  mutation InsertTask($object: tasks_insert_input!) {
    insert_tasks_one(object: $object) {
      id
      title
      status
    }
  }
`;

export const UPDATE_TASK = gql`
  mutation UpdateTask($id: uuid!, $set: tasks_set_input!) {
    update_tasks_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
      title
      status
      priority
      due_date
    }
  }
`;

export const UPDATE_TASK_STATUS = gql`
  mutation UpdateTaskStatus($id: uuid!, $status: String!, $completed_date: date) {
    update_tasks_by_pk(pk_columns: { id: $id }, _set: { status: $status, completed_date: $completed_date }) {
      id
      status
      completed_date
      updated_at
    }
  }
`;

export const DELETE_TASK = gql`
  mutation DeleteTask($id: uuid!) {
    delete_tasks_by_pk(id: $id) {
      id
      title
    }
  }
`;

export const INSERT_TASK_COMMENT = gql`
  mutation InsertTaskComment($object: task_comments_insert_input!) {
    insert_task_comments_one(object: $object) {
      id
      comment
      created_at
    }
  }
`;

export const INSERT_TASK_ACTIVITY = gql`
  mutation InsertTaskActivity($object: task_activity_log_insert_input!) {
    insert_task_activity_log_one(object: $object) {
      id
      action
      created_at
    }
  }
`;
