/**
 * Shared contracts for the KFC (Kiro / Claude Spec) Autonomous Agent Pipeline.
 * Connects .claude/agents/kfc specifications to the live World Model runtime.
 */

export type KFCPipelineStage =
  | "REQUIREMENTS"
  | "DESIGN"
  | "IMPL"
  | "JUDGE"
  | "TEST"
  | "COMPLETE";

export interface KFCStageArtifact {
  stage: KFCPipelineStage;
  title: string;
  markdownContent: string;
  timestamp: string;
  confidenceScore?: number;
  diffContent?: string;
  status: "pending" | "running" | "approved" | "rejected";
}

export interface KFCExecutionRequest {
  projectName: string;
  repository: string;
  prompt: string;
  targetDomain?: string;
}

export interface KFCExecutionState {
  executionId: string;
  projectName: string;
  repository: string;
  prompt: string;
  activeStage: KFCPipelineStage;
  artifacts: Partial<Record<KFCPipelineStage, KFCStageArtifact>>;
  isStreaming: boolean;
  error?: string;
}

export interface KFCStreamEvent {
  type: "stage_start" | "stage_progress" | "stage_complete" | "error";
  stage: KFCPipelineStage;
  artifact?: KFCStageArtifact;
  progressPercent?: number;
  message?: string;
  error?: string;
}
