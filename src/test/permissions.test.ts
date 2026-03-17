import { describe, it, expect } from "vitest";
import {
  can,
  canAny,
  isPermissionVisible,
  cleanOrphanPermissions,
  autoAddParentPermissions,
  PRESET_VENDEUR,
  PRESET_ADMIN,
  PERMISSION_KEYS,
  PermissionKey,
} from "../lib/permissions";

// ── can() ────────────────────────────────────────────────────────
describe("can", () => {
  it("returns true when permission exists", () => {
    expect(can(["ventes.orders.create", "messaging.view"], "messaging.view")).toBe(true);
  });

  it("returns false when permission is missing", () => {
    expect(can(["messaging.view"], "admin.users.delete")).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(can([], "messaging.view")).toBe(false);
  });
});

// ── canAny() ─────────────────────────────────────────────────────
describe("canAny", () => {
  it("returns true when at least one key matches", () => {
    expect(canAny(["messaging.view"], ["admin.users.view", "messaging.view"])).toBe(true);
  });

  it("returns false when no key matches", () => {
    expect(canAny(["messaging.view"], ["admin.users.view", "admin.users.edit"])).toBe(false);
  });

  it("returns false for empty permissions", () => {
    expect(canAny([], ["messaging.view"])).toBe(false);
  });

  it("returns false for empty keys", () => {
    expect(canAny(["messaging.view"], [])).toBe(false);
  });
});

// ── isPermissionVisible() ────────────────────────────────────────
describe("isPermissionVisible", () => {
  it("root permissions are always visible", () => {
    expect(isPermissionVisible("ventes.products.view", [])).toBe(true);
  });

  it("child is visible when parent is checked", () => {
    expect(
      isPermissionVisible("ventes.products.create", ["ventes.products.view"])
    ).toBe(true);
  });

  it("child is hidden when parent is unchecked", () => {
    expect(isPermissionVisible("ventes.products.create", [])).toBe(false);
  });

  it("child with multiple parents is visible if any parent checked", () => {
    expect(
      isPermissionVisible("ventes.orders.create", ["ventes.orders.view_all"])
    ).toBe(true);
    expect(
      isPermissionVisible("ventes.orders.create", ["ventes.orders.view_own"])
    ).toBe(true);
  });
});

// ── cleanOrphanPermissions() ─────────────────────────────────────
describe("cleanOrphanPermissions", () => {
  it("keeps root permissions", () => {
    const perms: PermissionKey[] = ["ventes.products.view", "messaging.view"];
    expect(cleanOrphanPermissions(perms)).toEqual(perms);
  });

  it("removes orphan child when parent is gone", () => {
    const perms: PermissionKey[] = ["ventes.products.create"];
    expect(cleanOrphanPermissions(perms)).toEqual([]);
  });

  it("keeps child when parent present", () => {
    const perms: PermissionKey[] = ["ventes.products.view", "ventes.products.edit"];
    expect(cleanOrphanPermissions(perms)).toEqual(perms);
  });
});

// ── autoAddParentPermissions() ───────────────────────────────────
describe("autoAddParentPermissions", () => {
  it("auto-adds first parent when none present", () => {
    const result = autoAddParentPermissions("ventes.products.create", []);
    expect(result).toContain("ventes.products.view");
  });

  it("does not duplicate parent if already present", () => {
    const perms: PermissionKey[] = ["ventes.products.view"];
    const result = autoAddParentPermissions("ventes.products.create", perms);
    expect(result).toEqual(perms);
  });

  it("does nothing for root permissions", () => {
    const perms: PermissionKey[] = [];
    const result = autoAddParentPermissions("ventes.products.view", perms);
    expect(result).toEqual(perms);
  });
});

// ── Presets sanity ───────────────────────────────────────────────
describe("Presets", () => {
  it("PRESET_VENDEUR keys are valid PERMISSION_KEYS", () => {
    for (const k of PRESET_VENDEUR) {
      expect(PERMISSION_KEYS).toContain(k);
    }
  });

  it("PRESET_ADMIN keys are valid PERMISSION_KEYS", () => {
    for (const k of PRESET_ADMIN) {
      expect(PERMISSION_KEYS).toContain(k);
    }
  });
});
