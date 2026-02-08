import { describe, it, expect } from "vitest";
import {
  normalizeRole,
  getRoleLabel,
  canEdit,
  canAddStories,
  canImport,
  canExport,
  canInvite,
  canManageMembers,
  canDeleteGraph,
  canUseGuestMode,
  getMaxInviteRole,
  getInvitableRoles,
} from "./roles";

describe("normalizeRole", () => {
  it("maps 'admin' to 'owner'", () => {
    expect(normalizeRole("admin")).toBe("owner");
  });

  it("maps 'member' to 'viewer'", () => {
    expect(normalizeRole("member")).toBe("viewer");
  });

  it("passes through new role names unchanged", () => {
    expect(normalizeRole("owner")).toBe("owner");
    expect(normalizeRole("editor")).toBe("editor");
    expect(normalizeRole("contributor")).toBe("contributor");
    expect(normalizeRole("viewer")).toBe("viewer");
  });
});

describe("getRoleLabel", () => {
  it("capitalizes role names", () => {
    expect(getRoleLabel("owner")).toBe("Owner");
    expect(getRoleLabel("editor")).toBe("Editor");
    expect(getRoleLabel("contributor")).toBe("Contributor");
    expect(getRoleLabel("viewer")).toBe("Viewer");
  });

  it("handles legacy role names", () => {
    expect(getRoleLabel("admin")).toBe("Owner");
    expect(getRoleLabel("member")).toBe("Viewer");
  });
});

describe("canEdit", () => {
  it("allows owner", () => expect(canEdit("owner")).toBe(true));
  it("allows editor", () => expect(canEdit("editor")).toBe(true));
  it("denies contributor", () => expect(canEdit("contributor")).toBe(false));
  it("denies viewer", () => expect(canEdit("viewer")).toBe(false));
  it("allows legacy admin", () => expect(canEdit("admin")).toBe(true));
  it("denies legacy member", () => expect(canEdit("member")).toBe(false));
});

describe("canAddStories", () => {
  it("allows owner", () => expect(canAddStories("owner")).toBe(true));
  it("allows editor", () => expect(canAddStories("editor")).toBe(true));
  it("allows contributor", () => expect(canAddStories("contributor")).toBe(true));
  it("denies viewer", () => expect(canAddStories("viewer")).toBe(false));
});

describe("canImport", () => {
  it("allows owner", () => expect(canImport("owner")).toBe(true));
  it("denies editor", () => expect(canImport("editor")).toBe(false));
  it("denies contributor", () => expect(canImport("contributor")).toBe(false));
  it("denies viewer", () => expect(canImport("viewer")).toBe(false));
});

describe("canExport", () => {
  it("allows owner", () => expect(canExport("owner")).toBe(true));
  it("denies editor", () => expect(canExport("editor")).toBe(false));
  it("denies contributor", () => expect(canExport("contributor")).toBe(false));
  it("denies viewer", () => expect(canExport("viewer")).toBe(false));
});

describe("canInvite", () => {
  it("allows owner", () => expect(canInvite("owner")).toBe(true));
  it("allows editor", () => expect(canInvite("editor")).toBe(true));
  it("denies contributor", () => expect(canInvite("contributor")).toBe(false));
  it("denies viewer", () => expect(canInvite("viewer")).toBe(false));
});

describe("canManageMembers", () => {
  it("allows owner", () => expect(canManageMembers("owner")).toBe(true));
  it("denies editor", () => expect(canManageMembers("editor")).toBe(false));
  it("denies contributor", () => expect(canManageMembers("contributor")).toBe(false));
  it("denies viewer", () => expect(canManageMembers("viewer")).toBe(false));
});

describe("canDeleteGraph", () => {
  it("allows owner", () => expect(canDeleteGraph("owner")).toBe(true));
  it("denies editor", () => expect(canDeleteGraph("editor")).toBe(false));
});

describe("canUseGuestMode", () => {
  it("allows owner", () => expect(canUseGuestMode("owner")).toBe(true));
  it("allows editor", () => expect(canUseGuestMode("editor")).toBe(true));
  it("denies contributor", () => expect(canUseGuestMode("contributor")).toBe(false));
  it("denies viewer", () => expect(canUseGuestMode("viewer")).toBe(false));
});

describe("getMaxInviteRole", () => {
  it("owner can invite up to editor", () => {
    expect(getMaxInviteRole("owner")).toBe("editor");
  });

  it("editor can invite up to contributor", () => {
    expect(getMaxInviteRole("editor")).toBe("contributor");
  });

  it("contributor cannot invite", () => {
    expect(getMaxInviteRole("contributor")).toBeNull();
  });

  it("viewer cannot invite", () => {
    expect(getMaxInviteRole("viewer")).toBeNull();
  });

  it("legacy admin can invite up to editor", () => {
    expect(getMaxInviteRole("admin")).toBe("editor");
  });
});

describe("getInvitableRoles", () => {
  it("owner can invite editor, contributor, viewer", () => {
    expect(getInvitableRoles("owner")).toEqual(["editor", "contributor", "viewer"]);
  });

  it("editor can invite contributor, viewer", () => {
    expect(getInvitableRoles("editor")).toEqual(["contributor", "viewer"]);
  });

  it("contributor gets empty array", () => {
    expect(getInvitableRoles("contributor")).toEqual([]);
  });

  it("viewer gets empty array", () => {
    expect(getInvitableRoles("viewer")).toEqual([]);
  });
});
