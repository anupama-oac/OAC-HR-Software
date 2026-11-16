-- Database Initialization Script for OAC HR Software
-- Automatically executed on PostgreSQL startup

CREATE DATABASE oac_auth_db OWNER oac_softwares;
CREATE DATABASE oac_leave_db OWNER oac_softwares;
CREATE DATABASE oac_expense_db OWNER oac_softwares;
CREATE DATABASE oac_payroll_db OWNER oac_softwares;
CREATE DATABASE oac_hr_db OWNER oac_softwares;

GRANT ALL PRIVILEGES ON DATABASE oac_auth_db TO oac_softwares;
GRANT ALL PRIVILEGES ON DATABASE oac_leave_db TO oac_softwares;
GRANT ALL PRIVILEGES ON DATABASE oac_expense_db TO oac_softwares;
GRANT ALL PRIVILEGES ON DATABASE oac_payroll_db TO oac_softwares;
GRANT ALL PRIVILEGES ON DATABASE oac_hr_db TO oac_softwares;

