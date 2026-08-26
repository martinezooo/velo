import { describe, it, expect, beforeEach } from "vitest";
import { useAccountStore, mailAccounts, getViewAccountIds, type Account } from "./accountStore";

const mockAccount: Account = {
  id: "acc-1",
  email: "test@gmail.com",
  displayName: "Test User",
  avatarUrl: null,
  isActive: true,
};

const mockAccount2: Account = {
  id: "acc-2",
  email: "work@gmail.com",
  displayName: "Work Account",
  avatarUrl: null,
  isActive: true,
};

describe("accountStore", () => {
  beforeEach(() => {
    useAccountStore.setState({
      accounts: [],
      activeAccountId: null,
      unifiedInbox: false,
    });
  });

  it("should start with no accounts", () => {
    const state = useAccountStore.getState();
    expect(state.accounts).toHaveLength(0);
    expect(state.activeAccountId).toBeNull();
  });

  it("should add an account and set it as active", () => {
    useAccountStore.getState().addAccount(mockAccount);
    const state = useAccountStore.getState();
    expect(state.accounts).toHaveLength(1);
    expect(state.activeAccountId).toBe("acc-1");
  });

  it("should not override active account when adding second account", () => {
    useAccountStore.getState().addAccount(mockAccount);
    useAccountStore.getState().addAccount(mockAccount2);
    const state = useAccountStore.getState();
    expect(state.accounts).toHaveLength(2);
    expect(state.activeAccountId).toBe("acc-1");
  });

  it("should switch active account", () => {
    useAccountStore.getState().addAccount(mockAccount);
    useAccountStore.getState().addAccount(mockAccount2);
    useAccountStore.getState().setActiveAccount("acc-2");
    expect(useAccountStore.getState().activeAccountId).toBe("acc-2");
  });

  it("should remove account and update active if needed", () => {
    useAccountStore.getState().addAccount(mockAccount);
    useAccountStore.getState().addAccount(mockAccount2);
    useAccountStore.getState().removeAccount("acc-1");

    const state = useAccountStore.getState();
    expect(state.accounts).toHaveLength(1);
    expect(state.activeAccountId).toBe("acc-2");
  });

  it("should set active to null when last account removed", () => {
    useAccountStore.getState().addAccount(mockAccount);
    useAccountStore.getState().removeAccount("acc-1");

    const state = useAccountStore.getState();
    expect(state.accounts).toHaveLength(0);
    expect(state.activeAccountId).toBeNull();
  });

  it("should set accounts from array", () => {
    useAccountStore.getState().setAccounts([mockAccount, mockAccount2]);
    const state = useAccountStore.getState();
    expect(state.accounts).toHaveLength(2);
    expect(state.activeAccountId).toBe("acc-1");
  });

  describe("unified inbox", () => {
    const caldavAccount: Account = {
      id: "acc-cal",
      email: "cal@example.com",
      displayName: "Calendar",
      avatarUrl: null,
      isActive: true,
      provider: "caldav",
    };

    it("lists only the active account when unified mode is off", () => {
      useAccountStore.getState().setAccounts([mockAccount, mockAccount2]);
      expect(getViewAccountIds(useAccountStore.getState())).toEqual(["acc-1"]);
    });

    it("lists every mail account when unified mode is on", () => {
      useAccountStore.getState().setAccounts([mockAccount, mockAccount2]);
      useAccountStore.getState().setUnifiedInbox(true);
      expect(getViewAccountIds(useAccountStore.getState())).toEqual(["acc-1", "acc-2"]);
    });

    it("leaves out CalDAV-only accounts, which have no mailbox", () => {
      useAccountStore.getState().setAccounts([mockAccount, mockAccount2, caldavAccount]);
      useAccountStore.getState().setUnifiedInbox(true);
      expect(getViewAccountIds(useAccountStore.getState())).toEqual(["acc-1", "acc-2"]);
      expect(mailAccounts(useAccountStore.getState().accounts)).toHaveLength(2);
    });

    it("picking a specific account leaves unified mode", () => {
      useAccountStore.getState().setAccounts([mockAccount, mockAccount2]);
      useAccountStore.getState().setUnifiedInbox(true);
      useAccountStore.getState().setActiveAccount("acc-2");

      const state = useAccountStore.getState();
      expect(state.unifiedInbox).toBe(false);
      expect(state.activeAccountId).toBe("acc-2");
    });

    it("does not restore unified mode when only one mail account is left", () => {
      useAccountStore.getState().setAccounts([mockAccount], "acc-1", true);
      expect(useAccountStore.getState().unifiedInbox).toBe(false);
    });

    it("restores unified mode when several mail accounts exist", () => {
      useAccountStore.getState().setAccounts([mockAccount, mockAccount2], "acc-2", true);
      const state = useAccountStore.getState();
      expect(state.unifiedInbox).toBe(true);
      expect(state.activeAccountId).toBe("acc-2");
    });

    it("drops unified mode when removing an account leaves only one", () => {
      useAccountStore.getState().setAccounts([mockAccount, mockAccount2]);
      useAccountStore.getState().setUnifiedInbox(true);
      useAccountStore.getState().removeAccount("acc-2");
      expect(useAccountStore.getState().unifiedInbox).toBe(false);
    });
  });
});
