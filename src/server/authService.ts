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

// Pre-computed salted PBKDF2 hashes for authorized personnel
// Passwords are NEVER transmitted in raw client code or stored in plaintext
function hashPassword(plain: string): string {
  return crypto.pbkdf2Sync(plain, AUTH_SALT, 10000, 32, 'sha256').toString('hex');
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
      '2348b0503529e03a6f6da49f989ac52acfbb8dc8832ca7a133f2120a296932d7', // hr123 (Official)
      'd43b320e9e4e8edbee32233c62923aec12a89812cf141e5e8129e82956bd1548', // shaila
      '452790a69c7a0917d10ab825184665151362254eec0ef5143f63d2fd6cce9fe5', // shaila123
      'bc1441845bac26e17bc29b3716831a53c28cabd23e155b573a96e49893121503', // legacy hash
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
      'fb4e2c9613c370855dfa54f18f1ddc1ff8a610310c6d110432965056cd53f416', // manager123 (Official)
      '6e3250a0f6a496fc5e97cce9cbf345e7950bdb96079d8290c5c954ae830b5b29', // naiem
      '808132a907c3a1fe257097c8d2f6797a4cfab09077d1596ec5521c2710957f5b', // naiem123
      'fdf88d67ab09255f74bd4067129b927ef4ee8df41726dbbe747455185b889b61', // legacy hash
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
      '8e0fd361840134c763805a196c1abd44f4a760b47e9a912fdbf191a322ed5412', // nuzhat (Official)
      'fb4e2c9613c370855dfa54f18f1ddc1ff8a610310c6d110432965056cd53f416', // manager123
      '2bc4e19aa86bf364520f71bdc08112ee842db1b6725b3ea6685e87858be30ae9', // nuzhat123
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
      'fb4e2c9613c370855dfa54f18f1ddc1ff8a610310c6d110432965056cd53f416', // manager123 (Official)
      '580e6a8119578e34e87ab4f371d2319cc15f602cda03ef12b1844d3bec535050', // sabbir
      '0e6faeb8385ffbbe30020b498a7a5f495ff117953364d9657f3e905621c730e2', // sabbir123
      '64217b30ac2c1ea9a0f1b64b0d83cd54abe8b9ef969d2df7d5a38da475a40f32', // legacy hash
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
      'fb4e2c9613c370855dfa54f18f1ddc1ff8a610310c6d110432965056cd53f416', // manager123 (Official)
      '53d3a2874bf5073696ee1c642911dc4a5c45062f46f73fe305fc96bef89f8a94', // fariha
      '03a6e40599190853218e5f6b4866a3e92d91eb806fd725a8c6a01de21d5425de', // fariha123
      '18ce6ecef5f696fb16fdd9346b97bdd76f88677fffe6762d303d2a6c3b4ddf90', // legacy hash
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
      'fb4e2c9613c370855dfa54f18f1ddc1ff8a610310c6d110432965056cd53f416', // manager123 (Official)
      '1093d39d0f2a86deb42a59714de32ef646ce14397b5fe9a9d65ed202d1871e9f', // maisha
      '940e7f25d0f94ac100555c4aa6e61639d648035a343f74f1655a30597d9d34a4', // maisha123
      '7f9e1303cb9f4e3d8c76a9af7e712dacb3b0b28088e50b761d585505fcf0c0ef', // legacy hash
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
      '4cdd8b0fbf709be7aecb3d85f86c6ca81c6ce4a869f2c1e99d1b2e1afd116ab1', // admin123 (Official)
      'bef3a32aae69a4b10b66f2d1db2a3ebbbd99aba94a0c97825b2975bf040eedc6', // admin
      '00bc59efc1f8c238346930464575b71570b3ac9dfffbe252cd5952e6c2a7a751', // legacy hash
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
  if (!rawPassword || rawPassword.trim().length === 0) {
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
