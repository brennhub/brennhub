import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "사주 작명 — AI + 정확한 명리학으로 이름을 짓습니다",
  description:
    "환각 없는 사주 계산과 81수리, AI 어감 분석으로 아이 이름을 추천합니다. 작명소 1/10 가격, 무제한 iteration.",
  keywords: [
    "사주 작명",
    "작명",
    "이름 추천",
    "사주팔자",
    "오행",
    "81수리",
    "한자 이름",
    "AI 작명",
  ],
};

export default function NamingLandingPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-10 pb-20">
      {/* Hero */}
      <section className="mb-16">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          AI + 정확한 명리학으로 이름을 짓습니다
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          사주팔자와 오행, 81수리를 결정론적으로 계산하고, AI는 의미·어감만 보조합니다.
          환각 없이, 작명소 1/10 가격으로.
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
              사주·오행·획수는 알고리즘으로 정확하게. AI는 의미와 어감 보조만 담당합니다.
            </p>
          </article>
          <article className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
              작명소 1/10 가격
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              전통 작명소 $200-500 vs 본 도구 $29-49. 결과는 명리학 기준 동등 또는 그 이상.
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

      {/* 가격 3단 */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          가격
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className="flex flex-col rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
              Free Preview
            </h3>
            <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
              $0
            </p>
            <ul className="mt-4 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>· 사주 1회 조회</li>
              <li>· 이름 후보 3개</li>
            </ul>
          </article>
          <article className="flex flex-col rounded-lg border border-zinc-900 bg-white p-5 ring-2 ring-zinc-900 dark:border-zinc-100 dark:bg-zinc-900 dark:ring-zinc-100">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
              Basic
            </h3>
            <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
              $29
            </p>
            <ul className="mt-4 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>· 후보 30개</li>
              <li>· 한자 의미 해설</li>
              <li>· 81수리 분석</li>
            </ul>
          </article>
          <article className="flex flex-col rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
              Premium
            </h3>
            <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
              $49
            </p>
            <ul className="mt-4 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>· Basic 포함</li>
              <li>· AI 어감 분석</li>
              <li>· 부모 의도 반영</li>
              <li>· 무제한 iteration</li>
            </ul>
          </article>
        </div>
      </section>

      {/* TODO: Gemini 환각 사례 섹션 — 실제 사례 캡처 + 본 도구 결과 비교 */}
      {/* TODO: 후기 / 사회증명 — 베타 사용자 인용, 별점 등 */}
      {/* TODO: FAQ — 음/양력 처리, 시주 모를 때, 환불 정책 등 */}
    </main>
  );
}
