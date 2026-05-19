import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "사주 작명 — 정확한 명리학으로 이름을 짓습니다",
  description:
    "환각 없는 사주 계산과 81수리로 아이 이름을 추천합니다.",
  keywords: [
    "사주 작명",
    "작명",
    "이름 추천",
    "사주팔자",
    "오행",
    "81수리",
    "한자 이름",
  ],
};

export default function NamingLandingPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-10 pb-20">
      {/* Hero */}
      <section className="mb-16">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          정확한 명리학으로 이름을 짓습니다
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          사주팔자와 오행, 81수리를 결정론적으로 계산합니다. 환각 없이, 일관되게.
        </p>
      </section>

      {/* 차별점 3개 */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          왜 다른가요?
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
              환각 없는 계산
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              사주·오행·획수를 알고리즘으로 정확히 계산합니다. 매번 같은 입력이면 같은 결과.
            </p>
          </article>
          <article className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
              작명소 대비 합리적인 비용
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              전통 작명소 가격의 일부로, 명리학 기준 동등 또는 그 이상의 결과.
            </p>
          </article>
          <article className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
              무제한 iteration
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              마음에 들 때까지 다른 후보를 받아보세요. 부모 의도를 반영해 점점 정교하게.
            </p>
          </article>
        </div>
      </section>

      {/* TODO: Gemini 환각 사례 섹션 — 실제 사례 캡처 + 본 도구 결과 비교 */}
      {/* TODO: 후기 / 사회증명 — 베타 사용자 인용, 별점 등 */}
      {/* TODO: FAQ — 음/양력 처리, 시주 모를 때 등 */}
    </main>
  );
}
