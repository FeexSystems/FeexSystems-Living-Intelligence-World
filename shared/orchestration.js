/**
 * FEEXSYSTEMS Omni-Command Orchestration Contract (v1.0)
 */

 



















































































































































export function createEmptyStageResponse(requestId) {
  return {
    version: "1.0",
    requestId,
    intent: "IDLE",
    status: "success",
    confidence: 1,
    groundedEvidenceCount: 0,
    reasoning_trace: [],
    ui_directive: {
      component: "EmptyStage",
      props: {},
    },
    context: {},
    suggestions: [
      "Show me the backend architecture",
      "Which projects use PostgreSQL?",
      "What technologies power Persona OS?",
      "Show evidence for the knowledge graph",
    ],
    evidence_anchors: [],
  };
}
