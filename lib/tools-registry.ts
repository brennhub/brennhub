export type ToolStatus = "live" | "coming-soon";

export type Tool = {
  id: string;
  slug: string;
  status: ToolStatus;
  createdAt: string;
};

export const tools: Tool[] = [
  {
    id: "email-diag",
    slug: "email-diag",
    status: "live",
    createdAt: "2026-05-12",
  },
  {
    id: "cron-trans",
    slug: "cron-trans",
    status: "live",
    createdAt: "2026-05-12",
  },
];
