import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle undefined classes", () => {
    expect(cn("foo", undefined, "baz")).toBe("foo baz");
  });

  it("should merge conflicting tailwind classes", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });
});
