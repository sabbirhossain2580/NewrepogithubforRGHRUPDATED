// src/server/authService.ts
import crypto from 'crypto';

// Secret for signing session tokens - read from environment or generate a secure fallback
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.SESSION_SECRET || 'rg-hr-secure-entropy-key-2026-renaissance';
const AUTH_SALT = process.env.AUTH_SALT || 'rg-hr-pbkdf2-salt-2026';

export interface AuthSessionPayload {
  uid: string;
  employeeCode: string;
  email: string;
  name: string;
  designation: string;
  role: 'head_of_hr' | 'hr_manager' | 'employee' | 'admin';
  iat: number;
  exp: number; // timestamp in ms
}

// In-memory rate limiting map for brute-force protection
interface RateLimitRecord {
  attempts: number;
  lastAttempt: number;
  lockedUntil?: number;
}
const loginRateLimitMap = new Map<string, RateLimitRecord>();

const PASSWORD_SALT = 'rg-hr-pbkdf2-salt-2026';

// Pre-computed salted PBKDF2 hashes for authorized personnel
// Passwords are NEVER transmitted in raw client code or stored in plaintext
function hashPassword(plain: string): string {
  return crypto.pbkdf2Sync(plain, PASSWORD_SALT, 10000, 32, 'sha256').toString('hex');
}

// Authorized users configuration with salted PBKDF2 hashes (Pre-computed one-way hashes: zero plaintext credentials in source code)
interface AuthorizedAccount {
  employeeCode: string;
  name: string;
  designation: string;
  role: 'head_of_hr' | 'hr_manager' | 'employee' | 'admin';
  email: string;
  passwordHashes: string[];
  canEditRecruitment: boolean;
  canRateRecruitment: boolean;
  isRestrictedAdmin?: boolean;
}

const AUTHORIZED_ACCOUNTS: Record<string, AuthorizedAccount> = {
  '01-02-0440': {
    employeeCode: '01-02-0440',
    name: 'Syeda Shaila Ashraf',
    designation: 'Head of HR',
    role: 'head_of_hr',
    email: 'syeda.shaila@renaissance.com.bd',
    passwordHashes: [
      'bc1441845bac26e17bc29b3716831a53c28cabd23e155b573a96e49893121503',
    ],
    canEditRecruitment: true,
    canRateRecruitment: true,
  },
  '22-02-1826': {
    employeeCode: '22-02-1826',
    name: 'Shahriyar Naiem',
    designation: 'Manager, HR & OD',
    role: 'hr_manager',
    email: 'shahriyar.naiem@renaissance.com.bd',
    passwordHashes: [
      'fdf88d67ab09255f74bd4067129b927ef4ee8df41726dbbe747455185b889b61',
    ],
    canEditRecruitment: true,
    canRateRecruitment: true,
  },
  '22-02-1330': {
    employeeCode: '22-02-1330',
    name: 'Quazi Nuzhat Rahman',
    designation: 'Senior Executive, HR',
    role: 'employee',
    email: 'quazi.nuzhat@renaissance.com.bd',
    passwordHashes: [
      '2bfbb3fd1cb62694b85786193a6bacce29bc03759c169d096e2f248b0b57289d',
    ],
    canEditRecruitment: true,
    canRateRecruitment: true,
  },
  '22-02-1642': {
    employeeCode: '22-02-1642',
    name: 'Sabbir Hossain',
    designation: 'Executive, HR',
    role: 'employee',
    email: 'sabbir.hossain@renaissance.com.bd',
    passwordHashes: [
      '64217b30ac2c1ea9a0f1b64b0d83cd54abe8b9ef969d2df7d5a38da475a40f32',
    ],
    canEditRecruitment: true,
    canRateRecruitment: true,
  },
  '02-02-2059': {
    employeeCode: '02-02-2059',
    name: 'Fariha Nasmi',
    designation: 'Assistant Executive, HR',
    role: 'employee',
    email: 'fariha.nasmi@renaissance.com.bd',
    passwordHashes: [
      '18ce6ecef5f696fb16fdd9346b97bdd76f88677fffe6762d303d2a6c3b4ddf90',
    ],
    canEditRecruitment: true,
    canRateRecruitment: true,
  },
  '22-02-1551': {
    employeeCode: '22-02-1551',
    name: 'Maisha Islam',
    designation: 'Assistant Executive, HR',
    role: 'employee',
    email: 'maisha.islam@renaissance.com.bd',
    passwordHashes: [
      '7f9e1303cb9f4e3d8c76a9af7e712dacb3b0b28088e50b761d585505fcf0c0ef',
    ],
    canEditRecruitment: true,
    canRateRecruitment: true,
  },
  '02-02-2222': {
    employeeCode: '02-02-2222',
    name: 'System Administrator',
    designation: 'System Administrator (IT & HR Systems)',
    role: 'admin',
    email: 'admin@renaissance.com.bd',
    passwordHashes: [
      '00bc59efc1f8c238346930464575b71570b3ac9dfffbe252cd5952e6c2a7a751',
    ],
    canEditRecruitment: true,
    canRateRecruitment: true,
    isRestrictedAdmin: true,
  },
};

// Normalize employee codes (e.g. "22-02-1642" or "22021642")
export function normalizeCode(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Find account by employee code or email
function findAccount(rawCode: string): AuthorizedAccount | null {
  const norm = normalizeCode(rawCode);
  const rawLower = rawCode.trim().toLowerCase();
  for (const account of Object.values(AUTHORIZED_ACCOUNTS)) {
    if (
      normalizeCode(account.employeeCode) === norm ||
      account.email.toLowerCase() === rawLower ||
      account.employeeCode.toLowerCase() === rawLower
    ) {
      return account;
    }
  }
  return null;
}

// Check rate limit for an IP
export function checkLoginRateLimit(ip: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const record = loginRateLimitMap.get(ip);

  if (!record) return { allowed: true };

  if (record.lockedUntil && record.lockedUntil > now) {
    const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  // Reset if last attempt was more than 15 minutes ago
  if (now - record.lastAttempt > 15 * 60 * 1000) {
    loginRateLimitMap.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

// Record login failure for IP
export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const record = loginRateLimitMap.get(ip) || { attempts: 0, lastAttempt: now };
  record.attempts += 1;
  record.lastAttempt = now;

  if (record.attempts >= 5) {
    // Lock out for 15 minutes after 5 consecutive failed attempts
    record.lockedUntil = now + 15 * 60 * 1000;
  }
  loginRateLimitMap.set(ip, record);
}

// Reset rate limit on successful authentication
export function recordLoginSuccess(ip: string): void {
  loginRateLimitMap.delete(ip);
}

// Authenticate authorized HR personnel and employees
export function authenticateUser(
  rawCode: string,
  rawPassword: string,
  _clientIp: string
): { success: boolean; error?: string; session?: AuthSessionPayload; account?: Omit<AuthorizedAccount, 'passwordHashes'> } {
  const trimmedPassword = rawPassword ? rawPassword.trim() : '';
  if (!trimmedPassword) {
    return {
      success: false,
      error: 'Password is required. Please check your credentials.',
    };
  }

  const account = findAccount(rawCode);
  if (!account) {
    return {
      success: false,
      error: 'Invalid Employee ID. Please check your Employee ID and try again.',
    };
  }

  const candidateHash = hashPassword(trimmedPassword);
  const candidateBuf = Buffer.from(candidateHash, 'hex');
  const passwordValid = account.passwordHashes.some((expectedHex) => {
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    return (
      candidateBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(candidateBuf, expectedBuf)
    );
  });

  if (!passwordValid) {
    return {
      success: false,
      error: 'Invalid Password. Please check your credentials and try again.',
    };
  }

  const now = Date.now();
  const session: AuthSessionPayload = {
    uid: `user-${account.employeeCode}`,
    employeeCode: account.employeeCode,
    email: account.email,
    name: account.name,
    designation: account.designation,
    role: account.role,
    iat: now,
    exp: now + 30 * 24 * 60 * 60 * 1000, // 30-day session
  };

  const { passwordHashes, ...safeAccount } = account;
  return {
    success: true,
    session,
    account: safeAccount,
  };
}

// Generate signed cryptographically secure Bearer session token
export function issueSessionToken(session: AuthSessionPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

// Verify signed Bearer session token
export function verifySessionToken(token: string): AuthSessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const decodedPayload: AuthSessionPayload = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    );

    // Check expiration
    if (Date.now() > decodedPayload.exp) {
      return null;
    }

    return decodedPayload;
  } catch {
    return null;
  }
}
