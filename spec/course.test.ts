import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The Assignment 2 spec, as the lines a machine can hold me to. The rest of
// the published spec — whether the course is niche, whether it reads at both
// marking viewports, whether anyone would want to take it — is the crit's job.

interface ApiNode {
  id: string;
  type: string;
  meta?: Record<string, unknown>;
}

interface CourseApi {
  course: { code: string; level: number; startDate: string; endDate: string };
  nodes: ApiNode[];
}

const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as CourseApi;
const nodesOfType = (...types: string[]): ApiNode[] =>
  api.nodes.filter((node) => types.includes(node.type));
const pageHtml = (id: string): string => readFileSync(resolve("dist", id, "index.html"), "utf8");

// The three digits this repo was allocated. No other course in the cohort has
// them, so they survive every rewrite of the course record; only the level
// digit in front of them is mine to pick.
const ALLOCATED_DIGITS = "969";
// 1000–4000 undergraduate, 6000 and 8000 postgraduate.
const LEVEL_DIGITS = "12346" + "8";

// Teaching weeks are where teaching happens — sessions and lectures. An
// assessment falling in a week doesn't make that week taught.
const TEACHING_WEEKS = 12;
const teachingWeek = (node: ApiNode): number => Number(node.meta?.week);

describe("the course record", () => {
  it("keeps the three digits this repo arrived with", () => {
    expect(api.course.code).toMatch(new RegExp(`^SLOP[${LEVEL_DIGITS}]${ALLOCATED_DIGITS}$`));
  });

  it("declares a level matching the code's first digit", () => {
    expect(api.course.level).toBe(Number(api.course.code.at(4)));
  });
});

describe("twelve dated teaching weeks", () => {
  const taught = nodesOfType("sessions", "lectures");

  it(`runs across ${TEACHING_WEEKS} numbered weeks with nothing missing`, () => {
    const weeks = new Set(taught.map(teachingWeek));
    const expected = Array.from({ length: TEACHING_WEEKS }, (_, i) => i + 1);
    expect([...weeks].sort((a, b) => a - b)).toEqual(expected);
  });

  it("dates each week, and never two weeks to the same day", () => {
    const byWeek = new Map<number, Set<string>>();
    for (const node of taught) {
      const date = String(node.meta?.date).slice(0, 10);
      expect(date, `${node.id} has no date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      byWeek.set(teachingWeek(node), (byWeek.get(teachingWeek(node)) ?? new Set()).add(date));
    }
    const starts = [...byWeek.entries()]
      .sort(([a], [b]) => a - b)
      .map(([week, dates]) => ({ week, start: [...dates].sort()[0] }));
    for (const [i, current] of starts.entries()) {
      const previous = starts[i - 1];
      if (!previous) continue;
      expect(current.start > previous.start, `week ${current.week} doesn't follow week ${previous.week}`).toBe(true);
    }
  });
});

describe("assessment", () => {
  it("adds up to 100%", () => {
    const assessments = nodesOfType("assessments");
    expect(assessments.length).toBeGreaterThan(0);
    const total = assessments.reduce((sum, node) => sum + Number(node.meta?.weight ?? 0), 0);
    expect(total).toBe(100);
  });
});

describe("slides", () => {
  const builtDecks = existsSync(resolve("dist/decks"))
    ? readdirSync(resolve("dist/decks")).filter((name) =>
        existsSync(resolve("dist/decks", name, "index.html")),
      )
    : [];

  it("builds at least one deck", () => {
    expect(builtDecks).not.toHaveLength(0);
  });

  it("links a built deck from a lecture's own page", () => {
    const linking = nodesOfType("lectures").filter((node) => {
      const html = pageHtml(node.id);
      return builtDecks.some((deck) => html.includes(`/decks/${deck}/`));
    });
    expect(linking.map((node) => node.id)).not.toHaveLength(0);
  });
});
