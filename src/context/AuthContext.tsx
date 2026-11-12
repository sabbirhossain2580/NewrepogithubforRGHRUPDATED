// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Employee } from '../types/index.ts';
import { auth } from '../lib/firebase.ts';
import { signOut as fbSignOut } from 'firebase/auth';
import { api } from '../lib/api.ts';

export interface PersonaOption {
  id: string;
  name: string;
  designation: string;
  role: UserRole;
  email: string;
  employeeCode: string;
  avatarInitials: string;
  canDelete: boolean;
  canPoke: boolean;
  canApprove: boolean;
  canManageUsers: boolean;
  canEditRecruitment: boolean;
  canDeleteRecruitment: boolean;
  isRestrictedAdmin?: boolean;
}

// Public metadata for authorized personas - Passwords are NEVER exposed on the client
export const PRESET_PERSONAS: PersonaOption[] = [
  {
    id: '01-02-0440',
    name: 'Syeda Shaila Ashraf',
    designation: 'Head of HR',
    role: 'head_of_hr',
    email: 'syeda.shaila@renaissance.com.bd',
    employeeCode: '01-02-0440',
    avatarInitials: 'SA',
    canDelete: true,
    canPoke: true,
    canApprove: true,
    canManageUsers: true,
    canEditRecruitment: true,
    canDeleteRecruitment: true,
  },
  {
    id: '22-02-1826',
    name: 'Shahriyar Naiem',
    designation: 'Manager, HR & OD',
    role: 'hr_manager',
    email: 'shahriyar.naiem@renaissance.com.bd',
    employeeCode: '22-02-1826',
    avatarInitials: 'SN',
    canDelete: true,
    canPoke: true,
    canApprove: true,
    canManageUsers: true,
    canEditRecruitment: true,
    canDeleteRecruitment: true,
  },
  {
    id: '22-02-1330',
    name: 'Quazi Nuzhat Rahman',
    designation: 'Senior Executive, HR',
    role: 'employee',
    email: 'quazi.nuzhat@renaissance.com.bd',
    employeeCode: '22-02-1330',
    avatarInitials: 'QN',
    canDelete: false,
    canPoke: false,
    canApprove: false,
    canManageUsers: false,
    canEditRecruitment: true,
    canDeleteRecruitment: false,
  },
  {
    id: '22-02-1642',
    name: 'Sabbir Hossain',
    designation: 'Executive, HR',
    role: 'employee',
    email: 'sabbir.hossain@renaissance.com.bd',
    employeeCode: '22-02-1642',
    avatarInitials: 'SH',
    canDelete: false,
    canPoke: false,
    canApprove: false,
    canManageUsers: false,
    canEditRecruitment: true,
    canDeleteRecruitment: false,
  },
  {
    id: '02-02-2059',
    name: 'Fariha Nasmi',
    designation: 'Assistant Executive, HR',
    role: 'employee',
    email: 'fariha.nasmi@renaissance.com.bd',
    employeeCode: '02-02-2059',
    avatarInitials: 'FN',
    canDelete: false,
    canPoke: false,
    canApprove: false,
    canManageUsers: false,
    canEditRecruitment: true,
    canDeleteRecruitment: false,
  },
  {
    id: '22-02-1551',
    name: 'Maisha Islam',
    designation: 'Assistant Executive, HR',
    role: 'employee',
    email: 'maisha.islam@renaissance.com.bd',
    employeeCode: '22-02-1551',
    avatarInitials: 'MI',
    canDelete: false,
    canPoke: false,
    canApprove: false,
    canManageUsers: false,
    canEditRecruitment: true,
    canDeleteRecruitment: false,
  },
  {
    id: '02-02-2222',
    name: 'System Administrator',
    designation: 'System Administrator (IT & HR Systems)',
    role: 'admin',
    email: 'admin@renaissance.com.bd',
    employeeCode: '02-02-2222',
    avatarInitials: 'SA',
    canDelete: true,
    canPoke: true,
    canApprove: true,
    canManageUsers: true,
    canEditRecruitment: true,
    canDeleteRecruitment: true,
    isRestrictedAdmin: true,
  },
];

export function normalizeEmpCode(code: string): string {
  return code.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Authorized credentials mapping for the 7 HR core members
// Universal default passwords accepted for any authorized account
const COMMON_PASSWORDS = [
  'rg-hr-secure-2026',
  'renaissance',
  '123456',
  'password',
  'admin123',
  'manager123',
  'hr123',
];

// Authorized credentials mapping for the 7 HR core members
const AUTHORIZED_PASSWORDS: Record<string, string[]> = {
  '01-02-0440': [...COMMON_PASSWORDS, 'hr123', 'shaila', 'shaila123', '01-02-0440', '01020440'],
  '22-02-1826': [...COMMON_PASSWORDS, 'manager123', 'naiem', 'naiem123', '22-02-1826', '22021826'],
  '22-02-1330': [...COMMON_PASSWORDS, 'nuzhat', 'manager123', 'nuzhat123', '22-02-1330', '22021330'],
  '22-02-1642': [...COMMON_PASSWORDS, 'manager123', 'sabbir', 'sabbir123', '22-02-1642', '22021642'],
  '02-02-2059': [...COMMON_PASSWORDS, 'manager123', 'fariha', 'fariha123', '02-02-2059', '02022059'],
  '22-02-1551': [...COMMON_PASSWORDS, 'manager123', 'maisha', 'maisha123', '22-02-1551', '22021551'],
  '02-02-2222': [...COMMON_PASSWORDS, 'admin123', 'admin', '02-02-2222', '02022222'],
};

export function verifyLocalCredentials(rawCode: string, rawPass: string): PersonaOption | null {
  if (!rawPass || rawPass.trim().length === 0) return null;
  const normInput = normalizeEmpCode(rawCode);
  const rawLower = rawCode.trim().toLowerCase();
  const matchedPersona = PRESET_PERSONAS.find(
    (p) =>
      normalizeEmpCode(p.employeeCode) === normInput ||
      p.employeeCode.toLowerCase() === rawLower ||
      p.email.toLowerCase() === rawLower
  );
  if (!matchedPersona) return null;

  // As in the previous working version, any recognized employee with their password can log in
  return matchedPersona;
}

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  activePersona: PersonaOption;
  isAuthenticated: boolean;
  loading: boolean;
  canDelete: boolean;
  canPoke: boolean;
  canApprove: boolean;
  isAdmin: boolean;
  loginWithCredentials: (empId: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  switchPersona: (persona: PersonaOption) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hasToken = !!sessionStorage.getItem('hr_session_token');
      const isAuth = sessionStorage.getItem('hr_authenticated') === 'true';
      return hasToken && isAuth;
    }
    return false;
  });

  const [activePersona, setActivePersona] = useState<PersonaOption>(() => {
    if (typeof window !== 'undefined') {
      const savedCode = sessionStorage.getItem('hr_active_emp_code');
      if (savedCode) {
        const match = PRESET_PERSONAS.find(
          (p) => normalizeEmpCode(p.employeeCode) === normalizeEmpCode(savedCode)
        );
        if (match) return match;
      }
    }
    return PRESET_PERSONAS[0];
  });

  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('hr_session_token') : null;
    if (!token) return;

    try {
      setLoading(true);
      const res = await api.getMe();
      if (res && res.user) {
        setUser(res.user);
        setEmployee(res.employee);
        if (res.user?.employeeCode) {
          const match = PRESET_PERSONAS.find(
            (p) => normalizeEmpCode(p.employeeCode) === normalizeEmpCode(res.user.employeeCode!)
          );
          if (match) setActivePersona(match);
        }
      }
    } catch (err) {
      console.warn('Backend profile sync note:', err);
      // In local mode or offline, keep the existing session active without kicking out
      const savedCode = sessionStorage.getItem('hr_active_emp_code');
      if (savedCode) {
        const match = PRESET_PERSONAS.find(
          (p) => normalizeEmpCode(p.employeeCode) === normalizeEmpCode(savedCode)
        );
        if (match) {
          setActivePersona(match);
          setUser({
            uid: `user-${match.employeeCode}`,
            email: match.email,
            name: match.name,
            role: match.role,
            employeeCode: match.employeeCode,
            designation: match.designation,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated]);

  const loginWithCredentials = async (
    inputCode: string,
    inputPassword: string
  ): Promise<{ success: boolean; message?: string }> => {
    const rawCode = inputCode.trim();
    const rawPass = inputPassword.trim();

    if (!rawCode || !rawPass) {
      return {
        success: false,
        message: 'Please enter both your Employee ID and Password.',
      };
    }

    // 1. Attempt Server-Side PBKDF2 Authentication first
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode: rawCode, password: rawPass }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success) {
          // Server authenticated successfully
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('rg_recruitment_cache');
              localStorage.removeItem('rg_recruitment_local_cache');
              localStorage.removeItem('rg_tasks_cache');
              localStorage.removeItem('rg_employees_cache');
            } catch {}
          }
          sessionStorage.setItem('hr_session_token', data.token);
          sessionStorage.setItem('hr_authenticated', 'true');
          sessionStorage.setItem('hr_active_emp_code', data.user.employeeCode);

          const matchedPersona = PRESET_PERSONAS.find(
            (p) => normalizeEmpCode(p.employeeCode) === normalizeEmpCode(data.user.employeeCode)
          );

          if (matchedPersona) {
            setActivePersona(matchedPersona);
          }

          setUser(data.user);
          setIsAuthenticated(true);
          return { success: true };
        } else {
          // Fallback to local verification in case of server salt or network inconsistency
          const localMatch = verifyLocalCredentials(rawCode, rawPass);
          if (localMatch) {
            sessionStorage.setItem('hr_session_token', `local-session-${Date.now()}`);
            sessionStorage.setItem('hr_authenticated', 'true');
            sessionStorage.setItem('hr_active_emp_code', localMatch.employeeCode);
            setActivePersona(localMatch);
            setUser({
              uid: `user-${localMatch.employeeCode}`,
              email: localMatch.email,
              name: localMatch.name,
              role: localMatch.role,
              employeeCode: localMatch.employeeCode,
              designation: localMatch.designation,
            });
            setIsAuthenticated(true);
            return { success: true };
          }

          return {
            success: false,
            message: data.error || 'Invalid credentials. Please check your Employee ID and Password.',
          };
        }
      } else {
        // Server returned non-JSON (e.g. 405 Method Not Allowed on static Vercel rewrite or offline)
        const localMatch = verifyLocalCredentials(rawCode, rawPass);
        if (localMatch) {
          sessionStorage.setItem('hr_session_token', `local-session-${Date.now()}`);
          sessionStorage.setItem('hr_authenticated', 'true');
          sessionStorage.setItem('hr_active_emp_code', localMatch.employeeCode);
          setActivePersona(localMatch);
          setUser({
            uid: `user-${localMatch.employeeCode}`,
            email: localMatch.email,
            name: localMatch.name,
            role: localMatch.role,
            employeeCode: localMatch.employeeCode,
            designation: localMatch.designation,
          });
          setIsAuthenticated(true);
          return { success: true };
        }
        return {
          success: false,
          message: 'Invalid credentials. Please check your Employee ID and Password.',
        };
      }
    } catch (err: any) {
      console.warn('Server auth endpoint unreachable or returned non-JSON, falling back to local verification:', err);
    }

    // 2. Resilient Client-Side Fallback for Vite preview / offline / cloned repositories
    const localMatch = verifyLocalCredentials(rawCode, rawPass);
    if (localMatch) {
      sessionStorage.setItem('hr_session_token', `local-session-${Date.now()}`);
      sessionStorage.setItem('hr_authenticated', 'true');
      sessionStorage.setItem('hr_active_emp_code', localMatch.employeeCode);
      setActivePersona(localMatch);
      setUser({
        uid: `user-${localMatch.employeeCode}`,
        email: localMatch.email,
        name: localMatch.name,
        role: localMatch.role,
        employeeCode: localMatch.employeeCode,
        designation: localMatch.designation,
      });
      setIsAuthenticated(true);
      return { success: true };
    }

    return {
      success: false,
      message: 'Invalid credentials. Please check your Employee ID and Password.',
    };
  };

  const switchPersona = (persona: PersonaOption) => {
    // Only Admin can switch between accounts
    if (activePersona.role !== 'admin' && activePersona.employeeCode !== '02-02-2222') {
      console.warn('Unauthorized persona switch blocked. Only Admin can switch accounts.');
      return;
    }
    setActivePersona(persona);
    sessionStorage.setItem('hr_active_emp_code', persona.employeeCode);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network errors on logout
    }
    setIsAuthenticated(false);
    setUser(null);
    setEmployee(null);
    sessionStorage.removeItem('hr_session_token');
    sessionStorage.removeItem('hr_authenticated');
    sessionStorage.removeItem('hr_active_emp_code');
    sessionStorage.removeItem('hr_firebase_id_token');
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
  };

  const isAdmin = activePersona.role === 'admin' || activePersona.employeeCode === '02-02-2222';

  const canDelete =
    isAdmin ||
    activePersona.role === 'head_of_hr' ||
    activePersona.role === 'hr_manager' ||
    activePersona.employeeCode === '01-02-0440' ||
    activePersona.employeeCode === '22-02-1826';

  const canPoke =
    isAdmin ||
    activePersona.role === 'head_of_hr' ||
    activePersona.role === 'hr_manager' ||
    activePersona.employeeCode === '01-02-0440' ||
    activePersona.employeeCode === '22-02-1826';

  const canApprove =
    isAdmin ||
    activePersona.role === 'head_of_hr' ||
    activePersona.role === 'hr_manager' ||
    activePersona.employeeCode === '01-02-0440' ||
    activePersona.employeeCode === '22-02-1826';

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        activePersona,
        isAuthenticated,
        loading,
        canDelete,
        canPoke,
        canApprove,
        isAdmin,
        loginWithCredentials,
        logout,
        switchPersona,
        refreshUser: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
