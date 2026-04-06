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
      alternate_phone
      date_of_birth
      gender
      blood_group
      nationality
      address_line1
      address_line2
      city
      state
      pincode
      country
      college
      university
      college_email
      college_city
      college_state
      degree
      branch
      specialization
      graduation_year
      current_year
      cgpa
      percentage
      student_id
      department_id
      start_date
      end_date
      status
      duration_months
      work_mode
      stipend
      offer_letter_date
      joining_letter_date
      skills
      languages_known
      tools
      linkedin_url
      github_url
      portfolio_url
      aadhar_number
      pan_number
      reference_name
      reference_contact
      notes
      user_id
      created_at
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
      alternate_phone
      date_of_birth
      gender
      blood_group
      nationality
      address_line1
      address_line2
      city
      state
      pincode
      country
      college
      university
      college_email
      college_city
      college_state
      degree
      branch
      specialization
      graduation_year
      current_year
      cgpa
      percentage
      student_id
      department_id
      start_date
      end_date
      status
      duration_months
      work_mode
      stipend
      offer_letter_date
      joining_letter_date
      skills
      languages_known
      tools
      linkedin_url
      github_url
      portfolio_url
      aadhar_number
      pan_number
      reference_name
      reference_contact
      notes
      user_id
      created_at
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
  query GetDashboardStats($where: interns_bool_exp = {}) {
    total:      interns_aggregate(where: $where)                                                              { aggregate { count } }
    active:     interns_aggregate(where: { _and: [$where, { status: { _eq: "active"     } }] })              { aggregate { count } }
    completed:  interns_aggregate(where: { _and: [$where, { status: { _eq: "completed"  } }] })              { aggregate { count } }
    terminated: interns_aggregate(where: { _and: [$where, { status: { _eq: "terminated" } }] })              { aggregate { count } }
    dept_count: departments_aggregate                                                                         { aggregate { count } }
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

// TASK QUERIES
export const GET_TASKS = gql`
  query GetTasks(
    $where:    tasks_bool_exp
    $order_by: [tasks_order_by!]
    $limit:    Int
    $offset:   Int
  ) {
    tasks(
      where:    $where
      order_by: $order_by
      limit:    $limit
      offset:   $offset
    ) {
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
      task_interns {
  intern {
    id
    name
    email
  }
}
    }
    tasks_aggregate(where: $where) {
      aggregate { count }
    }
  }
`;

export const GET_TASK_BY_ID = gql`
  query GetTaskById($id: uuid!) {
    tasks_by_pk(id: $id) {
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
      parent_task_id
      tags
      attachment_url
      notes
      created_at
      updated_at
      interns {
        id
        name
        email
      }
      task_activity_log(order_by: { created_at: desc }) {
        id
        action
        old_value
        new_value
        user_id
        created_at
      }
    }
  }
`;

export const GET_TASK_COMMENTS = gql`
  query GetTaskComments($task_id: uuid!) {
    task_comments(where: { task_id: { _eq: $task_id } }, order_by: { created_at: asc }) {
      id
      comment
      user_id
      created_at
      updated_at
    }
  }
`;

export const GET_TASK_ACTIVITY = gql`
  query GetTaskActivity($task_id: uuid!) {
    task_activity_log(where: { task_id: { _eq: $task_id } }, order_by: { created_at: desc }) {
      id
      action
      old_value
      new_value
      user_id
      created_at
    }
  }
`;

export const GET_INTERN_TASKS = gql`
  query GetInternTasks($internId: uuid!) {
    tasks(
      where: { task_interns: { intern_id: { _eq: $internId } } }
      order_by: { created_at: desc }
    ) {
      id
      title
      description
      priority
      status
      due_date
      start_date
      completed_date
      estimated_hours
      tags
      created_at
      updated_at
    }
    tasks_aggregate(where: { task_interns: { intern_id: { _eq: $internId } } }) {
      aggregate { count }
    }
  }
`;

export const GET_INTERN_PROFILE = gql`
  query GetInternProfile($id: uuid!) {
    interns_by_pk(id: $id) {
      id
      name
      email
      status
      start_date
      end_date
      department_id
      college
      university
      phone
      alternate_phone
      date_of_birth
      gender
      blood_group
      nationality
      aadhar_number
      pan_number
      address_line1
      address_line2
      city
      state
      pincode
      country
      degree
      branch
      specialization
      graduation_year
      current_year
      cgpa
      percentage
      student_id
      linkedin_url
      github_url
      portfolio_url
    }
  }
`;
