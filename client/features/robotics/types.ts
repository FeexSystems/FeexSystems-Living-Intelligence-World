/**
 * Client-side robotics feature types.
 * Re-exports shared robotics contracts and adds UI-specific view models.
 */
export type {
  RobotCatalogEntry,
  RoboticsTask,
  HolokaiCommand,
  HolokaiContext,
  RoboticsFacetOptions,
} from "@shared/world-intelligence";

/** View model for a robot card in the catalog listing. */
export interface RobotCardViewModel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  manufacturer: string | null;
  robotClass: string | null;
  domain: string | null;
  lifecycle: string | null;
  capabilities: string[];
  holokaiIntegrated: boolean;
  worldModelProjectId: string | null;
}

/** View model for a robotics task card. */
export interface RoboticsTaskViewModel {
  id: string;
  robotId: string;
  name: string;
  taskType: string;
  status: string;
  createdAt: string;
}

/** Filter state for the robotics catalog. */
export interface RoboticsFilterState {
  robotClass: string | "all";
  domain: string | "all";
  lifecycle: string | "all";
  holokaiIntegrated: boolean | "all";
  search: string;
}