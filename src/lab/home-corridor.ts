import type { LabRun } from './model';
import { startRun } from './runner';

const metric = (run: LabRun, key: string) => Number(run.metrics.find(m => m.key === key)!.value);
const crossing = (run: LabRun, drone: string) => run.scene!.events.find(e => e.drone === drone && e.resource === 'corridor');
function overlap(run: LabRun) {
  const a = crossing(run, 'A'), b = crossing(run, 'B')!;
  return a ? Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start)) : 0;
}

/** The home experience reads the same computed W9 flight events as the Lab. */
export function homeCorridorHtml(run: LabRun, before: LabRun) {
  const a = crossing(run, 'A'), b = crossing(run, 'B')!, initialA = crossing(before, 'A')!;
  const clash = overlap(run), start = Math.max(a?.start ?? 0, b.start), end = Math.min(a?.end ?? 0, b.end);
  const min = Math.floor(Math.min(initialA.start, a?.start ?? b.start, b.start) / 10) * 10;
  const max = Math.ceil(Math.max(initialA.end, a?.end ?? b.end, b.end) / 10) * 10;
  const x = (t: number) => 55 + (t - min) / (max - min) * 385;
  const facts = (r: LabRun) => [overlap(r) + ' s', metric(r, 'A arrival (s)') + ' s', metric(r, 'A hover (s)') + ' s', (metric(r, 'A energy (J)') / 1000).toFixed(1) + ' kJ'];
  const previous = facts(before), current = facts(run);
  const labels = ['Overlap', 'A arrives', 'A hovers', 'A flight energy'];
  return `<p class="home-corridor-outcome ${clash ? 'conflict' : 'clear'}" data-home-outcome><strong>${clash ? `Conflict · ${clash} seconds shared` : 'Pass check passed · no overlap'}</strong><span>${clash ? `Both drones occupy the tower passage on [${start}, ${end}).` : a ? 'A enters at the instant B leaves. The extra hover uses energy.' : 'A goes around the building blocks. Only B uses the passage.'}</span></p>
    <div class="home-corridor-evidence"><div><h3>Before and after</h3><table><thead><tr><th scope="col">Measure</th><th scope="col">Both depart</th><th scope="col">Your choice</th></tr></thead><tbody>${labels.map((label, i) => `<tr><th scope="row">${label}</th><td>${previous[i]}</td><td ${previous[i] !== current[i] ? 'class="home-changed" data-home-changed' : ''}>${current[i]}${previous[i] !== current[i] ? '<small>changed</small>' : ''}</td></tr>`).join('')}</tbody></table></div>
    <figure><figcaption>Who occupies the tower passage?</figcaption><svg viewBox="0 0 480 166" role="img" aria-label="${a ? `A occupies the pass from ${a.start} to ${a.end} seconds.` : 'A avoids the pass.'} B occupies it from ${b.start} to ${b.end} seconds. ${clash} seconds overlap.">
    ${clash ? `<rect x="${x(start)}" y="12" width="${x(end) - x(start)}" height="113" fill="#fbe0d5" stroke="#ab4934" stroke-dasharray="3 3"/>` : ''}
    ${[a, b].map((event, i) => `<text x="8" y="${43 + i * 65}" font-size="17" fill="#254b41">${i ? 'B' : 'A'}</text><line x1="55" x2="440" y1="${37 + i * 65}" y2="${37 + i * 65}" stroke="#c6d2c2"/>${event ? `<rect x="${x(event.start)}" y="${25 + i * 65}" width="${x(event.end) - x(event.start)}" height="24" rx="4" fill="${i ? '#685f91' : '#246f64'}"/><text x="${x(event.start)}" y="${67 + i * 65}" font-size="14" fill="#254b41">[${event.start}, ${event.end})</text>` : `<text x="68" y="43" font-size="15" fill="#536354">Takes the way around</text>`}`).join('')}
    <text x="55" y="160" font-size="13" fill="#536354">${min} s</text><text x="440" y="160" text-anchor="end" font-size="13" fill="#536354">${max} s</text></svg><p>Seconds after 18:00. Shading marks overlap. The whole crossing must be free.</p></figure></div>`;
}

export function mountHomeCorridor(root: HTMLElement) {
  const before = JSON.parse(root.querySelector('[data-home-initial]')!.textContent!) as LabRun;
  const result = root.querySelector<HTMLElement>('[data-home-result]')!, status = root.querySelector<HTMLElement>('[data-home-run-state]')!;
  const controller = new AbortController();
  let generation = 0, active: ReturnType<typeof startRun> | undefined;
  async function update(arrangement: 'both' | 'wait' | 'detour') {
    const id = ++generation;
    active?.cancel();
    result.setAttribute('aria-busy', 'true');
    status.textContent = 'Computing your choice… Previous result stays visible until it is ready.';
    active = startRun({ ...structuredClone(before.input), arrangement });
    try {
      const run = await active.promise;
      if (controller.signal.aborted || id !== generation) return;
      result.innerHTML = homeCorridorHtml(run, before);
      root.dataset.homeChoice = arrangement;
      status.textContent = `Computed in your browser · ${run.elapsed} ms · engine ${run.engine} · ${run.inputHash.slice(-8)}`;
    } catch (error) {
      if (!controller.signal.aborted && id === generation) status.textContent = (error as Error).message;
    } finally {
      if (id === generation) result.removeAttribute('aria-busy');
    }
  }
  root.addEventListener('change', event => {
    const input = event.target as HTMLInputElement;
    if (input.matches('[data-home-arrangement]') && ['both', 'wait', 'detour'].includes(input.value)) void update(input.value as 'both' | 'wait' | 'detour');
  }, { signal: controller.signal });
  void update('both');
  return () => { generation++; controller.abort(); active?.cancel(); };
}
