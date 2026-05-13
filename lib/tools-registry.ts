export type ToolStatus = "live" | "coming-soon";

export type Tool = {
  id: string;
  name: string;
  description: string;
  slug: string;
  status: ToolStatus;
  createdAt: string;
};

export const tools: Tool[] = [];
