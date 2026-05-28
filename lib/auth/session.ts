/**
 * 세션 + 사용자 헬퍼.
 * - cookie 값 = 32-byte CSPRNG hex 평문 (64자).
 * - D1 sessions.id = SHA-256(cookie) hex (DB 누설 시 cookie 위조 불가).
 * - 30일 만료 (sliding 없음). 만료 시 재로그인.
 */

import { COOKIE_SESSION, readCookie } from "./cookie";
import { randomHex } from "./random";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthUser {
  id: string;
  google_sub: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  // feat/profile (2026-05-27): 사용자 커스텀 표시 이름. NULL이면 name(Google) 사용.
  // 표시 우선순위: display_name > name > email. callback은 이 필드를 건드리지 않음.
  display_name: string | null;
  // 1-A (2026-05-27): admin 권한. 1=admin, 0=일반. middleware는 자체 SQL 사용,
  // 본 필드는 UI 측 조건 표시(예: admin 메뉴) 등 향후 활용.
  is_admin: number;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

interface D1Like {
  prepare(sql: string): {
    bind(...args: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
  };
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  const arr = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < arr.length; i++) out += arr[i].toString(16).padStart(2, "0");
  return out;
}

/**
 * Google 프로필 → users upsert. 신규면 생성, 기존이면 last_login + 프로필 동기화.
 * 반환: user.id.
 */
export async function upsertUserByGoogleSub(
  db: D1Like,
  profile: GoogleProfile,
): Promise<string> {
  const now = Date.now();
  const existing = await db
    .prepare("SELECT id FROM users WHERE google_sub = ?")
    .bind(profile.sub)
    .first<{ id: string }>();
  if (existing) {
    await db
      .prepare(
        "UPDATE users SET last_login_at = ?, email = ?, name = ?, avatar_url = ? WHERE id = ?",
      )
      .bind(
        now,
        profile.email,
        profile.name ?? null,
        profile.picture ?? null,
        existing.id,
      )
      .run();
    return existing.id;
  }
  const id = randomHex(16);
  await db
    .prepare(
      "INSERT INTO users (id, google_sub, email, name, avatar_url, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      id,
      profile.sub,
      profile.email,
      profile.name ?? null,
      profile.picture ?? null,
      now,
      now,
    )
    .run();
  return id;
}

/**
 * 새 세션 발급.
 * 반환: cookie에 담을 평문 값 (64자 hex).
 */
export async function createSession(
  db: D1Like,
  userId: string,
  userAgent: string | null,
): Promise<{ cookieValue: string; expiresAt: number }> {
  const cookieValue = randomHex(32);
  const sessionId = await sha256Hex(cookieValue);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  await db
    .prepare(
      "INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(sessionId, userId, now, expiresAt, userAgent)
    .run();
  return { cookieValue, expiresAt };
}

export async function destroySessionByCookie(
  db: D1Like,
  cookieValue: string,
): Promise<void> {
  const sessionId = await sha256Hex(cookieValue);
  await db
    .prepare("DELETE FROM sessions WHERE id = ?")
    .bind(sessionId)
    .run();
}

/**
 * 요청 헤더에서 세션 cookie → 현재 사용자.
 * 만료 / 없음 → null.
 */
export async function getUserFromHeaders(
  db: D1Like,
  headers: Headers,
): Promise<AuthUser | null> {
  const cookieValue = readCookie(headers, COOKIE_SESSION);
  if (!cookieValue) return null;
  const sessionId = await sha256Hex(cookieValue);
  const row = await db
    .prepare(
      "SELECT u.id AS id, u.google_sub AS google_sub, u.email AS email, u.name AS name, u.avatar_url AS avatar_url, u.display_name AS display_name, u.is_admin AS is_admin " +
        "FROM sessions s JOIN users u ON s.user_id = u.id " +
        "WHERE s.id = ? AND s.expires_at > ?",
    )
    .bind(sessionId, Date.now())
    .first<AuthUser>();
  return row ?? null;
}

/**
 * 표시 이름 변경. value=null이면 커스텀 이름 제거(Google name으로 복원).
 */
export async function updateDisplayName(
  db: D1Like,
  userId: string,
  value: string | null,
): Promise<void> {
  await db
    .prepare("UPDATE users SET display_name = ? WHERE id = ?")
    .bind(value, userId)
    .run();
}

interface D1BatchLike extends D1Like {
  batch(statements: unknown[]): Promise<unknown>;
}

/**
 * 계정 영구 삭제. user_data + sessions + users를 명시적으로 삭제 (자식→부모 순).
 * CASCADE에 의존하지 않음 — D1 FK enforcement 상태와 무관하게 보장. 원자적 batch.
 */
export async function deleteAccount(
  db: D1BatchLike,
  userId: string,
): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM user_data WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM users WHERE id = ?").bind(userId),
  ]);
}

export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
