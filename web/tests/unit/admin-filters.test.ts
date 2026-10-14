import { describe, expect, it } from "vitest";
import { escapeLike, filtersToQuery, parseLeadFilters, searchTerms } from "@/lib/admin/filters";
import { duration, money, poundsToPence } from "@/lib/admin/format";
import { safeNextPath } from "@/lib/admin/next-path";

describe("lead filters in the URL", () => {
  it("parses valid values and drops invalid ones", () => {
    const f = parseLeadFilters({ q: "  ab12 cde ", status: "quoted", category: "car", from: "2026-02-30", to: "2026-10-13", sort: "oldest", page: "3" });
    expect(f).toEqual({ q: "ab12 cde", status: "quoted", category: undefined, channel: undefined, campaign: undefined, from: undefined, to: "2026-10-13", sort: "oldest", page: 3 });
  });

  it("defaults sort and page", () => {
    const f = parseLeadFilters(new URLSearchParams("page=-1&channel=google-ads"));
    expect(f.sort).toBe("newest");
    expect(f.page).toBe(1);
    expect(f.channel).toBe("google-ads");
  });

  it("round-trips to a canonical query string", () => {
    const f = parseLeadFilters({ status: "new", category: "tesla", page: "1" });
    expect(filtersToQuery(f)).toBe("?status=new&category=tesla");
    expect(filtersToQuery(f, { page: 2 })).toBe("?status=new&category=tesla&page=2");
    expect(filtersToQuery(parseLeadFilters({}))).toBe("");
  });

  it("rejects odd channel tokens", () => {
    expect(parseLeadFilters({ channel: "<script>" }).channel).toBeUndefined();
  });
});

describe("search terms", () => {
  it("normalises registrations with or without spaces", () => {
    expect(searchTerms("ab12 cde").reg).toBe("AB12CDE");
    expect(searchTerms("AB12CDE").reg).toBe("AB12CDE");
  });

  it("turns UK phone formats into the stored E.164 digits", () => {
    expect(searchTerms("07700 900123").phoneDigits).toBe("447700900123");
    expect(searchTerms("+44 7700 900123").phoneDigits).toBe("447700900123");
    expect(searchTerms("0044 7700 900123").phoneDigits).toBe("447700900123");
    expect(searchTerms("900123").phoneDigits).toBe("900123");
    expect(searchTerms("Danny").phoneDigits).toBeUndefined();
  });

  it("escapes LIKE wildcards", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });
});

describe("admin formatting", () => {
  it("parses pounds typed by a person", () => {
    expect(poundsToPence("12,500")).toBe(1_250_000);
    expect(poundsToPence("£12500.5")).toBe(1_250_050);
    expect(poundsToPence("12.345")).toBeNull();
    expect(poundsToPence("abc")).toBeNull();
    expect(poundsToPence("")).toBeNull();
  });

  it("formats money and durations", () => {
    expect(money(1_250_000)).toBe("£12,500");
    expect(duration(45_000)).toBe("45s");
    expect(duration(3 * 3_600_000 + 20 * 60_000)).toBe("3h 20m");
    expect(duration(52 * 3_600_000)).toBe("2d 4h");
  });
});

describe("sign-in redirect target", () => {
  it("only allows admin paths on this site", () => {
    expect(safeNextPath("/admin/leads?status=new")).toBe("/admin/leads?status=new");
    expect(safeNextPath("/admin")).toBe("/admin");
    expect(safeNextPath("https://evil.example/admin")).toBe("/admin");
    expect(safeNextPath("//evil.example/admin")).toBe("/admin");
    expect(safeNextPath("/administrator")).toBe("/admin");
    expect(safeNextPath("/admin\\..\\x")).toBe("/admin");
    expect(safeNextPath("/admin/login")).toBe("/admin");
    expect(safeNextPath(undefined)).toBe("/admin");
  });
});
