/**
 * 근거 문장으로 바로 가는 링크 — 브라우저 텍스트 조각(Text Fragment) `#:~:text=`.
 *
 * 조각 = 인용 첫 줄의 첫 문장부호(. ; : ! ?)까지, 최대 12단어, 120자 미만, 끝 문장부호 제거.
 *  보통 8~12단어. 문장이 그보다 짧으면 문장 끝에서 멈춘다 — 조각이 문장·목록 칸을 넘으면 페이지에서 안 걸리기 때문.
 * 지원하지 않는 브라우저는 #: 뒤를 무시하고 페이지 맨 위를 연다 — 링크가 깨지지는 않는다.
 *
 * 예 (url = "https://www.doctorofcredit.com/chase/"):
 *   textFragmentUrl(url, "You can receive only one new checking and one new savings account opening related bonus every two years.")
 *     → "https://www.doctorofcredit.com/chase/#:~:text=You%20can%20receive%20only%20one%20new%20checking%20and%20one%20new%20savings%20account"
 *        (12단어에서 자름)
 *   textFragmentUrl(url, "Maintain at least a $15,000 balance for 90 days from the coupon enrollment.")
 *     → "...#:~:text=Maintain%20at%20least%20a%20%2415%2C000%20balance%20for%2090%20days%20from%20the%20coupon"
 *   textFragmentUrl(url, "Offer at a glance:\nExpiration date: October 14, 2026")
 *     → "...#:~:text=Offer%20at%20a%20glance"   (첫 줄만, 끝 ":" 제거 — 4단어지만 줄이 끝남)
 *   textFragmentUrl(url, "Set up your first Eligible Direct Deposit. SoFi must receive it on or before 12/31/26.")
 *     → "...#:~:text=Set%20up%20your%20first%20Eligible%20Direct%20Deposit"   (문장 끝에서 멈춤, 7단어)
 *   textFragmentUrl(url + "#top", "...") → 기존 #해시는 버리고 조각을 붙인다.
 *   textFragmentUrl(null, "...") → null
 */

const MAX_WORDS = 12;
const MAX_CHARS = 120;

export function fragmentText(quote: string): string {
  const firstLine = quote.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "";
  const words = firstLine.replace(/[“”"]/g, "").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    out.push(w);
    const endsSentence = /[.;:!?]$/.test(w);
    if (out.length >= MAX_WORDS) break;
    if (endsSentence) break;
    if (out.join(" ").length >= MAX_CHARS) break;
  }
  let frag = out.join(" ");
  while (frag.length >= MAX_CHARS && out.length > 1) {
    out.pop();
    frag = out.join(" ");
  }
  return frag.replace(/[.;:,!?)\]]+$/, "").trim();
}

export function textFragmentUrl(url: string | null | undefined, quote: string | null | undefined): string | null {
  if (!url) return null;
  const base = url.split("#")[0];
  const frag = quote ? fragmentText(quote) : "";
  if (!frag) return base;
  // encodeURIComponent는 "-"를 남긴다 — 텍스트 조각 문법에서 "-"는 접두·접미 구분자라 따로 인코딩.
  return `${base}#:~:text=${encodeURIComponent(frag).replace(/-/g, "%2D")}`;
}
