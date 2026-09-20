import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// PROCESS.md is the written account the marker reads. The course guides
// 400–600 words for an assignment and applies no penalty; the hard limit
// here is mine, so that the account cannot quietly grow into a report.

export const HARD_LIMIT = 1000;

/** Prose words: comments, code blocks and link targets do not count. */
export function proseWords(markdown: string): number {
  const prose = markdown
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/^#+\s+/gm, "");
  return prose.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

describe("PROCESS.md", () => {
  it(`stays under ${HARD_LIMIT} words of prose`, () => {
    const words = proseWords(readFileSync("PROCESS.md", "utf8"));
    expect(words, `${words} words`).toBeLessThanOrEqual(HARD_LIMIT);
  });

  it("counts prose only", () => {
    expect(proseWords("one two <!-- not three --> [four](https://example.com/five-six) ```seven```")).toBe(3);
  });
});
