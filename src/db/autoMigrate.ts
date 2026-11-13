// src/db/autoMigrate.ts
import { pool, db, withDbRetry } from './index.ts';
import {
  employees,
  users,
  appSettings,
  recruitmentRequisitions,
} from './schema.ts';
import { RAW_MRF_DATA } from './seedRecruitment.ts';

let isDbInitialized = false;
let initPromise: Promise<void> | null = null;

export function isDatabaseReady(): boolean {
  return isDbInitialized;
}

export async function ensureDatabaseReady(): Promise<void> {
  if (isDbInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('Running automatic database schema and table initialization check...');

      // Verify connectivity first with retry for Cloud SQL cold-start wake-up
      await withDbRetry(() => pool.query('SELECT 1'), 4);

      // 1. Create essential tables only if they do not exist yet
      const tableCheck = await withDbRetry(
        () => pool.query(`SELECT to_regclass('public.recruitment_requisitions') AS req_tbl, to_regclass('public.employees') AS emp_tbl`),
        2
      );
      const tablesExist = Boolean(tableCheck.rows[0]?.req_tbl && tableCheck.rows[0]?.emp_tbl);

      if (!tablesExist) {
        try {
          await withDbRetry(() => pool.query(`
        -- 1. Users Table
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          uid TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'employee',
          employee_code TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- 2. Employees Table
        CREATE TABLE IF NOT EXISTS employees (
          id SERIAL PRIMARY KEY,
          employee_code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          designation TEXT NOT NULL,
          department TEXT NOT NULL DEFAULT 'Human Resources & OD',
          reporting_manager_id INTEGER,
          reporting_manager_name TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          is_head_of_hr BOOLEAN NOT NULL DEFAULT FALSE,
          avatar_initials TEXT,
          join_date TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- 3. Responsibilities Table
        CREATE TABLE IF NOT EXISTS responsibilities (
          id SERIAL PRIMARY KEY,
          responsibility_code TEXT NOT NULL UNIQUE,
          employee_id INTEGER REFERENCES employees(id),
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          frequency TEXT NOT NULL,
          expected_deliverable TEXT NOT NULL,
          measurement_criteria TEXT NOT NULL,
          related_kpi_title TEXT,
          reporting_manager TEXT,
          effective_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- 4. Tasks Table
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          task_code TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          assigned_employee_id INTEGER REFERENCES employees(id),
          assigning_manager_name TEXT NOT NULL,
          related_responsibility_id INTEGER REFERENCES responsibilities(id),
          related_kpi_id INTEGER,
          priority TEXT NOT NULL DEFAULT 'Medium',
          assignment_date TEXT NOT NULL,
          start_date TEXT NOT NULL,
          original_deadline TEXT NOT NULL,
          revised_deadline TEXT,
          revised_by TEXT,
          revised_at TEXT,
          extension_reason TEXT,
          completion_date TEXT,
          status TEXT NOT NULL DEFAULT 'Not Started',
          progress_percent INTEGER NOT NULL DEFAULT 0,
          employee_completion_notes TEXT,
          delay_reason TEXT,
          delay_category TEXT,
          manager_comments TEXT,
          supporting_attachments TEXT,
          approval_status TEXT NOT NULL DEFAULT 'Not Submitted',
          is_poked BOOLEAN NOT NULL DEFAULT FALSE,
          poked_by TEXT,
          poked_at TIMESTAMP,
          poke_count INTEGER NOT NULL DEFAULT 0,
          created_by TEXT NOT NULL,
          last_updated_by TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- 5. Deadline Extension Requests Table
        CREATE TABLE IF NOT EXISTS deadline_extension_requests (
          id SERIAL PRIMARY KEY,
          task_id INTEGER REFERENCES tasks(id),
          employee_id INTEGER REFERENCES employees(id),
          current_deadline TEXT NOT NULL,
          requested_deadline TEXT NOT NULL,
          reason_category TEXT NOT NULL,
          detailed_reason TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Pending',
          reviewer_name TEXT,
          reviewer_comments TEXT,
          reviewed_at TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- 6. KPIs Table
        CREATE TABLE IF NOT EXISTS kpis (
          id SERIAL PRIMARY KEY,
          kpi_code TEXT NOT NULL UNIQUE,
          employee_id INTEGER REFERENCES employees(id),
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'HR Operations',
          measurement_method TEXT NOT NULL DEFAULT 'higher_is_better',
          target_value DOUBLE PRECISION NOT NULL,
          actual_value DOUBLE PRECISION,
          unit TEXT NOT NULL DEFAULT '%',
          weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
          reporting_period TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          data_source TEXT,
          evidence_notes TEXT,
          submission_status TEXT NOT NULL DEFAULT 'Not Submitted',
          manager_review_status TEXT NOT NULL DEFAULT 'Pending',
          approved_achievement_percentage DOUBLE PRECISION,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- 7. Task Audit Logs Table
        CREATE TABLE IF NOT EXISTS task_audit_logs (
          id SERIAL PRIMARY KEY,
          task_id INTEGER REFERENCES tasks(id),
          action_type TEXT NOT NULL,
          action_summary TEXT NOT NULL,
          previous_value TEXT,
          new_value TEXT,
          performed_by TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- 8. Notifications Table
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          recipient_employee_id INTEGER REFERENCES employees(id),
          recipient_email TEXT,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL,
          link_id INTEGER,
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- 9. App Settings Table
        CREATE TABLE IF NOT EXISTS app_settings (
          id SERIAL PRIMARY KEY,
          setting_key TEXT NOT NULL UNIQUE,
          setting_value TEXT NOT NULL,
          description TEXT,
          updated_by TEXT,
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- 10. Recruitment Requisitions Table
        CREATE TABLE IF NOT EXISTS recruitment_requisitions (
          id SERIAL PRIMARY KEY,
          sl INTEGER NOT NULL,
          requisition_code TEXT NOT NULL UNIQUE,
          position_title TEXT NOT NULL,
          department TEXT NOT NULL,
          requisition_date TEXT NOT NULL,
          requisition_submitted_by TEXT NOT NULL,
          hod TEXT NOT NULL,
          company TEXT NOT NULL,
          vacancy INTEGER NOT NULL DEFAULT 1,
          recruitment_type TEXT NOT NULL DEFAULT 'New Recruitment',
          replacement_of_whom TEXT,
          replacement_employee_salary TEXT,
          offer_letter_date TEXT,
          date_of_joining TEXT,
          recruitment_status TEXT NOT NULL DEFAULT 'Ongoing',
          time_to_fill_days INTEGER,
          remarks TEXT,
          recruitment_assisted_by_id INTEGER REFERENCES employees(id),
          recruitment_assisted_by_name TEXT NOT NULL,
          recruitment_assisted_by_code TEXT,
          last_updated_by_id TEXT,
          last_updated_by_name TEXT,
          last_updated_at TIMESTAMP DEFAULT NOW(),
          created_by_id TEXT,
          created_by_name TEXT,
          version INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- 11. Recruitment Audit Logs Table
        CREATE TABLE IF NOT EXISTS recruitment_audit_logs (
          id SERIAL PRIMARY KEY,
          requisition_id INTEGER REFERENCES recruitment_requisitions(id) ON DELETE CASCADE,
          requisition_code TEXT NOT NULL,
          position_title TEXT,
          action TEXT NOT NULL,
          field_name TEXT,
          previous_value TEXT,
          new_value TEXT,
          details TEXT NOT NULL,
          performed_by_user_id TEXT,
          performed_by_name TEXT NOT NULL,
          performed_by_role TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- 12. Recruitment Ratings Table
        CREATE TABLE IF NOT EXISTS recruitment_ratings (
          id SERIAL PRIMARY KEY,
          employee_code TEXT NOT NULL,
          employee_name TEXT NOT NULL,
          rated_by_employee_code TEXT NOT NULL,
          rated_by_name TEXT NOT NULL,
          rating_score DOUBLE PRECISION NOT NULL,
          rating_period TEXT NOT NULL DEFAULT 'October 2026',
          feedback TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `), 2);
        } catch (ddlErr: any) {
          console.warn('Database auto-migration note (DDL schema query skipped or permission restricted):', ddlErr.message || ddlErr);
        }
      }

      // 2. Ensure initial HR admin and personnel exist
      try {
        let existingEmps: any[] = [];
        try {
          existingEmps = await db.select().from(employees);
        } catch {
          // Table may not exist yet on first boot before DDL finishes or if schema permissions apply
        }

        if (existingEmps.length === 0) {
          console.log('Seeding initial HR personnel and admin users...');
          const initialPersonnel = [
            {
              employeeCode: '01-02-0440',
              name: 'Syeda Shaila Ashraf',
              email: 'syeda.shaila@renaissance.com.bd',
              designation: 'Head of HR',
              department: 'Human Resources & OD',
              isHeadOfHr: true,
              status: 'active',
              avatarInitials: 'SA',
              joinDate: '01-Jul-15',
            },
            {
              employeeCode: '22-02-1826',
              name: 'Shahriyar Naiem',
              email: 'shahriyar.naiem@renaissance.com.bd',
              designation: 'Manager, HR & OD',
              department: 'Human Resources & OD',
              isHeadOfHr: false,
              status: 'active',
              avatarInitials: 'SN',
              joinDate: '01-Jan-22',
            },
            {
              employeeCode: '22-02-1330',
              name: 'Quazi Nuzhat Rahman',
              email: 'quazi.nuzhat@renaissance.com.bd',
              designation: 'Senior Executive, HR',
              department: 'Human Resources & OD',
              isHeadOfHr: false,
              status: 'active',
              avatarInitials: 'QN',
              joinDate: '15-Mar-22',
            },
            {
              employeeCode: '22-02-1642',
              name: 'Sabbir Hossain',
              email: 'sabbir.hossain@renaissance.com.bd',
              designation: 'Executive, HR',
              department: 'Human Resources & OD',
              isHeadOfHr: false,
              status: 'active',
              avatarInitials: 'SH',
              joinDate: '01-Jun-22',
            },
            {
              employeeCode: '02-02-2059',
              name: 'Fariha Nasmi',
              email: 'fariha.nasmi@renaissance.com.bd',
              designation: 'Assistant Executive, HR',
              department: 'Human Resources & OD',
              isHeadOfHr: false,
              status: 'active',
              avatarInitials: 'FN',
              joinDate: '10-Sep-22',
            },
            {
              employeeCode: '22-02-1551',
              name: 'Maisha Islam',
              email: 'maisha.islam@renaissance.com.bd',
              designation: 'Assistant Executive, HR',
              department: 'Human Resources & OD',
              isHeadOfHr: false,
              status: 'active',
              avatarInitials: 'MI',
              joinDate: '15-Nov-22',
            },
            {
              employeeCode: '02-02-2222',
              name: 'System Administrator',
              email: 'admin@renaissance.com.bd',
              designation: 'System Administrator (IT & HR Systems)',
              department: 'IT & HR Systems',
              isHeadOfHr: false,
              status: 'active',
              avatarInitials: 'SA',
              joinDate: '01-Jan-20',
            },
          ];

          for (const emp of initialPersonnel) {
            try {
              await db.insert(employees).values(emp).onConflictDoNothing();
              await db
                .insert(users)
                .values({
                  uid: `user-${emp.employeeCode}`,
                  email: emp.email,
                  name: emp.name,
                  role: emp.isHeadOfHr ? 'head_of_hr' : emp.designation.includes('Manager') ? 'hr_manager' : emp.employeeCode === '02-02-2222' ? 'admin' : 'employee',
                  employeeCode: emp.employeeCode,
                })
                .onConflictDoNothing();
            } catch {}
          }

          // Add default settings
          try {
            await db
              .insert(appSettings)
              .values([
                {
                  settingKey: 'company_name',
                  settingValue: 'Renaissance Group',
                  description: 'Organization Name',
                  updatedBy: 'System Administrator',
                },
                {
                  settingKey: 'department_name',
                  settingValue: 'Human Resources (HR) & Organization Development (OD)',
                  description: 'Department Name',
                  updatedBy: 'System Administrator',
                },
              ])
              .onConflictDoNothing();
          } catch {}
        }
      } catch (empErr: any) {
        console.warn('Database initial personnel check note:', empErr.message || empErr);
      }

      // 3. Ensure sample recruitment requisitions exist so dashboard loads with data
      try {
        let existingReqs: any[] = [];
        try {
          existingReqs = await db.select().from(recruitmentRequisitions);
        } catch {
          // Table may not exist yet or permission restricted during first boot
        }

        if (existingReqs.length === 0) {
          console.log('Seeding initial active recruitment requisitions...');
          const initialBatch = RAW_MRF_DATA;
          for (const r of initialBatch) {
            try {
              await db.insert(recruitmentRequisitions).values({
                sl: r.sl,
                requisitionCode: `MRF-2026-${String(r.sl).padStart(3, '0')}`,
                positionTitle: r.positionTitle,
                department: r.department,
                requisitionDate: r.requisitionDate,
                requisitionSubmittedBy: r.requisitionSubmittedBy,
                hod: r.hod,
                company: r.company,
                vacancy: r.vacancy,
                recruitmentType: r.recruitmentType,
                replacementOfWhom: r.replacementOfWhom || null,
                replacementEmployeeSalary: r.replacementEmployeeSalary || null,
                offerLetterDate: r.offerLetterDate || null,
                dateOfJoining: r.dateOfJoining || null,
                recruitmentStatus: r.recruitmentStatus,
                remarks: r.remarks || null,
                recruitmentAssistedByName: r.assistedByName,
                recruitmentAssistedByCode: r.assistedByCode,
                createdByName: 'System Administrator',
                createdById: '02-02-2222',
                version: 1,
              }).onConflictDoNothing();
            } catch {}
          }
        }
      } catch (reqErr: any) {
        console.warn('Database recruitment requisition check note:', reqErr.message || reqErr);
      }

      isDbInitialized = true;
      console.log('Automatic database schema check and initial data verification complete.');
    } catch (err: any) {
      console.warn('Database auto-migration check note (will retry on next request):', err.message || err);
      isDbInitialized = false;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}
