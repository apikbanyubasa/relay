import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  serializeListQuery,
  TaskQueryBuilder,
  toStableQueryKey,
} from "./query-builder";

describe("Frontend TaskQueryBuilder Unit Tests (Contract v2)", () => {
  it("should build query state fluently with whereEquals, whereContains, and pagination", () => {
    const query = new TaskQueryBuilder()
      .whereEquals("status", ["IN_PROGRESS", "BLOCKED"])
      .whereContains("title", "onboarding")
      .whereBetween(
        "due_date",
        "2026-09-01T00:00:00.000Z",
        "2026-10-01T00:00:00.000Z",
        true,
      )
      .orderBy("due_date", "asc")
      .paginate(2, 20)
      .build();

    assert.equal(query.page, 2);
    assert.equal(query.rows, 20);
    assert.equal(query.orderKey, "due_date");
    assert.equal(query.orderRule, "asc");
    assert.deepEqual(query.filters.status, ["IN_PROGRESS", "BLOCKED"]);
    assert.equal(query.searchFilters.title, "onboarding");
    assert.equal(query.rangedFilters.length, 1);
    assert.equal(query.rangedFilters[0]?.exclusive?.end, true);
  });

  it("should serialize query parameters safely using URLSearchParams", () => {
    const query = new TaskQueryBuilder()
      .whereEquals("department", "FRONTEND")
      .whereContains("title", "Slicing")
      .paginate(1, 10)
      .build();

    const searchParams = serializeListQuery(query);
    const queryString = searchParams.toString();

    assert.ok(queryString.includes("filters="));
    assert.ok(queryString.includes("searchFilters="));
    assert.ok(queryString.includes("page=1"));
    assert.ok(queryString.includes("rows=10"));
  });

  it("should produce deterministic and stable query keys for TanStack Query", () => {
    const query1 = {
      filters: { status: "DONE", department: "BACKEND" },
      page: 1,
      rows: 10,
    };
    const query2 = {
      filters: { status: "DONE", department: "BACKEND" },
      page: 1,
      rows: 10,
    };

    const key1 = toStableQueryKey(query1);
    const key2 = toStableQueryKey(query2);

    assert.equal(key1, key2);
  });
});
