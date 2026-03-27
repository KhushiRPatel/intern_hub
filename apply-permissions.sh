#!/bin/bash
# Run from project root: bash apply-permissions.sh
# Replace these with your actual values if different

HASURA_URL="http://localhost:8080"
ADMIN_SECRET="myadminsecret"

apply() {
  local TABLE=$1
  local ROLE=$2
  local FILTER=$3

  curl -s -X POST "$HASURA_URL/v1/metadata" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $ADMIN_SECRET" \
    -d "{
      \"type\": \"pg_create_select_permission\",
      \"args\": {
        \"source\": \"default\",
        \"table\": { \"schema\": \"public\", \"name\": \"$TABLE\" },
        \"role\": \"$ROLE\",
        \"permission\": {
          \"columns\": \"*\",
          \"filter\": $FILTER,
          \"allow_aggregations\": true
        }
      }
    }" | python3 -m json.tool 2>/dev/null || echo "done"

  echo "  ✓ $TABLE.$ROLE"
}

echo "Applying Hasura select permissions..."

# interns
apply "interns" "admin"             '{}'
apply "interns" "department_person" '{"department_id":{"_eq":"X-Hasura-Department-Id"}}'
apply "interns" "intern"            '{"user_id":{"_eq":"X-Hasura-User-Id"}}'

# departments
apply "departments" "admin"             '{}'
apply "departments" "department_person" '{}'
apply "departments" "intern"            '{}'

# users
apply "users" "admin"             '{}'
apply "users" "department_person" '{"id":{"_eq":"X-Hasura-User-Id"}}'
apply "users" "intern"            '{"id":{"_eq":"X-Hasura-User-Id"}}'

# tasks
apply "tasks" "admin"             '{}'
apply "tasks" "department_person" '{"department_id":{"_eq":"X-Hasura-Department-Id"}}'
apply "tasks" "intern"            '{"task_interns":{"intern_id":{"_eq":"X-Hasura-User-Id"}}}'

# task_interns
apply "task_interns" "admin"             '{}'
apply "task_interns" "department_person" '{}'
apply "task_interns" "intern"            '{"intern_id":{"_eq":"X-Hasura-User-Id"}}'

echo ""
echo "Done. Reload Hasura console to verify."