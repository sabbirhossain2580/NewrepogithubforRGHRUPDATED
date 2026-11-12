// src/db/seed.ts
import { db } from './index.ts';
import { employees, responsibilities, tasks, kpis, appSettings, users, taskAuditLogs, notifications } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function seedDatabase(forceReset = false) {
  try {
    let existingEmployees: any[] = [];
    try {
      existingEmployees = await db.select().from(employees);
    } catch {
      // Database connection unavailable or schema not ready yet; safely return
      return;
    }

    if (existingEmployees.length > 0 && !forceReset) {
      console.log('Database already has employee records, skipping automatic seed.');
      return;
    }

    if (forceReset) {
      console.log('Resetting and re-seeding database...');
      await db.delete(notifications);
      await db.delete(taskAuditLogs);
      await db.delete(tasks);
      await db.delete(kpis);
      await db.delete(responsibilities);
      await db.delete(users);
      await db.delete(employees);
      await db.delete(appSettings);
    }

    // 1. Initial Settings
    await db.insert(appSettings).values([
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
      {
        settingKey: 'timezone',
        settingValue: 'Asia/Dhaka',
        description: 'Configured corporate timezone for deadlines and notifications',
        updatedBy: 'System Administrator',
      },
      {
        settingKey: 'day_cutoff_time',
        settingValue: '23:59',
        description: 'Daily cutoff time before task is calculated overdue',
        updatedBy: 'System Administrator',
      },
      {
        settingKey: 'scoring_kpi_weight',
        settingValue: '70',
        description: 'Weight of Approved KPI Achievement in overall monthly performance score (%)',
        updatedBy: 'Head of HR',
      },
      {
        settingKey: 'scoring_task_weight',
        settingValue: '30',
        description: 'Weight of Task Execution Score in overall monthly performance score (%)',
        updatedBy: 'Head of HR',
      },
      {
        settingKey: 'kpi_cap_percentage',
        settingValue: '120',
        description: 'Maximum cap on KPI over-achievement percentage',
        updatedBy: 'Head of HR',
      },
      {
        settingKey: 'head_of_hr_email',
        settingValue: 'head.hr@renaissance.com.bd',
        description: 'Assigned Head of HR account email',
        updatedBy: 'System Administrator',
      },
      {
        settingKey: 'current_reporting_period',
        settingValue: 'October 2026',
        description: 'Active performance management cycle period',
        updatedBy: 'Head of HR',
      },
    ]).onConflictDoNothing();

    // 2. Head of HR & 5 Core Team Employees
    // Configurable Head of HR account (Syeda Shaila Ashraf, Head of HR - supervisory role)
    const [headOfHr] = await db.insert(employees).values({
      employeeCode: '01-02-0440',
      name: 'Syeda Shaila Ashraf',
      email: 'syeda.shaila@renaissance.com.bd',
      designation: 'Head of HR',
      department: 'HR',
      reportingManagerName: 'Managing Director, Renaissance Group',
      status: 'active',
      isHeadOfHr: true,
      avatarInitials: 'SA',
      joinDate: '07-Aug-16',
    }).returning();

    // 1. Shahriyar Naiem — Manager, HR & OD
    const [shahriyar] = await db.insert(employees).values({
      employeeCode: '22-02-1826',
      name: 'Shahriyar Naiem',
      email: 'shahriyar.naiem@renaissance.com.bd',
      designation: 'Manager, HR & OD',
      department: 'HR & OD',
      reportingManagerId: headOfHr.id,
      reportingManagerName: headOfHr.name,
      status: 'active',
      isHeadOfHr: false,
      avatarInitials: 'SN',
      joinDate: '12-Aug-25',
    }).returning();

    // 2. Quazi Nuzhat Rahman — Senior Executive, HR
    const [nuzhat] = await db.insert(employees).values({
      employeeCode: '22-02-1330',
      name: 'Quazi Nuzhat Rahman',
      email: 'quazi.nuzhat@renaissance.com.bd',
      designation: 'Senior Executive, HR',
      department: 'HR',
      reportingManagerId: headOfHr.id,
      reportingManagerName: headOfHr.name,
      status: 'active',
      isHeadOfHr: false,
      avatarInitials: 'QN',
      joinDate: '01-Nov-22',
    }).returning();

    // 3. Sabbir Hossain — Executive, HR
    const [sabbir] = await db.insert(employees).values({
      employeeCode: '22-02-1642',
      name: 'Sabbir Hossain',
      email: 'sabbir.hossain@renaissance.com.bd',
      designation: 'Executive, HR',
      department: 'HR',
      reportingManagerId: headOfHr.id,
      reportingManagerName: headOfHr.name,
      status: 'active',
      isHeadOfHr: false,
      avatarInitials: 'SH',
      joinDate: '02-Oct-24',
    }).returning();

    // 4. Maisha Islam — Assistant Executive, HR
    const [maisha] = await db.insert(employees).values({
      employeeCode: '22-02-1551',
      name: 'Maisha Islam',
      email: 'maisha.islam@renaissance.com.bd',
      designation: 'Assistant Executive, HR',
      department: 'Human Resources & OD',
      reportingManagerId: headOfHr.id,
      reportingManagerName: headOfHr.name,
      status: 'active',
      isHeadOfHr: false,
      avatarInitials: 'MI',
      joinDate: '2024-02-01',
    }).returning();

    // 5. Fariha Nasmi — Assistant Executive, HR
    const [fariha] = await db.insert(employees).values({
      employeeCode: '02-02-2059',
      name: 'Fariha Nasmi',
      email: 'fariha.nasmi@renaissance.com.bd',
      designation: 'Assistant Executive, HR',
      department: 'HR',
      reportingManagerId: headOfHr.id,
      reportingManagerName: headOfHr.name,
      status: 'active',
      isHeadOfHr: false,
      avatarInitials: 'FN',
      joinDate: '20-Jul-26',
    }).returning();

    // Insert Default System Users for Role Testing
    await db.insert(users).values([
      {
        uid: 'user-head-hr',
        email: headOfHr.email,
        name: headOfHr.name,
        role: 'head_of_hr',
        employeeCode: headOfHr.employeeCode,
      },
      {
        uid: 'user-mgr-shahriyar',
        email: shahriyar.email,
        name: shahriyar.name,
        role: 'hr_manager',
        employeeCode: shahriyar.employeeCode,
      },
      {
        uid: 'user-exec-nuzhat',
        email: nuzhat.email,
        name: nuzhat.name,
        role: 'employee',
        employeeCode: nuzhat.employeeCode,
      },
      {
        uid: 'user-exec-sabbir',
        email: sabbir.email,
        name: sabbir.name,
        role: 'employee',
        employeeCode: sabbir.employeeCode,
      },
      {
        uid: 'user-asst-maisha',
        email: maisha.email,
        name: maisha.name,
        role: 'employee',
        employeeCode: maisha.employeeCode,
      },
      {
        uid: 'user-asst-fariha',
        email: fariha.email,
        name: fariha.name,
        role: 'employee',
        employeeCode: fariha.employeeCode,
      },
      {
        uid: 'user-admin',
        email: 'admin@renaissance.com.bd',
        name: 'System Administrator',
        role: 'admin',
        employeeCode: '02-02-2222',
      },
    ]).onConflictDoNothing();

    // 3. Employee Responsibilities Register
    const [respShahriyar1] = await db.insert(responsibilities).values({
      responsibilityCode: 'RESP-001',
      employeeId: shahriyar.id,
      title: 'Departmental OD & Manpower Strategy',
      description: 'Design organizational development frameworks, conduct departmental capacity planning, and forecast quarterly talent requirements for Renaissance Group units.',
      category: 'Training & OD',
      frequency: 'Monthly',
      expectedDeliverable: 'Quarterly Manpower Blueprint & OD Health Matrix',
      measurementCriteria: '100% adherence to planned talent allocations and executive approval',
      relatedKpiTitle: 'Departmental OD Milestone Achievement',
      reportingManager: headOfHr.name,
      effectiveDate: '2026-01-01',
      status: 'active',
    }).returning();

    const [respShahriyar2] = await db.insert(responsibilities).values({
      responsibilityCode: 'RESP-002',
      employeeId: shahriyar.id,
      title: 'Performance Appraisal Calibration & Reviews',
      description: 'Supervise monthly KPI evaluation cycles, calibrate employee deliverables across units, and prepare executive review decks for Head of HR.',
      category: 'Performance Management',
      frequency: 'Monthly',
      expectedDeliverable: 'Calibrated Monthly Appraisal Summary & Action Register',
      measurementCriteria: 'Completion of 100% team appraisals within 3 working days of month-end',
      relatedKpiTitle: 'Monthly Appraisal Review SLA Adherence',
      reportingManager: headOfHr.name,
      effectiveDate: '2026-01-01',
      status: 'active',
    }).returning();

    const [respNuzhat1] = await db.insert(responsibilities).values({
      responsibilityCode: 'RESP-003',
      employeeId: nuzhat.id,
      title: 'Executive & Managerial Talent Acquisition',
      description: 'Manage full-cycle headhunting, candidate screening, structured competency interviews, and offer rollouts for corporate and manufacturing divisions.',
      category: 'Talent Acquisition',
      frequency: 'Weekly',
      expectedDeliverable: 'Weekly Talent Pipeline Dashboard & Candidate Dossiers',
      measurementCriteria: 'Time-to-fill <= 30 calendar days for approved requisitions',
      relatedKpiTitle: 'Average Time-to-Fill for Executive Positions',
      reportingManager: shahriyar.name,
      effectiveDate: '2026-01-01',
      status: 'active',
    }).returning();

    const [respNuzhat2] = await db.insert(responsibilities).values({
      responsibilityCode: 'RESP-004',
      employeeId: nuzhat.id,
      title: 'Corporate Onboarding & 90-Day Induction',
      description: 'Deliver structured onboarding experience for all lateral hires and monitor 30/60/90-day progress reviews with department heads.',
      category: 'Talent Acquisition',
      frequency: 'Weekly',
      expectedDeliverable: 'Formal Onboarding Kits & 90-Day Probation Feedback Reports',
      measurementCriteria: '95%+ positive onboarding survey rating and zero dropouts in first 30 days',
      relatedKpiTitle: 'New Hire 90-Day Retention Rate',
      reportingManager: shahriyar.name,
      effectiveDate: '2026-01-01',
      status: 'active',
    }).returning();

    const [respSabbir1] = await db.insert(responsibilities).values({
      responsibilityCode: 'RESP-005',
      employeeId: sabbir.id,
      title: 'HR Analytics & Monthly Management Information System (MIS)',
      description: 'Aggregate enterprise HR metrics including headcount movements, attrition patterns, separation analysis, and operational cost dashboards.',
      category: 'HR Operations & Analytics',
      frequency: 'Monthly',
      expectedDeliverable: 'Monthly Comprehensive HR Analytics MIS Deck',
      measurementCriteria: 'Delivery on or before 25th of each month with audited separation data',
      relatedKpiTitle: 'Timely Submission of Monthly HR MIS Report',
      reportingManager: shahriyar.name,
      effectiveDate: '2026-01-01',
      status: 'active',
    }).returning();

    const [respSabbir2] = await db.insert(responsibilities).values({
      responsibilityCode: 'RESP-006',
      employeeId: sabbir.id,
      title: 'HRIS Records Integrity & Separation Clearance Operations',
      description: 'Audit employee master records, maintain digital personnel archives, and coordinate cross-departmental clearance workflows for outgoing staff.',
      category: 'HR Operations & Analytics',
      frequency: 'Daily',
      expectedDeliverable: 'Settlement Clearance Dossiers & Audit-Ready Digital Master File',
      measurementCriteria: '100% data fidelity on audit sample checks and zero unresolved clearance tickets > 7 days',
      relatedKpiTitle: 'Separation Settlement SLA Compliance',
      reportingManager: shahriyar.name,
      effectiveDate: '2026-01-01',
      status: 'active',
    }).returning();

    const [respMaisha1] = await db.insert(responsibilities).values({
      responsibilityCode: 'RESP-007',
      employeeId: maisha.id,
      title: 'Training Needs Assessment & Skill Workshops',
      description: 'Coordinate quarterly training calendars, organize internal capability sessions, and track cumulative training hours per full-time employee.',
      category: 'Training & OD',
      frequency: 'Monthly',
      expectedDeliverable: 'Training Event Attendance Logs & Post-Training Competency Assessments',
      measurementCriteria: 'Achieve minimum 8 training hours per employee per quarter',
      relatedKpiTitle: 'Average Training Hours per Employee',
      reportingManager: shahriyar.name,
      effectiveDate: '2026-01-01',
      status: 'active',
    }).returning();

    const [respMaisha2] = await db.insert(responsibilities).values({
      responsibilityCode: 'RESP-008',
      employeeId: maisha.id,
      title: 'Employee Engagement & Welfare Initiatives',
      description: 'Organize departmental town halls, Renaissance cultural celebrations, wellness screenings, and quarterly employee sentiment surveys.',
      category: 'Employee Relations',
      frequency: 'Monthly',
      expectedDeliverable: 'Monthly Engagement Action Calendar & Pulse Survey Analytical Digest',
      measurementCriteria: 'Employee satisfaction index >= 80% on quarterly pulse checks',
      relatedKpiTitle: 'Quarterly Employee Engagement Index',
      reportingManager: shahriyar.name,
      effectiveDate: '2026-01-01',
      status: 'active',
    }).returning();

    const [respFariha1] = await db.insert(responsibilities).values({
      responsibilityCode: 'RESP-009',
      employeeId: fariha.id,
      title: 'Statutory Labour Compliance & Factory Standards Auditing',
      description: 'Ensure full adherence to Bangladesh Labour Act 2006 (and amendments), conduct factory floor compliance audits, and prepare inspection dossiers.',
      category: 'Compliance',
      frequency: 'Weekly',
      expectedDeliverable: 'Factory Compliance Audit Reports & Corrective Action Plans (CAP)',
      measurementCriteria: 'Zero non-compliance legal citations and 100% timely filing of statutory forms',
      relatedKpiTitle: 'Statutory Compliance Audit Score',
      reportingManager: shahriyar.name,
      effectiveDate: '2026-01-01',
      status: 'active',
    }).returning();

    const [respFariha2] = await db.insert(responsibilities).values({
      responsibilityCode: 'RESP-010',
      employeeId: fariha.id,
      title: 'Grievance Documentation & Disciplinary Secretariat',
      description: 'Maintain confidential records of employee grievances, record formal inquiry committee minutes, and monitor closure timelines within statutory guidelines.',
      category: 'Compliance',
      frequency: 'Ad Hoc',
      expectedDeliverable: 'Formal Inquiry Committee Minutes & Disciplinary Registry',
      measurementCriteria: 'All grievances investigated and resolved within 14 working days',
      relatedKpiTitle: 'Grievance Resolution Turnaround Time',
      reportingManager: shahriyar.name,
      effectiveDate: '2026-01-01',
      status: 'active',
    }).returning();

    // 4. Sample Demonstrative Tasks (Clearly labeled demonstration tasks)
    // Task 1: Overdue task scenario matching Section 7 prompt requirement
    const [taskOverdue] = await db.insert(tasks).values({
      taskCode: 'TSK-1001',
      title: 'Submit the monthly HR analytics report',
      description: 'Consolidate unit-level employee separation data, monthly turnover rates, and operational analytics for October 2026 executive presentation.',
      assignedEmployeeId: sabbir.id,
      assigningManagerName: shahriyar.name,
      relatedResponsibilityId: respSabbir1.id,
      priority: 'High',
      assignmentDate: '2026-10-15',
      startDate: '2026-10-16',
      originalDeadline: '2026-10-25', // 4 days past October 29
      status: 'Overdue',
      progressPercent: 65,
      delayReason: 'Awaiting validated employee separation data from Chittagong and Gazipur manufacturing units.',
      delayCategory: 'Dependency on another department',
      managerComments: 'Pending review. Requested Sabbir to escalate directly to factory administrative managers for expedited data dispatch.',
      approvalStatus: 'Pending Review',
      createdBy: shahriyar.name,
      lastUpdatedBy: sabbir.name,
    }).returning();

    // Task 2: Quazi Nuzhat Rahman - Completed task with approval
    const [taskCompleted] = await db.insert(tasks).values({
      taskCode: 'TSK-1002',
      title: 'Complete candidate shortlist for Senior Merchandiser vacancy',
      description: 'Screen incoming profiles for the Senior Merchandiser position in Apparel Division, conduct technical telephone screens, and prepare interview dossier.',
      assignedEmployeeId: nuzhat.id,
      assigningManagerName: shahriyar.name,
      relatedResponsibilityId: respNuzhat1.id,
      priority: 'High',
      assignmentDate: '2026-10-10',
      startDate: '2026-10-11',
      originalDeadline: '2026-10-22',
      completionDate: '2026-10-21',
      status: 'Completed',
      progressPercent: 100,
      employeeCompletionNotes: 'Completed screening of 42 candidates. Top 5 shortlisted candidates submitted with evaluation matrices to hiring manager.',
      managerComments: 'Shortlist approved. Excellent turnaround and candidate match quality.',
      approvalStatus: 'Approved',
      createdBy: shahriyar.name,
      lastUpdatedBy: shahriyar.name,
    }).returning();

    // Task 3: Maisha Islam - Submitted for Review
    const [taskReview] = await db.insert(tasks).values({
      taskCode: 'TSK-1003',
      title: 'Conduct Q4 Supervisory Leadership Workshop needs assessment',
      description: 'Survey 35 front-line supervisors across Renaissance spinning and knitting plants to identify operational management training topics.',
      assignedEmployeeId: maisha.id,
      assigningManagerName: shahriyar.name,
      relatedResponsibilityId: respMaisha1.id,
      priority: 'Medium',
      assignmentDate: '2026-10-14',
      startDate: '2026-10-15',
      originalDeadline: '2026-10-30',
      status: 'Submitted for Review',
      progressPercent: 100,
      employeeCompletionNotes: 'Survey received 33/35 responses. Compiled 8-page analysis highlighting conflict management and productivity tracking as key topics.',
      approvalStatus: 'Pending Review',
      createdBy: shahriyar.name,
      lastUpdatedBy: maisha.name,
    }).returning();

    // Task 4: Fariha Nasmi - In Progress (upcoming deadline)
    const [taskInProgress] = await db.insert(tasks).values({
      taskCode: 'TSK-1004',
      title: 'Quarterly compliance audit checklist for Gazipur Dyeing Unit',
      description: 'Inspect fire safety registers, female worker rest room provisions, and overtime payment records in accordance with Bangladesh Labour Rules.',
      assignedEmployeeId: fariha.id,
      assigningManagerName: shahriyar.name,
      relatedResponsibilityId: respFariha1.id,
      priority: 'Critical',
      assignmentDate: '2026-10-20',
      startDate: '2026-10-22',
      originalDeadline: '2026-11-05',
      status: 'In Progress',
      progressPercent: 45,
      createdBy: shahriyar.name,
      lastUpdatedBy: fariha.name,
    }).returning();

    // Task 5: Shahriyar Naiem - In Progress (assigned by Head of HR)
    const [taskManager] = await db.insert(tasks).values({
      taskCode: 'TSK-1005',
      title: 'Annual HR & OD Strategic Budget Proposal 2027',
      description: 'Consolidate training budgets, HR software licensing, recruitment agency reserves, and staff welfare allocations for Group Finance submission.',
      assignedEmployeeId: shahriyar.id,
      assigningManagerName: headOfHr.name,
      relatedResponsibilityId: respShahriyar1.id,
      priority: 'Critical',
      assignmentDate: '2026-10-18',
      startDate: '2026-10-19',
      originalDeadline: '2026-11-10',
      status: 'In Progress',
      progressPercent: 50,
      createdBy: headOfHr.name,
      lastUpdatedBy: shahriyar.name,
    }).returning();

    // Task 6: Quazi Nuzhat Rahman - Revision Required
    const [taskRevision] = await db.insert(tasks).values({
      taskCode: 'TSK-1006',
      title: 'Revise Renaissance Group Employee Handbook 2026 Edition',
      description: 'Update maternity leave clauses, remote communication norms, and code of business ethics in accordance with updated group policy.',
      assignedEmployeeId: nuzhat.id,
      assigningManagerName: shahriyar.name,
      relatedResponsibilityId: respNuzhat2.id,
      priority: 'Medium',
      assignmentDate: '2026-10-05',
      startDate: '2026-10-06',
      originalDeadline: '2026-10-28',
      status: 'Revision Required',
      progressPercent: 70,
      employeeCompletionNotes: 'First draft submitted with revised clauses.',
      managerComments: 'Please align the intellectual property disclosure clause with legal department guidelines before final approval.',
      approvalStatus: 'Revision Requested',
      createdBy: shahriyar.name,
      lastUpdatedBy: shahriyar.name,
    }).returning();

    // 5. Audit logs for tasks
    await db.insert(taskAuditLogs).values([
      {
        taskId: taskOverdue.id,
        actionType: 'create',
        actionSummary: 'Task assigned to Sabbir Hossain by Shahriyar Naiem with deadline 25 Oct 2026.',
        performedBy: shahriyar.name,
      },
      {
        taskId: taskOverdue.id,
        actionType: 'delay_reported',
        actionSummary: 'Delay reported: Awaiting validated employee separation data from Chittagong and Gazipur manufacturing units.',
        previousValue: 'Status: In Progress',
        newValue: 'Status: Overdue',
        performedBy: sabbir.name,
      },
      {
        taskId: taskCompleted.id,
        actionType: 'submission',
        actionSummary: 'Employee submitted completed task notes and candidate shortlist dossier.',
        performedBy: nuzhat.name,
      },
      {
        taskId: taskCompleted.id,
        actionType: 'approval_decision',
        actionSummary: 'Manager Shahriyar Naiem approved task completion.',
        previousValue: 'approvalStatus: Pending Review',
        newValue: 'approvalStatus: Approved',
        performedBy: shahriyar.name,
      },
    ]);

    // 6. Monthly KPIs for October 2026
    await db.insert(kpis).values([
      // Shahriyar Naiem KPIs
      {
        kpiCode: 'KPI-101',
        employeeId: shahriyar.id,
        title: 'Departmental Monthly Appraisal Review SLA Adherence',
        description: 'Percentage of departmental staff appraisals reviewed and calibrated within 3 working days of monthly close.',
        category: 'Performance Management',
        measurementMethod: 'percentage',
        targetValue: 100,
        actualValue: 95,
        unit: '%',
        weight: 1.5,
        reportingPeriod: 'October 2026',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        dataSource: 'HR Appraisal Management Portal',
        evidenceNotes: 'Reviewed 4 out of 5 subordinates dossiers on time.',
        submissionStatus: 'Submitted',
        managerReviewStatus: 'Recommended',
        approvedAchievementPercentage: 95.0,
      },
      {
        kpiCode: 'KPI-102',
        employeeId: shahriyar.id,
        title: 'OD Initiative Milestone Execution',
        description: 'Execution milestones for group organizational structure realignment and job description cataloging.',
        category: 'Training & OD',
        measurementMethod: 'milestone',
        targetValue: 4,
        actualValue: 4,
        unit: 'Milestones',
        weight: 1.0,
        reportingPeriod: 'October 2026',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        dataSource: 'Project Charter & Signed Deliverables',
        evidenceNotes: 'All 4 milestones achieved and signed off by Head of HR.',
        submissionStatus: 'Approved',
        managerReviewStatus: 'Approved',
        approvedAchievementPercentage: 100.0,
      },

      // Quazi Nuzhat Rahman KPIs
      {
        kpiCode: 'KPI-201',
        employeeId: nuzhat.id,
        title: 'Average Time-to-Fill for Executive Positions',
        description: 'Target average recruitment turnaround from requisition approval to job offer acceptance (Lower is better).',
        category: 'Talent Acquisition',
        measurementMethod: 'lower_is_better',
        targetValue: 30, // 30 days
        actualValue: 26, // 26 days achieved (better than target)
        unit: 'Days',
        weight: 1.5,
        reportingPeriod: 'October 2026',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        dataSource: 'Applicant Tracking System (ATS)',
        evidenceNotes: 'Average across 4 closed positions was 26.2 calendar days.',
        submissionStatus: 'Approved',
        managerReviewStatus: 'Approved',
        approvedAchievementPercentage: 113.3, // capped or calculated appropriately
      },
      {
        kpiCode: 'KPI-202',
        employeeId: nuzhat.id,
        title: 'New Hire 90-Day Retention Rate',
        description: 'Retention percentage of new employees completing first 90 days successfully.',
        category: 'Talent Acquisition',
        measurementMethod: 'percentage',
        targetValue: 90,
        actualValue: 94,
        unit: '%',
        weight: 1.0,
        reportingPeriod: 'October 2026',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        dataSource: 'HRIS Employee Master Data',
        submissionStatus: 'Approved',
        managerReviewStatus: 'Approved',
        approvedAchievementPercentage: 104.4,
      },

      // Sabbir Hossain KPIs
      {
        kpiCode: 'KPI-301',
        employeeId: sabbir.id,
        title: 'Timely Submission of Monthly HR MIS Report',
        description: 'On-time delivery of comprehensive HR analytics and headcount MIS by scheduled deadline.',
        category: 'HR Operations & Analytics',
        measurementMethod: 'percentage',
        targetValue: 100,
        actualValue: 65, // Pending completion due to separation data delay
        unit: '%',
        weight: 1.5,
        reportingPeriod: 'October 2026',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        dataSource: 'HR Analytics Repository',
        evidenceNotes: 'Report compilation delayed due to factory separation reconciliations; 65% draft submitted.',
        submissionStatus: 'Submitted',
        managerReviewStatus: 'Pending',
        approvedAchievementPercentage: null, // Pending evaluation
      },
      {
        kpiCode: 'KPI-302',
        employeeId: sabbir.id,
        title: 'Separation Settlement SLA Compliance',
        description: 'Full and final settlement dossiers processed within corporate 15-day SLA standard.',
        category: 'HR Operations & Analytics',
        measurementMethod: 'percentage',
        targetValue: 95,
        actualValue: 91,
        unit: '%',
        weight: 1.0,
        reportingPeriod: 'October 2026',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        dataSource: 'Settlement Register & Accounts Acknowledgments',
        submissionStatus: 'Submitted',
        managerReviewStatus: 'Recommended',
        approvedAchievementPercentage: 95.8,
      },

      // Maisha Islam KPIs
      {
        kpiCode: 'KPI-401',
        employeeId: maisha.id,
        title: 'Average Training Hours per Employee',
        description: 'Cumulative corporate and factory staff capability training hours delivered.',
        category: 'Training & OD',
        measurementMethod: 'higher_is_better',
        targetValue: 8.0,
        actualValue: 8.5,
        unit: 'Hours',
        weight: 1.5,
        reportingPeriod: 'October 2026',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        dataSource: 'Training Attendance Logs & LMS Records',
        evidenceNotes: 'Organized 6 workshops; total average reached 8.5 hours.',
        submissionStatus: 'Submitted',
        managerReviewStatus: 'Recommended',
        approvedAchievementPercentage: 106.2,
      },
      {
        kpiCode: 'KPI-402',
        employeeId: maisha.id,
        title: 'Quarterly Employee Engagement Index',
        description: 'Employee sentiment and satisfaction score from pulse surveys.',
        category: 'Employee Relations',
        measurementMethod: 'percentage',
        targetValue: 80,
        actualValue: 82,
        unit: '%',
        weight: 1.0,
        reportingPeriod: 'October 2026',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        dataSource: 'Confidential Survey Platform',
        submissionStatus: 'Approved',
        managerReviewStatus: 'Approved',
        approvedAchievementPercentage: 102.5,
      },

      // Fariha Nasmi KPIs
      {
        kpiCode: 'KPI-501',
        employeeId: fariha.id,
        title: 'Statutory Labour Compliance Audit Score',
        description: 'Audit adherence percentage against Bangladesh Labour Act standards across inspections.',
        category: 'Compliance',
        measurementMethod: 'percentage',
        targetValue: 98,
        actualValue: 99,
        unit: '%',
        weight: 1.5,
        reportingPeriod: 'October 2026',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        dataSource: 'External and Internal Inspection Reports',
        evidenceNotes: 'Audit completed across all manufacturing floors with zero critical non-conformances.',
        submissionStatus: 'Approved',
        managerReviewStatus: 'Approved',
        approvedAchievementPercentage: 101.0,
      },
      {
        kpiCode: 'KPI-502',
        employeeId: fariha.id,
        title: 'Grievance Resolution Turnaround Time',
        description: 'Average days taken from grievance submission to formal inquiry closure (Lower is better).',
        category: 'Compliance',
        measurementMethod: 'lower_is_better',
        targetValue: 14,
        actualValue: 10,
        unit: 'Days',
        weight: 1.0,
        reportingPeriod: 'October 2026',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        dataSource: 'Grievance Registry & Hearing Dossiers',
        submissionStatus: 'Approved',
        managerReviewStatus: 'Approved',
        approvedAchievementPercentage: 120.0,
      },
    ]);

    // 7. Initial Notifications
    await db.insert(notifications).values([
      {
        recipientEmployeeId: sabbir.id,
        recipientEmail: sabbir.email,
        title: 'OVERDUE TASK ALERT: Submit the monthly HR analytics report',
        message: 'The task "Submit the monthly HR analytics report" was due on 25 October 2026 and is currently 4 days overdue. Please update status and delay justifications.',
        type: 'overdue_alert',
        linkId: taskOverdue.id,
        isRead: false,
      },
      {
        recipientEmployeeId: shahriyar.id,
        recipientEmail: shahriyar.email,
        title: 'Task Submission for Review: Leadership Workshop Assessment',
        message: 'Maisha Islam has submitted task TSK-1003 for your managerial review.',
        type: 'revision_requested',
        linkId: taskReview.id,
        isRead: false,
      },
      {
        recipientEmployeeId: headOfHr.id,
        recipientEmail: headOfHr.email,
        title: 'Overdue Departmental Task Escalation',
        message: 'Task TSK-1001 assigned to Sabbir Hossain has exceeded deadline by 4 days.',
        type: 'overdue_alert',
        linkId: taskOverdue.id,
        isRead: false,
      },
    ]);

    console.log('Database seeded successfully with initial team members, responsibilities, tasks, and KPIs.');
  } catch {
    // Database seeding check finished gracefully
  }
}
