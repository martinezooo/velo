import { useState, useRef, useCallback } from "react";
import { useAccountStore, mailAccounts, type Account } from "@/stores/accountStore";
import { ChevronDown, Check, Plus, UserPlus, Calendar, Layers } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";

interface AccountSwitcherProps {
  collapsed: boolean;
  onAddAccount: () => void;
  /**
   * "block" is the standalone header card. "inline" is the compact line that
   * sits under the Inbox row, where the scope belongs — picking which mailbox
   * you are reading is a property of the inbox, not of the whole window, and
   * folding it in there buys back the header's vertical space.
   */
  variant?: "block" | "inline";
}

export function AccountSwitcher({
  collapsed,
  onAddAccount,
  variant = "block",
}: AccountSwitcherProps) {
  const { accounts, activeAccountId, unifiedInbox, setActiveAccount, setUnifiedInbox } =
    useAccountStore();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useClickOutside(dropdownRef, () => setOpen(false));

  const activeAccount = accounts.find((a) => a.id === activeAccountId);
  // "All inboxes" is only meaningful with more than one mailbox
  const canUnify = mailAccounts(accounts).length > 1;

  const handleSwitch = useCallback(
    (id: string) => {
      setActiveAccount(id);
      setOpen(false);
    },
    [setActiveAccount],
  );

  const handleSelectUnified = useCallback(() => {
    setUnifiedInbox(true);
    setOpen(false);
  }, [setUnifiedInbox]);

  const handleAdd = useCallback(() => {
    onAddAccount();
    setOpen(false);
  }, [onAddAccount]);

  // No accounts — prompt to add
  if (accounts.length === 0) {
    return (
      <div className="p-3">
        <button
          onClick={onAddAccount}
          className={`flex items-center w-full rounded-lg p-2 text-sm text-sidebar-text/70 hover:bg-sidebar-hover hover:text-sidebar-text transition-colors ${
            collapsed ? "justify-center" : "gap-3"
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <UserPlus size={16} className="text-accent" />
          </div>
          {!collapsed && <span className="font-medium">Add Account</span>}
        </button>
      </div>
    );
  }

  const renderDropdown = () => (
        <div
          className={`absolute z-50 mt-1 py-1 rounded-lg border border-border-primary bg-bg-primary shadow-lg glass-panel ${
            collapsed ? "left-full ml-1 top-0 w-64" : "left-2 right-2"
          }`}
        >
          {canUnify && (
            <>
              <button
                onClick={handleSelectUnified}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors ${
                  unifiedInbox
                    ? "bg-accent/8 text-accent"
                    : "text-text-primary hover:bg-bg-hover"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    unifiedInbox ? "bg-accent text-white" : "bg-accent/12 text-accent"
                  }`}
                >
                  <Layers size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate leading-tight">
                    All inboxes
                  </div>
                  <div className="text-xs text-text-secondary truncate leading-tight">
                    Mail from every account in one list
                  </div>
                </div>
                {unifiedInbox && <Check size={14} className="shrink-0 text-accent" />}
              </button>
              <div className="border-t border-border-primary my-1" />
            </>
          )}
          {accounts.length > 1 && (
            <div className="px-3 py-1.5 text-[0.625rem] font-medium text-text-tertiary uppercase tracking-wider">
              Accounts
            </div>
          )}
          {accounts.map((account) => {
            const isActive = !unifiedInbox && account.id === activeAccountId;
            return (
              <button
                key={account.id}
                onClick={() => handleSwitch(account.id)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors ${
                  isActive
                    ? "bg-accent/8 text-accent"
                    : "text-text-primary hover:bg-bg-hover"
                }`}
              >
                <AccountAvatarSmall account={account} isActive={isActive} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate leading-tight flex items-center gap-1.5">
                    {account.displayName || account.email.split("@")[0]}
                    {account.provider === "caldav" && (
                      <Calendar size={12} className="shrink-0 text-text-tertiary" />
                    )}
                  </div>
                  <div className="text-xs text-text-secondary truncate leading-tight">
                    {account.email}
                  </div>
                </div>
                {isActive && (
                  <Check size={14} className="shrink-0 text-accent" />
                )}
              </button>
            );
          })}
          <div className="border-t border-border-primary my-1" />
          <button
            onClick={handleAdd}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center shrink-0">
              <Plus size={14} />
            </div>
            <span>Add account</span>
          </button>
        </div>
  );

  if (variant === "inline") {
    const scopeLabel = unifiedInbox
      ? "All inboxes"
      : activeAccount?.email ?? "No account";
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          title={unifiedInbox ? `All inboxes — ${mailAccounts(accounts).length} accounts` : scopeLabel}
          className={`flex items-center w-full transition-colors rounded-md ${
            collapsed ? "justify-center py-1.5" : "gap-1.5 py-1 pl-7 pr-3"
          } text-[0.75rem] text-sidebar-text/55 hover:text-sidebar-text hover:bg-sidebar-hover`}
        >
          {unifiedInbox
            ? <Layers size={12} className="shrink-0 text-accent" />
            : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left">{scopeLabel}</span>
              <ChevronDown
                size={12}
                className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              />
            </>
          )}
        </button>
        {open && renderDropdown()}
      </div>
    );
  }

  return (
    <div className="relative p-2" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center w-full rounded-lg p-1.5 hover:bg-sidebar-hover transition-colors ${
          collapsed ? "justify-center" : "gap-2.5"
        } ${open ? "bg-sidebar-hover" : ""}`}
      >
        {unifiedInbox ? <UnifiedAvatar /> : <ActiveAvatar account={activeAccount} />}
        {!collapsed && (unifiedInbox || activeAccount) && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium text-sidebar-text truncate leading-tight">
                {unifiedInbox
                  ? "All inboxes"
                  : activeAccount!.displayName || activeAccount!.email.split("@")[0]}
              </div>
              <div className="text-xs text-sidebar-text/50 truncate leading-tight">
                {unifiedInbox
                  ? `${mailAccounts(accounts).length} accounts`
                  : activeAccount!.email}
              </div>
            </div>
            <ChevronDown
              size={14}
              className={`shrink-0 text-sidebar-text/40 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && renderDropdown()}
    </div>
  );
}

/** Trigger avatar for "All inboxes" — stands in for no single account */
function UnifiedAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
      <Layers size={16} />
    </div>
  );
}

/** The main avatar shown in the trigger — slightly larger */
function ActiveAvatar({ account }: { account: Account | undefined }) {
  const [imgError, setImgError] = useState(false);

  if (!account) return null;

  const initial = (
    account.displayName?.[0] ?? account.email[0] ?? "?"
  ).toUpperCase();
  const showImg = account.avatarUrl && !imgError;

  return (
    <div className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0 text-sm font-semibold overflow-hidden">
      {showImg ? (
        <img
          key={account.avatarUrl}
          src={account.avatarUrl!}
          alt={account.email}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
}

/** Smaller avatar used inside the dropdown list */
function AccountAvatarSmall({
  account,
  isActive,
}: {
  account: Account;
  isActive: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  const initial = (
    account.displayName?.[0] ?? account.email[0] ?? "?"
  ).toUpperCase();
  const showImg = account.avatarUrl && !imgError;

  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold overflow-hidden ${
        isActive
          ? "bg-accent text-white"
          : "bg-accent/12 text-accent"
      }`}
    >
      {showImg ? (
        <img
          key={account.avatarUrl}
          src={account.avatarUrl!}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
}
