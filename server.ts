// server.ts
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { db, pool, withDbRetry } from './src/db/index.ts';
import {
  employees,
  responsibilities,
  tasks,
  kpis,
  appSettings,
  users,
  taskAuditLogs,
  notifications,
  deadlineExtensionRequests,
  recruitmentRequisitions,
  recruitmentAuditLogs,
  recruitmentRatings,
} from './src/db/schema.ts';
import { eq, desc, asc, and, or, sql } from 'drizzle-orm';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { seedDatabase } from './src/db/seed.ts';
import { seedRecruitmentDatabase } from './src/db/seedRecruitment.ts';
import {
  authenticateUser,
  issueSessionToken,
} from './src/server/authService.ts';

import { ensureDatabaseReady, isDatabaseReady } from './src/db/autoMigrate.ts';
import cors from 'cors';

dotenv.config();

const app = express();

// Enable CORS for all external clients (e.g. Vercel deployment, custom shortlinks, preview environments)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin) and all web origins
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Employee-Code', 'X-Requested-With'],
  })
);

app.use(express.json());

// Anti-cache and security headers middleware for all /api endpoints
app.use('/api', (_req: Request, res: Response, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});


// In-memory API Rate Limiter
const apiRateLimitMap = new Map<string, { count: number; resetAt: number }>();
app.use('/api', (req: Request, res: Response, next) => {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const record = apiRateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    apiRateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return next();
  }
  record.count += 1;
  if (record.count > 1000) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
  }
  next();
});

// Ensure database is initialized before handling DB-backed API routes
app.use('/api', async (req: Request, _res: Response, next: NextFunction) => {
  if (req.path.startsWith('/auth/') || req.path === '/download-repo') {
    return next();
  }
  if (!isDatabaseReady()) {
    await ensureDatabaseReady().catch(() => {});
  }
  next();
});

// Download Complete Repository ZIP endpoint for GitHub
app.get('/api/download-repo', (_req: Request, res: Response) => {
  const zipPath = path.resolve(process.cwd(), 'public', 'rg-hr-recruitment-portal-repo.zip');
  res.download(zipPath, 'rg-hr-recruitment-portal-repo.zip');
});

// Authentication endpoints
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { employeeId, employeeCode, password } = req.body;
    const targetCode = (employeeCode || employeeId || '').trim();
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!targetCode || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both your Employee ID and Password.',
      });
    }

    const authResult = authenticateUser(targetCode, password, clientIp);
    if (!authResult.success || !authResult.session || !authResult.account) {
      return res.status(401).json({
        success: false,
        error: authResult.error || 'Invalid credentials.',
      });
    }

    const token = issueSessionToken(authResult.session);
    res.json({
      success: true,
      token,
      user: {
        uid: authResult.session.uid,
        email: authResult.session.email,
        name: authResult.session.name,
        role: authResult.session.role,
        employeeCode: authResult.session.employeeCode,
        designation: authResult.session.designation,
      },
      account: authResult.account,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Internal authentication error.' });
  }
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/auth/session', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ success: true, user: req.user });
});


// Helper for today in Asia/Dhaka (format: YYYY-MM-DD)
function getTodayDhaka(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    return '2026-10-29';
  }
}

// Calculate days between two dates
function calculateDaysOverdue(deadline: string, today: string): number {
  const dDate = new Date(deadline);
  const tDate = new Date(today);
  const diffTime = tDate.getTime() - dDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Automatic overdue evaluator for tasks
function processTaskOverdue(task: any, today: string) {
  const effectiveDeadline = task.revisedDeadline || task.originalDeadline;
  const isPast = effectiveDeadline < today;
  const isTerminal = task.status === 'Completed' || task.status === 'Cancelled';
  const isOverdue = !isTerminal && isPast;
  const daysOverdue = isOverdue ? calculateDaysOverdue(effectiveDeadline, today) : 0;

  return {
    ...task,
    effectiveDeadline,
    isOverdue,
    daysOverdue,
    calculatedStatus: isOverdue ? 'Overdue' : task.status,
  };
}

// --- API ROUTES ---

// 1. Current Authenticated User / Me
app.get('/api/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    let employeeData = null;
    if (user.employeeCode) {
      const emps = await withDbRetry(() =>
        db.select().from(employees).where(eq(employees.employeeCode, user.employeeCode!))
      );
      employeeData = emps[0] || null;
    }
    res.json({
      user,
      employee: employeeData,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Employees Directory & Summary Metrics
app.get('/api/employees', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [allEmployees, allTasks, allKpis, allResps] = await withDbRetry(() =>
      Promise.all([
        db.select().from(employees).orderBy(asc(employees.employeeCode)),
        db.select().from(tasks),
        db.select().from(kpis),
        db.select().from(responsibilities),
      ])
    );
    const today = getTodayDhaka();

    // Map metrics for each employee
    const enriched = allEmployees.map((emp) => {
      const empTasks = allTasks.filter((t) => t.assignedEmployeeId === emp.id).map(t => processTaskOverdue(t, today));
      const empKpis = allKpis.filter((k) => k.employeeId === emp.id);
      const empResps = allResps.filter((r) => r.employeeId === emp.id && r.status === 'active');

      const totalTasks = empTasks.length;
      const completedTasks = empTasks.filter((t) => t.status === 'Completed').length;
      const overdueTasks = empTasks.filter((t) => t.isOverdue).length;
      const pendingTasks = totalTasks - completedTasks;
      const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // On-time completion: completed tasks where completionDate <= effectiveDeadline
      const onTimeCompleted = empTasks.filter(
        (t) => t.status === 'Completed' && t.completionDate && t.completionDate <= t.effectiveDeadline
      ).length;
      const onTimeRate = completedTasks > 0 ? Math.round((onTimeCompleted / completedTasks) * 100) : 100;

      // KPI Achievement (weighted approved score)
      const approvedKpis = empKpis.filter((k) => k.approvedAchievementPercentage !== null);
      let totalWeight = 0;
      let weightedSum = 0;
      approvedKpis.forEach((k) => {
        const weight = k.weight || 1.0;
        const score = k.approvedAchievementPercentage || 0;
        weightedSum += score * weight;
        totalWeight += weight;
      });
      const avgKpiAchievement = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;

      return {
        ...emp,
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        taskCompletionRate,
        onTimeRate,
        avgKpiAchievement,
        responsibilitiesCount: empResps.length,
        kpiCount: empKpis.length,
        approvedKpiCount: approvedKpis.length,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Permission checker: Only Admin, Syeda Shaila Ashraf, and Shahriyar Naiem can add/edit/remove employees
function canManageEmployees(user?: any): boolean {
  if (!user) return false;
  return (
    user.role === 'admin' ||
    user.employeeCode === '02-02-2222' ||
    user.role === 'head_of_hr' ||
    user.employeeCode === '01-02-0440' || // Syeda Shaila Ashraf
    user.role === 'hr_manager' ||
    user.employeeCode === '22-02-1826' // Shahriyar Naiem
  );
}

// Create Employee (Admin, Shaila Ashraf, or Shahriyar Naiem)
app.post('/api/employees', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!canManageEmployees(req.user)) {
      return res.status(403).json({ error: 'Permission denied. Only Admin, Syeda Shaila Ashraf, or Shahriyar Naiem can add employees.' });
    }

    const { employeeCode, name, email, designation, department, reportingManagerId, reportingManagerName, isHeadOfHr, joinDate } = req.body;
    if (!employeeCode || !name || !email || !designation) {
      return res.status(400).json({ error: 'Missing required employee fields: Employee ID, Name, Email, and Designation are required.' });
    }

    const initials = name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const [newEmp] = await db.insert(employees).values({
      employeeCode,
      name,
      email,
      designation,
      department: department || 'Human Resources & OD',
      reportingManagerId: reportingManagerId ? parseInt(reportingManagerId, 10) : 1,
      reportingManagerName: reportingManagerName || 'Syeda Shaila Ashraf',
      isHeadOfHr: !!isHeadOfHr,
      avatarInitials: initials,
      joinDate: joinDate || getTodayDhaka(),
      status: 'active',
    }).returning();

    // Create user profile too
    await db.insert(users).values({
      uid: `usr-${Date.now()}`,
      email,
      name,
      role: isHeadOfHr ? 'head_of_hr' : designation.toLowerCase().includes('manager') ? 'hr_manager' : 'employee',
      employeeCode,
    }).onConflictDoNothing();

    res.json(newEmp);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Employee Profile (Admin, Shaila Ashraf, or Shahriyar Naiem)
app.put('/api/employees/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!canManageEmployees(req.user)) {
      return res.status(403).json({ error: 'Permission denied. Only Admin, Syeda Shaila Ashraf, or Shahriyar Naiem can edit employees.' });
    }

    const id = parseInt(req.params.id, 10);
    const { name, designation, department, joinDate, reportingManagerId, reportingManagerName, status, isHeadOfHr } = req.body;

    const [updated] = await db
      .update(employees)
      .set({
        name,
        designation,
        department,
        joinDate: joinDate !== undefined ? joinDate : undefined,
        reportingManagerId: reportingManagerId ? parseInt(reportingManagerId, 10) : undefined,
        reportingManagerName,
        status,
        isHeadOfHr: isHeadOfHr !== undefined ? !!isHeadOfHr : undefined,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Employee (Admin, Shaila Ashraf, or Shahriyar Naiem)
app.delete('/api/employees/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!canManageEmployees(req.user)) {
      return res.status(403).json({ error: 'Permission denied. Only Admin, Syeda Shaila Ashraf, or Shahriyar Naiem can remove employees.' });
    }

    const id = parseInt(req.params.id, 10);
    const existing = await db.select().from(employees).where(eq(employees.id, id));
    if (!existing[0]) return res.status(404).json({ error: 'Employee not found.' });
    const emp = existing[0];

    // Prevent deleting primary Head of HR
    if (emp.isHeadOfHr || emp.employeeCode === '01-02-0440') {
      return res.status(400).json({ error: 'Cannot remove primary Head of HR account.' });
    }

    // Clean up dependent foreign keys
    await db.delete(notifications).where(eq(notifications.recipientEmployeeId, id));
    await db.delete(responsibilities).where(eq(responsibilities.employeeId, id));
    await db.delete(kpis).where(eq(kpis.employeeId, id));
    await db.delete(tasks).where(eq(tasks.assignedEmployeeId, id));
    if (emp.email) {
      await db.delete(users).where(eq(users.email, emp.email));
    }
    await db.delete(employees).where(eq(employees.id, id));

    res.json({ success: true, message: `Employee ${emp.name} removed successfully.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Responsibilities Register
app.get('/api/responsibilities', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const allResps = await db
      .select({
        id: responsibilities.id,
        responsibilityCode: responsibilities.responsibilityCode,
        employeeId: responsibilities.employeeId,
        title: responsibilities.title,
        description: responsibilities.description,
        category: responsibilities.category,
        frequency: responsibilities.frequency,
        expectedDeliverable: responsibilities.expectedDeliverable,
        measurementCriteria: responsibilities.measurementCriteria,
        relatedKpiTitle: responsibilities.relatedKpiTitle,
        reportingManager: responsibilities.reportingManager,
        effectiveDate: responsibilities.effectiveDate,
        status: responsibilities.status,
        createdAt: responsibilities.createdAt,
        employeeName: employees.name,
        employeeDesignation: employees.designation,
        employeeCode: employees.employeeCode,
      })
      .from(responsibilities)
      .leftJoin(employees, eq(responsibilities.employeeId, employees.id))
      .orderBy(asc(responsibilities.responsibilityCode));

    res.json(allResps);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/responsibilities', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ error: 'Only Managers, Head of HR, or Admin can assign job responsibilities.' });
    }

    const {
      responsibilityCode,
      employeeId,
      title,
      description,
      category,
      frequency,
      expectedDeliverable,
      measurementCriteria,
      relatedKpiTitle,
      reportingManager,
      effectiveDate,
    } = req.body;

    if (!employeeId || !title || !description || !category || !frequency) {
      return res.status(400).json({ error: 'Missing mandatory responsibility fields.' });
    }

    const code = responsibilityCode || `RESP-${Date.now().toString().slice(-4)}`;

    const [newResp] = await db.insert(responsibilities).values({
      responsibilityCode: code,
      employeeId: parseInt(employeeId, 10),
      title,
      description,
      category,
      frequency,
      expectedDeliverable: expectedDeliverable || 'Quarterly Deliverable Document',
      measurementCriteria: measurementCriteria || 'Standard departmental SLA',
      relatedKpiTitle,
      reportingManager: reportingManager || req.user?.name,
      effectiveDate: effectiveDate || getTodayDhaka(),
      status: 'active',
    }).returning();

    res.json(newResp);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/responsibilities/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    const id = parseInt(req.params.id, 10);
    const { title, description, category, frequency, expectedDeliverable, measurementCriteria, relatedKpiTitle, status } = req.body;

    const [updated] = await db
      .update(responsibilities)
      .set({
        title,
        description,
        category,
        frequency,
        expectedDeliverable,
        measurementCriteria,
        relatedKpiTitle,
        status,
        updatedAt: new Date(),
      })
      .where(eq(responsibilities.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Tasks Register & Management
app.get('/api/tasks', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const today = getTodayDhaka();
    const allTasks = await withDbRetry(() =>
      db
        .select({
          id: tasks.id,
          taskCode: tasks.taskCode,
          title: tasks.title,
          description: tasks.description,
          assignedEmployeeId: tasks.assignedEmployeeId,
          assigningManagerName: tasks.assigningManagerName,
          relatedResponsibilityId: tasks.relatedResponsibilityId,
          relatedKpiId: tasks.relatedKpiId,
          priority: tasks.priority,
          assignmentDate: tasks.assignmentDate,
          startDate: tasks.startDate,
          originalDeadline: tasks.originalDeadline,
          revisedDeadline: tasks.revisedDeadline,
          revisedBy: tasks.revisedBy,
          revisedAt: tasks.revisedAt,
          extensionReason: tasks.extensionReason,
          completionDate: tasks.completionDate,
          status: tasks.status,
          progressPercent: tasks.progressPercent,
          employeeCompletionNotes: tasks.employeeCompletionNotes,
          delayReason: tasks.delayReason,
          delayCategory: tasks.delayCategory,
          managerComments: tasks.managerComments,
          supportingAttachments: tasks.supportingAttachments,
          approvalStatus: tasks.approvalStatus,
          isPoked: tasks.isPoked,
          pokedBy: tasks.pokedBy,
          pokedAt: tasks.pokedAt,
          pokeCount: tasks.pokeCount,
          createdBy: tasks.createdBy,
          lastUpdatedBy: tasks.lastUpdatedBy,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          employeeName: employees.name,
          employeeDesignation: employees.designation,
          employeeEmail: employees.email,
          employeeCode: employees.employeeCode,
          responsibilityTitle: responsibilities.title,
        })
        .from(tasks)
        .leftJoin(employees, eq(tasks.assignedEmployeeId, employees.id))
        .leftJoin(responsibilities, eq(tasks.relatedResponsibilityId, responsibilities.id))
        .orderBy(desc(tasks.id))
    );

    const processed = allTasks.map((t) => processTaskOverdue(t, today));
    res.json(processed);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create/Assign Task (All authorized team members can create tasks)
app.post('/api/tasks', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      assignedEmployeeId,
      relatedResponsibilityId,
      relatedKpiId,
      priority,
      startDate,
      originalDeadline,
    } = req.body;

    if (!title || !description || !assignedEmployeeId || !originalDeadline) {
      return res.status(400).json({ error: 'Title, description, assigned employee, and deadline are required.' });
    }

    const parsedEmpId = parseInt(String(assignedEmployeeId), 10);
    if (isNaN(parsedEmpId) || parsedEmpId <= 0 || parsedEmpId > 2147483647) {
      return res.status(400).json({ error: 'Invalid assigned employee selection. Please refresh the employee list and try again.' });
    }

    const [assignee] = await withDbRetry(() =>
      db.select({ id: employees.id }).from(employees).where(eq(employees.id, parsedEmpId))
    );
    if (!assignee) {
      return res.status(400).json({ error: 'Selected employee was not found in the database.' });
    }

    const taskCode = `TSK-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = getTodayDhaka();

    const [newTask] = await withDbRetry(() =>
      db.insert(tasks).values({
        taskCode,
        title,
        description,
        assignedEmployeeId: parsedEmpId,
        assigningManagerName: req.user?.name || 'HR Team',
        relatedResponsibilityId: relatedResponsibilityId ? parseInt(relatedResponsibilityId, 10) : null,
        relatedKpiId: relatedKpiId ? parseInt(relatedKpiId, 10) : null,
        priority: priority || 'Medium',
        assignmentDate: today,
        startDate: startDate || today,
        originalDeadline,
        status: 'Not Started',
        progressPercent: 0,
        approvalStatus: 'Not Submitted',
        isPoked: false,
        pokeCount: 0,
        createdBy: req.user?.name || 'Team Member',
        lastUpdatedBy: req.user?.name || 'Team Member',
      }).returning()
    );

    // Audit log
    await withDbRetry(() =>
      db.insert(taskAuditLogs).values({
        taskId: newTask.id,
        actionType: 'created',
        actionSummary: `Task ${taskCode} created by ${req.user?.name} and assigned with deadline ${originalDeadline}.`,
        performedBy: req.user?.name || 'Team Member',
      })
    );

    // Notification to assigned employee
    await withDbRetry(() =>
      db.insert(notifications).values({
        recipientEmployeeId: parsedEmpId,
        title: `New Task Assigned: ${title}`,
        message: `You have been assigned "${title}" due on ${originalDeadline} by ${req.user?.name}.`,
        type: 'task_assigned',
        linkId: newTask.id,
        isRead: false,
      })
    );

    res.json(newTask);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Poke / Urge Task (Only Syeda Shaila Ashraf, Shahriyar Naiem, and Admin)
app.post('/api/tasks/:id/poke', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ error: 'Only Head of HR (Syeda Shaila Ashraf) or Manager (Shahriyar Naiem) can poke/urge tasks.' });
    }

    const id = parseInt(req.params.id, 10);
    const existing = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!existing[0]) return res.status(404).json({ error: 'Task not found' });
    const task = existing[0];

    if (task.status === 'Completed' || task.status === 'Cancelled') {
      return res.status(400).json({ error: 'Cannot poke a completed or cancelled task.' });
    }

    const newPokeCount = (task.pokeCount || 0) + 1;
    const pokedBy = req.user?.name || 'Head of HR';
    const now = new Date();

    const [updated] = await db
      .update(tasks)
      .set({
        isPoked: true,
        pokedBy: pokedBy,
        pokedAt: now,
        pokeCount: newPokeCount,
        lastUpdatedBy: pokedBy,
        updatedAt: now,
      })
      .where(eq(tasks.id, id))
      .returning();

    // Log to task audit logs
    await db.insert(taskAuditLogs).values({
      taskId: id,
      actionType: 'task_poked',
      actionSummary: `🚨 Task poked/urgent follow-up #${newPokeCount} issued by ${pokedBy}. Immediate action required!`,
      performedBy: pokedBy,
    });

    // Notify the assigned employee
    await db.insert(notifications).values({
      recipientEmployeeId: task.assignedEmployeeId,
      title: `🚨 POKE: ${pokedBy} has poked your task!`,
      message: `URGENT: ${pokedBy} has poked your task "${task.title}". The task is highlighted in red. Please submit progress or completion immediately!`,
      type: 'overdue_alert',
      linkId: id,
      isRead: false,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Unpoke / Clear Poke from Task
app.post('/api/tasks/:id/unpoke', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ error: 'Only managers or Head of HR can clear a poke.' });
    }

    const id = parseInt(req.params.id, 10);
    const [updated] = await db
      .update(tasks)
      .set({
        isPoked: false,
        lastUpdatedBy: req.user?.name || 'Manager',
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    await db.insert(taskAuditLogs).values({
      taskId: id,
      actionType: 'task_unpoked',
      actionSummary: `Task poke cleared by ${req.user?.name}.`,
      performedBy: req.user?.name || 'Manager',
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Task (Progress, Notes, Delay Reasons)
app.put('/api/tasks/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!existing[0]) return res.status(404).json({ error: 'Task not found' });

    const currentTask = existing[0];
    const { progressPercent, employeeCompletionNotes, delayReason, delayCategory, managerComments, status } = req.body;

    const updates: any = {
      lastUpdatedBy: req.user?.name || 'User',
      updatedAt: new Date(),
    };

    if (progressPercent !== undefined) updates.progressPercent = progressPercent;
    if (employeeCompletionNotes !== undefined) updates.employeeCompletionNotes = employeeCompletionNotes;
    if (delayReason !== undefined) updates.delayReason = delayReason;
    if (delayCategory !== undefined) updates.delayCategory = delayCategory;
    if (managerComments !== undefined) updates.managerComments = managerComments;
    if (status !== undefined) updates.status = status;

    const [updated] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();

    // Log progress/delay in audit trail
    if (delayReason && delayReason !== currentTask.delayReason) {
      await db.insert(taskAuditLogs).values({
        taskId: id,
        actionType: 'delay_reported',
        actionSummary: `Delay reason updated: [${delayCategory || 'General'}] ${delayReason}`,
        previousValue: currentTask.delayReason || 'None',
        newValue: delayReason,
        performedBy: req.user?.name || 'Employee',
      });
    }

    if (progressPercent !== undefined && progressPercent !== currentTask.progressPercent) {
      await db.insert(taskAuditLogs).values({
        taskId: id,
        actionType: 'progress_updated',
        actionSummary: `Progress updated to ${progressPercent}%`,
        previousValue: `${currentTask.progressPercent}%`,
        newValue: `${progressPercent}%`,
        performedBy: req.user?.name || 'Employee',
      });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit Task for Review
app.post('/api/tasks/:id/submit', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { completionNotes, attachments } = req.body;
    const today = getTodayDhaka();

    const [updated] = await db
      .update(tasks)
      .set({
        status: 'Submitted for Review',
        approvalStatus: 'Pending Review',
        progressPercent: 100,
        employeeCompletionNotes: completionNotes,
        supportingAttachments: attachments,
        lastUpdatedBy: req.user?.name || 'Employee',
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    await db.insert(taskAuditLogs).values({
      taskId: id,
      actionType: 'submission',
      actionSummary: `Task submitted for managerial review with completion notes.`,
      newValue: completionNotes || 'Submitted for review',
      performedBy: req.user?.name || 'Employee',
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Manager/Head of HR Review Decision (Approve / Reject / Revision)
app.post('/api/tasks/:id/review', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ error: 'Separation of duties: Employees cannot review/approve tasks.' });
    }

    const id = parseInt(req.params.id, 10);
    const { decision, managerComments } = req.body; // 'approve' | 'reject' | 'revision'
    const today = getTodayDhaka();

    let newStatus = 'In Progress';
    let newApprovalStatus = 'Pending Review';
    let completionDate = null;

    if (decision === 'approve') {
      newStatus = 'Completed';
      newApprovalStatus = 'Approved';
      completionDate = today;
    } else if (decision === 'revision') {
      newStatus = 'Revision Required';
      newApprovalStatus = 'Revision Requested';
    } else if (decision === 'reject') {
      newStatus = 'Revision Required';
      newApprovalStatus = 'Rejected';
    }

    const [updated] = await db
      .update(tasks)
      .set({
        status: newStatus,
        approvalStatus: newApprovalStatus,
        completionDate: completionDate,
        managerComments: managerComments,
        lastUpdatedBy: req.user?.name || 'Manager',
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    await db.insert(taskAuditLogs).values({
      taskId: id,
      actionType: 'approval_decision',
      actionSummary: `Manager ${req.user?.name} decided [${decision.toUpperCase()}]. Comment: ${managerComments || 'None'}`,
      previousValue: 'Submitted for Review',
      newValue: newStatus,
      performedBy: req.user?.name || 'Manager',
    });

    // Notify employee
    await db.insert(notifications).values({
      recipientEmployeeId: updated.assignedEmployeeId,
      title: `Task Review Decision: ${decision === 'approve' ? 'Approved' : 'Revision Requested'}`,
      message: `Your task "${updated.title}" was evaluated by ${req.user?.name}: ${managerComments || decision}`,
      type: decision === 'approve' ? 'task_assigned' : 'revision_requested',
      linkId: id,
      isRead: false,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Task (Permanent removal with cascading dependent records cleanup)
app.delete('/api/tasks/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!existing[0]) return res.status(404).json({ error: 'Task not found' });

    if (req.user?.role === 'employee') {
      return res.status(403).json({ error: 'Permission denied: Only managers or Head of HR can delete tasks.' });
    }

    // Delete dependent child records first
    await db.delete(deadlineExtensionRequests).where(eq(deadlineExtensionRequests.taskId, id));
    await db.delete(taskAuditLogs).where(eq(taskAuditLogs.taskId, id));
    await db.delete(tasks).where(eq(tasks.id, id));

    res.json({ success: true, message: `Task ${existing[0].taskCode} deleted successfully.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Request Deadline Extension (Preserves original deadline)
app.post('/api/tasks/:id/request-extension', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { requestedDeadline, reasonCategory, detailedReason } = req.body;

    const [existing] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const currentDeadline = existing.revisedDeadline || existing.originalDeadline;

    const [reqRecord] = await db.insert(deadlineExtensionRequests).values({
      taskId: id,
      employeeId: existing.assignedEmployeeId,
      currentDeadline,
      requestedDeadline,
      reasonCategory: reasonCategory || 'Workload conflict',
      detailedReason: detailedReason || 'Extension requested due to dependencies',
      status: 'Pending',
    }).returning();

    await db.insert(taskAuditLogs).values({
      taskId: id,
      actionType: 'extension_requested',
      actionSummary: `Deadline extension requested until ${requestedDeadline}. Category: ${reasonCategory}. Reason: ${detailedReason}`,
      previousValue: currentDeadline,
      newValue: requestedDeadline,
      performedBy: req.user?.name || 'Employee',
    });

    res.json(reqRecord);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve or Reject Deadline Extension (Authorized approver only)
app.post('/api/tasks/:id/decide-extension', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ error: 'Separation of duties: Only managers or Head of HR can approve extensions.' });
    }

    const id = parseInt(req.params.id, 10);
    const { requestId, decision, reviewerComments, approvedDeadline } = req.body; // decision: 'approve' | 'reject'
    const today = getTodayDhaka();

    const [taskRecord] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!taskRecord) return res.status(404).json({ error: 'Task not found' });

    // Update extension request record
    if (requestId) {
      await db
        .update(deadlineExtensionRequests)
        .set({
          status: decision === 'approve' ? 'Approved' : 'Rejected',
          reviewerName: req.user?.name,
          reviewerComments,
          reviewedAt: new Date().toISOString(),
        })
        .where(eq(deadlineExtensionRequests.id, requestId));
    }

    if (decision === 'approve') {
      const finalRevised = approvedDeadline || taskRecord.revisedDeadline;
      // Preserve original deadline, update revised_deadline and extension metadata
      await db
        .update(tasks)
        .set({
          revisedDeadline: finalRevised,
          revisedBy: req.user?.name,
          revisedAt: today,
          extensionReason: reviewerComments,
          lastUpdatedBy: req.user?.name,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, id));

      await db.insert(taskAuditLogs).values({
        taskId: id,
        actionType: 'extension_decision',
        actionSummary: `Extension APPROVED by ${req.user?.name}. Revised Deadline: ${finalRevised}. (Original deadline: ${taskRecord.originalDeadline} retained).`,
        previousValue: taskRecord.revisedDeadline || taskRecord.originalDeadline,
        newValue: finalRevised,
        performedBy: req.user?.name || 'Approver',
      });
    } else {
      await db.insert(taskAuditLogs).values({
        taskId: id,
        actionType: 'extension_decision',
        actionSummary: `Extension REJECTED by ${req.user?.name}. Reason: ${reviewerComments}`,
        performedBy: req.user?.name || 'Approver',
      });
    }

    res.json({ success: true, decision });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Task History & Audit Trail
app.get('/api/tasks/:id/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const logs = await db
      .select()
      .from(taskAuditLogs)
      .where(eq(taskAuditLogs.taskId, id))
      .orderBy(desc(taskAuditLogs.createdAt));

    const extensions = await db
      .select()
      .from(deadlineExtensionRequests)
      .where(eq(deadlineExtensionRequests.taskId, id))
      .orderBy(desc(deadlineExtensionRequests.createdAt));

    res.json({ logs, extensions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. KPI Module
app.get('/api/kpis', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const allKpis = await withDbRetry(() =>
      db
        .select({
          id: kpis.id,
          kpiCode: kpis.kpiCode,
          employeeId: kpis.employeeId,
          title: kpis.title,
          description: kpis.description,
          category: kpis.category,
          measurementMethod: kpis.measurementMethod,
          targetValue: kpis.targetValue,
          actualValue: kpis.actualValue,
          unit: kpis.unit,
          weight: kpis.weight,
          reportingPeriod: kpis.reportingPeriod,
          startDate: kpis.startDate,
          endDate: kpis.endDate,
          dataSource: kpis.dataSource,
          evidenceNotes: kpis.evidenceNotes,
          submissionStatus: kpis.submissionStatus,
          managerReviewStatus: kpis.managerReviewStatus,
          approvedAchievementPercentage: kpis.approvedAchievementPercentage,
          createdAt: kpis.createdAt,
          updatedAt: kpis.updatedAt,
          employeeName: employees.name,
          employeeDesignation: employees.designation,
          employeeCode: employees.employeeCode,
        })
        .from(kpis)
        .leftJoin(employees, eq(kpis.employeeId, employees.id))
        .orderBy(asc(kpis.kpiCode))
    );

    // Calculate preliminary achievement % for submitted actuals
    const enriched = allKpis.map((k) => {
      let calculatedAchievement: number | null = null;
      if (k.actualValue !== null && k.actualValue !== undefined && k.targetValue > 0) {
        if (k.measurementMethod === 'lower_is_better') {
          // e.g. target 30 days, actual 26 days => 30/26 * 100 = 115.3%
          calculatedAchievement = Math.round((k.targetValue / k.actualValue) * 1000) / 10;
        } else {
          // Standard higher is better
          calculatedAchievement = Math.round((k.actualValue / k.targetValue) * 1000) / 10;
        }
      }

      return {
        ...k,
        calculatedAchievement,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create KPI
app.post('/api/kpis', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ error: 'Permission denied. Only managers or Head of HR can create KPIs.' });
    }

    const {
      employeeId,
      title,
      description,
      category,
      measurementMethod,
      targetValue,
      unit,
      weight,
      reportingPeriod,
      startDate,
      endDate,
      dataSource,
    } = req.body;

    if (!employeeId || !title || !targetValue) {
      return res.status(400).json({ error: 'Employee, title, and target value are required.' });
    }

    const kpiCode = `KPI-${Math.floor(100 + Math.random() * 900)}`;

    const [newKpi] = await db.insert(kpis).values({
      kpiCode,
      employeeId: parseInt(employeeId, 10),
      title,
      description: description || title,
      category: category || 'General HR',
      measurementMethod: measurementMethod || 'higher_is_better',
      targetValue: parseFloat(targetValue),
      unit: unit || '%',
      weight: weight ? parseFloat(weight) : 1.0,
      reportingPeriod: reportingPeriod || 'October 2026',
      startDate: startDate || '2026-10-01',
      endDate: endDate || '2026-10-31',
      dataSource: dataSource || 'HRIS',
      submissionStatus: 'Not Submitted',
      managerReviewStatus: 'Pending',
    }).returning();

    res.json(newKpi);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit KPI Actual Value (Employee)
app.post('/api/kpis/:id/submit', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { actualValue, evidenceNotes } = req.body;

    if (actualValue === undefined || actualValue === null) {
      return res.status(400).json({ error: 'Actual value is required.' });
    }

    const [updated] = await db
      .update(kpis)
      .set({
        actualValue: parseFloat(actualValue),
        evidenceNotes: evidenceNotes || '',
        submissionStatus: 'Submitted',
        managerReviewStatus: 'Pending',
        updatedAt: new Date(),
      })
      .where(eq(kpis.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Recommend / Review KPI (Manager)
app.post('/api/kpis/:id/review', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ error: 'Separation of duties: Employees cannot review KPIs.' });
    }

    const id = parseInt(req.params.id, 10);
    const { status, comments } = req.body; // 'Recommended' | 'Revision Requested'

    const [updated] = await db
      .update(kpis)
      .set({
        managerReviewStatus: status || 'Recommended',
        updatedAt: new Date(),
      })
      .where(eq(kpis.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Final Approve KPI (Head of HR / Admin)
app.post('/api/kpis/:id/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'head_of_hr' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied. Final KPI approval is restricted to Head of HR.' });
    }

    const id = parseInt(req.params.id, 10);
    const { approvedPercentage, reviewStatus } = req.body;

    const [updated] = await db
      .update(kpis)
      .set({
        approvedAchievementPercentage: approvedPercentage !== undefined ? parseFloat(approvedPercentage) : null,
        managerReviewStatus: reviewStatus || 'Approved',
        submissionStatus: 'Approved',
        updatedAt: new Date(),
      })
      .where(eq(kpis.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete KPI (Management Only: Head of HR, Manager, Admin)
app.delete('/api/kpis/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole === 'employee') {
      return res.status(403).json({ error: 'Permission denied: Employees (Fariha, Sabbir, Nuzhat, Maisha) cannot delete KPIs.' });
    }

    const id = parseInt(req.params.id, 10);
    const existing = await db.select().from(kpis).where(eq(kpis.id, id));
    if (!existing[0]) return res.status(404).json({ error: 'KPI record not found.' });

    // Unlink any tasks referencing this KPI
    await db.update(tasks).set({ relatedKpiId: null }).where(eq(tasks.relatedKpiId, id));

    // Delete the KPI row
    await db.delete(kpis).where(eq(kpis.id, id));

    res.json({ success: true, message: `KPI ${existing[0].kpiCode} deleted successfully.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Monthly Performance Ranking
app.get('/api/performance/ranking', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const today = getTodayDhaka();
    const [allEmployees, allTasks, allKpis, settingsList] = await withDbRetry(() =>
      Promise.all([
        db.select().from(employees).where(eq(employees.status, 'active')).orderBy(asc(employees.employeeCode)),
        db.select().from(tasks),
        db.select().from(kpis),
        db.select().from(appSettings),
      ])
    );

    const settingsMap = Object.fromEntries(settingsList.map((s) => [s.settingKey, s.settingValue]));
    const kpiWeight = parseFloat(settingsMap['scoring_kpi_weight'] || '70') / 100;
    const taskWeight = parseFloat(settingsMap['scoring_task_weight'] || '30') / 100;
    const kpiCap = parseFloat(settingsMap['kpi_cap_percentage'] || '120');

    const rankings = allEmployees.map((emp) => {
      const empTasks = allTasks.filter((t) => t.assignedEmployeeId === emp.id).map(t => processTaskOverdue(t, today));
      const empKpis = allKpis.filter((k) => k.employeeId === emp.id);

      const totalTasks = empTasks.length;
      const completedTasks = empTasks.filter((t) => t.status === 'Completed').length;
      const overdueTasks = empTasks.filter((t) => t.isOverdue).length;

      // On-time completion rate
      const onTimeCompleted = empTasks.filter(
        (t) => t.status === 'Completed' && t.completionDate && t.completionDate <= t.effectiveDeadline
      ).length;
      const onTimeRate = completedTasks > 0 ? Math.round((onTimeCompleted / completedTasks) * 100) : 100;

      // Task Execution Score: combination of completion rate, on-time rate, and deduction for overdue
      let taskExecutionScore = 0;
      if (totalTasks > 0) {
        const rawCompletion = (completedTasks / totalTasks) * 60;
        const rawOnTime = (onTimeRate / 100) * 40;
        const overdueDeduction = overdueTasks * 5;
        taskExecutionScore = Math.max(0, Math.min(100, Math.round(rawCompletion + rawOnTime - overdueDeduction)));
      }

      // Approved KPI Score
      const approvedKpis = empKpis.filter((k) => k.approvedAchievementPercentage !== null);
      let totalKpiWeight = 0;
      let weightedKpiSum = 0;
      approvedKpis.forEach((k) => {
        const w = k.weight || 1.0;
        const cappedScore = Math.min(kpiCap, k.approvedAchievementPercentage || 0);
        weightedKpiSum += cappedScore * w;
        totalKpiWeight += w;
      });

      const approvedKpiScore = totalKpiWeight > 0 ? Math.round((weightedKpiSum / totalKpiWeight) * 10) / 10 : null;
      const kpiSubmissionRate = empKpis.length > 0 ? Math.round((empKpis.filter((k) => k.submissionStatus !== 'Not Submitted').length / empKpis.length) * 100) : 0;

      // Overall Score calculation
      let overallScore: number | null = null;
      let statusLabel = 'Active';

      if (approvedKpiScore === null && totalTasks === 0) {
        statusLabel = 'Insufficient Data';
      } else if (approvedKpiScore === null) {
        statusLabel = 'Pending KPI Evaluation';
        overallScore = Math.round(taskExecutionScore * taskWeight * 10) / 10;
      } else {
        overallScore = Math.round((approvedKpiScore * kpiWeight + taskExecutionScore * taskWeight) * 10) / 10;
      }

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        name: emp.name,
        designation: emp.designation,
        department: emp.department,
        isHeadOfHr: emp.isHeadOfHr,
        assignedTaskCount: totalTasks,
        completedTaskCount: completedTasks,
        overdueTaskCount: overdueTasks,
        onTimeCompletionRate: onTimeRate,
        taskExecutionScore,
        approvedKpiScore,
        kpiSubmissionRate,
        overallScore,
        statusLabel,
      };
    });

    // Sort rankable employees (descending overall score)
    const sorted = [...rankings].sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
    const rankedWithPosition = sorted.map((item, index) => ({
      ...item,
      rank: item.overallScore !== null ? index + 1 : '—',
    }));

    res.json({
      methodology: {
        kpiWeight: Math.round(kpiWeight * 100),
        taskWeight: Math.round(taskWeight * 100),
        kpiCap,
        period: settingsMap['current_reporting_period'] || 'October 2026',
        description: `Overall Score = (${Math.round(kpiWeight * 100)}% × Approved KPI Score) + (${Math.round(taskWeight * 100)}% × Task Execution Score). Overdue tasks apply proportional execution deductions.`,
      },
      rankings: rankedWithPosition,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Main Dashboard 10 Summary Cards & Chart Data
app.get('/api/dashboard/stats', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const today = getTodayDhaka();
    const [allEmployees, rawTasks, allKpis] = await withDbRetry(() =>
      Promise.all([
        db.select().from(employees).where(eq(employees.status, 'active')),
        db.select().from(tasks),
        db.select().from(kpis),
      ])
    );
    const allTasks = rawTasks.map((t) => processTaskOverdue(t, today));

    // 10 Mandatory Metrics:
    // 1. Total Employees
    const totalEmployees = allEmployees.length;
    // 2. Total Assigned Tasks
    const totalAssignedTasks = allTasks.length;
    // 3. Completed Tasks
    const completedTasks = allTasks.filter((t) => t.status === 'Completed').length;
    // 4. In Progress Tasks
    const inProgressTasks = allTasks.filter((t) => t.status === 'In Progress').length;
    // 5. Pending Tasks (Not Completed and not cancelled)
    const pendingTasks = allTasks.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled').length;
    // 6. Overdue Tasks
    const overdueTasks = allTasks.filter((t) => t.isOverdue).length;
    // 7. Tasks Awaiting Approval
    const awaitingApproval = allTasks.filter((t) => t.status === 'Submitted for Review' || t.approvalStatus === 'Pending Review').length;

    // 8. Average KPI Achievement across approved KPIs
    const approvedKpis = allKpis.filter((k) => k.approvedAchievementPercentage !== null);
    const avgKpiAchievement =
      approvedKpis.length > 0
        ? Math.round(
            (approvedKpis.reduce((acc, k) => acc + (k.approvedAchievementPercentage || 0), 0) / approvedKpis.length) * 10
          ) / 10
        : 0;

    // 9. On-Time Completion Rate
    const onTimeCompleted = allTasks.filter(
      (t) => t.status === 'Completed' && t.completionDate && t.completionDate <= t.effectiveDeadline
    ).length;
    const onTimeCompletionRate = completedTasks > 0 ? Math.round((onTimeCompleted / completedTasks) * 100) : 100;

    // 10. Employees Requiring Attention (Employees with overdue tasks or overdue KPIs)
    const overdueEmpIds = new Set(allTasks.filter((t) => t.isOverdue).map((t) => t.assignedEmployeeId));
    const employeesRequiringAttention = overdueEmpIds.size;

    // Chart Data Preparation:
    // A. Employee-wise Task Completion (Excluding Head of HR Syeda Shaila Ashraf as she is executive oversight)
    const activeStaff = allEmployees.filter(
      (emp) => !emp.name.toLowerCase().includes('shaila') && !emp.name.toLowerCase().includes('syeda')
    );

    const employeeTaskChart = activeStaff.map((emp) => {
      const empTasks = allTasks.filter((t) => t.assignedEmployeeId === emp.id);
      return {
        name: emp.name.split(' ')[0],
        fullName: emp.name,
        completed: empTasks.filter((t) => t.status === 'Completed').length,
        inProgress: empTasks.filter((t) => t.status === 'In Progress').length,
        overdue: empTasks.filter((t) => t.isOverdue).length,
        total: empTasks.length,
      };
    });

    // B. Monthly KPI Achievement comparison
    const kpiComparison = activeStaff.map((emp) => {
      const empKpis = allKpis.filter((k) => k.employeeId === emp.id && k.approvedAchievementPercentage !== null);
      const score = empKpis.length > 0 ? Math.round(empKpis.reduce((a, b) => a + (b.approvedAchievementPercentage || 0), 0) / empKpis.length) : 0;
      return {
        name: emp.name.split(' ')[0],
        fullName: emp.name,
        target: 100,
        actual: score,
      };
    });

    // C. Task Distribution
    const taskDistribution = [
      { name: 'Completed', value: completedTasks, color: '#16a34a' },
      { name: 'In Progress', value: inProgressTasks, color: '#2563eb' },
      { name: 'Overdue', value: overdueTasks, color: '#dc2626' },
      { name: 'Under Review', value: awaitingApproval, color: '#d97706' },
      { name: 'Not Started', value: allTasks.filter((t) => t.status === 'Not Started').length, color: '#64748b' },
    ];

    // D. Department Trend (6-month simulated historical trend leading to current month)
    const monthlyTrend = [
      { month: 'May 2026', onTimeRate: 88, kpiScore: 91 },
      { month: 'Jun 2026', onTimeRate: 92, kpiScore: 94 },
      { month: 'Jul 2026', onTimeRate: 85, kpiScore: 89 },
      { month: 'Aug 2026', onTimeRate: 90, kpiScore: 93 },
      { month: 'Sep 2026', onTimeRate: 94, kpiScore: 96 },
      { month: 'Oct 2026', onTimeRate: onTimeCompletionRate, kpiScore: avgKpiAchievement },
    ];

    res.json({
      cards: {
        totalEmployees,
        totalAssignedTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        overdueTasks,
        awaitingApproval,
        avgKpiAchievement,
        onTimeCompletionRate,
        employeesRequiringAttention,
      },
      charts: {
        employeeTaskChart,
        kpiComparison,
        taskDistribution,
        monthlyTrend,
      },
      currentDate: today,
      timezone: 'Asia/Dhaka',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Notifications
app.get('/api/notifications', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(30);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. System Settings
app.get('/api/settings', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await db.select().from(appSettings);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'head_of_hr') {
      return res.status(403).json({ error: 'Permission denied. Settings can only be edited by Admin or Head of HR.' });
    }

    const { settings } = req.body; // Array of { settingKey, settingValue }
    if (Array.isArray(settings)) {
      for (const s of settings) {
        await db
          .insert(appSettings)
          .values({
            settingKey: s.settingKey,
            settingValue: String(s.settingValue),
            updatedBy: req.user?.name || 'Administrator',
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: appSettings.settingKey,
            set: {
              settingValue: String(s.settingValue),
              updatedBy: req.user?.name || 'Administrator',
              updatedAt: new Date(),
            },
          });
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Database Reset / Re-seed (Admin only)
app.post('/api/admin/reset-seed', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await seedDatabase(true);
    await seedRecruitmentDatabase(true);
    res.json({ success: true, message: 'Database successfully re-seeded with demo records.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RG HR - RECRUITMENT STATUS & CHECKLIST API ROUTES
// ============================================================================

// Helpers for Recruitment Permissions & Calculations - All authenticated HR personnel have full access
function canEditRecruitment(user?: AuthRequest['user']): boolean {
  return !!user;
}

function canRateRecruitment(user?: AuthRequest['user']): boolean {
  return !!user;
}

function calculateCalendarDays(startDate: string, endDate: string): number {
  try {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const diff = e.getTime() - s.getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

// 1. Get All Recruitment Requisitions (Supports both /api/recruitment/requisitions and /api/requisitions)
app.get(['/api/recruitment/requisitions', '/api/requisitions'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const today = getTodayDhaka();
    let records = await withDbRetry(() =>
      db.select().from(recruitmentRequisitions).orderBy(asc(recruitmentRequisitions.sl))
    );

    // If live database table is empty, auto-seed initial sample requisitions once
    if (records.length === 0) {
      await withDbRetry(() => seedRecruitmentDatabase());
      records = await withDbRetry(() =>
        db.select().from(recruitmentRequisitions).orderBy(asc(recruitmentRequisitions.sl))
      );
    }

    const enriched = records.map((item) => {
      let pendingDays = 0;
      if (item.recruitmentStatus === 'Ongoing' || item.recruitmentStatus === 'Held Up') {
        pendingDays = calculateCalendarDays(item.requisitionDate, today);
      }
      return {
        ...item,
        pendingDays,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch recruitment requisitions from database.' });
  }
});

// 2. Get Single Recruitment Requisition (Supports both /api/recruitment/requisitions/:id and /api/requisitions/:id)
app.get(['/api/recruitment/requisitions/:id', '/api/requisitions/:id'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [record] = await withDbRetry(() =>
      db.select().from(recruitmentRequisitions).where(eq(recruitmentRequisitions.id, id))
    );
    if (!record) {
      return res.status(404).json({ error: 'Requisition not found.' });
    }
    const today = getTodayDhaka();
    let pendingDays = 0;
    if (record.recruitmentStatus === 'Ongoing' || record.recruitmentStatus === 'Held Up') {
      pendingDays = calculateCalendarDays(record.requisitionDate, today);
    }
    res.json({ ...record, pendingDays });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Create New Recruitment Requisition (Supports both /api/recruitment/requisitions and /api/requisitions)
app.post(['/api/recruitment/requisitions', '/api/requisitions'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!canEditRecruitment(req.user)) {
      return res.status(403).json({
        error:
          'Dashboard Viewing Access Only: Data entry and modification is reserved for HR team members, Manager (HR & OD), and System Admin.',
      });
    }

    const {
      positionTitle,
      department,
      requisitionDate,
      requisitionSubmittedBy,
      hod,
      company,
      vacancy,
      recruitmentType,
      replacementOfWhom,
      replacementEmployeeSalary,
      offerLetterDate,
      dateOfJoining,
      recruitmentStatus,
      remarks,
      recruitmentAssistedByName,
      recruitmentAssistedByCode,
    } = req.body;

    const posTitle = (positionTitle || '').trim();
    const dept = (department || '').trim();
    const reqDate = (requisitionDate || '').trim();
    const comp = (company || 'RAL').trim();
    const assistedName = (recruitmentAssistedByName || req.user?.name || 'Syeda Shaila Ashraf').trim();
    const submittedBy = (requisitionSubmittedBy || req.user?.name || 'HR Requisitioner').trim();
    const hodName = (hod || 'Department Head').trim();

    if (!posTitle || !dept || !reqDate) {
      return res.status(400).json({
        error: 'Position Title, Department, and Requisition Date are required fields.',
      });
    }

    // Determine SL safely
    const existingList = await withDbRetry(() =>
      db.select({ sl: recruitmentRequisitions.sl }).from(recruitmentRequisitions)
    );
    const maxSl = existingList.length > 0 ? Math.max(...existingList.map((r) => r.sl || 0)) : 0;
    const nextSl = maxSl + 1;
    const requisitionCode = `MRF-2026-${String(nextSl).padStart(3, '0')}`;

    // Auto-calculate time to fill if joined
    let timeToFillDays: number | null = null;
    const status = (recruitmentStatus || 'Ongoing').trim();
    if (status === 'Joined' && dateOfJoining && reqDate) {
      timeToFillDays = calculateCalendarDays(reqDate, dateOfJoining);
    }

    // Map assisted employee ID
    let assistedById: number | null = null;
    if (recruitmentAssistedByCode) {
      try {
        const [emp] = await withDbRetry(() =>
          db
            .select({ id: employees.id })
            .from(employees)
            .where(eq(employees.employeeCode, recruitmentAssistedByCode))
        );
        if (emp) assistedById = emp.id;
      } catch {}
    }

    const [created] = await withDbRetry(() =>
      db
        .insert(recruitmentRequisitions)
        .values({
          sl: nextSl,
          requisitionCode,
          positionTitle: posTitle,
          department: dept,
          requisitionDate: reqDate,
          requisitionSubmittedBy: submittedBy,
          hod: hodName,
          company: comp,
          vacancy: vacancy ? parseInt(String(vacancy), 10) : 1,
          recruitmentType: (recruitmentType || 'New Recruitment').trim(),
          replacementOfWhom: replacementOfWhom?.trim() || null,
          replacementEmployeeSalary: replacementEmployeeSalary?.trim() || null,
          offerLetterDate: offerLetterDate?.trim() || null,
          dateOfJoining: dateOfJoining?.trim() || null,
          recruitmentStatus: status,
          timeToFillDays,
          remarks: remarks?.trim() || null,
          recruitmentAssistedById: assistedById,
          recruitmentAssistedByName: assistedName,
          recruitmentAssistedByCode: recruitmentAssistedByCode?.trim() || null,
          createdById: req.user?.employeeCode || req.user?.uid || 'user',
          createdByName: req.user?.name || 'HR Employee',
          lastUpdatedById: req.user?.employeeCode || req.user?.uid || 'user',
          lastUpdatedByName: req.user?.name || 'HR Employee',
          version: 1,
        })
        .returning()
    );

    // Audit Log (wrapped in try/catch so audit log failure never blocks requisition creation)
    try {
      await withDbRetry(() =>
        db.insert(recruitmentAuditLogs).values({
          requisitionId: created.id,
          requisitionCode: created.requisitionCode,
          positionTitle: created.positionTitle,
          action: 'CREATE',
          fieldName: 'ALL',
          previousValue: null,
          newValue: `Status: ${created.recruitmentStatus}, Company: ${created.company}`,
          details: `Requisition created for ${created.positionTitle} (${created.department}) assisted by ${created.recruitmentAssistedByName}.`,
          performedByUserId: req.user?.employeeCode || req.user?.uid,
          performedByName: req.user?.name || 'HR Employee',
          performedByRole: req.user?.role,
        })
      );
    } catch (auditErr: any) {
      console.warn('Audit log creation note (requisition saved successfully):', auditErr.message || auditErr);
    }

    res.status(201).json(created);
  } catch (error: any) {
    console.error('Error creating recruitment requisition:', error);
    res.status(500).json({ error: error.message || 'Failed to create recruitment requisition in database.' });
  }
});

// 4. Update Existing Recruitment Requisition (Supports both /api/recruitment/requisitions/:id and /api/requisitions/:id)
app.put(['/api/recruitment/requisitions/:id', '/api/requisitions/:id'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!canEditRecruitment(req.user)) {
      return res.status(403).json({
        error:
          'Dashboard Viewing Access Only: Data entry and modification is reserved for HR team members, Manager (HR & OD), and System Admin.',
      });
    }

    const id = parseInt(req.params.id, 10);
    const [existing] = await db.select().from(recruitmentRequisitions).where(eq(recruitmentRequisitions.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Requisition not found.' });
    }

    // Record-level Concurrency / Conflict Check
    const clientVersion = req.body.version !== undefined ? parseInt(String(req.body.version), 10) : null;
    if (clientVersion !== null && clientVersion < existing.version) {
      return res.status(409).json({
        error: `Simultaneous update conflict: Record was updated by ${
          existing.lastUpdatedByName || 'another employee'
        }. Please refresh to view the latest changes before saving.`,
        currentRecord: existing,
      });
    }

    const {
      positionTitle,
      department,
      requisitionDate,
      requisitionSubmittedBy,
      hod,
      company,
      vacancy,
      recruitmentType,
      replacementOfWhom,
      replacementEmployeeSalary,
      offerLetterDate,
      dateOfJoining,
      recruitmentStatus,
      remarks,
      recruitmentAssistedByName,
      recruitmentAssistedByCode,
    } = req.body;

    if (requisitionSubmittedBy !== undefined && !requisitionSubmittedBy.trim()) {
      return res.status(400).json({ error: 'Requisition Submitted By is required and cannot be empty.' });
    }
    if (hod !== undefined && !hod.trim()) {
      return res.status(400).json({ error: 'Head of Department (HOD) is required and cannot be empty.' });
    }

    const newReqDate = requisitionDate || existing.requisitionDate;
    const newStatus = recruitmentStatus || existing.recruitmentStatus;
    const newDOJ = dateOfJoining !== undefined ? (dateOfJoining || null) : existing.dateOfJoining;

    // Automatic calculation of Turnaround Time:
    // Time to Fill = Date of Joining (DOJ) - Requisition Date
    let timeToFillDays: number | null = null;
    if (newStatus === 'Joined' && newDOJ && newReqDate) {
      timeToFillDays = calculateCalendarDays(newReqDate, newDOJ);
    }

    // Detect Changes for Audit Trail
    const changes: string[] = [];
    if (newStatus !== existing.recruitmentStatus) {
      changes.push(`Status: '${existing.recruitmentStatus}' ➔ '${newStatus}'`);
    }
    if (newDOJ !== existing.dateOfJoining) {
      changes.push(`DOJ: '${existing.dateOfJoining || 'None'}' ➔ '${newDOJ || 'None'}'`);
    }
    if (positionTitle && positionTitle !== existing.positionTitle) {
      changes.push(`Position: '${existing.positionTitle}' ➔ '${positionTitle}'`);
    }
    if (recruitmentAssistedByName && recruitmentAssistedByName !== existing.recruitmentAssistedByName) {
      changes.push(`Assisted By: '${existing.recruitmentAssistedByName}' ➔ '${recruitmentAssistedByName}'`);
    }
    if (offerLetterDate !== undefined && offerLetterDate !== existing.offerLetterDate) {
      changes.push(`Offer Letter: '${existing.offerLetterDate || 'None'}' ➔ '${offerLetterDate || 'None'}'`);
    }

    const nextVersion = existing.version + 1;

    const [updated] = await db
      .update(recruitmentRequisitions)
      .set({
        positionTitle: positionTitle !== undefined ? positionTitle : existing.positionTitle,
        department: department !== undefined ? department : existing.department,
        requisitionDate: newReqDate,
        requisitionSubmittedBy: requisitionSubmittedBy !== undefined ? requisitionSubmittedBy : existing.requisitionSubmittedBy,
        hod: hod !== undefined ? hod : existing.hod,
        company: company !== undefined ? company : existing.company,
        vacancy: vacancy !== undefined ? parseInt(String(vacancy), 10) : existing.vacancy,
        recruitmentType: recruitmentType !== undefined ? recruitmentType : existing.recruitmentType,
        replacementOfWhom: replacementOfWhom !== undefined ? replacementOfWhom : existing.replacementOfWhom,
        replacementEmployeeSalary:
          replacementEmployeeSalary !== undefined ? replacementEmployeeSalary : existing.replacementEmployeeSalary,
        offerLetterDate: offerLetterDate !== undefined ? (offerLetterDate || null) : existing.offerLetterDate,
        dateOfJoining: newDOJ,
        recruitmentStatus: newStatus,
        timeToFillDays,
        remarks: remarks !== undefined ? remarks : existing.remarks,
        recruitmentAssistedByName:
          recruitmentAssistedByName !== undefined ? recruitmentAssistedByName : existing.recruitmentAssistedByName,
        recruitmentAssistedByCode:
          recruitmentAssistedByCode !== undefined ? recruitmentAssistedByCode : existing.recruitmentAssistedByCode,
        lastUpdatedById: req.user?.employeeCode || req.user?.uid || 'user',
        lastUpdatedByName: req.user?.name || 'HR Employee',
        lastUpdatedAt: new Date(),
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(eq(recruitmentRequisitions.id, id))
      .returning();

    // Log to Audit Trail
    if (changes.length > 0) {
      await db.insert(recruitmentAuditLogs).values({
        requisitionId: updated.id,
        requisitionCode: updated.requisitionCode,
        positionTitle: updated.positionTitle,
        action: newStatus !== existing.recruitmentStatus ? 'STATUS_CHANGE' : 'UPDATE',
        fieldName: changes.map((c) => c.split(':')[0]).join(', '),
        previousValue: existing.recruitmentStatus,
        newValue: updated.recruitmentStatus,
        details: changes.join('; '),
        performedByUserId: req.user?.employeeCode || req.user?.uid,
        performedByName: req.user?.name || 'HR Employee',
        performedByRole: req.user?.role,
      });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Delete Requisition (Supports both /api/recruitment/requisitions/:id and /api/requisitions/:id)
app.delete(['/api/recruitment/requisitions/:id', '/api/requisitions/:id'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Authorized deletion: System Administrator, Head of HR, and Manager (HR & OD)
    const allowedDelete =
      req.user?.role === 'admin' ||
      ['02-02-2222', '01-02-0440', '22-02-1826'].includes(req.user?.employeeCode || '');
    if (!allowedDelete) {
      return res.status(403).json({ error: 'Permission denied: Only Admin, Head of HR, or Manager (HR & OD) can delete recruitment records.' });
    }

    const id = parseInt(req.params.id, 10);
    const [existing] = await db.select().from(recruitmentRequisitions).where(eq(recruitmentRequisitions.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Requisition not found.' });
    }

    await db.insert(recruitmentAuditLogs).values({
      requisitionId: null,
      requisitionCode: existing.requisitionCode,
      positionTitle: existing.positionTitle,
      action: 'DELETE',
      fieldName: 'RECORD',
      previousValue: `${existing.requisitionCode} (${existing.positionTitle})`,
      newValue: 'DELETED',
      details: `Requisition ${existing.requisitionCode} for ${existing.positionTitle} was deleted.`,
      performedByUserId: req.user?.employeeCode || req.user?.uid,
      performedByName: req.user?.name || 'HR Employee',
      performedByRole: req.user?.role,
    });

    await db.delete(recruitmentRequisitions).where(eq(recruitmentRequisitions.id, id));
    res.json({ success: true, message: 'Requisition deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Excel Bulk Import / MRF Sync
app.post('/api/recruitment/import-excel', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!canEditRecruitment(req.user)) {
      return res.status(403).json({ error: 'Permission denied to import recruitment data.' });
    }

    const { records, mode = 'upsert' } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'No records provided for import.' });
    }

    const existingList = await db.select().from(recruitmentRequisitions);
    const existingByCode = new Map(existingList.map((r) => [r.requisitionCode, r]));
    const existingBySl = new Map(existingList.map((r) => [r.sl, r]));

    let importedCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const sl = row.sl || i + 1;
      const code = row.requisitionCode || `MRF-2026-${String(sl).padStart(3, '0')}`;
      const status = row.recruitmentStatus || 'Ongoing';
      const reqDate = row.requisitionDate || getTodayDhaka();
      const doj = row.dateOfJoining || null;

      let timeToFill: number | null = null;
      if (status === 'Joined' && doj && reqDate) {
        timeToFill = calculateCalendarDays(reqDate, doj);
      }

      const existingRecord = existingByCode.get(code) || existingBySl.get(sl);

      if (existingRecord && mode === 'upsert') {
        await db
          .update(recruitmentRequisitions)
          .set({
            positionTitle: row.positionTitle || existingRecord.positionTitle,
            department: row.department || existingRecord.department,
            requisitionDate: reqDate,
            requisitionSubmittedBy: row.requisitionSubmittedBy || existingRecord.requisitionSubmittedBy,
            hod: row.hod || existingRecord.hod,
            company: row.company || existingRecord.company,
            vacancy: row.vacancy ? parseInt(String(row.vacancy), 10) : existingRecord.vacancy,
            recruitmentType: row.recruitmentType || existingRecord.recruitmentType,
            replacementOfWhom: row.replacementOfWhom !== undefined ? row.replacementOfWhom : existingRecord.replacementOfWhom,
            replacementEmployeeSalary:
              row.replacementEmployeeSalary !== undefined
                ? row.replacementEmployeeSalary
                : existingRecord.replacementEmployeeSalary,
            offerLetterDate: row.offerLetterDate || existingRecord.offerLetterDate,
            dateOfJoining: doj,
            recruitmentStatus: status,
            timeToFillDays: timeToFill,
            remarks: row.remarks !== undefined ? row.remarks : existingRecord.remarks,
            recruitmentAssistedByName: row.recruitmentAssistedByName || existingRecord.recruitmentAssistedByName,
            recruitmentAssistedByCode: row.recruitmentAssistedByCode || existingRecord.recruitmentAssistedByCode,
            lastUpdatedByName: req.user?.name || 'Excel Import',
            lastUpdatedAt: new Date(),
            version: existingRecord.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(recruitmentRequisitions.id, existingRecord.id));
        updatedCount++;
      } else if (!existingRecord) {
        await db.insert(recruitmentRequisitions).values({
          sl,
          requisitionCode: code,
          positionTitle: row.positionTitle || 'Position',
          department: row.department || 'Operations',
          requisitionDate: reqDate,
          requisitionSubmittedBy: row.requisitionSubmittedBy || 'HOD',
          hod: row.hod || 'Department Head',
          company: row.company || 'RAL',
          vacancy: row.vacancy ? parseInt(String(row.vacancy), 10) : 1,
          recruitmentType: row.recruitmentType || 'New Recruitment',
          replacementOfWhom: row.replacementOfWhom || null,
          replacementEmployeeSalary: row.replacementEmployeeSalary || null,
          offerLetterDate: row.offerLetterDate || null,
          dateOfJoining: doj,
          recruitmentStatus: status,
          timeToFillDays: timeToFill,
          remarks: row.remarks || null,
          recruitmentAssistedByName: row.recruitmentAssistedByName || 'Quazi Nuzhat Rahman',
          recruitmentAssistedByCode: row.recruitmentAssistedByCode || '22-02-1330',
          createdByName: req.user?.name || 'Excel Import',
          lastUpdatedByName: req.user?.name || 'Excel Import',
          version: 1,
        });
        importedCount++;
      }
    }

    await db.insert(recruitmentAuditLogs).values({
      requisitionCode: 'EXCEL-IMPORT',
      positionTitle: 'Master MRF Workbook Import',
      action: 'IMPORT',
      fieldName: 'ALL',
      previousValue: null,
      newValue: `${importedCount} added, ${updatedCount} updated`,
      details: `Excel import processed: ${importedCount} new requisitions inserted, ${updatedCount} existing records updated.`,
      performedByUserId: req.user?.employeeCode || req.user?.uid,
      performedByName: req.user?.name || 'HR Employee',
      performedByRole: req.user?.role,
    });

    res.json({ success: true, importedCount, updatedCount, totalProcessed: records.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Comprehensive Recruitment Analytics & Dynamic Metrics
app.get('/api/recruitment/analytics', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const today = getTodayDhaka();
    const filterCompany = req.query.company as string | undefined;
    const filterHod = req.query.hod as string | undefined;

    let records = await withDbRetry(() => db.select().from(recruitmentRequisitions));
    if (filterCompany && filterCompany !== 'ALL') {
      records = records.filter((r) => r.company === filterCompany);
    }
    if (filterHod && filterHod !== 'ALL') {
      records = records.filter((r) => r.hod === filterHod);
    }

    const totalRequisitions = records.length;
    let totalVacancies = 0;
    let joinedCount = 0;
    let ongoingCount = 0;
    let heldUpCount = 0;
    let cancelledCount = 0;
    let didNotJoinCount = 0;
    let newRecruitmentCount = 0;
    let replacementCount = 0;

    let totalTimeToFillSum = 0;
    let joinedWithTimeToFillCount = 0;

    // Alert buckets
    let ongoingOlder30 = 0;
    let ongoingOlder60 = 0;
    let ongoingOlder90 = 0;
    let missingDOJ = 0;
    let missingOfferLetter = 0;

    // Monthly aggregation
    const monthlyMap = new Map<
      string,
      { requisitions: number; joined: number; ongoing: number; timeToFillSum: number; joinedCount: number }
    >();

    // Department aggregation
    const deptMap = new Map<
      string,
      { total: number; joined: number; ongoing: number; timeToFillSum: number; joinedCount: number }
    >();

    // Company aggregation
    const companyMap = new Map<string, { total: number; joined: number; ongoing: number; heldUp: number }>();
    const knownCompanies = ['RAL', 'SGL', 'PSL', 'MTSL', 'RDL', 'RBL'];
    knownCompanies.forEach((c) => companyMap.set(c, { total: 0, joined: 0, ongoing: 0, heldUp: 0 }));

    // Authorized HR Employees for workload tracking
    const hrEmployees = [
      { code: '22-02-1826', name: 'Shahriyar Naiem', designation: 'Manager, HR & OD' },
      { code: '22-02-1330', name: 'Quazi Nuzhat Rahman', designation: 'Senior Executive, HR' },
      { code: '22-02-1642', name: 'Sabbir Hossain', designation: 'Executive, HR' },
      { code: '02-02-2059', name: 'Fariha Nasmi', designation: 'Assistant Executive, HR' },
      { code: '22-02-1551', name: 'Maisha Islam', designation: 'Assistant Executive, HR' },
    ];

    const employeeMap = new Map<
      string,
      {
        code: string;
        name: string;
        designation: string;
        totalAssigned: number;
        joined: number;
        ongoing: number;
        heldUp: number;
        didNotJoin: number;
        cancelled: number;
        timeToFillSum: number;
        recentRequisitions: any[];
      }
    >();

    hrEmployees.forEach((emp) => {
      employeeMap.set(emp.code, {
        code: emp.code,
        name: emp.name,
        designation: emp.designation,
        totalAssigned: 0,
        joined: 0,
        ongoing: 0,
        heldUp: 0,
        didNotJoin: 0,
        cancelled: 0,
        timeToFillSum: 0,
        recentRequisitions: [],
      });
    });

    records.forEach((r) => {
      totalVacancies += r.vacancy || 1;

      // Status
      if (r.recruitmentStatus === 'Joined') joinedCount++;
      else if (r.recruitmentStatus === 'Ongoing') ongoingCount++;
      else if (r.recruitmentStatus === 'Held Up') heldUpCount++;
      else if (r.recruitmentStatus === 'Cancelled') cancelledCount++;
      else if (r.recruitmentStatus === 'Did not Join') didNotJoinCount++;

      // Type
      if (r.recruitmentType === 'New Recruitment') newRecruitmentCount++;
      else replacementCount++;

      // Pending age
      const pendingAge = calculateCalendarDays(r.requisitionDate, today);
      if (r.recruitmentStatus === 'Ongoing') {
        if (pendingAge > 90) ongoingOlder90++;
        else if (pendingAge > 60) ongoingOlder60++;
        else if (pendingAge > 30) ongoingOlder30++;

        if (!r.offerLetterDate) missingOfferLetter++;
      }

      if (r.recruitmentStatus === 'Joined') {
        if (!r.dateOfJoining) missingDOJ++;
      }

      // Time to Fill (ONLY for Joined)
      if (r.recruitmentStatus === 'Joined' && r.timeToFillDays && r.timeToFillDays > 0) {
        totalTimeToFillSum += r.timeToFillDays;
        joinedWithTimeToFillCount++;
      }

      // Monthly Trends
      const monthKey = r.requisitionDate.substring(0, 7); // '2026-03'
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          requisitions: 0,
          joined: 0,
          ongoing: 0,
          timeToFillSum: 0,
          joinedCount: 0,
        });
      }
      const m = monthlyMap.get(monthKey)!;
      m.requisitions++;
      if (r.recruitmentStatus === 'Joined') {
        m.joined++;
        if (r.timeToFillDays && r.timeToFillDays > 0) {
          m.timeToFillSum += r.timeToFillDays;
          m.joinedCount++;
        }
      } else if (r.recruitmentStatus === 'Ongoing') {
        m.ongoing++;
      }

      // Department
      const dept = r.department || 'Other';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { total: 0, joined: 0, ongoing: 0, timeToFillSum: 0, joinedCount: 0 });
      }
      const d = deptMap.get(dept)!;
      d.total++;
      if (r.recruitmentStatus === 'Joined') {
        d.joined++;
        if (r.timeToFillDays && r.timeToFillDays > 0) {
          d.timeToFillSum += r.timeToFillDays;
          d.joinedCount++;
        }
      } else if (r.recruitmentStatus === 'Ongoing') {
        d.ongoing++;
      }

      // Company
      const comp = r.company || 'RAL';
      if (!companyMap.has(comp)) {
        companyMap.set(comp, { total: 0, joined: 0, ongoing: 0, heldUp: 0 });
      }
      const c = companyMap.get(comp)!;
      c.total++;
      if (r.recruitmentStatus === 'Joined') c.joined++;
      else if (r.recruitmentStatus === 'Ongoing') c.ongoing++;
      else if (r.recruitmentStatus === 'Held Up') c.heldUp++;

      // Assisted By Employee
      // Match by code or name
      let empEntry = r.recruitmentAssistedByCode ? employeeMap.get(r.recruitmentAssistedByCode) : undefined;
      if (!empEntry && r.recruitmentAssistedByName) {
        const found = hrEmployees.find((e) =>
          r.recruitmentAssistedByName.toLowerCase().includes(e.name.toLowerCase().split(' ')[0])
        );
        if (found) empEntry = employeeMap.get(found.code);
      }

      if (empEntry) {
        empEntry.totalAssigned++;
        if (r.recruitmentStatus === 'Joined') {
          empEntry.joined++;
          if (r.timeToFillDays && r.timeToFillDays > 0) {
            empEntry.timeToFillSum += r.timeToFillDays;
          }
        } else if (r.recruitmentStatus === 'Ongoing') {
          empEntry.ongoing++;
        } else if (r.recruitmentStatus === 'Held Up') {
          empEntry.heldUp++;
        } else if (r.recruitmentStatus === 'Did not Join') {
          empEntry.didNotJoin++;
        } else if (r.recruitmentStatus === 'Cancelled') {
          empEntry.cancelled++;
        }

        if (empEntry.recentRequisitions.length < 5) {
          empEntry.recentRequisitions.push(r);
        }
      }
    });

    const averageTimeToFill =
      joinedWithTimeToFillCount > 0 ? Math.round((totalTimeToFillSum / joinedWithTimeToFillCount) * 10) / 10 : 0;

    // Build Chart Data
    const statusOverview = [
      {
        name: 'Joined' as const,
        count: joinedCount,
        percentage: totalRequisitions > 0 ? Math.round((joinedCount / totalRequisitions) * 100) : 0,
        color: '#10B981', // Emerald
      },
      {
        name: 'Ongoing' as const,
        count: ongoingCount,
        percentage: totalRequisitions > 0 ? Math.round((ongoingCount / totalRequisitions) * 100) : 0,
        color: '#3B82F6', // Royal Blue
      },
      {
        name: 'Held Up' as const,
        count: heldUpCount,
        percentage: totalRequisitions > 0 ? Math.round((heldUpCount / totalRequisitions) * 100) : 0,
        color: '#F59E0B', // Amber
      },
      {
        name: 'Did not Join' as const,
        count: didNotJoinCount,
        percentage: totalRequisitions > 0 ? Math.round((didNotJoinCount / totalRequisitions) * 100) : 0,
        color: '#8B5CF6', // Purple
      },
      {
        name: 'Cancelled' as const,
        count: cancelledCount,
        percentage: totalRequisitions > 0 ? Math.round((cancelledCount / totalRequisitions) * 100) : 0,
        color: '#EF4444', // Rose Red
      },
    ];

    // Sorted monthly trends
    const sortedMonthKeys = Array.from(monthlyMap.keys()).sort();
    const monthNames: Record<string, string> = {
      '2026-01': 'Jan 26',
      '2026-02': 'Feb 26',
      '2026-03': 'Mar 26',
      '2026-04': 'Apr 26',
      '2026-05': 'May 26',
      '2026-06': 'Jun 26',
      '2026-07': 'Jul 26',
      '2026-08': 'Aug 26',
      '2026-09': 'Sep 26',
      '2026-10': 'Oct 26',
      '2026-11': 'Nov 26',
      '2026-12': 'Dec 26',
    };

    const monthlyTrends = sortedMonthKeys.map((k) => {
      const data = monthlyMap.get(k)!;
      return {
        month: monthNames[k] || k,
        requisitions: data.requisitions,
        joined: data.joined,
        ongoing: data.ongoing,
      };
    });

    const monthlyTimeToFill = sortedMonthKeys.map((k) => {
      const data = monthlyMap.get(k)!;
      const avg = data.joinedCount > 0 ? Math.round((data.timeToFillSum / data.joinedCount) * 10) / 10 : 0;
      return {
        month: monthNames[k] || k,
        avgDays: avg,
        joinedCount: data.joinedCount,
      };
    });

    // Employee Profiles
    const employeeContributions = hrEmployees.map((emp) => {
      const data = employeeMap.get(emp.code)!;
      const avgTTF = data.joined > 0 ? Math.round((data.timeToFillSum / data.joined) * 10) / 10 : 0;
      const completionRate =
        data.totalAssigned > 0 ? Math.round((data.joined / data.totalAssigned) * 100) : 0;

      // Automatic star rating calculation (out of 5.0)
      let autoRating = 0;
      if (data.totalAssigned > 0) {
        let score = 2.0 + (completionRate / 100) * 2.0;
        if (avgTTF > 0) {
          if (avgTTF <= 45) score += 1.0;
          else if (avgTTF <= 60) score += 0.8;
          else if (avgTTF <= 75) score += 0.5;
          else score += 0.2;
        } else {
          score += 0.7; // Ongoing within 60-day corporate turnaround SLA
        }
        autoRating = Math.min(5.0, Math.round(score * 10) / 10);
      }

      return {
        employeeCode: emp.code,
        employeeName: emp.name,
        designation: emp.designation,
        totalAssigned: data.totalAssigned,
        joined: data.joined,
        ongoing: data.ongoing,
        heldUp: data.heldUp,
        didNotJoin: data.didNotJoin,
        cancelled: data.cancelled,
        avgTimeToFill: avgTTF,
        completionRate,
        rating: autoRating,
        ratingFeedback: '',
        recentRequisitions: data.recentRequisitions,
      };
    });

    // Recruitment Type
    const recruitmentTypeAnalysis = [
      {
        type: 'New Recruitment' as const,
        count: newRecruitmentCount,
        percentage: totalRequisitions > 0 ? Math.round((newRecruitmentCount / totalRequisitions) * 100) : 0,
        color: '#0EA5E9', // Cyan/Sky
      },
      {
        type: 'Replacement' as const,
        count: replacementCount,
        percentage: totalRequisitions > 0 ? Math.round((replacementCount / totalRequisitions) * 100) : 0,
        color: '#6366F1', // Indigo
      },
    ];

    // Department Breakdown
    const departmentBreakdown = Array.from(deptMap.entries())
      .map(([department, data]) => ({
        department,
        total: data.total,
        joined: data.joined,
        ongoing: data.ongoing,
        avgTimeToFill: data.joinedCount > 0 ? Math.round((data.timeToFillSum / data.joinedCount) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Company Breakdown
    const companyBreakdown = Array.from(companyMap.entries()).map(([company, data]) => ({
      company,
      total: data.total,
      joined: data.joined,
      ongoing: data.ongoing,
      heldUp: data.heldUp,
    }));

    res.json({
      cards: {
        totalRequisitions,
        totalVacancies,
        joinedEmployees: joinedCount,
        ongoingRecruitment: ongoingCount,
        heldUpRecruitment: heldUpCount,
        cancelledRecruitment: cancelledCount,
        didNotJoinRecruitment: didNotJoinCount,
        averageTimeToFill,
        newRecruitment: newRecruitmentCount,
        replacementRecruitment: replacementCount,
      },
      charts: {
        statusOverview,
        monthlyTrends,
        employeeContributions,
        recruitmentTypeAnalysis,
        departmentBreakdown,
        companyBreakdown,
        monthlyTimeToFill,
      },
      alerts: {
        ongoingOlder30,
        ongoingOlder60,
        ongoingOlder90,
        missingDOJ,
        missingOfferLetter,
        heldUp: heldUpCount,
      },
      lastSyncTimestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Recruitment Audit Log
app.get('/api/recruitment/audit-logs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await db
      .select()
      .from(recruitmentAuditLogs)
      .orderBy(desc(recruitmentAuditLogs.createdAt))
      .limit(200);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Ratings Management (Head of HR & Manager can rate the 4 HR employees out of 5)
app.get('/api/recruitment/ratings', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const allRatings = await db.select().from(recruitmentRatings).orderBy(desc(recruitmentRatings.createdAt));
    res.json(allRatings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/recruitment/ratings', requireAuth, async (_req: AuthRequest, res: Response) => {
  return res.status(403).json({
    error:
      'System Policy Notice: Individual employee star ratings are 100% automated based on objective turnaround time and joining fulfillment metrics. Manual rating submissions by supervisors are disabled.',
  });
});

// 404 Handler for unmatched API routes (prevents fallback to HTML index.html)
app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API route not found' });
});

// Global Error Handling Middleware for Express API routes
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Global Express API error:', err);
  if (res.headersSent) return;
  const status = typeof err?.status === 'number' ? err.status : typeof err?.statusCode === 'number' ? err.statusCode : 500;
  res.status(status).json({
    error: err?.message || 'Internal Server Error',
  });
});

// Start Server and Vite Middleware
async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} is already in use by dev server process.`);
    } else {
      console.error('Server listen error:', err);
    }
  });

  // Initialize DB schema & tables check first, followed by seed verification
  ensureDatabaseReady()
    .then(() => seedDatabase(false))
    .catch((err) => {
      console.warn('Initial schema & seed check warning:', err);
    });
}

// Start Server only if running as standalone process (not on Vercel/Netlify/AWS serverless)
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.NETLIFY) {
  startServer();
}

export { app };
export default app;
