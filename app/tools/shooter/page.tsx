import { ShooterClientShell } from "./client-shell";

/**
 * 아케이드 슈터 — thin server shell. 게임 본체는 client.
 *
 * D1·외부 데이터 fetch 없음 — 100% client-rendered (localStorage 최고점만).
 */
export default function ShooterPage() {
  return <ShooterClientShell />;
}
