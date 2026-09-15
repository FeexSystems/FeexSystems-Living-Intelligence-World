import type { ComponentType } from "react";
import type { OmniComponent } from "@shared/orchestration";
import { GraphVisualizer } from "./visualizers/GraphVisualizer";
import { MarkdownViewer } from "./visualizers/MarkdownViewer";
import { MetricsDashboard } from "./visualizers/MetricsDashboard";
import { CodeViewer } from "./visualizers/CodeViewer";
import { EmptyStage } from "./visualizers/EmptyStage";
import { ErrorStage } from "./visualizers/ErrorStage";
import { CommandCenterShell } from "./visualizers/CommandCenterShell";

export const ComponentRegistry: Record<OmniComponent, ComponentType<any>> = {
  GraphVisualizer,
  MarkdownViewer,
  MetricsDashboard,
  CodeViewer,
  EvidencePanel: MarkdownViewer,
  CommandCenterShell,
  EmptyStage,
  ErrorStage,
};
