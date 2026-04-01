// Run from project root: node apply-permissions.mjs
const HASURA_URL   = process.env.HASURA_URL || 'http://localhost:8081';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'myadminsecret';

async function track(table) {
  const res = await fetch(`${HASURA_URL}/v1/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type':          'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
    body: JSON.stringify({
      type: 'pg_track_table',
      args: {
        source: 'default',
        table: { schema: 'public', name: table },
      },
    }),
  });
  const json = await res.json();
  if (json.error) {
    if (json.error.includes('already tracked') || json.code === 'already-tracked') {
      console.log(`  ✓ ${table} (already tracked)`);
    } else {
      console.error(`  ✗ ${table} — ${json.error}`);
    }
  } else {
    console.log(`  ✓ ${table} tracked`);
  }
}

async function apply(type, table, role, permission) {
  const dropType = type.replace('create', 'drop');
  await fetch(`${HASURA_URL}/v1/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type':          'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
    body: JSON.stringify({
      type: dropType,
      args: {
        source: 'default',
        table:  { schema: 'public', name: table },
        role,
      },
    }),
  });

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

// ── Track Tables ──────────────────────────────────────────────────────────────
console.log('Tracking tables...\n');
await track('departments');
await track('users');
await track('interns');
await track('tasks');
await track('task_interns');
await track('task_comments');
await track('task_activity_log');

// ── SELECT permissions ────────────────────────────────────────────────────────
console.log('\nApplying Hasura permissions...\n');

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
const updates = [
  ['interns', 'admin', {}, '*'],
  ['interns', 'department_person',
    { department_id: { _eq: 'X-Hasura-Department-Id' } },
    ['name', 'phone', 'college', 'degree', 'branch', 'department_id',
     'start_date', 'end_date', 'status']
  ],
  ['interns', 'intern',
    { user_id: { _eq: 'X-Hasura-User-Id' } },
    ['phone', 'alternate_phone', 'date_of_birth', 'gender', 'blood_group',
     'nationality', 'aadhar_number', 'pan_number', 'address_line1', 'address_line2',
     'city', 'state', 'pincode', 'country', 'college', 'university', 'degree', 'branch',
     'specialization', 'graduation_year', 'current_year', 'cgpa', 'percentage',
     'student_id', 'linkedin_url', 'github_url', 'portfolio_url']
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
