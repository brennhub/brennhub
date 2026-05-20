// 16진 색(`#rrggbb`) 위에서 가독성이 높은 텍스트 색을 반환.
// WCAG 상대 휘도 기준 0.179 임계 — 흰색/검정의 대비비가 같아지는 경계.
export function getContrastText(hex: string): "#171717" | "#ffffff" {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const linear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const luminance =
    0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  return luminance > 0.179 ? "#171717" : "#ffffff";
}
