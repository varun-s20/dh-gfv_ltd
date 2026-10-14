import { describe, expect, it } from "vitest";
import { CONVERSION_HEADER, conversionsCsv, conversionValue, toConversionRows, type ConversionCandidate } from "@/lib/admin/conversions";
import { addLondonDays, dateKeyToInstant, formatConversionTime, londonDateKey, startOfLondonDay, zoneOffsetMinutes } from "@/lib/admin/time";

const base: ConversionCandidate = {
  gclid: "Cj0KCQjw-test_GCLID123",
  status: "accepted",
  purchasePricePence: null,
  closedAt: null,
  acceptedPence: 1_250_000,
  acceptedAt: new Date("2026-07-01T12:00:00Z"),
  updatedAt: new Date("2026-07-02T09:00:00Z"),
};

describe("Google Ads conversion time", () => {
  it("formats BST with a +0100 offset", () => {
    expect(formatConversionTime(new Date("2026-07-01T12:00:00Z"))).toBe("2026-07-01 13:00:00+0100");
  });

  it("formats GMT with a +0000 offset", () => {
    expect(formatConversionTime(new Date("2026-01-15T09:30:05Z"))).toBe("2026-01-15 09:30:05+0000");
  });

  it("handles the spring-forward changeover", () => {
    expect(formatConversionTime(new Date("2026-03-29T00:59:59Z"))).toBe("2026-03-29 00:59:59+0000");
    expect(formatConversionTime(new Date("2026-03-29T01:00:00Z"))).toBe("2026-03-29 02:00:00+0100");
  });

  it("handles the autumn changeover", () => {
    expect(formatConversionTime(new Date("2026-10-25T00:30:00Z"))).toBe("2026-10-25 01:30:00+0100");
    expect(formatConversionTime(new Date("2026-10-25T01:30:00Z"))).toBe("2026-10-25 01:30:00+0000");
  });
});

describe("London calendar helpers", () => {
  it("finds London midnight in summer and winter", () => {
    expect(startOfLondonDay(new Date("2026-07-01T12:00:00Z")).toISOString()).toBe("2026-06-30T23:00:00.000Z");
    expect(startOfLondonDay(new Date("2026-01-15T00:30:00Z")).toISOString()).toBe("2026-01-15T00:00:00.000Z");
    expect(londonDateKey(new Date("2026-06-30T23:30:00Z"))).toBe("2026-07-01");
  });

  it("parses date inputs and rejects nonsense", () => {
    expect(dateKeyToInstant("2026-07-01")?.toISOString()).toBe("2026-06-30T23:00:00.000Z");
    expect(dateKeyToInstant("2026-07-01", 1)?.toISOString()).toBe("2026-07-01T23:00:00.000Z");
    expect(dateKeyToInstant("2026-02-30")).toBeNull();
    expect(dateKeyToInstant("13/10/2026")).toBeNull();
  });

  it("adds calendar days across a changeover", () => {
    expect(addLondonDays(new Date("2026-03-28T12:00:00Z"), 1).toISOString()).toBe("2026-03-29T00:00:00.000Z");
    expect(addLondonDays(new Date("2026-03-28T12:00:00Z"), 2).toISOString()).toBe("2026-03-29T23:00:00.000Z");
    expect(zoneOffsetMinutes(new Date("2026-08-01T00:00:00Z"))).toBe(60);
  });
});

describe("offline conversion rows", () => {
  it("uses the accepted offer when no purchase is recorded", () => {
    const [row] = toConversionRows([base], "Vehicle purchased");
    expect(row).toMatchObject({ gclid: base.gclid, valuePence: 1_250_000, name: "Vehicle purchased" });
    expect(row?.time.toISOString()).toBe("2026-07-01T12:00:00.000Z");
  });

  it("prefers the recorded purchase price and closing time", () => {
    const [row] = toConversionRows(
      [{ ...base, status: "closed", purchasePricePence: 1_200_050, closedAt: new Date("2026-07-05T10:00:00Z") }],
      "Purchase",
    );
    expect(row?.valuePence).toBe(1_200_050);
    expect(row?.time.toISOString()).toBe("2026-07-05T10:00:00.000Z");
  });

  it("skips leads without a usable gclid, without a value, or in other statuses", () => {
    const rows = toConversionRows(
      [
        { ...base, gclid: null },
        { ...base, gclid: "bad gclid with spaces" },
        { ...base, status: "quoted" },
        { ...base, status: "closed", acceptedPence: null, purchasePricePence: null },
      ],
      "x",
    );
    expect(rows).toHaveLength(0);
  });

  it("falls back to a default conversion name", () => {
    expect(toConversionRows([base], "   ")[0]?.name).toBe("Vehicle purchased");
  });

  it("writes Google's upload template", () => {
    const csv = conversionsCsv(toConversionRows([base], "Vehicle purchased"));
    const [header, line] = csv.split("\r\n");
    expect(header).toBe("Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency");
    expect(CONVERSION_HEADER).toHaveLength(5);
    expect(line).toBe("Cj0KCQjw-test_GCLID123,Vehicle purchased,2026-07-01 13:00:00+0100,12500.00,GBP");
    expect(csv.startsWith("﻿")).toBe(false);
  });

  it("neutralises a formula-like conversion name", () => {
    const csv = conversionsCsv(toConversionRows([base], "=cmd"));
    expect(csv.split("\r\n")[1]).toContain(",'=cmd,");
  });

  it("formats values as plain decimals", () => {
    expect(conversionValue(1_250_000)).toBe("12500.00");
    expect(conversionValue(99)).toBe("0.99");
  });
});
