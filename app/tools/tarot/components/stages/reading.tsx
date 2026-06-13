"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { toRoman } from "@/lib/tarot/glyphs";
import { buildSealPayload } from "@/lib/tarot/ritual";
import { renderShareImage } from "@/lib/tarot/share-image";
import { TAROT_CARDS } from "@/lib/tarot/cards";
import type { Domain, OrientationEntry, TarotCard as TarotCardData } from "@/lib/tarot/types";
import { SealBadge } from "../seal-badge";

/**
 * S8 리딩 — 질문이 리딩의 제목(대가의 회수). 카드별: essence(항상) →
 * 매칭 키워드 강조 + gloss(도메인 뱃지와 동일 강조색 = "이 해석이 어느 사전
 * 의미에서 왔는지"의 시각 증명) → 비매칭은 접힘(숨기지 않되 강조만) →
 * 매칭 0개면 mute 정직 문구 → Waite 원문 토글 → '검증' 토글(커밋-리빌 원본 공개).
 * 본문(essence·gloss)은 ko 전용 합의 — 카드 이름만 locale을 따른다.
 * 같은 리딩 재뽑기 없음 — '새 리딩'은 S0부터. 저장된 리딩 보기에도 동일 컴포넌트.
 */
export type DrawnCard = {
  card: TarotCardData;
  /** 컷에서 고정된 숨은 방향(2층 ①). */
  hidden: "upright" | "reversed";
  /** 최종 방향 = 숨은 비트 × 선택(2층 ②). */
  orientation: "upright" | "reversed";
  /** 셔플 중 선점한 카드인지(card.id === markedCardId). 표시용 메타데이터. */
  marked: boolean;
};

type ReadingProps = {
  question: string;
  domain: Domain;
  cards: readonly DrawnCard[];
  /** 검증 토글용 봉인 원본 — order·bits·nonce = 해시 payload(v2) / pickedIndices·choice = 표시용. */
  order: readonly number[];
  bits: readonly (0 | 1)[];
  nonce: string;
  hash: string;
  pickedIndices: readonly number[];
  choice: "upright" | "reversed";
  /** 선점한 카드 id(0~21) 또는 null — 검증 투명성. payload 무관(봉인 불변) 명시. */
  markedCardId: number | null;
  onNewReading: () => void;
};

function CardSection({
  drawn,
  position,
  domain,
  domainLabel,
}: {
  drawn: DrawnCard;
  position: string;
  domain: Domain;
  domainLabel: string;
}) {
  const tt = useMessages().tarot;
  const { locale } = useLocale();
  const [showAll, setShowAll] = useState(false);
  const [showWaite, setShowWaite] = useState(false);

  const { card, orientation, marked } = drawn;
  const entry: OrientationEntry = card[orientation];
  const reversed = orientation === "reversed";
  // "그 외" = 특정 도메인 매칭 안 함 → 전체 키워드 동등 표시(강조/mute 없음).
  const isOther = domain === "other";
  const matched = isOther ? [] : entry.keywords.filter((k) => k.domains.includes(domain));
  const unmatched = isOther ? [] : entry.keywords.filter((k) => !k.domains.includes(domain));

  return (
    <section className="rounded-lg bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center gap-3">
        <span className="text-xs tracking-wide text-muted-foreground">{position}</span>
        <span className="w-8 font-serif text-sm">{toRoman(card.id)}</span>
        <span className="flex-1 font-medium break-keep">
          {locale === "en" ? card.name.en : card.name.ko}
        </span>
        {marked && (
          <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
            <span aria-hidden="true">✦</span>
            {tt.markedBadge}
          </span>
        )}
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs ring-1",
            reversed ? "bg-foreground/10 ring-foreground/40" : "ring-foreground/20",
          )}
        >
          {reversed ? tt.orientationReversed : tt.orientationUpright}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed break-keep">{entry.essence.ko}</p>

      {isOther ? (
        // 그 외 — 전체 키워드 동등 표시 (중립 스타일, mute·강조·토글 없음)
        <ul className="mt-4 flex flex-col gap-3">
          {entry.keywords.map((k) => (
            <li key={k.word.ko}>
              <span className="inline-block rounded-full px-3 py-1 text-xs font-medium ring-1 ring-foreground/20">
                {k.word.ko}
              </span>
              <p className="mt-1.5 border-l-2 border-foreground/15 pl-3 text-sm leading-relaxed text-muted-foreground break-keep">
                {k.gloss.ko}
              </p>
            </li>
          ))}
        </ul>
      ) : matched.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3">
          {matched.map((k) => (
            <li key={k.word.ko}>
              <span className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                {k.word.ko}
              </span>
              <p className="mt-1.5 border-l-2 border-primary/50 pl-3 text-sm leading-relaxed text-muted-foreground break-keep">
                {k.gloss.ko}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground break-keep">
          {tt.readingMute.replace("{domain}", domainLabel)}
        </p>
      )}

      {unmatched.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll((v) => !v)}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {showAll ? tt.readingAllKeywordsHide : tt.readingAllKeywords}
          </button>
          {showAll && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {unmatched.map((k) => (
                <span
                  key={k.word.ko}
                  className="rounded-full px-3 py-1 text-xs text-muted-foreground ring-1 ring-foreground/15"
                >
                  {k.word.ko}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-foreground/10 pt-3">
        <button
          type="button"
          aria-expanded={showWaite}
          onClick={() => setShowWaite((v) => !v)}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {showWaite ? tt.readingWaiteHide : tt.readingWaite}
        </button>
        {showWaite && (
          <div className="mt-2">
            <p className="text-sm leading-relaxed italic">{entry.waite}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              — The Pictorial Key to the Tarot (1910)
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/** 접힌 '검증' 섹션 — 봉인 해시 + 원본 공개. 해시 payload와 표시용 정보를 구분 명시. */
function VerifySection({
  order,
  bits,
  nonce,
  hash,
  pickedIndices,
  choice,
  markedCardId,
  cards,
  positions,
}: Pick<
  ReadingProps,
  "order" | "bits" | "nonce" | "hash" | "pickedIndices" | "choice" | "markedCardId" | "cards"
> & {
  positions: readonly string[];
}) {
  const tt = useMessages().tarot;
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const markedCard = markedCardId !== null ? TAROT_CARDS[markedCardId] : null;
  const markedName = markedCard
    ? locale === "en"
      ? markedCard.name.en
      : markedCard.name.ko
    : tt.verifyMarkedNone;
  const axisLabel = choice === "reversed" ? tt.flipVertical : tt.flipHorizontal;
  const oriLabel = (o: "upright" | "reversed") =>
    o === "reversed" ? tt.orientationReversed : tt.orientationUpright;

  return (
    <section className="rounded-lg bg-card p-4 ring-1 ring-foreground/10">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        {open ? tt.verifyHide : tt.verifyShow}
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <SealBadge hash={hash} />
          <p className="text-center text-xs text-muted-foreground">{tt.verifyIntro}</p>
          <div>
            <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
              {tt.verifyPayload}
            </p>
            <p className="mt-1 font-mono text-[10px] break-all text-muted-foreground">
              {buildSealPayload(order, bits, nonce)}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
              {tt.verifyDisplay}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tt.verifyPicked}:{" "}
              {pickedIndices.map((p) => tt.verifyPickedNth.replace("{n}", String(p + 1))).join(" · ")}
              {" / "}
              {tt.verifyChoice}:{" "}
              {choice === "reversed" ? tt.orientationReversed : tt.orientationUpright}
            </p>
            {/* 선점 공개 — 봉인 payload에 미포함(해시 불변)임을 명시한 투명성 한 줄. */}
            <p className="mt-1 text-xs text-muted-foreground break-keep">
              {tt.verifyMarked.replace("{name}", markedName)}
            </p>
          </div>
          {/* 카드별 "놓인 방향 → 뒤집는 축 → 최종" — 선택 전에 이미 정해져 있었음을 보여준다. */}
          <div>
            <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
              {tt.verifyLayHeading}
            </p>
            <ul className="mt-1 flex flex-col gap-1">
              {cards.map((c, i) => (
                <li key={c.card.slug} className="text-xs text-muted-foreground break-keep">
                  {tt.verifyLayLine
                    .replace("{pos}", positions[i])
                    .replace("{hidden}", oriLabel(c.hidden))
                    .replace("{axis}", axisLabel)
                    .replace("{final}", oriLabel(c.orientation))}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

/** 경량 토스트 — fixed top-center, 자동 dismiss. 전역 provider 없어 자체 구현(외부 라이브러리 0). */
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  useEffect(() => {
    const id = setTimeout(() => onDoneRef.current(), 2500);
    return () => clearTimeout(id);
  }, [message]);
  return (
    <div
      role="status"
      className="fixed top-4 left-1/2 z-50 -translate-x-1/2 animate-in rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg fade-in slide-in-from-top-2"
    >
      {message}
    </div>
  );
}

export function Reading({
  question,
  domain,
  cards,
  order,
  bits,
  nonce,
  hash,
  pickedIndices,
  choice,
  markedCardId,
  onNewReading,
}: ReadingProps) {
  const tt = useMessages().tarot;
  const { locale } = useLocale();
  const positions = [tt.positionPast, tt.positionPresent, tt.positionFuture];
  const domainLabel = tt[`domain_${domain}` as keyof typeof tt] as string;

  // 토스트 + key로 같은 메시지 연속 트리거에도 재마운트(타이머 리셋)
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);
  const showToast = (msg: string) => setToast({ msg, key: Date.now() });

  /** 공유 이미지 canvas — 질문 포함(상단). "other"는 매칭 없으니 전체 키워드를 pool로. */
  const buildCanvas = () =>
    renderShareImage({
      question,
      cards: cards.map(({ card, orientation }, i) => {
        const entry = card[orientation];
        const pool =
          domain === "other"
            ? entry.keywords
            : entry.keywords.filter((k) => k.domains.includes(domain));
        const body =
          pool.length > 0
            ? pool[0].gloss.ko
            : (entry.essence.ko.match(/^.*?다\./)?.[0] ?? entry.essence.ko);
        return {
          roman: toRoman(card.id),
          name: locale === "en" ? card.name.en : card.name.ko,
          sub: locale === "en" ? card.name.ko : card.name.en,
          positionLabel: positions[i],
          orientationLabel:
            orientation === "reversed" ? tt.orientationReversed : tt.orientationUpright,
          reversed: orientation === "reversed",
          chips: pool.map((k) => k.word.ko),
          body,
        };
      }),
      domainLabel,
      toolLine: `${tt.title} — BrennHub`,
      urlLine: "brennhub.com/tools/tarot",
    });

  const canvasToBlob = (canvas: HTMLCanvasElement) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));

  const download = (canvas: HTMLCanvasElement) => {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `tarot-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  /**
   * 공유 단일 경로 — 플랫폼별 적응: ① 네이티브 공유 시트(모바일) → ② 클립보드 복사(데스크톱
   * Chromium/Edge) → ③ PNG 다운로드(폴백). 각 경로 토스트 피드백. 별도 복사 버튼 없이 일원화.
   */
  const handleShare = async () => {
    const canvas = buildCanvas();
    const blob = await canvasToBlob(canvas);
    if (!blob) {
      download(canvas);
      showToast(tt.shareToastSaved);
      return;
    }
    // ① 네이티브 공유 시트
    if (typeof navigator.share === "function") {
      const file = new File([blob], "tarot.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          showToast(tt.shareToastShared);
          return;
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return; // 사용자 취소
          // 그 외 실패 → 아래 폴백
        }
      }
    }
    // ② 클립보드 이미지 복사 (Safari는 await 후 gesture 소실 가능 — Edge/Chromium/Android 타깃)
    if (typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function") {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        showToast(tt.shareToastCopied);
        return;
      } catch {
        // ③ 폴백
      }
    }
    download(canvas);
    showToast(tt.shareToastSaved);
  };

  return (
    <div className="flex flex-1 animate-in flex-col gap-8 pt-4 fade-in duration-700">
      <header className="text-center">
        <p className="text-lg font-medium break-keep">“{question}”</p>
        <span className="mt-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          {domainLabel}
        </span>
      </header>

      <div className="flex flex-col gap-4">
        {cards.map((drawn, i) => (
          <CardSection
            key={drawn.card.slug}
            drawn={drawn}
            position={positions[i]}
            domain={domain}
            domainLabel={domainLabel}
          />
        ))}
      </div>

      <VerifySection
        order={order}
        bits={bits}
        nonce={nonce}
        hash={hash}
        pickedIndices={pickedIndices}
        choice={choice}
        markedCardId={markedCardId}
        cards={cards}
        positions={positions}
      />

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={handleShare}
          className="w-full rounded-lg px-8 py-3 font-medium ring-1 ring-foreground/20 sm:w-auto"
        >
          {tt.shareImage}
        </button>
        <button
          type="button"
          onClick={onNewReading}
          className="w-full rounded-lg bg-primary px-8 py-3 font-medium text-primary-foreground sm:w-auto"
        >
          {tt.newReading}
        </button>
      </div>

      {toast && <Toast key={toast.key} message={toast.msg} onDone={() => setToast(null)} />}

      <Link
        href="/tools/tarot/cards"
        className="mx-auto text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        {tt.dictionaryLink}
      </Link>
    </div>
  );
}
