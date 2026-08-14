import { describe, it, expect } from "vitest";
import { parseListQuery, pageCount, paginationArgs } from "./query";

describe("parseListQuery", () => {
  it("applies sane defaults", () => {
    const q = parseListQuery({});
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(20);
    expect(q.q).toBeUndefined();
    expect(q.status).toBeUndefined();
  });

  it("clamps invalid pages up to 1", () => {
    expect(parseListQuery({ page: "0" }).page).toBe(1);
    expect(parseListQuery({ page: "-5" }).page).toBe(1);
    expect(parseListQuery({ page: "abc" }).page).toBe(1);
  });

  it("caps page size", () => {
    expect(parseListQuery({}, { pageSize: 500 }).pageSize).toBe(100);
  });

  it("computes skip/take from page", () => {
    expect(paginationArgs(parseListQuery({ page: "3" }))).toEqual({ skip: 40, take: 20 });
  });
});

describe("pageCount", () => {
  it("never returns less than 1", () => {
    expect(pageCount(0, 20)).toBe(1);
  });
  it("rounds up", () => {
    expect(pageCount(21, 20)).toBe(2);
    expect(pageCount(40, 20)).toBe(2);
    expect(pageCount(41, 20)).toBe(3);
  });
});
