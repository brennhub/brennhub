import { cn } from "@/lib/utils";
import { ASTROLOGY_GLYPH, toRoman } from "@/lib/tarot/glyphs";
import type { TarotCard as TarotCardData } from "@/lib/tarot/types";

/**
 * 카드 컴포넌트 v1 — CSS 타이포 앞면 + 뒷면 패턴 1종.
 * hook 없는 순수 표현 컴포넌트 (server/client 양쪽 트리에서 사용 가능).
 * 테두리·격자가 foreground 토큰 기반이라 다크/라이트 모두 자동 대응.
 * 픽셀아트 덱 교체는 v1.x 트랙 (BACKLOG).
 */

type TarotCardProps = {
  face: "front" | "back";
  /** face === "front"일 때 필수 — 앞면은 전부 카드 데이터로 렌더. */
  card?: TarotCardData;
  /** 역방향 — 앞면 내용물만 180° 회전 (쉘·테두리는 유지). */
  reversed?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASS = { sm: "w-24", md: "w-36", lg: "w-48" } as const;

/** 원소 마크 — 연금술 글리프(모바일 tofu 위험) 대신 CSS 삼각형. */
function ElementMark({ ko }: { ko: string }) {
  if (ko === "불")
    return (
      <span className="inline-block size-2.5 bg-foreground/60 [clip-path:polygon(50%_0,0_100%,100%_100%)]" />
    );
  if (ko === "물")
    return (
      <span className="inline-block size-2.5 bg-foreground/60 [clip-path:polygon(0_0,100%_0,50%_100%)]" />
    );
  if (ko === "공기")
    return (
      <span className="relative inline-block size-2.5">
        <span className="absolute inset-0 bg-foreground/60 [clip-path:polygon(50%_0,0_100%,100%_100%)]" />
        <span className="absolute inset-x-0 top-[55%] h-px bg-card" />
      </span>
    );
  // 미지 원소 — ko 텍스트 폴백
  return <span className="text-[10px]">{ko}</span>;
}

export function TarotCard({
  face,
  card,
  reversed = false,
  size = "md",
  className,
}: TarotCardProps) {
  const shell = cn(
    "relative aspect-[7/12] shrink-0 rounded-xl bg-card text-card-foreground",
    "border-2 border-foreground/75 shadow-sm",
    SIZE_CLASS[size],
    className,
  );

  if (face === "back" || !card) {
    return (
      <div className={shell}>
        <div className="absolute inset-1.5 rounded-lg border border-foreground/25" />
        <div
          className="absolute inset-3 rounded-md opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, var(--color-foreground) 0 1px, transparent 1px 9px)," +
              "repeating-linear-gradient(-45deg, var(--color-foreground) 0 1px, transparent 1px 9px)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-8 rotate-45 items-center justify-center border border-foreground/40 bg-card">
            <span className="-rotate-45 text-sm text-foreground/50">☽</span>
          </span>
        </div>
      </div>
    );
  }

  const astrologyGlyph = card.meta.astrology
    ? (ASTROLOGY_GLYPH[card.meta.astrology.ko] ?? card.meta.astrology.ko)
    : null;

  return (
    <div
      className={shell}
      role="img"
      aria-label={`${card.name.ko} 카드${reversed ? " 역방향" : ""}`}
    >
      <div className="absolute inset-1.5 rounded-lg border border-foreground/25" />
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-between p-3",
          reversed && "rotate-180",
        )}
      >
        <span className="font-serif text-lg tracking-[0.2em]">
          {toRoman(card.id)}
        </span>
        <span className="flex flex-col items-center gap-1 text-center">
          <span className="text-base font-semibold leading-tight break-keep">
            {card.name.ko}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {card.name.en}
          </span>
        </span>
        <span className="flex h-4 items-center gap-2 text-sm text-muted-foreground">
          {card.meta.element && <ElementMark ko={card.meta.element.ko} />}
          {astrologyGlyph && <span>{astrologyGlyph}</span>}
        </span>
      </div>
    </div>
  );
}
