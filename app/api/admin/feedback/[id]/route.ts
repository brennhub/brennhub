import { getCloudflareContext } from "@opennextjs/cloudflare";

const VALID_STATUSES = ["new", "read", "resolved"] as const;
type Status = (typeof VALID_STATUSES)[number];

function isStatus(v: unknown): v is Status {
  return (
    typeof v === "string" && (VALID_STATUSES as readonly string[]).includes(v)
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const idNum = parseInt(id, 10);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const status = (body as { status?: unknown })?.status;
  if (!isStatus(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const db = (env as { DB?: D1Database }).DB;
  if (!db) {
    return Response.json({ error: "DB unavailable" }, { status: 500 });
  }

  try {
    const result = await db
      .prepare("UPDATE feedback SET status = ? WHERE id = ?")
      .bind(status, idNum)
      .run();
    if (!result.success) {
      return Response.json({ error: "Update failed" }, { status: 500 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: "Server error", message: (e as Error).message },
      { status: 500 },
    );
  }
}
