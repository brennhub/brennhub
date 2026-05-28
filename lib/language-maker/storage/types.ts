import type { LanguageProject } from "../types";

export interface LanguageProjectStorage {
  getProject(): Promise<LanguageProject | null>;
  saveProject(project: LanguageProject): Promise<void>;
  clearProject(): Promise<void>;
}
