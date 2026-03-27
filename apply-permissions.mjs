// Run from project root: node apply-permissions.mjs
const HASURA_URL   = 'http://localhost:8080';
const ADMIN_SECRET = 'myadminsecret'; // ← your HASURA_ADMIN_SECRET value

async function apply(type, table, role, permission) {
  const res = await fetch(`${HASURA_URL}/v1/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type':          'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
    body: JSON.stringify({
      type,
      args: {
        source: 'default',
        table:  { schema: 'public', name: table },
        role,
        permission,
      },
    }),
  });
  const json = await res.json();
  const permType = type.replace('pg_create_', '').replace('_permission', '');
  if (json.error && !json.error.includes('already exists')) {
    console.error(`  ✗ ${table}.${role} [${permType}] — ${json.error}`);
  } else {
    console.log(`  ✓ ${table}.${role} [${permType}]`);
  }
}

console.log('Applying Hasura permissions...\n');

// ── SELECT permissions ────────────────────────────────────────────────────────
const selects = [
  ['interns',      'admin',             {}],
  ['interns',      'department_person', { department_id: { _eq: 'X-Hasura-Department-Id' } }],
  ['interns',      'intern',            { user_id:       { _eq: 'X-Hasura-User-Id'       } }],
  ['departments',  'admin',             {}],
  ['departments',  'department_person', {}],
  ['departments',  'intern',            {}],
  ['users',        'admin',             {}],
  ['users',        'department_person', { id: { _eq: 'X-Hasura-User-Id' } }],
  ['users',        'intern',            { id: { _eq: 'X-Hasura-User-Id' } }],
  ['tasks',        'admin',             {}],
  ['tasks',        'department_person', { department_id: { _eq: 'X-Hasura-Department-Id' } }],
  ['tasks',        'intern',            { task_interns: { intern_id: { _eq: 'X-Hasura-User-Id' } } }],
  ['task_interns', 'admin',             {}],
  ['task_interns', 'department_person', {}],
  ['task_interns', 'intern',            { intern_id: { _eq: 'X-Hasura-User-Id' } }],
];

for (const [table, role, filter] of selects) {
  await apply('pg_create_select_permission', table, role, {
    columns: '*', filter, allow_aggregations: true,
  });
}

// ── UPDATE permissions ────────────────────────────────────────────────────────
// department_person can update interns in their department
// intern can update only their own record (limited columns)
const updates = [
  ['interns', 'admin', {}, '*'],
  ['interns', 'department_person',
    { department_id: { _eq: 'X-Hasura-Department-Id' } },
    ['name', 'phone', 'college', 'degree', 'branch', 'department_id',
     'start_date', 'end_date', 'status']
  ],
  ['interns', 'intern',
    { user_id: { _eq: 'X-Hasura-User-Id' } },
    ['phone', 'linkedin_url', 'github_url', 'portfolio_url',
     'address_line1', 'address_line2', 'city', 'state', 'pincode']
  ],
  ['users', 'admin',             {}, '*'],
  ['users', 'department_person', { id: { _eq: 'X-Hasura-User-Id' } }, ['name', 'phone', 'department_id']],
  ['users', 'intern',            { id: { _eq: 'X-Hasura-User-Id' } }, ['phone']],
  ['task_interns', 'admin',             {}, '*'],
  ['task_interns', 'department_person', {}, ['intern_status']],
  ['task_interns', 'intern',
    { intern_id: { _eq: 'X-Hasura-User-Id' } },
    ['intern_status']
  ],
];

for (const [table, role, filter, columns] of updates) {
  await apply('pg_create_update_permission', table, role, {
    columns,
    filter,
    check: {},
  });
}

// ── DELETE permissions ────────────────────────────────────────────────────────
// Only admin can delete interns and users
const deletes = [
  ['interns', 'admin', {}],
  ['users',   'admin', {}],
  ['tasks',   'admin', {}],
  ['tasks',   'department_person', { department_id: { _eq: 'X-Hasura-Department-Id' } }],
];

for (const [table, role, filter] of deletes) {
  await apply('pg_create_delete_permission', table, role, { filter });
}

console.log('\nDone. Reload Hasura console to verify.');