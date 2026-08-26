import { create } from "zustand";

export type StatusTone = "success" | "info" | "error";

/**
 * Brief confirmations in the status bar the sync already uses.
 *
 * Controls that change something invisible — whether AI is reachable, how
 * message bodies are painted — otherwise give no feedback at all, which reads
 * as "the click did nothing".
 */
interface StatusToastState {
  message: string | null;
  tone: StatusTone;
  showToast: (message: string, tone?: StatusTone) => void;
  clearToast: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;
const VISIBLE_MS = 2600;

export const useStatusToastStore = create<StatusToastState>((set) => ({
  message: null,
  tone: "success",

  showToast: (message, tone = "success") => {
    if (timer) clearTimeout(timer);
    set({ message, tone });
    timer = setTimeout(() => set({ message: null }), VISIBLE_MS);
  },

  clearToast: () => {
    if (timer) clearTimeout(timer);
    set({ message: null });
  },
}));
