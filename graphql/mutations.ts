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
