import { describe, expect, it } from "vitest";
import { csvCell, csvFilename, csvRow, neutraliseFormula, toCsv } from "@/lib/admin/csv";

describe("CSV builder (RFC 4180)", () => {
  it("leaves plain values bare", () => {
    expect(csvCell("Tesla Model Y")).toBe("Tesla Model Y");
    expect(csvCell(31200)).toBe("31200");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(true)).toBe("yes");
  });

  it("quotes fields with commas, quotes and line breaks, doubling embedded quotes", () => {
    expect(csvCell("Pope, Danny")).toBe('"Pope, Danny"');
    expect(csvCell('The "good" one')).toBe('"The ""good"" one"');
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
    expect(csvCell("cr\r\nlf")).toBe('"cr\r\nlf"');
  });

  it("ends every record with CRLF and joins with commas", () => {
    const doc = toCsv(["a", "b"], [["1", "x,y"], [2, null]]);
    expect(doc).toBe('a,b\r\n1,"x,y"\r\n2,\r\n');
  });

  it("adds a UTF-8 BOM only when asked", () => {
    expect(toCsv(["£"], [], { bom: true }).startsWith("﻿£")).toBe(true);
    expect(toCsv(["£"], []).startsWith("£")).toBe(true);
  });

  it("serialises dates as ISO 8601", () => {
    expect(csvCell(new Date("2026-10-13T09:00:00Z"))).toBe("2026-10-13T09:00:00.000Z");
  });
});

describe("formula-injection protection", () => {
  it.each([
    ["=HYPERLINK(\"http://evil\")", "'=HYPERLINK(\"http://evil\")"],
    ["+447700900123", "'+447700900123"],
    ["-2+3", "'-2+3"],
    ["@SUM(A1:A2)", "'@SUM(A1:A2)"],
    ["\t=1", "'\t=1"],
  ])("prefixes %j with a single quote", (input, expected) => {
    expect(neutraliseFormula(input)).toBe(expected);
  });

  it("still quotes a neutralised cell when it needs quoting", () => {
    expect(csvCell('=1+2,"x"')).toBe('"\'=1+2,""x"""');
  });

  it("does not touch real numbers or safe text", () => {
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell("a=b")).toBe("a=b");
    expect(csvRow(["GF-7K3Q9", "AB12CDE"])).toBe("GF-7K3Q9,AB12CDE");
  });

  it("makes filenames safe", () => {
    expect(csvFilename("leads export", "2026-10-13")).toBe("leads-export-2026-10-13.csv");
  });
});
