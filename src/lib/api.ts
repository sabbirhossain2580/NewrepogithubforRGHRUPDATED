// src/lib/api.ts
import {
  Employee,
  Responsibility,
  Task,
  KPI,
  DashboardStats,
  NotificationItem,
  AppSetting,
  PerformanceRankItem,
  User,
  RecruitmentRequisition,
  RecruitmentStats,
  RecruitmentAuditLog,
  RecruitmentRating,
} from '../types/index.ts';


// Purge any stale client mock cache from previous sessions immediately
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('rg_recruitment_cache');
    localStorage.removeItem('rg_recruitment_local_cache');
    localStorage.removeItem('rg_tasks_cache');
    localStorage.removeItem('rg_employees_cache');
  } catch {}
}

// Get current verified auth headers with anti-cache directives
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  const sessionToken = typeof window !== 'undefined'
    ? sessionStorage.getItem('hr_session_token') || sessionStorage.getItem('hr_firebase_id_token')
    : null;

  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }

  const activeEmpCode = typeof window !== 'undefined'
    ? sessionStorage.getItem('hr_active_emp_code')
    : null;

  if (activeEmpCode) {
    headers['X-Employee-Code'] = activeEmpCode;
  }

  return headers;
}

// Robust JSON response parser to prevent unexpected token exceptions on server errors
async function parseJsonResponse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      return { error: res.statusText || 'Failed to parse JSON response from server' };
    }
  }
  const text = await res.text().catch(() => '');
  return { error: text || res.statusText || `Server error (${res.status})` };
}

export const DEFAULT_HR_EMPLOYEES: Employee[] = [
  {
    id: 1,
    employeeCode: '01-02-0440',
    name: 'Syeda Shaila Ashraf',
    email: 'syeda.shaila@renaissance.com.bd',
    designation: 'Head of HR',
    department: 'Human Resources & OD',
    isHeadOfHr: true,
    status: 'active',
    avatarInitials: 'SA',
    joinDate: '01-Jul-15',
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    taskCompletionRate: 0,
  },
  {
    id: 2,
    employeeCode: '22-02-1826',
    name: 'Shahriyar Naiem',
    email: 'shahriyar.naiem@renaissance.com.bd',
    designation: 'Manager, HR & OD',
    department: 'Human Resources & OD',
    isHeadOfHr: false,
    status: 'active',
    avatarInitials: 'SN',
    joinDate: '01-Jan-22',
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    taskCompletionRate: 0,
  },
  {
    id: 3,
    employeeCode: '22-02-1330',
    name: 'Quazi Nuzhat Rahman',
    email: 'quazi.nuzhat@renaissance.com.bd',
    designation: 'Senior Executive, HR',
    department: 'Human Resources & OD',
    isHeadOfHr: false,
    status: 'active',
    avatarInitials: 'QN',
    joinDate: '15-Mar-22',
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    taskCompletionRate: 0,
  },
  {
    id: 4,
    employeeCode: '22-02-1642',
    name: 'Sabbir Hossain',
    email: 'sabbir.hossain@renaissance.com.bd',
    designation: 'Executive, HR',
    department: 'Human Resources & OD',
    isHeadOfHr: false,
    status: 'active',
    avatarInitials: 'SH',
    joinDate: '01-Jun-22',
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    taskCompletionRate: 0,
  },
  {
    id: 5,
    employeeCode: '02-02-2059',
    name: 'Fariha Nasmi',
    email: 'fariha.nasmi@renaissance.com.bd',
    designation: 'Assistant Executive, HR',
    department: 'Human Resources & OD',
    isHeadOfHr: false,
    status: 'active',
    avatarInitials: 'FN',
    joinDate: '10-Sep-22',
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    taskCompletionRate: 0,
  },
  {
    id: 6,
    employeeCode: '22-02-1551',
    name: 'Maisha Islam',
    email: 'maisha.islam@renaissance.com.bd',
    designation: 'Assistant Executive, HR',
    department: 'Human Resources & OD',
    isHeadOfHr: false,
    status: 'active',
    avatarInitials: 'MI',
    joinDate: '15-Nov-22',
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    taskCompletionRate: 0,
  },
];

export const api = {
  // Current user
  async getMe(): Promise<{ user: User; employee: Employee | null }> {
    const res = await fetch('/api/me', { headers: getHeaders() });
    const data = await parseJsonResponse(res);
    if (!res.ok || data.error) throw new Error(data.error || 'Failed to get user profile');
    return data;
  },

  // Employees
  async getEmployees(): Promise<Employee[]> {
    const res = await fetch('/api/employees', { headers: getHeaders() });
    const result = await parseJsonResponse(res);
    if (!res.ok || result?.error) {
      throw new Error(result?.error || 'Failed to fetch employees');
    }
    return Array.isArray(result) ? result : [];
  },

  async createEmployee(data: Partial<Employee>): Promise<Employee> {
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result?.error) {
      throw new Error(result?.error || 'Failed to create employee');
    }
    return result;
  },

  async updateEmployee(id: number, data: Partial<Employee>): Promise<Employee> {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result?.error) {
      throw new Error(result?.error || 'Failed to update employee');
    }
    return result;
  },

  async deleteEmployee(id: number): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result?.error) {
      throw new Error(result?.error || 'Failed to delete employee');
    }
    return result;
  },

  // Responsibilities
  async getResponsibilities(): Promise<Responsibility[]> {
    try {
      const res = await fetch('/api/responsibilities', { headers: getHeaders() });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {}
    return [];
  },

  async createResponsibility(data: Partial<Responsibility>): Promise<Responsibility> {
    const res = await fetch('/api/responsibilities', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to create responsibility');
    }
    return result;
  },

  async updateResponsibility(id: number, data: Partial<Responsibility>): Promise<Responsibility> {
    const res = await fetch(`/api/responsibilities/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to update responsibility');
    }
    return result;
  },

  // Tasks
  async getTasks(): Promise<Task[]> {
    try {
      const res = await fetch('/api/tasks', { headers: getHeaders() });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {}
    return [];
  },

  async createTask(data: any): Promise<Task> {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to create task');
    }
    return result;
  },

  async updateTask(id: number, data: any): Promise<Task> {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to update task');
    }
    return result;
  },

  async deleteTask(id: number): Promise<void> {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to delete task');
    }
  },

  async submitTask(id: number, data: { completionNotes: string; attachments?: string }): Promise<Task> {
    const res = await fetch(`/api/tasks/${id}/submit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to submit task');
    }
    return result;
  },

  async reviewTask(id: number, data: { decision: 'approve' | 'reject' | 'revision'; managerComments: string }): Promise<Task> {
    const res = await fetch(`/api/tasks/${id}/review`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to review task');
    }
    return result;
  },

  async pokeTask(id: number): Promise<Task> {
    const res = await fetch(`/api/tasks/${id}/poke`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to poke task');
    }
    return result;
  },

  async unpokeTask(id: number): Promise<Task> {
    const res = await fetch(`/api/tasks/${id}/unpoke`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to clear poke');
    }
    return result;
  },

  async requestExtension(id: number, data: { requestedDeadline: string; reasonCategory: string; detailedReason: string }): Promise<any> {
    const res = await fetch(`/api/tasks/${id}/request-extension`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to request extension');
    }
    return result;
  },

  async decideExtension(id: number, data: { requestId?: number; decision: 'approve' | 'reject'; reviewerComments?: string; approvedDeadline?: string }): Promise<any> {
    const res = await fetch(`/api/tasks/${id}/decide-extension`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to decide on extension');
    }
    return result;
  },

  async getTaskHistory(id: number): Promise<{ logs: any[]; extensions: any[] }> {
    const res = await fetch(`/api/tasks/${id}/history`, { headers: getHeaders() });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) throw new Error(result.error || 'Failed to get task history');
    return result;
  },

  // KPIs
  async getKpis(): Promise<KPI[]> {
    try {
      const res = await fetch('/api/kpis', { headers: getHeaders() });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {}
    return [];
  },

  async createKpi(data: any): Promise<KPI> {
    const res = await fetch('/api/kpis', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to create KPI');
    }
    return result;
  },

  async submitKpi(id: number, data: { actualValue: number; evidenceNotes?: string }): Promise<KPI> {
    const res = await fetch(`/api/kpis/${id}/submit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to submit KPI actuals');
    }
    return result;
  },

  async reviewKpi(id: number, data: { status: 'Recommended' | 'Revision Requested'; comments?: string }): Promise<KPI> {
    const res = await fetch(`/api/kpis/${id}/review`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to review KPI');
    }
    return result;
  },

  async approveKpi(id: number, data: { approvedPercentage: number; reviewStatus?: string }): Promise<KPI> {
    const res = await fetch(`/api/kpis/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to approve KPI');
    }
    return result;
  },

  async deleteKpi(id: number): Promise<any> {
    const res = await fetch(`/api/kpis/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to delete KPI');
    }
    return result;
  },

  // Rankings
  async getRankings(): Promise<{ methodology: any; rankings: PerformanceRankItem[] }> {
    try {
      const res = await fetch('/api/performance/ranking', { headers: getHeaders() });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {}
    return { methodology: {}, rankings: [] };
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const res = await fetch('/api/dashboard/stats', { headers: getHeaders() });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {}
    return {
      cards: {
        totalEmployees: 6,
        totalAssignedTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        awaitingApproval: 0,
        avgKpiAchievement: 0,
        onTimeCompletionRate: 100,
        employeesRequiringAttention: 0,
      },
      charts: {
        employeeTaskChart: [],
        kpiComparison: [],
        taskDistribution: [],
        monthlyTrend: [],
      },
      currentDate: new Date().toISOString().split('T')[0],
      timezone: 'Asia/Dhaka',
    };
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const res = await fetch('/api/notifications', { headers: getHeaders() });
      if (!res.ok) return [];
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {
      return [];
    }
    return [];
  },

  async markNotificationRead(id: number): Promise<void> {
    await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: getHeaders(),
    });
  },

  // Settings
  async getSettings(): Promise<AppSetting[]> {
    const res = await fetch('/api/settings', { headers: getHeaders() });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) throw new Error(result.error || 'Failed to fetch settings');
    return result;
  },

  async updateSettings(settings: Array<{ settingKey: string; settingValue: string }>): Promise<void> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ settings }),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) throw new Error(result.error || 'Failed to update settings');
  },

  // Reset seed
  async resetSeed(): Promise<void> {
    const res = await fetch('/api/admin/reset-seed', {
      method: 'POST',
      headers: getHeaders(),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) throw new Error(result.error || 'Failed to reset demo data');
  },

  // ----------------------------------------------------
  // RG HR - Recruitment Status & Checklist APIs (Real-Time Database Driven)
  // ----------------------------------------------------

  async getRecruitmentRequisitions(): Promise<RecruitmentRequisition[]> {
    // Purge any stale client mock cache immediately
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('rg_recruitment_cache');
      } catch {}
    }

    try {
      const res = await fetch(`/api/recruitment/requisitions?_t=${Date.now()}`, {
        headers: getHeaders(),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (err) {
      console.warn('Network issue fetching requisitions from API:', err);
    }

    return [];
  },

  async getRecruitmentRequisition(id: number): Promise<RecruitmentRequisition> {
    const res = await fetch(`/api/recruitment/requisitions/${id}?_t=${Date.now()}`, {
      headers: getHeaders(),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Requisition not found in database');
    }
    return result;
  },

  async createRecruitmentRequisition(
    data: Partial<RecruitmentRequisition>
  ): Promise<RecruitmentRequisition> {
    const res = await fetch('/api/recruitment/requisitions', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to create requisition in database');
    }
    return result;
  },

  async updateRecruitmentRequisition(
    id: number,
    data: Partial<RecruitmentRequisition>
  ): Promise<RecruitmentRequisition> {
    const res = await fetch(`/api/recruitment/requisitions/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to update requisition in database');
    }
    return result;
  },

  async deleteRecruitmentRequisition(id: number): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`/api/recruitment/requisitions/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to delete requisition from database');
    }
    return result;
  },

  async importRecruitmentExcel(
    records: Partial<RecruitmentRequisition>[],
    mode: 'upsert' | 'append' = 'upsert'
  ): Promise<{ success: boolean; importedCount: number; updatedCount: number; totalProcessed: number }> {
    const res = await fetch('/api/recruitment/import-excel', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ records, mode }),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to import Excel data to database');
    }
    return result;
  },

  async getRecruitmentAnalytics(): Promise<RecruitmentStats> {
    try {
      const res = await fetch(`/api/recruitment/analytics?_t=${Date.now()}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await res.json();
        }
      }
    } catch (err) {
      console.warn('Network issue fetching recruitment analytics from server:', err);
    }

    // Dynamic revalidation fallback computed directly from live requisition data
    try {
      const reqs = await this.getRecruitmentRequisitions();
      return generateLocalAnalytics(reqs);
    } catch {
      return generateLocalAnalytics([]);
    }
  },

  async getRecruitmentAuditLogs(): Promise<RecruitmentAuditLog[]> {
    try {
      const res = await fetch(`/api/recruitment/audit-logs?_t=${Date.now()}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await res.json();
        }
      }
    } catch (err) {
      console.warn('Network issue fetching recruitment audit logs:', err);
    }
    return [];
  },

  async getRecruitmentRatings(): Promise<RecruitmentRating[]> {
    try {
      const res = await fetch(`/api/recruitment/ratings?_t=${Date.now()}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await res.json();
        }
      }
    } catch (err) {
      console.warn('Network issue fetching recruitment ratings:', err);
    }
    return [];
  },

  async submitRecruitmentRating(data: {
    employeeCode: string;
    employeeName: string;
    ratingScore: number;
    ratingPeriod?: string;
    feedback?: string;
  }): Promise<RecruitmentRating> {
    const res = await fetch('/api/recruitment/ratings', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseJsonResponse(res);
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to submit rating');
    }
    return result;
  },
};

export function generateLocalAnalytics(reqs: RecruitmentRequisition[]): RecruitmentStats {
  const total = reqs.length;
  const joined = reqs.filter((r) => r.recruitmentStatus === 'Joined').length;
  const ongoing = reqs.filter((r) => r.recruitmentStatus === 'Ongoing').length;
  const heldUp = reqs.filter((r) => r.recruitmentStatus === 'Held Up').length;
  const didNotJoin = reqs.filter((r) => r.recruitmentStatus === 'Did not Join').length;
  const cancelled = reqs.filter((r) => r.recruitmentStatus === 'Cancelled').length;

  // Accurately compute Time-to-Fill (strictly for Joined candidates with valid time-to-fill)
  let totalTimeToFillSum = 0;
  let joinedWithTimeToFillCount = 0;
  reqs.forEach((r) => {
    if (r.recruitmentStatus === 'Joined' && r.timeToFillDays && r.timeToFillDays > 0) {
      totalTimeToFillSum += r.timeToFillDays;
      joinedWithTimeToFillCount++;
    }
  });

  const averageTimeToFill =
    joinedWithTimeToFillCount > 0
      ? Math.round((totalTimeToFillSum / joinedWithTimeToFillCount) * 10) / 10
      : 0;

  const hrPersonnel = [
    { code: '01-02-0440', name: 'Syeda Shaila Ashraf', designation: 'Head of HR' },
    { code: '22-02-1826', name: 'Shahriyar Naiem', designation: 'Manager, HR & OD' },
    { code: '22-02-1330', name: 'Quazi Nuzhat Rahman', designation: 'Senior Executive, HR' },
    { code: '22-02-1642', name: 'Sabbir Hossain', designation: 'Executive, HR' },
    { code: '02-02-2059', name: 'Fariha Nasmi', designation: 'Assistant Executive, HR' },
    { code: '22-02-1551', name: 'Maisha Islam', designation: 'Assistant Executive, HR' },
  ];

  const employeeContributions = hrPersonnel.map((hp) => {
    const assigned = reqs.filter(
      (r) =>
        r.recruitmentAssistedByCode === hp.code ||
        (r.recruitmentAssistedByName &&
          r.recruitmentAssistedByName.toLowerCase().includes(hp.name.toLowerCase().split(' ')[0]))
    );
    const j = assigned.filter((r) => r.recruitmentStatus === 'Joined').length;
    const o = assigned.filter((r) => r.recruitmentStatus === 'Ongoing').length;
    const h = assigned.filter((r) => r.recruitmentStatus === 'Held Up').length;
    const dnj = assigned.filter((r) => r.recruitmentStatus === 'Did not Join').length;
    const c = assigned.filter((r) => r.recruitmentStatus === 'Cancelled').length;

    const empJoinedWithTTF = assigned.filter(
      (r) => r.recruitmentStatus === 'Joined' && r.timeToFillDays && r.timeToFillDays > 0
    );
    const empAvgTTF =
      empJoinedWithTTF.length > 0
        ? Math.round(
            empJoinedWithTTF.reduce((sum, r) => sum + (r.timeToFillDays || 0), 0) /
              empJoinedWithTTF.length
          )
        : 0;

    return {
      employeeCode: hp.code,
      employeeName: hp.name,
      designation: hp.designation,
      totalAssigned: assigned.length,
      joined: j,
      ongoing: o,
      heldUp: h,
      didNotJoin: dnj,
      cancelled: c,
      avgTimeToFill: empAvgTTF,
      completionRate: assigned.length > 0 ? Math.round((j / assigned.length) * 100) : 0,
      rating: 5.0,
      ratingFeedback: assigned.length > 0 ? 'Active recruitment pipeline management' : 'Assigned to active recruitment requisitions',
      recentRequisitions: assigned.slice(0, 5),
    };
  });

  return {
    cards: {
      totalRequisitions: total,
      totalVacancies: reqs.reduce((sum, r) => sum + (r.vacancy || 1), 0),
      joinedEmployees: joined,
      ongoingRecruitment: ongoing,
      heldUpRecruitment: heldUp,
      cancelledRecruitment: cancelled,
      didNotJoinRecruitment: didNotJoin,
      averageTimeToFill,
      newRecruitment: reqs.filter((r) => r.recruitmentType === 'New Recruitment').length,
      replacementRecruitment: reqs.filter((r) => r.recruitmentType === 'Replacement').length,
    },
    alerts: {
      ongoingOlder30: reqs.filter((r) => r.recruitmentStatus === 'Ongoing' && (r.pendingDays || 0) > 30).length,
      ongoingOlder60: reqs.filter((r) => r.recruitmentStatus === 'Ongoing' && (r.pendingDays || 0) > 60).length,
      ongoingOlder90: reqs.filter((r) => r.recruitmentStatus === 'Ongoing' && (r.pendingDays || 0) > 90).length,
      missingDOJ: reqs.filter((r) => r.recruitmentStatus === 'Joined' && !r.dateOfJoining).length,
      missingOfferLetter: reqs.filter((r) => r.recruitmentStatus === 'Ongoing' && !r.offerLetterDate).length,
      heldUp,
    },
    charts: {
      statusOverview: [
        { name: 'Joined', count: joined, percentage: total > 0 ? Math.round((joined / total) * 100) : 0, color: '#10b981' },
        { name: 'Ongoing', count: ongoing, percentage: total > 0 ? Math.round((ongoing / total) * 100) : 0, color: '#3b82f6' },
        { name: 'Held Up', count: heldUp, percentage: total > 0 ? Math.round((heldUp / total) * 100) : 0, color: '#f59e0b' },
      ],
      monthlyTrends: [],
      departmentBreakdown: [],
      companyBreakdown: [],
      recruitmentTypeAnalysis: [
        { type: 'New Recruitment', count: reqs.filter((r) => r.recruitmentType === 'New Recruitment').length, percentage: total > 0 ? Math.round((reqs.filter((r) => r.recruitmentType === 'New Recruitment').length / total) * 100) : 0, color: '#6366f1' },
        { type: 'Replacement', count: reqs.filter((r) => r.recruitmentType === 'Replacement').length, percentage: total > 0 ? Math.round((reqs.filter((r) => r.recruitmentType === 'Replacement').length / total) * 100) : 0, color: '#06b6d4' },
      ],
      employeeContributions,
      monthlyTimeToFill: [],
    },
    lastSyncTimestamp: new Date().toISOString(),
  };
}

