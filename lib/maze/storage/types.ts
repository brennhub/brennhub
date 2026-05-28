import type { MazeProject } from "../types";

export interface MazeProjectStorage {
  getProject(): Promise<MazeProject | null>;
  saveProject(project: MazeProject): Promise<void>;
  clearProject(): Promise<void>;
}
