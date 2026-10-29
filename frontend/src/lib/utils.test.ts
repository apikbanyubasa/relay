import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cn, formatDate, formatDateTime } from "./utils";

describe("Frontend Utility Unit Tests", () => {
  it("should merge classnames correctly with tailwind-merge", () => {
    const result = cn("px-4 py-2 bg-red-500", "bg-blue-500", {
      "text-white": true,
      "opacity-50": false,
    });
    assert.equal(result, "px-4 py-2 bg-blue-500 text-white");
  });

  it("should format date strings properly", () => {
    const formatted = formatDate("2026-09-26T12:00:00Z");
    assert.ok(formatted.includes("2026"));
    assert.equal(formatDate(null), "-");
    assert.equal(formatDate(undefined), "-");
  });

  it("should format date-time strings properly", () => {
    const formatted = formatDateTime("2026-09-26T14:30:00Z");
    assert.ok(formatted.includes("2026"));
    assert.equal(formatDateTime(null), "-");
  });
});
