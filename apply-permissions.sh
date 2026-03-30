  #!/bin/sh

  HASURA_URL="http://hasura:8080"
  ADMIN_SECRET="myadminsecret"

  # ── Track Tables ──────────────────────────────────────────────────────────────
  track() {
    local TABLE=$1
    RESPONSE=$(curl -s -X POST "$HASURA_URL/v1/metadata" \
      -H "Content-Type: application/json" \
      -H "x-hasura-admin-secret: $ADMIN_SECRET" \
      -d "{
        \"type\": \"pg_track_table\",
        \"args\": {
          \"source\": \"default\",
          \"table\": { \"schema\": \"public\", \"name\": \"$TABLE\" }
        }
      }")

    if echo "$RESPONSE" | grep -q '"error"'; then
      if echo "$RESPONSE" | grep -q "already tracked"; then
        echo "  ✓ $TABLE (already tracked)"
      else
        echo "  ✗ $TABLE — $RESPONSE"
      fi
    else
      echo "  ✓ $TABLE tracked"
    fi
  }

  echo "Tracking tables...\n"
  track interns
  track departments
  track users
  track tasks
  track task_interns
  track task_activity_log
  track task_comments

  apply() {
    local TYPE=$1
    local TABLE=$2
    local ROLE=$3
    local PERMISSION=$4

    RESPONSE=$(curl -s -X POST "$HASURA_URL/v1/metadata" \
      -H "Content-Type: application/json" \
      -H "x-hasura-admin-secret: $ADMIN_SECRET" \
      -d "{
        \"type\": \"$TYPE\",
        \"args\": {
          \"source\": \"default\",
          \"table\": { \"schema\": \"public\", \"name\": \"$TABLE\" },
          \"role\": \"$ROLE\",
          \"permission\": $PERMISSION
        }
      }")

    PERM_TYPE=$(echo "$TYPE" | sed 's/pg_create_//' | sed 's/_permission//')

    if echo "$RESPONSE" | grep -q '"error"'; then
      if echo "$RESPONSE" | grep -q "already exists"; then
        echo "  ✓ $TABLE.$ROLE [$PERM_TYPE] (already exists)"
      else
        echo "  ✗ $TABLE.$ROLERM_TYPE] — $RESPONSE"
      fi
    else
      echo "  ✓ $TABLE.$ROLE [$PERM_TYPE]"
    fi
  }

  echo "Applying Hasura permissions...\n"

  # ── SELECT ────────────────────────────────────────────────────────────────────
  apply pg_create_select_permission interns      admin             '{"columns":"*","filter":{},"allow_aggregations":true}'
  apply pg_create_select_permission interns      department_person '{"columns":"*","filter":{"department_id":{"_eq":"X-Hasura-Department-Id"}},"allow_aggregations":true}'
  apply pg_create_select_permission interns      intern            '{"columns":"*","filter":{"user_id":{"_eq":"X-Hasura-User-Id"}},"allow_aggregations":true}'
  apply pg_create_select_permission departments  admin             '{"columns":"*","filter":{},"allow_aggregations":true}'
  apply pg_create_select_permission departments  department_person '{"columns":"*","filter":{},"allow_aggregations":true}'
  apply pg_create_select_permission departments  intern            '{"columns":"*","filter":{},"allow_aggregations":true}'
  apply pg_create_select_permission users        admin             '{"columns":"*","filter":{},"allow_aggregations":true}'
  apply pg_create_select_permission users        department_person '{"columns":"*","filter":{"id":{"_eq":"X-Hasura-User-Id"}},"allow_aggregations":true}'
  apply pg_create_select_permission users        intern            '{"columns":"*","filter":{"id":{"_eq":"X-Hasura-User-Id"}},"allow_aggregations":true}'
  apply pg_create_select_permission tasks        admin             '{"columns":"*","filter":{},"allow_aggregations":true}'
  apply pg_create_select_permission tasks        department_person '{"columns":"*","filter":{"department_id":{"_eq":"X-Hasura-Department-Id"}},"allow_aggregations":true}'
  apply pg_create_select_permission tasks        intern            '{"columns":"*","filter":{"task_interns":{"intern_id":{"_eq":"X-Hasura-User-Id"}}},"allow_aggregations":true}'
  apply pg_create_select_permission task_interns admin             '{"columns":"*","filter":{},"allow_aggregations":true}'
  apply pg_create_select_permission task_interns department_person '{"columns":"*","filter":{},"allow_aggregations":true}'
  apply pg_create_select_permission task_interns intern            '{"columns":"*","filter":{"intern_id":{"_eq":"X-Hasura-User-Id"}},"allow_aggregations":true}'

  # ── UPDATE ────────────────────────────────────────────────────────────────────
  apply pg_create_update_permission interns      admin             '{"columns":"*","filter":{},"check":{}}'
  apply pg_create_update_permission interns      department_person '{"columns":["name","phone","college","degree","branch","department_id","start_date","end_date","status"],"filter":{"department_id":{"_eq":"X-Hasura-Department-Id"}},"check":{}}'
  apply pg_create_update_permission interns      intern            '{"columns":["phone","linkedin_url","github_url","portfolio_url","address_line1","address_line2","city","state","pincode"],"filter":{"user_id":{"_eq":"X-Hasura-User-Id"}},"check":{}}'
  apply pg_create_update_permission users        admin             '{"columns":"*","filter":{},"check":{}}'
  apply pg_create_update_permission users        department_person '{"columns":["name","phone","department_id"],"filter":{"id":{"_eq":"X-Hasura-User-Id"}},"check":{}}'
  apply pg_create_update_permission users        intern            '{"columns":["phone"],"filter":{"id":{"_eq":"X-Hasura-User-Id"}},"check":{}}'
  apply pg_create_update_permission task_interns admin             '{"columns":"*","filter":{},"check":{}}'
  apply pg_create_update_permission task_interns department_person '{"columns":["intern_status"],"filter":{},"check":{}}'
  apply pg_create_update_permission task_interns intern            '{"columns":["intern_status"],"filter":{"intern_id":{"_eq":"X-Hasura-User-Id"}},"check":{}}'

  # ── DELETE ────────────────────────────────────────────────────────────────────
  apply pg_create_delete_permission interns      admin             '{"filter":{}}'
  apply pg_create_delete_permission users        admin             '{"filter":{}}'
  apply pg_create_delete_permission tasks        admin             '{"filter":{}}'
  apply pg_create_delete_permission tasks        department_person '{"filter":{"department_id":{"_eq":"X-Hasura-Department-Id"}}}'

  echo "\nDone. Reload Hasura console to verify."