// Run: node export-metadata.mjs
import { writeFileSync, mkdirSync } from 'fs';

const HASURA_URL   = 'http://localhost:8080';
const ADMIN_SECRET = 'myadminsecret'; // ← same as your HASURA_ADMIN_SECRET

const res = await fetch(`${HASURA_URL}/v1/metadata`, {
  method: 'POST',
  headers: {
    'Content-Type':          'application/json',
    'x-hasura-admin-secret': ADMIN_SECRET,
  },
  body: JSON.stringify({ type: 'export_metadata', args: {} }),
});

const metadata = await res.json();
if (metadata.error) {
  console.error('Export failed:', metadata.error);
  process.exit(1);
}

mkdirSync('hasura/metadata', { recursive: true });
writeFileSync('hasura/metadata/metadata.json', JSON.stringify(metadata, null, 2));
console.log('✓ Metadata exported to hasura/metadata/metadata.json');