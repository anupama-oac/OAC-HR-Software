#!/bin/sh
set -eu

for database in \
  oac_auth_db \
  oac_leave_db \
  oac_expense_db \
  oac_payroll_db \
  oac_hr_db
do
  if psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname = '$database'" | grep -q 1
  then
    echo "Database already exists: $database"
  else
    createdb -h "$POSTGRES_HOST" -U "$POSTGRES_USER" \
      --owner="$POSTGRES_USER" "$database"
    echo "Created database: $database"
  fi
done
