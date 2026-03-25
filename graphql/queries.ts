import { gql } from '@apollo/client';

export const GET_INTERNS = gql`
  query GetInterns(
    $where:    interns_bool_exp
    $order_by: [interns_order_by!]
    $limit:    Int
    $offset:   Int
  ) {
    interns(
      where:    $where
      order_by: $order_by
      limit:    $limit
      offset:   $offset
    ) {
      id
      name
      email
      phone
      college
      degree
      branch
      status
      start_date
      end_date
      user_id
      created_at
      department_id
    }
    interns_aggregate(where: $where) {
      aggregate { count }
    }
  }
`;

export const GET_INTERN_BY_ID = gql`
  query GetInternById($id: uuid!) {
    interns_by_pk(id: $id) {
      id
      name
      email
      phone
      college
      degree
      branch
      status
      start_date
      end_date
      user_id
      created_at
      department_id
    }
  }
`;

export const GET_DEPARTMENTS = gql`
  query GetDepartments {
    departments(order_by: { name: asc }) {
      id
      name
    }
  }
`;

export const GET_COLLEGES = gql`
  query GetColleges {
    interns(distinct_on: college, order_by: { college: asc }) {
      college
    }
  }
`;

export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats {
    total:      interns_aggregate                                         { aggregate { count } }
    active:     interns_aggregate(where: { status: { _eq: "active"     } }) { aggregate { count } }
    completed:  interns_aggregate(where: { status: { _eq: "completed"  } }) { aggregate { count } }
    terminated: interns_aggregate(where: { status: { _eq: "terminated" } }) { aggregate { count } }
    dept_count: departments_aggregate                                     { aggregate { count } }
  }
`;

export const GET_DEPARTMENT_PERSONS = gql`
  query GetDepartmentPersons(
    $where:    users_bool_exp!
    $order_by: [users_order_by!]
  ) {
    users(
      where: { _and: [{ role: { _eq: "department_person" } }, $where] }
      order_by: $order_by
    ) {
      id
      name
      email
      phone
      department_id
      created_at
    }
    users_aggregate(where: { _and: [{ role: { _eq: "department_person" } }, $where] }) {
      aggregate { count }
    }
  }
`;
