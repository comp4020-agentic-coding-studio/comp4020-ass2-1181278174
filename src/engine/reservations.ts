// Shared resources as half-open occupancy intervals (docs/engine.md §5,
// week 9). A resource has a capacity: the corridor 1, the charging pads 2.
// Two occupancies overlap when max(s1, s2) < min(e1, e2). A drone's own
// consecutive occupancies of one resource count once. Reservations are tried
// inside a transaction and kept only when the whole task commits.

export interface Interval {
  start: number;
  end: number;
}

export interface Occupancy extends Interval {
  resource: string;
  owner: string;
  task?: string;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
}

/** The most distinct owners occupying `resource` at any tick of [start, end). */
function peakOwners(entries: Occupancy[], resource: string, start: number, end: number, ignoreOwner?: string): number {
  const relevant = entries.filter((e) => e.resource === resource && e.owner !== ignoreOwner && overlaps(e, { start, end }));
  const points = new Set<number>([start]);
  for (const e of relevant) {
    if (e.start > start && e.start < end) points.add(e.start);
    if (e.end > start && e.end < end) points.add(e.end);
  }
  let peak = 0;
  for (const t of points) {
    const owners = new Set(relevant.filter((e) => e.start <= t && t < e.end).map((e) => e.owner));
    peak = Math.max(peak, owners.size);
  }
  return peak;
}

export class ReservationTable {
  private entries: Occupancy[] = [];
  private readonly capacities: Record<string, number>;
  private readonly defaultCapacity: number;

  constructor(capacities: Record<string, number> = {}, defaultCapacity = 1) {
    this.capacities = capacities;
    this.defaultCapacity = defaultCapacity;
  }

  capacity(resource: string): number {
    return this.capacities[resource] ?? this.defaultCapacity;
  }

  list(resource?: string): Occupancy[] {
    return this.entries.filter((e) => resource === undefined || e.resource === resource).map((e) => ({ ...e }));
  }

  /** Other owners' occupancies of the resource that overlap [start, end). */
  conflicts(resource: string, start: number, end: number, owner?: string): Occupancy[] {
    return this.entries.filter((e) => e.resource === resource && e.owner !== owner && overlaps(e, { start, end })).map((e) => ({ ...e }));
  }

  /** Would adding [start, end) for `owner` keep every tick within capacity? */
  available(resource: string, start: number, end: number, owner?: string, extra: Occupancy[] = []): boolean {
    if (!(start < end)) return false;
    return peakOwners([...this.entries, ...extra], resource, start, end, owner) < this.capacity(resource);
  }

  /** The earliest tick at or after `from` when [t, t + duration) is available. */
  earliestFree(resource: string, from: number, duration: number, owner?: string, extra: Occupancy[] = []): number {
    const candidates = new Set<number>([from]);
    for (const e of [...this.entries, ...extra]) if (e.resource === resource && e.end > from) candidates.add(e.end);
    for (const t of [...candidates].sort((a, b) => a - b)) {
      if (this.available(resource, t, t + duration, owner, extra)) return t;
    }
    throw new Error(`no free slot on ${resource} after ${from}`);
  }

  /** Reserve immediately, or refuse and change nothing. */
  reserve(occ: Occupancy): boolean {
    if (!this.available(occ.resource, occ.start, occ.end, occ.owner)) return false;
    this.entries.push({ ...occ });
    return true;
  }

  release(owner: string, task?: string): number {
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => !(e.owner === owner && (task === undefined || e.task === task)));
    return before - this.entries.length;
  }

  /** Reservations made through the transaction are checked against committed
   *  and pending entries, and kept only on commit. */
  transaction(): Transaction {
    return new Transaction(this);
  }

  /** @internal */
  commitPending(pending: Occupancy[]): void {
    this.entries.push(...pending.map((e) => ({ ...e })));
  }
}

export class Transaction {
  private pending: Occupancy[] = [];
  private open = true;
  private readonly table: ReservationTable;

  constructor(table: ReservationTable) {
    this.table = table;
  }

  reserve(occ: Occupancy): boolean {
    if (!this.open) throw new Error("transaction is closed");
    if (!this.table.available(occ.resource, occ.start, occ.end, occ.owner, this.pending)) return false;
    this.pending.push({ ...occ });
    return true;
  }

  earliestFree(resource: string, from: number, duration: number, owner?: string): number {
    return this.table.earliestFree(resource, from, duration, owner, this.pending);
  }

  get size(): number {
    return this.pending.length;
  }

  commit(): void {
    if (!this.open) throw new Error("transaction is closed");
    this.table.commitPending(this.pending);
    this.pending = [];
    this.open = false;
  }

  rollback(): void {
    this.pending = [];
    this.open = false;
  }
}
