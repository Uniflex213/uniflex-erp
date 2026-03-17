import { describe, it, expect } from "vitest";
import { fmt, detectDestination, detectProvince, computeTaxLines } from "../orders/orderTaxUtils";

// ── fmt() ────────────────────────────────────────────────────────
describe("fmt", () => {
  it("formats CAD currency", () => {
    const result = fmt(1234.5);
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("50");
  });

  it("handles zero", () => {
    const result = fmt(0);
    expect(result).toContain("0");
  });
});

// ── detectDestination() ──────────────────────────────────────────
describe("detectDestination", () => {
  it("detects CANADA from postal code starting with letter", () => {
    expect(detectDestination("", "J7C 1N1")).toBe("CANADA");
    expect(detectDestination("", "H3B 2Y5")).toBe("CANADA");
  });

  it("detects USA from 5-digit zip code", () => {
    expect(detectDestination("", "10001")).toBe("USA");
    expect(detectDestination("", "90210")).toBe("USA");
  });

  it("detects CANADA from address containing province", () => {
    expect(detectDestination("123 rue Principale, Montréal QC H3B", "")).toBe("CANADA");
  });

  it("detects USA from address containing state abbreviation", () => {
    expect(detectDestination("456 Main St, New York NY 10001", "")).toBe("USA");
  });

  it("returns empty when undetectable", () => {
    expect(detectDestination("", "")).toBe("");
  });
});

// ── detectProvince() ─────────────────────────────────────────────
describe("detectProvince", () => {
  it("detects QC from abbreviation", () => {
    expect(detectProvince("Montréal, QC H3B 2Y5")).toBe("QC");
  });

  it("detects ON from 'ONTARIO'", () => {
    expect(detectProvince("Toronto, Ontario M5V")).toBe("ON");
  });

  it("detects BC from abbreviation", () => {
    expect(detectProvince("Vancouver BC V6B")).toBe("BC");
  });

  it("detects AB from 'ALBERTA'", () => {
    expect(detectProvince("Calgary, Alberta T2P")).toBe("AB");
  });

  it("returns empty for unknown", () => {
    expect(detectProvince("Somewhere far away")).toBe("");
  });
});

// ── computeTaxLines() ────────────────────────────────────────────
describe("computeTaxLines", () => {
  const amount = 100;

  it("returns empty for no province", () => {
    expect(computeTaxLines("", amount)).toEqual([]);
  });

  it("QC: TPS 5% + TVQ 9.975%", () => {
    const lines = computeTaxLines("QC", amount);
    expect(lines).toHaveLength(2);
    expect(lines[0].label).toBe("TPS (5%)");
    expect(lines[0].amount).toBeCloseTo(5);
    expect(lines[1].label).toBe("TVQ (9.975%)");
    expect(lines[1].amount).toBeCloseTo(9.975);
  });

  it("ON: TVH 13%", () => {
    const lines = computeTaxLines("ON", amount);
    expect(lines).toHaveLength(1);
    expect(lines[0].label).toBe("TVH (13%)");
    expect(lines[0].amount).toBeCloseTo(13);
  });

  it("NB: TVH 15%", () => {
    const lines = computeTaxLines("NB", amount);
    expect(lines).toHaveLength(1);
    expect(lines[0].label).toBe("TVH (15%)");
    expect(lines[0].amount).toBeCloseTo(15);
  });

  it("BC: TPS 5% + PST 7%", () => {
    const lines = computeTaxLines("BC", amount);
    expect(lines).toHaveLength(2);
    expect(lines[0].amount).toBeCloseTo(5);
    expect(lines[1].label).toBe("PST (7%)");
    expect(lines[1].amount).toBeCloseTo(7);
  });

  it("SK: TPS 5% + PST 6%", () => {
    const lines = computeTaxLines("SK", amount);
    expect(lines).toHaveLength(2);
    expect(lines[1].label).toBe("PST (6%)");
    expect(lines[1].amount).toBeCloseTo(6);
  });

  it("MB: TPS 5% + PST 7%", () => {
    const lines = computeTaxLines("MB", amount);
    expect(lines).toHaveLength(2);
    expect(lines[1].label).toBe("PST (7%)");
    expect(lines[1].amount).toBeCloseTo(7);
  });

  it("AB: TPS 5% only (no provincial tax)", () => {
    const lines = computeTaxLines("AB", amount);
    expect(lines).toHaveLength(1);
    expect(lines[0].label).toBe("TPS (5%)");
    expect(lines[0].amount).toBeCloseTo(5);
  });

  it("NS/PE/NL: TVH 15%", () => {
    for (const prov of ["NS", "PE", "NL"]) {
      const lines = computeTaxLines(prov, amount);
      expect(lines).toHaveLength(1);
      expect(lines[0].amount).toBeCloseTo(15);
    }
  });
});
