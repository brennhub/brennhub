import { redirect } from "next/navigation";
import { guardDevOnly } from "@/lib/env.server";

// Decide at request time from the runtime env (no static prerender), like the other devOnly tools.
export const dynamic = "force-dynamic";

/**
 * The hub card links to /tools/<slug>, so this page only forwards to the static app.
 * The app itself is public/english/index.html, served as a static asset at /english/.
 * guardDevOnly makes /tools/english a 404 on prod; it does NOT protect /english/.
 */
export default async function EnglishToolPage() {
  await guardDevOnly("english");
  redirect("/english/");
}
