import Link from "next/link";
import { messages } from "@/lib/i18n/messages";
import { DEFAULT_LOCALE } from "@/lib/i18n/types";

/**
 * `?id=XXX` 조회 실패 시 server-rendered fallback (P4a 0.14.0).
 *
 * 손상·만료·잘못된 id 등 모든 not-found 케이스를 한 화면으로 처리.
 * server component라 useMessages 사용 불가 — messages.ts 직접 import + DEFAULT_LOCALE.
 * 사용자 locale은 client-side LocaleProvider가 결정하므로 server에선 default 사용 —
 * 깊은 i18n 필요 시 후속 패치(별 비용 없음, dev 점검 시 결정).
 */
export function SharedNotFound() {
  const t = messages[DEFAULT_LOCALE].maze;
  return (
    <main className="mx-auto w-full max-w-md px-6 pt-20 pb-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t.shareNotFoundTitle}
      </h1>
      <p className="mt-3 text-muted-foreground">{t.shareNotFoundMessage}</p>
      <div className="mt-6">
        <Link
          href="/tools/maze"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t.sharedBuildOwn}
        </Link>
      </div>
    </main>
  );
}
