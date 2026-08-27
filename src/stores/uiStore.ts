import { create } from "zustand";
import { setSetting } from "@/services/db/settings";
import type { ColorThemeId } from "@/constants/themes";

type Theme = "light" | "dark" | "system";
type ReadingPanePosition = "right" | "bottom" | "hidden";
type ReadFilter = "all" | "read" | "unread";
export type EmailDensity = "compact" | "default" | "spacious";
export type DefaultReplyMode = "reply" | "replyAll";
export type MarkAsReadBehavior = "instant" | "2s" | "manual";
/**
 * How a message body is painted.
 * - light: as the sender designed it, on white
 * - dim:   same colours, brightness pulled down so white stops glaring
 * - dark:  inverted, with photos and logos inverted back
 */
export type EmailBodyTheme = "light" | "dim" | "dark";

/** How the thread list is ordered. Pinned threads stay on top regardless. */
export type EmailSort =
  | "newest"
  | "oldest"
  | "unread"
  | "sender"
  | "subject"
  | "attachments";

export const EMAIL_BODY_THEMES: EmailBodyTheme[] = ["light", "dim", "dark"];
export type FontScale = "small" | "default" | "large" | "xlarge";
export type InboxViewMode = "unified" | "split";

export interface SidebarNavItem {
  id: string;
  visible: boolean;
}

interface UIState {
  theme: Theme;
  sidebarCollapsed: boolean;
  contactSidebarVisible: boolean;
  readingPanePosition: ReadingPanePosition;
  readFilter: ReadFilter;
  emailListWidth: number;
  emailDensity: EmailDensity;
  defaultReplyMode: DefaultReplyMode;
  markAsReadBehavior: MarkAsReadBehavior;
  /** How message bodies are rendered. HTML mail is authored for white
   *  backgrounds, so it stays light unless the reader forces dark. */
  emailBodyTheme: EmailBodyTheme;
  emailSort: EmailSort;
  /** Fetch sender avatars from Gravatar. Off means initials only, and no
   *  request leaves the machine for them. */
  showSenderAvatars: boolean;
  fontScale: FontScale;
  colorTheme: ColorThemeId;
  sendAndArchive: boolean;
  inboxViewMode: InboxViewMode;
  taskSidebarVisible: boolean;
  sidebarNavConfig: SidebarNavItem[] | null;
  reduceMotion: boolean;
  isOnline: boolean;
  lastSyncAt: number | null;
  /** True while any account is mid-sync, so the UI can show it. */
  isSyncing: boolean;
  /**
   * Which mailbox the account-scoped settings pages are editing. Null follows
   * the active account. Deliberately separate from activeAccountId so choosing
   * a mailbox to configure does not change the mail you are looking at.
   */
  settingsAccountId: string | null;
  pendingOpsCount: number;
  isSyncingFolder: string | null;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleContactSidebar: () => void;
  setContactSidebarVisible: (visible: boolean) => void;
  setReadingPanePosition: (position: ReadingPanePosition) => void;
  setReadFilter: (filter: ReadFilter) => void;
  setEmailListWidth: (width: number) => void;
  setEmailDensity: (density: EmailDensity) => void;
  setDefaultReplyMode: (mode: DefaultReplyMode) => void;
  setMarkAsReadBehavior: (behavior: MarkAsReadBehavior) => void;
  setEmailBodyTheme: (theme: EmailBodyTheme) => void;
  setEmailSort: (sort: EmailSort) => void;
  setShowSenderAvatars: (enabled: boolean) => void;
  toggleEmailBodyTheme: () => void;
  setFontScale: (scale: FontScale) => void;
  setColorTheme: (theme: ColorThemeId) => void;
  setSendAndArchive: (enabled: boolean) => void;
  setInboxViewMode: (mode: InboxViewMode) => void;
  toggleTaskSidebar: () => void;
  setTaskSidebarVisible: (visible: boolean) => void;
  setSidebarNavConfig: (config: SidebarNavItem[]) => void;
  restoreSidebarNavConfig: (config: SidebarNavItem[]) => void;
  setReduceMotion: (reduce: boolean) => void;
  setOnline: (online: boolean) => void;
  setPendingOpsCount: (count: number) => void;
  /** Epoch ms of the last successful sync, restored across restarts. */
  setLastSyncAt: (timestamp: number) => void;
  setSyncing: (syncing: boolean) => void;
  setSettingsAccountId: (accountId: string | null) => void;
  setSyncingFolder: (folder: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "system",
  sidebarCollapsed: false,
  contactSidebarVisible: true,
  readingPanePosition: "right",
  readFilter: "all",
  emailListWidth: 320,
  emailDensity: "default",
  defaultReplyMode: "reply",
  markAsReadBehavior: "instant",
  emailBodyTheme: "light",
  emailSort: "newest",
  showSenderAvatars: true,
  fontScale: "default",
  colorTheme: "sage",
  sendAndArchive: false,
  inboxViewMode: "unified",
  taskSidebarVisible: false,
  sidebarNavConfig: null,
  reduceMotion: false,
  isOnline: true,
  pendingOpsCount: 0,
  isSyncingFolder: null,
  lastSyncAt: null,
  isSyncing: false,
  settingsAccountId: null,

  setTheme: (theme) => set({ theme }),
  toggleSidebar: () =>
    set((state) => {
      const collapsed = !state.sidebarCollapsed;
      setSetting("sidebar_collapsed", String(collapsed)).catch(() => {});
      return { sidebarCollapsed: collapsed };
    }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleContactSidebar: () =>
    set((state) => {
      const visible = !state.contactSidebarVisible;
      setSetting("contact_sidebar_visible", String(visible)).catch(() => {});
      return { contactSidebarVisible: visible };
    }),
  setContactSidebarVisible: (contactSidebarVisible) => set({ contactSidebarVisible }),
  setReadingPanePosition: (readingPanePosition) => {
    setSetting("reading_pane_position", readingPanePosition).catch(() => {});
    set({ readingPanePosition });
  },
  setReadFilter: (readFilter) => {
    setSetting("read_filter", readFilter).catch(() => {});
    set({ readFilter });
  },
  setEmailListWidth: (emailListWidth) => {
    setSetting("email_list_width", String(emailListWidth)).catch(() => {});
    set({ emailListWidth });
  },
  setEmailDensity: (emailDensity) => {
    setSetting("email_density", emailDensity).catch(() => {});
    set({ emailDensity });
  },
  setDefaultReplyMode: (defaultReplyMode) => {
    setSetting("default_reply_mode", defaultReplyMode).catch(() => {});
    set({ defaultReplyMode });
  },
  setShowSenderAvatars: (showSenderAvatars) => {
    setSetting("show_sender_avatars", showSenderAvatars ? "true" : "false").catch(() => {});
    set({ showSenderAvatars });
  },
  setEmailSort: (emailSort) => {
    setSetting("email_sort", emailSort).catch(() => {});
    set({ emailSort });
  },
  setEmailBodyTheme: (emailBodyTheme) => {
    setSetting("email_body_theme", emailBodyTheme).catch(() => {});
    set({ emailBodyTheme });
  },
  // Cycles light → dim → dark → light
  toggleEmailBodyTheme: () =>
    set((state) => {
      const next = EMAIL_BODY_THEMES[
        (EMAIL_BODY_THEMES.indexOf(state.emailBodyTheme) + 1) % EMAIL_BODY_THEMES.length
      ]!;
      setSetting("email_body_theme", next).catch(() => {});
      return { emailBodyTheme: next };
    }),
  setSyncing: (isSyncing: boolean) => set({ isSyncing }),
  setSettingsAccountId: (settingsAccountId: string | null) => set({ settingsAccountId }),
  setLastSyncAt: (lastSyncAt) => {
    setSetting("last_sync_at", String(lastSyncAt)).catch(() => {});
    set({ lastSyncAt });
  },
  setMarkAsReadBehavior: (markAsReadBehavior) => {
    setSetting("mark_as_read_behavior", markAsReadBehavior).catch(() => {});
    set({ markAsReadBehavior });
  },
  setFontScale: (fontScale) => {
    setSetting("font_size", fontScale).catch(() => {});
    set({ fontScale });
  },
  setColorTheme: (colorTheme) => {
    setSetting("color_theme", colorTheme).catch(() => {});
    set({ colorTheme });
  },
  setSendAndArchive: (sendAndArchive) => {
    setSetting("send_and_archive", String(sendAndArchive)).catch(() => {});
    set({ sendAndArchive });
  },
  setInboxViewMode: (inboxViewMode) => {
    setSetting("inbox_view_mode", inboxViewMode).catch(() => {});
    set({ inboxViewMode });
  },
  toggleTaskSidebar: () =>
    set((state) => {
      const visible = !state.taskSidebarVisible;
      setSetting("task_sidebar_visible", String(visible)).catch(() => {});
      return { taskSidebarVisible: visible };
    }),
  setTaskSidebarVisible: (taskSidebarVisible) => set({ taskSidebarVisible }),
  setSidebarNavConfig: (sidebarNavConfig) => {
    setSetting("sidebar_nav_config", JSON.stringify(sidebarNavConfig)).catch(() => {});
    set({ sidebarNavConfig });
  },
  restoreSidebarNavConfig: (sidebarNavConfig) => set({ sidebarNavConfig }),
  setReduceMotion: (reduceMotion) => {
    setSetting("reduce_motion", String(reduceMotion)).catch(() => {});
    set({ reduceMotion });
  },
  setOnline: (isOnline) => set({ isOnline }),
  setPendingOpsCount: (pendingOpsCount) => set({ pendingOpsCount }),
  setSyncingFolder: (isSyncingFolder) => set({ isSyncingFolder }),
}));
