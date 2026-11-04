import { create } from "zustand";


function newSessionId() {
  return `omni-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}


















export const useOmniStore = create((set) => ({
  command: "",
  isProcessing: false,
  payload: null,
  liveTrace: [],
  context: { sessionId: newSessionId() },
  history: [],
  setCommand: (command) => set({ command }),
  setProcessing: (isProcessing) => set({ isProcessing }),
  setPayload: (payload) => set({ payload }),
  appendTrace: (s) => set((st) => ({ liveTrace: [...st.liveTrace, s] })),
  clearTrace: () => set({ liveTrace: [] }),
  setContext: (ctx) => set((s) => ({ context: { ...s.context, ...ctx } })),
  pushHistory: (cmd) =>
    set((s) => ({
      history: [cmd, ...s.history.filter((h) => h !== cmd)].slice(0, 12),
    })),
  reset: () =>
    set({
      command: "",
      isProcessing: false,
      payload: null,
      liveTrace: [],
      context: { sessionId: newSessionId() },
    }),
}));
