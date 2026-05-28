import type { Metadata } from "next";
import { SajuNamingClientShell } from "./client-shell";

export const metadata: Metadata = {
  title: "사주 작명 — BrennHub",
  description:
    "사주팔자 + 성명학 기반 작명. 생년월일시로 사주를 분석하고 이름을 추천받으세요.",
};

export default function SajuNamingPage() {
  return <SajuNamingClientShell />;
}
