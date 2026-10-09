import "react";
import type { OmniCommandResponse } from "@shared/orchestration";
import { ComponentRegistry } from "./ComponentRegistry";
import { EmptyStage } from "./visualizers/EmptyStage";

interface StageProps {
  payload: OmniCommandResponse | null;
}

export function Stage({ payload }: StageProps) {
  if (!payload) return <EmptyStage />;

  const { component, props } = payload.ui_directive;
  const Active = ComponentRegistry[component] ?? EmptyStage;

  return (
    <div className="stage-transition-wrapper w-full h-full min-h-0">
      <Active {...props} />
    </div>
  );
}
