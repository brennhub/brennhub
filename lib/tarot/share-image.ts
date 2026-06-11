/**
 * 공유 이미지 — canvas 직접 그리기 (html2canvas 금지: Tailwind v4 + Lightning CSS
 * 환경에서 빈 PNG, lineup-builder 선례. language-maker와 동일하게 canvas 네이티브).
 * 구성: 카드 3장 타이포 렌더 + 이름 + 방향 + 도구명 + URL.
 * 질문은 파라미터 자체가 없다 — "기본값 질문 미포함"이 코드로 보장된다.
 */

export type ShareCard = {
  roman: string;
  /** locale 우선 이름 (ko locale = ko, en locale = en). */
  name: string;
  /** 보조 이름 — 반대 locale 표기. */
  sub: string;
  positionLabel: string;
  orientationLabel: string;
  reversed: boolean;
};

const W = 1080;
const H = 1350;
const CARD_W = 280;
const CARD_H = 480;
const CARD_GAP = 40;
const CARD_Y = 360;

const SANS = "system-ui, -apple-system, 'Segoe UI', 'Malgun Gothic', sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCard(ctx: CanvasRenderingContext2D, card: ShareCard, x: number) {
  // 포지션 라벨 (카드 위)
  ctx.fillStyle = "#9ca3af";
  ctx.font = `26px ${SANS}`;
  ctx.textAlign = "center";
  ctx.fillText(card.positionLabel, x + CARD_W / 2, CARD_Y - 28);

  // 셸 — 역방향이어도 셸·테두리는 유지 (DOM TarotCard와 동일 규칙)
  ctx.fillStyle = "#fafafa";
  roundRect(ctx, x, CARD_Y, CARD_W, CARD_H, 24);
  ctx.fill();
  ctx.strokeStyle = "#27272a";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 2;
  roundRect(ctx, x + 12, CARD_Y + 12, CARD_W - 24, CARD_H - 24, 16);
  ctx.stroke();

  // 내용물 — 역방향은 내용만 180° (카드 중심 기준)
  ctx.save();
  if (card.reversed) {
    ctx.translate(x + CARD_W / 2, CARD_Y + CARD_H / 2);
    ctx.rotate(Math.PI);
    ctx.translate(-(x + CARD_W / 2), -(CARD_Y + CARD_H / 2));
  }
  ctx.fillStyle = "#27272a";
  ctx.font = `40px ${SERIF}`;
  ctx.fillText(card.roman, x + CARD_W / 2, CARD_Y + 88);
  ctx.fillStyle = "#111113";
  ctx.font = `600 40px ${SANS}`;
  ctx.fillText(card.name, x + CARD_W / 2, CARD_Y + CARD_H / 2 + 12, CARD_W - 48);
  ctx.fillStyle = "#52525c";
  ctx.font = `22px ${SANS}`;
  ctx.fillText(card.sub.toUpperCase(), x + CARD_W / 2, CARD_Y + CARD_H / 2 + 52, CARD_W - 48);
  ctx.restore();

  // 방향 라벨 (카드 아래)
  ctx.fillStyle = card.reversed ? "#e4e4e7" : "#9ca3af";
  ctx.font = `${card.reversed ? "600 " : ""}28px ${SANS}`;
  ctx.fillText(card.orientationLabel, x + CARD_W / 2, CARD_Y + CARD_H + 56);
}

export function renderShareImage(opts: {
  cards: readonly ShareCard[];
  toolLine: string;
  urlLine: string;
}): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // 배경 — 테마 무관 고정 다크 (그라운딩 패널과 같은 의식 무드)
  ctx.fillStyle = "#161618";
  ctx.fillRect(0, 0, W, H);

  const total = CARD_W * 3 + CARD_GAP * 2;
  const x0 = (W - total) / 2;
  opts.cards.slice(0, 3).forEach((card, i) => {
    drawCard(ctx, card, x0 + i * (CARD_W + CARD_GAP));
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#e4e4e7";
  ctx.font = `600 34px ${SANS}`;
  ctx.fillText(opts.toolLine, W / 2, H - 140);
  ctx.fillStyle = "#71717b";
  ctx.font = `26px ${SANS}`;
  ctx.fillText(opts.urlLine, W / 2, H - 88);

  return canvas;
}
