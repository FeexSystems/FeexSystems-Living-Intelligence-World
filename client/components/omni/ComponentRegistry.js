

import { GraphVisualizer } from "./visualizers/GraphVisualizer";
import { MarkdownViewer } from "./visualizers/MarkdownViewer";
import { MetricsDashboard } from "./visualizers/MetricsDashboard";
import { CodeViewer } from "./visualizers/CodeViewer";
import { EmptyStage } from "./visualizers/EmptyStage";
import { ErrorStage } from "./visualizers/ErrorStage";
import { CommandCenterShell } from "./visualizers/CommandCenterShell";

export const ComponentRegistry = {
  GraphVisualizer,
  MarkdownViewer,
  MetricsDashboard,
  CodeViewer,
  EvidencePanel: MarkdownViewer,
  CommandCenterShell,
  EmptyStage,
  ErrorStage,
};
