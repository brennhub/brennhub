export type ToolStatus = "live" | "coming-soon";

export type Tool = {
  id: string;
  name: string;
  description: string;
  slug: string;
  status: ToolStatus;
  createdAt: string;
};

export const tools: Tool[] = [
  {
    id: "email-diag",
    name: "이메일 발송 진단기",
    description: "도메인의 SPF/DMARC/MX 설정을 진단합니다",
    slug: "email-diag",
    status: "live",
    createdAt: "2026-05-12",
  },
];
