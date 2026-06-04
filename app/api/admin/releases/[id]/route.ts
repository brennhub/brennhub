/**
 * /api/admin/releases/[id] — Union 모델용 단일 항목 수정/삭제.
 * 인증: middleware.ts가 /api/admin/*를 보호.
 *
 *   PUT    : body의 id가 URL id와 일치해야 함. upsert (파일 id면 오버라이드, 아니면 D1-only).
 *   DELETE : 파일 id면 tombstone(deleted=1), D1-only id면 row DELETE.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  softDeleteRelease,
  upsertRelease,
} from "@/lib/releases-server";
import type { Release, ReleaseKind } from "@/lib/releases";

interface AuthEnv {
  AUTH_DB?: D1Database;
}

const VALID_KINDS = ["new", "improved", "fixed"] as const;

function isString(v: unknown): v is string {
  return typeof v === "string";
}
function isValidDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function validateBody(b: unknown, expectedId: string): Release | string {
  if (!b || typeof b !== "object") return "Body must be an object";
  const r = b as Record<string, unknown>;
  if (!isString(r.id) || r.id !== expectedId)
    return "id in body must match URL id";
  if (!isString(r.date) || !isValidDate(r.date))
    return "date must be YYYY-MM-DD";
  if (!isString(r.tool) || !r.tool.trim()) return "tool required";
  const title = r.title as Record<string, unknown> | null;
  const body = r.body as Record<string, unknown> | null;
  if (
    !title ||
    !isString(title.ko) ||
    !isString(title.en) ||
    !title.ko.trim() ||
    !title.en.trim()
  )
    return "title.ko and title.en required";
  if (
    !body ||
    !isString(body.ko) ||
    !isString(body.en) ||
    !body.ko.trim() ||
    !body.en.trim()
  )
    return "body.ko and body.en required";
  let kind: ReleaseKind | undefined;
  if (r.kind != null && r.kind !== "") {
    if (
      !isString(r.kind) ||
      !(VALID_KINDS as readonly string[]).includes(r.kind)
    )
      return "kind must be 'new'|'improved'|'fixed'";
    kind = r.kind as ReleaseKind;
  }
  return {
    id: r.id,
    date: r.date,
    tool: r.tool.trim(),
    title: { ko: title.ko, en: title.en },
    body: { ko: body.ko, en: body.en },
    kind,
  };
}

function getDb(): D1Database | null {
  const { env } = getCloudflareContext();
  return (env as unknown as AuthEnv).AUTH_DB ?? null;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || !id.trim())
    return Response.json({ error: "Invalid id" }, { status: 400 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const v = validateBody(raw, id);
  if (typeof v === "string")
    return Response.json({ error: v }, { status: 400 });

  const db = getDb();
  if (!db) return Response.json({ error: "DB unavailable" }, { status: 500 });

  try {
    await upsertRelease(
      db as unknown as Parameters<typeof upsertRelease>[0],
      v,
    );
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: "Server error", message: (e as Error).message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || !id.trim())
    return Response.json({ error: "Invalid id" }, { status: 400 });

  const db = getDb();
  if (!db) return Response.json({ error: "DB unavailable" }, { status: 500 });

  try {
    await softDeleteRelease(
      db as unknown as Parameters<typeof softDeleteRelease>[0],
      id,
    );
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: "Server error", message: (e as Error).message },
      { status: 500 },
    );
  }
}
