/**
 * 릴리스 노트 server-side ops — Union 모델 (파일 = 소스, D1 = admin 오버레이).
 *
 * /releases: listPublicReleases — file ∪ D1, D1 우선, deleted 제외.
 * /admin/releases: listAdminReleases — 모든 항목(source/deleted 표기 포함).
 * CRUD: upsertRelease(파일 오버라이드 또는 D1 신규/수정), softDeleteRelease(파일=tombstone / D1-only=hard delete).
 */

import { releases as fileReleases, type Release, type ReleaseKind } from "./releases";

type D1Row = {
  id: string;
  date: string;
  tool: string;
  title_ko: string;
  title_en: string;
  body_ko: string;
  body_en: string;
  kind: string | null;
  deleted: number;
  created_at: number;
  updated_at: number;
};

interface D1Like {
  prepare(sql: string): {
    bind(...args: unknown[]): {
      all<T>(): Promise<{ results: T[] }>;
      first<T>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
  };
}

function rowToRelease(r: D1Row): Release {
  return {
    id: r.id,
    date: r.date,
    tool: r.tool,
    title: { ko: r.title_ko, en: r.title_en },
    body: { ko: r.body_ko, en: r.body_en },
    kind: (r.kind as ReleaseKind | null) ?? undefined,
  };
}

async function readAllRows(db: D1Like): Promise<Map<string, D1Row>> {
  const result = await db
    .prepare("SELECT * FROM releases")
    .bind()
    .all<D1Row>();
  const map = new Map<string, D1Row>();
  for (const r of result.results) map.set(r.id, r);
  return map;
}

/** /releases 공개 페이지용 — 파일 ∪ D1, D1 우선, deleted 제외, date desc. */
export async function listPublicReleases(db: D1Like): Promise<Release[]> {
  const byId = await readAllRows(db);
  const out: Release[] = [];
  for (const f of fileReleases) {
    const d = byId.get(f.id);
    if (d?.deleted === 1) {
      byId.delete(f.id);
      continue;
    }
    out.push(d ? rowToRelease(d) : f);
    byId.delete(f.id);
  }
  // D1-only entries (admin 직접 추가, 파일에 없음).
  for (const d of byId.values()) {
    if (d.deleted === 1) continue;
    out.push(rowToRelease(d));
  }
  out.sort((a, b) => b.date.localeCompare(a.date));
  return out;
}

export type AdminRelease = Release & {
  /** 'file' = lib/releases.ts에 있음, 'd1' = admin 직접 추가(파일에 없음). */
  source: "file" | "d1";
  /** 'file' source인 경우 admin이 tombstone 처리한 상태. */
  deleted: boolean;
};

/** /admin/releases용 — 모든 항목(deleted 포함) + source 표기. date desc. */
export async function listAdminReleases(db: D1Like): Promise<AdminRelease[]> {
  const byId = await readAllRows(db);
  const out: AdminRelease[] = [];
  for (const f of fileReleases) {
    const d = byId.get(f.id);
    if (d) {
      out.push({
        ...rowToRelease(d),
        source: "file",
        deleted: d.deleted === 1,
      });
      byId.delete(f.id);
    } else {
      out.push({ ...f, source: "file", deleted: false });
    }
  }
  for (const d of byId.values()) {
    out.push({
      ...rowToRelease(d),
      source: "d1",
      deleted: d.deleted === 1,
    });
  }
  out.sort((a, b) => b.date.localeCompare(a.date));
  return out;
}

/**
 * UPSERT by id. 파일 entry id면 오버라이드 row 생성/갱신 (deleted=0으로 복원).
 * admin 신규(파일에 없는 id)면 새 D1 row.
 */
export async function upsertRelease(
  db: D1Like,
  r: Release,
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      "INSERT INTO releases (id, date, tool, title_ko, title_en, body_ko, body_en, kind, deleted, created_at, updated_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?) " +
        "ON CONFLICT(id) DO UPDATE SET " +
        "date=excluded.date, tool=excluded.tool, " +
        "title_ko=excluded.title_ko, title_en=excluded.title_en, " +
        "body_ko=excluded.body_ko, body_en=excluded.body_en, " +
        "kind=excluded.kind, deleted=0, updated_at=excluded.updated_at",
    )
    .bind(
      r.id,
      r.date,
      r.tool,
      r.title.ko,
      r.title.en,
      r.body.ko,
      r.body.en,
      r.kind ?? null,
      now,
      now,
    )
    .run();
}

/**
 * 삭제:
 *   - 파일 entry id → D1에 deleted=1 row 생성/갱신 (tombstone — /releases에서 가림).
 *   - D1-only id   → D1 row 삭제.
 * 파일 자체는 git audit trail로 보존, 사라지지 않음.
 */
export async function softDeleteRelease(
  db: D1Like,
  id: string,
): Promise<void> {
  const fileEntry = fileReleases.find((r) => r.id === id);
  if (fileEntry) {
    const now = Date.now();
    await db
      .prepare(
        "INSERT INTO releases (id, date, tool, title_ko, title_en, body_ko, body_en, kind, deleted, created_at, updated_at) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?) " +
          "ON CONFLICT(id) DO UPDATE SET deleted=1, updated_at=excluded.updated_at",
      )
      .bind(
        fileEntry.id,
        fileEntry.date,
        fileEntry.tool,
        fileEntry.title.ko,
        fileEntry.title.en,
        fileEntry.body.ko,
        fileEntry.body.en,
        fileEntry.kind ?? null,
        now,
        now,
      )
      .run();
  } else {
    await db.prepare("DELETE FROM releases WHERE id = ?").bind(id).run();
  }
}
