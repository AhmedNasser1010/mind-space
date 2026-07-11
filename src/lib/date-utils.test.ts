import { describe, expect, it } from "vitest"
import { toDateString } from "@/lib/date-utils"

describe("toDateString", () => {
  it("formats a mid-year date", () => {
    expect(toDateString(new Date(2026, 6, 11))).toBe("2026-07-11")
  })

  it("pads single-digit month and day", () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe("2026-01-05")
  })

  it("formats a December date", () => {
    expect(toDateString(new Date(2026, 11, 31))).toBe("2026-12-31")
  })
})
