/**
 * 공유 이미지 — canvas 직접 그리기 (html2canvas 금지: Tailwind v4 + Lightning CSS
 * 환경에서 빈 PNG, lineup-builder 선례. language-maker와 동일하게 canvas 네이티브).
 * 구성(0.5.0 — 결과 포함): 도메인 뱃지 → 카드별 블록[미니 카드 + 포지션·이름·방향 +
 * 매칭 키워드 칩 + 대표 gloss(최대 2줄)] ×3 → 도구명 + URL.
 * 질문은 파라미터 자체가 없다 — "질문 미포함"이 코드로 보장된다.
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
  /** 매칭 키워드 ko — mute면 빈 배열. */
  chips: string[];
  /** 대표 gloss(첫 매칭 키워드) 또는 mute 시 essence 첫 문장 — 호출부에서 결정. */
  body: string;
};

const W = 1080;
const H = 1350;
const CARD_W = 160;
const CARD_H = 274; // aspect 7/12
const BLOCK_X = 80;
const BLOCK_TEXT_X = 290;
const BLOCK_TEXT_RIGHT = 1000;
const BLOCK_Y0 = 170;
const BLOCK_H = 330;

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

/**
 * measureText 기반 word-wrap — 공백 우선 줄바꿈, 한국어 장어절은 글자 단위 폴백,
 * maxLines 초과분은 마지막 줄 "…" 말줄임.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let current = "";
  const pushChar = (ch: string) => {
    if (ctx.measureText(current + ch).width <= maxWidth) {
      current += ch;
      return true;
    }
    return false;
  };
  for (const word of text.split(" ")) {
    const candidate = current === "" ? word : `${current} ${word}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current !== "") {
      lines.push(current);
      current = "";
    }
    // 어절 자체가 한 줄을 넘는 경우(한국어 장어절) — 글자 단위 폴백
    for (const ch of word) {
      if (!pushChar(ch)) {
        lines.push(current);
        current = ch;
      }
    }
  }
  if (current !== "") lines.push(current);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    let last = cut[maxLines - 1];
    while (last.length > 0 && ctx.measureText(last + "…").width > maxWidth) {
      last = last.slice(0, -1);
    }
    cut[maxLines - 1] = last + "…";
    return cut;
  }
  return lines;
}

/** 카드 미니 렌더 — DOM TarotCard와 동일 규칙(셸·테두리 유지, 역방향은 내용만 180°). */
function drawMiniCard(ctx: CanvasRenderingContext2D, card: ShareCard, x: number, y: number) {
  ctx.fillStyle = "#fafafa";
  roundRect(ctx, x, y, CARD_W, CARD_H, 16);
  ctx.fill();
  ctx.strokeStyle = "#27272a";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x + 8, y + 8, CARD_W - 16, CARD_H - 16, 11);
  ctx.stroke();

  ctx.save();
  if (card.reversed) {
    ctx.translate(x + CARD_W / 2, y + CARD_H / 2);
    ctx.rotate(Math.PI);
    ctx.translate(-(x + CARD_W / 2), -(y + CARD_H / 2));
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "#27272a";
  ctx.font = `26px ${SERIF}`;
  ctx.fillText(card.roman, x + CARD_W / 2, y + 52);
  ctx.fillStyle = "#111113";
  ctx.font = `600 24px ${SANS}`;
  ctx.fillText(card.name, x + CARD_W / 2, y + CARD_H / 2 + 8, CARD_W - 28);
  ctx.fillStyle = "#52525c";
  ctx.font = `13px ${SANS}`;
  ctx.fillText(card.sub.toUpperCase(), x + CARD_W / 2, y + CARD_H / 2 + 34, CARD_W - 28);
  ctx.restore();
}

function drawBlock(ctx: CanvasRenderingContext2D, card: ShareCard, y: number) {
  drawMiniCard(ctx, card, BLOCK_X, y);

  const textW = BLOCK_TEXT_RIGHT - BLOCK_TEXT_X;
  ctx.textAlign = "left";

  // ① 포지션 · 이름 · 방향
  let lineY = y + 44;
  ctx.fillStyle = "#9ca3af";
  ctx.font = `26px ${SANS}`;
  const posText = `${card.positionLabel} · `;
  ctx.fillText(posText, BLOCK_TEXT_X, lineY);
  const posW = ctx.measureText(posText).width;
  ctx.fillStyle = "#fafafa";
  ctx.font = `600 34px ${SANS}`;
  const nameText = card.name;
  ctx.fillText(nameText, BLOCK_TEXT_X + posW, lineY);
  const nameW = ctx.measureText(nameText).width;
  ctx.fillStyle = card.reversed ? "#e4e4e7" : "#9ca3af";
  ctx.font = `${card.reversed ? "600 " : ""}26px ${SANS}`;
  ctx.fillText(`  ${card.orientationLabel}`, BLOCK_TEXT_X + posW + nameW, lineY);

  // ② 매칭 키워드 칩 행 (넘치면 "+n")
  lineY += 64;
  if (card.chips.length > 0) {
    ctx.font = `600 26px ${SANS}`;
    const chipH = 46;
    const padX = 20;
    const gap = 14;
    let cx = BLOCK_TEXT_X;
    let shown = 0;
    for (const chip of card.chips) {
      const w = ctx.measureText(chip).width + padX * 2;
      const remaining = card.chips.length - shown - 1;
      const reserve = remaining > 0 ? 90 : 0; // "+n" 자리
      if (cx + w > BLOCK_TEXT_RIGHT - reserve && shown > 0) break;
      ctx.fillStyle = "#e4e4e7";
      roundRect(ctx, cx, lineY - chipH + 12, w, chipH, chipH / 2);
      ctx.fill();
      ctx.fillStyle = "#161618";
      ctx.fillText(chip, cx + padX, lineY);
      cx += w + gap;
      shown++;
    }
    if (shown < card.chips.length) {
      ctx.fillStyle = "#9ca3af";
      ctx.fillText(`+${card.chips.length - shown}`, cx + 4, lineY);
    }
  }

  // ③ 대표 gloss / mute essence 첫 문장 — 최대 2줄 말줄임
  lineY += 58;
  ctx.fillStyle = "#a1a1aa";
  ctx.font = `28px ${SANS}`;
  for (const line of wrapText(ctx, card.body, textW, 2)) {
    ctx.fillText(line, BLOCK_TEXT_X, lineY);
    lineY += 40;
  }
}

export function renderShareImage(opts: {
  cards: readonly ShareCard[];
  domainLabel: string;
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

  // 도메인 뱃지 (중앙 필)
  ctx.font = `600 30px ${SANS}`;
  const badgeW = ctx.measureText(opts.domainLabel).width + 56;
  const badgeH = 58;
  ctx.fillStyle = "#e4e4e7";
  roundRect(ctx, (W - badgeW) / 2, 66, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.fillStyle = "#161618";
  ctx.textAlign = "center";
  ctx.fillText(opts.domainLabel, W / 2, 66 + 39);

  opts.cards.slice(0, 3).forEach((card, i) => {
    drawBlock(ctx, card, BLOCK_Y0 + i * BLOCK_H);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#e4e4e7";
  ctx.font = `600 34px ${SANS}`;
  ctx.fillText(opts.toolLine, W / 2, H - 110);
  ctx.fillStyle = "#71717b";
  ctx.font = `26px ${SANS}`;
  ctx.fillText(opts.urlLine, W / 2, H - 62);

  return canvas;
}
