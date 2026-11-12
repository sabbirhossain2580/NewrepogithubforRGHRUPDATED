// src/lib/googleSheets.ts
import { getCachedAccessToken } from './firebase.ts';
import { Task, KPI, Employee, Responsibility, PerformanceRankItem } from '../types/index.ts';

export interface CreateSheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export const googleSheetsApi = {
  /**
   * Creates a new Google Spreadsheet with structured tabs, headers, and rows.
   */
  async createSpreadsheet(
    title: string,
    sheetsData: Array<{
      title: string;
      headers: string[];
      rows: (string | number | null | undefined)[][];
    }>
  ): Promise<CreateSheetResult> {
    const accessToken = getCachedAccessToken();
    if (!accessToken) {
      throw new Error('Google Sheets permission required. Please sign in with your Google account first.');
    }

    // 1. Create the spreadsheet with specified sheet titles
    const createPayload = {
      properties: {
        title,
      },
      sheets: sheetsData.map((s) => ({
        properties: {
          title: s.title,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      })),
    };

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createPayload),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.error?.message || 'Failed to create Google Spreadsheet');
    }

    const createdSheet = await createRes.json();
    const spreadsheetId = createdSheet.spreadsheetId;
    const spreadsheetUrl = createdSheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // 2. Populate values into each sheet tab using batchUpdate values
    const dataUpdates = sheetsData.map((s) => ({
      range: `'${s.title}'!A1`,
      values: [s.headers, ...s.rows.map((row) => row.map((val) => (val === null || val === undefined ? '' : String(val))))],
    }));

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: dataUpdates,
        }),
      }
    );

    if (!updateRes.ok) {
      console.warn('Batch update values warning:', await updateRes.text());
    }

    return {
      spreadsheetId,
      spreadsheetUrl,
    };
  },

  /**
   * Export comprehensive HR Master Dashboard to Google Sheets
   */
  async exportComprehensiveMasterSheet(data: {
    tasks: Task[];
    employees: Employee[];
    kpis: KPI[];
    responsibilities: Responsibility[];
    rankings: PerformanceRankItem[];
  }): Promise<CreateSheetResult> {
    const title = `Renaissance Group — HR & OD Master Performance Sheet (${new Date().toLocaleDateString('en-GB')})`;

    const sheets = [
      // Tab 1: Task Register
      {
        title: 'Task Register',
        headers: [
          'Task Code',
          'Task Title',
          'Assignee',
          'Designation',
          'Priority',
          'Start Date',
          'Original Deadline',
          'Revised Deadline',
          'Days Overdue',
          'Status',
          'Progress %',
          'Delay Category',
          'Delay Justification',
          'Manager Review Comments',
          'Approval Status',
        ],
        rows: data.tasks.map((t) => [
          t.taskCode,
          t.title,
          t.employeeName,
          t.employeeDesignation,
          t.priority,
          t.startDate,
          t.originalDeadline,
          t.revisedDeadline || 'None',
          t.daysOverdue,
          t.calculatedStatus,
          `${t.progressPercent}%`,
          t.delayCategory || 'None',
          t.delayReason || 'None',
          t.managerComments || 'Pending',
          t.approvalStatus,
        ]),
      },

      // Tab 2: Overdue Tasks Focus
      {
        title: 'Critical Overdue Tasks',
        headers: [
          'Task Code',
          'Title',
          'Employee Name',
          'Designation',
          'Original Deadline',
          'Days Overdue',
          'Delay Reason Category',
          'Employee Written Justification',
          'Manager Comments',
        ],
        rows: data.tasks
          .filter((t) => t.isOverdue)
          .map((t) => [
            t.taskCode,
            t.title,
            t.employeeName,
            t.employeeDesignation,
            t.originalDeadline,
            `${t.daysOverdue} days`,
            t.delayCategory || 'Uncategorized',
            t.delayReason || 'Pending written explanation',
            t.managerComments || 'Pending review',
          ]),
      },

      // Tab 3: Monthly KPIs
      {
        title: 'KPI Performance Scorecard',
        headers: [
          'KPI Code',
          'Employee',
          'Designation',
          'KPI Title',
          'Measurement Method',
          'Target',
          'Actual Achieved',
          'Calculated %',
          'Weight',
          'Approved Achievement %',
          'Submission Status',
          'Manager Review Status',
          'Data Source',
          'Evidence Notes',
        ],
        rows: data.kpis.map((k) => [
          k.kpiCode,
          k.employeeName,
          k.employeeDesignation,
          k.title,
          k.measurementMethod,
          `${k.targetValue} ${k.unit}`,
          k.actualValue !== null && k.actualValue !== undefined ? `${k.actualValue} ${k.unit}` : 'Not Submitted',
          k.calculatedAchievement !== null && k.calculatedAchievement !== undefined ? `${k.calculatedAchievement}%` : 'Pending',
          `${k.weight}x`,
          k.approvedAchievementPercentage !== null ? `${k.approvedAchievementPercentage}%` : 'Pending Approval',
          k.submissionStatus,
          k.managerReviewStatus,
          k.dataSource || 'HRIS',
          k.evidenceNotes || 'None',
        ]),
      },

      // Tab 4: Monthly Performance Rankings
      {
        title: 'Monthly Rankings',
        headers: [
          'Rank',
          'Employee Name',
          'Designation',
          'Tasks Assigned',
          'Tasks Completed',
          'On-Time Delivery %',
          'Overdue Tasks',
          'Approved KPI Score %',
          'Task Execution Score',
          'Overall Performance Score',
          'Evaluation Status',
        ],
        rows: data.rankings.map((r) => [
          String(r.rank),
          r.name,
          r.designation,
          r.assignedTaskCount,
          r.completedTaskCount,
          `${r.onTimeCompletionRate}%`,
          r.overdueTaskCount,
          r.approvedKpiScore ? `${r.approvedKpiScore}%` : 'Pending',
          `${r.taskExecutionScore}/100`,
          r.overallScore || 'Pending',
          r.statusLabel,
        ]),
      },

      // Tab 5: Ongoing Job Responsibilities
      {
        title: 'Responsibility Register',
        headers: [
          'Resp Code',
          'Employee Name',
          'Designation',
          'Duty Title',
          'Category',
          'Frequency',
          'Expected Deliverable',
          'Measurement Criteria (SLA)',
          'Linked KPI',
          'Reporting Manager',
          'Status',
        ],
        rows: data.responsibilities.map((r) => [
          r.responsibilityCode,
          r.employeeName,
          r.employeeDesignation,
          r.title,
          r.category,
          r.frequency,
          r.expectedDeliverable,
          r.measurementCriteria,
          r.relatedKpiTitle || 'N/A',
          r.reportingManager || 'N/A',
          r.status,
        ]),
      },
    ];

    return this.createSpreadsheet(title, sheets);
  },
};
