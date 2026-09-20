// The independent validator (docs/engine.md §5–§7): it reads a plan, never
// a planner's opinion of it. A plan with a violation is not a valid plan.
// Unfinished orders are reported, not hidden, and stay in the denominator.

import { overlaps, type Occupancy } from "./reservations.ts";

export interface Activity {
  owner: string;
  kind: "load" | "fly" | "service" | "wait" | "turnaround" | "charge";
  start: number;
  end: number;
  task?: string;
}

export interface Delivery {
  order: string;
  owner: string;
  tick: number;
}

export interface PlanForValidation {
  orders: string[];
  activities: Activity[];
  occupancies: Occupancy[];
  deliveries: Delivery[];
  capacities: Record<string, number>;
  cutoff: number;
}

export interface Violation {
  rule: "interval" | "overlap-self" | "capacity" | "delivered-twice" | "unknown-order";
  detail: string;
  owner?: string;
  resource?: string;
  order?: string;
  tick?: number;
}

export interface Validation {
  ok: boolean;
  violations: Violation[];
  delivered: string[];
  /** Orders with no delivery before the cut-off, each with the reason. */
  unfinished: { order: string; reason: "not-delivered" | "after-cutoff" }[];
}

export function validate(plan: PlanForValidation): Validation {
  const violations: Violation[] = [];

  for (const a of plan.activities) {
    if (!(a.start < a.end)) violations.push({ rule: "interval", detail: `${a.owner} ${a.kind} [${a.start}, ${a.end}) is empty or reversed`, owner: a.owner });
  }
  for (const o of plan.occupancies) {
    if (!(o.start < o.end)) violations.push({ rule: "interval", detail: `${o.owner} on ${o.resource} [${o.start}, ${o.end}) is empty or reversed`, owner: o.owner, resource: o.resource });
  }

  // One drone does one thing at a time.
  const byOwner = new Map<string, Activity[]>();
  for (const a of plan.activities) byOwner.set(a.owner, [...(byOwner.get(a.owner) ?? []), a]);
  for (const [owner, acts] of byOwner) {
    const sorted = [...acts].sort((x, y) => x.start - y.start);
    for (let i = 1; i < sorted.length; i++) {
      const p = sorted[i - 1], q = sorted[i];
      if (overlaps(p, q)) violations.push({ rule: "overlap-self", detail: `${owner}: ${p.kind} [${p.start}, ${p.end}) overlaps ${q.kind} [${q.start}, ${q.end})`, owner, tick: q.start });
    }
  }

  // Capacity at every tick where something changes.
  const resources = new Set(plan.occupancies.map((o) => o.resource));
  for (const resource of resources) {
    const cap = plan.capacities[resource] ?? 1;
    const entries = plan.occupancies.filter((o) => o.resource === resource);
    const points = [...new Set(entries.map((e) => e.start))].sort((a, b) => a - b);
    for (const t of points) {
      const owners = new Set(entries.filter((e) => e.start <= t && t < e.end).map((e) => e.owner));
      if (owners.size > cap) {
        violations.push({ rule: "capacity", detail: `${resource} holds ${[...owners].join(", ")} at tick ${t}; capacity ${cap}`, resource, tick: t });
        break;
      }
    }
  }

  // Every order delivered at most once, and only orders that exist.
  const seen = new Map<string, Delivery>();
  for (const d of plan.deliveries) {
    if (!plan.orders.includes(d.order)) violations.push({ rule: "unknown-order", detail: `${d.owner} delivered ${d.order}, which is not in the case`, order: d.order, owner: d.owner });
    const prev = seen.get(d.order);
    if (prev) violations.push({ rule: "delivered-twice", detail: `${d.order} delivered by ${prev.owner} at ${prev.tick} and by ${d.owner} at ${d.tick}`, order: d.order });
    else seen.set(d.order, d);
  }
  const delivered = plan.orders.filter((o) => seen.has(o) && seen.get(o)!.tick <= plan.cutoff);
  const unfinished = plan.orders
    .filter((o) => !delivered.includes(o))
    .map((o) => ({ order: o, reason: seen.has(o) ? ("after-cutoff" as const) : ("not-delivered" as const) }));

  return { ok: violations.length === 0, violations, delivered, unfinished };
}
