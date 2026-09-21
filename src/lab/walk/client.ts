import { navigate } from 'astro:transitions/client';
import type { SceneData } from '../model';
import { advance, groundPosition, nearbyTarget, walkTargets } from './navigation';
import type { createWalkScene } from './scene';
import { supportsWalking } from './availability';
import { createHoverEntry, HOVER_RADIUS } from './hover-entry';

interface CourseWeek { week: number; stage: string; title: string; description: string; lecture: string; tutorial: string; lab: string }

export function mountWalk(root: HTMLElement) {
  const desktop = matchMedia('(min-width: 900px)');
  const touch = matchMedia('(any-pointer: coarse)');
  const mouse = matchMedia('(any-pointer: fine)');
  const canWalk = () => supportsWalking({ wide: desktop.matches, fine: mouse.matches, coarse: touch.matches, touchPoints: navigator.maxTouchPoints });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const surface = root.querySelector<HTMLElement>('[data-walk-surface]')!;
  const host = root.querySelector<HTMLElement>('[data-walk-scene]')!;
  const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-walk-stop]'));
  const hint = root.querySelector<HTMLElement>('[data-walk-prompt]')!;
  const status = root.querySelector<HTMLElement>('[data-walk-status]')!;
  const droneLabel = root.querySelector<HTMLElement>('[data-walk-drone]')!;
  const nextButton = root.querySelector<HTMLButtonElement>('[data-walk-next]')!;
  const journey = root.querySelector<HTMLElement>('[data-walk-journey]')!;
  let nextWeek = 0;
  const data: SceneData = JSON.parse(root.querySelector('[data-walk-data]')!.textContent!);
  const courses: CourseWeek[] = JSON.parse(root.querySelector('[data-walk-courses]')!.textContent!);
  const portal = root.querySelector<HTMLDialogElement>('[data-walk-portal]')!;
  const portalTitle = portal.querySelector<HTMLElement>('#walk-portal-title')!;
  const links = Array.from(portal.querySelectorAll<HTMLAnchorElement>('[data-portal-link]'));
  let selected = 0, transition = 0, returnFocus: HTMLElement | undefined, pendingHref = '';
  const targets = walkTargets(data.map), kitchen = data.map.nodes.find(node => node.id === data.map.kitchen)!;
  const abort = new AbortController(), { signal } = abort, keys = new Set<string>();
  let scene: ReturnType<typeof createWalkScene> | undefined, position = groundPosition(kitchen);
  let frame = 0, last = 0, generation = 0, loading = false, near = nearbyTarget(position, targets);
  let hovered: typeof near;
  const hoverEntry = createHoverEntry();
  const moveKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright']);

  function project() {
    if (!scene) return;
    const drone = scene.project(scene.drone(), 28);
    const droneBody = scene.project(scene.drone(), 0);
    droneLabel.hidden = !drone;
    if (drone) { droneLabel.style.left = drone.x + 'px'; droneLabel.style.top = drone.y + 'px'; }
    const occupied: { x: number; y: number; width: number; height: number }[] = drone ? [{ x: drone.x - 60, y: drone.y - 24, width: 120, height: 65 }] : [];
    if (droneBody) occupied.push({ x: droneBody.x - 75, y: droneBody.y - 50, width: 150, height: 100 });
    for (const [index, anchor] of anchors.entries()) {
      const target = targets[index], point = scene.project(target.position);
      anchor.hidden = !point;
      if (!point) continue;
      const width = anchor.offsetWidth, height = anchor.offsetHeight;
      const x = Math.max(8, Math.min(host.clientWidth - width - 8, point.x - width / 2));
      let y = point.y - height - 12, fits = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        y = point.y - height - 12 - Math.ceil(attempt / 2) * (height + 7) * (attempt % 2 ? 1 : -1);
        if (y < 8 || y + height > host.clientHeight - 70) continue;
        if (!occupied.some(box => x < box.x + box.width + 5 && x + width + 5 > box.x && y < box.y + box.height + 5 && y + height + 5 > box.y)) { fits = true; break; }
      }
      anchor.hidden = !fits;
      if (!fits) continue;
      occupied.push({ x, y, width, height });
      anchor.style.left = x + 'px'; anchor.style.top = y + 'px';
      const line = anchor.querySelector<HTMLElement>('[data-walk-leader]')!;
      const dx = point.x - x - width / 2, dy = point.y - y - height;
      line.style.width = Math.hypot(dx, dy) + 'px'; line.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    }
  }
  function update() {
    near = nearbyTarget(position, targets, near);
    const index = targets.indexOf(near!);
    anchors.forEach((anchor, i) => { anchor.dataset.near = String(i === index); });
    const prompt = near ? `Enter: open ${near.label}` : 'Follow the coloured trail uphill, or choose any week.';
    if (hint.textContent !== prompt) hint.textContent = prompt;
    scene?.highlight(hovered ?? near);
  }
  function stop() {
    keys.clear(); cancelAnimationFrame(frame); frame = 0; last = 0;
    hoverEntry.cancel(); delete host.dataset.dwelling;
    if (scene) update();
  }
  function instruction() {
    status.textContent = reduced.matches ? 'Motion is reduced. Choose a stop or use the list.'
      : document.activeElement === surface ? 'W A S D or arrows: fly. Hover over a week for 2 seconds to open it, or press Enter.'
      : 'Click the hill or Tab to it, then use W A S D or the arrow keys.';
  }
  function tick(now: number) {
    if (!scene || reduced.matches || document.hidden) { stop(); return; }
    const seconds = last ? Math.min((now - last) / 1000, .05) : 1 / 60; last = now;
    if (keys.size) { position = advance(position, keys, seconds, data.map); update(); }
    const following = scene.move(position, seconds);
    const week = near?.week && Math.hypot(position.x - near.position.x, position.y - near.position.y) <= HOVER_RADIUS ? near.week : undefined;
    const dwell = hoverEntry.update(week, !keys.size && document.activeElement === surface && !portal.open, now);
    if (dwell.open) { void select(targets.findIndex(target => target.week === dwell.open), surface, true); return; }
    if (dwell.remaining) {
      host.dataset.dwelling = String(week);
      const prompt = `Opening Week ${week} in ${Math.ceil(dwell.remaining / 1000)}s… Fly away to cancel.`;
      if (hint.textContent !== prompt) hint.textContent = prompt;
    } else { delete host.dataset.dwelling; update(); }
    frame = keys.size || following || dwell.remaining ? requestAnimationFrame(tick) : 0;
    if (!frame) last = 0;
  }
  function release() {
    generation++; transition++; pendingHref = ''; stop(); scene?.dispose(); scene = undefined; loading = false;
    hoverEntry.reset();
    hovered = undefined; nextButton.disabled = false; portal.close(); delete portal.dataset.leaving; delete root.dataset.walkTransition;
    root.dataset.walkReady = 'false'; anchors.forEach(anchor => { anchor.hidden = true; });
    host.dataset.state = 'list';
  }
  async function ensure() {
    root.dataset.walkMobile = String(!canWalk());
    if (!canWalk()) { release(); return; }
    if (scene || loading || signal.aborted) return;
    loading = true; const current = ++generation;
    try {
      const { createWalkScene } = await import('./scene');
      if (current !== generation || signal.aborted || !canWalk()) return;
      root.dataset.walkReady = 'true';
      scene = createWalkScene(host, data, project);
      host.dataset.state = reduced.matches ? 'still' : 'walking';
      position = groundPosition(kitchen); update(); project();
      if (reduced.matches) void scene.overview(0);
      instruction();
    } catch { release(); }
    finally { if (current === generation) loading = false; }
  }
  const ordinaryClick = (event: MouseEvent) => !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0;
  async function select(index: number, trigger?: HTMLElement, arrived = false) {
    if (!scene) return;
    if (!targets[index].week) { await depart(anchors[index].href, index); return; }
    hoverEntry.dismiss(targets[index].week);
    stop(); const current = ++transition; selected = index; returnFocus = trigger;
    scene.highlight(targets[index]);
    const course = courses.find(course => course.week === targets[index].week)!;
    portal.dataset.stage = course.stage;
    portal.querySelector('[data-portal-week]')!.textContent = `Week ${course.week} of 12`;
    portalTitle.textContent = course.title;
    portal.querySelector('[data-portal-description]')!.textContent = course.description;
    links.forEach(link => { link.href = course[link.dataset.portalLink as 'lecture' | 'tutorial' | 'lab']; });
    portal.querySelector('[data-walk-departure]')!.textContent = '';
    delete portal.dataset.leaving;
    root.dataset.walkTransition = 'approach'; nextButton.disabled = true;
    hint.textContent = `Flying to Week ${course.week}…`;
    journey.textContent = `Kitchen → Summit · flying to Week ${course.week}`;
    const completed = arrived || reduced.matches ? true : await scene.visit(targets[index].position);
    if (!completed || current !== transition || signal.aborted) return;
    delete root.dataset.walkTransition; nextButton.disabled = false;
    position = scene.position();
    nextWeek = course.week === 12 ? 0 : course.week;
    nextButton.textContent = course.week === 12 ? 'Fly back to Week 1' : `Fly to Week ${course.week + 1} ↑`;
    journey.textContent = `Week ${course.week} / 12 · ${course.week === 1 ? 'Kitchen' : course.week === 12 ? 'Summit' : 'Climbing the hill'}`;
    update();
    portal.showModal(); portalTitle.focus({ preventScroll: true });
  }
  async function depart(href: string, index = selected, label = 'Assignment') {
    if (pendingHref) return;
    stop(); const current = ++transition; pendingHref = href;
    portal.querySelector('[data-walk-departure]')!.textContent = `Opening ${label}…`;
    root.dataset.walkTransition = 'leaving'; portal.dataset.leaving = 'true';
    let completed = true;
    if (scene && !reduced.matches) {
      if (!targets[index].week) completed = await scene.visit(targets[index].position);
      if (completed && current === transition) completed = await scene.visit(scene.position(), 950, true);
    }
    if (completed && current === transition && !signal.aborted) void navigate(href);
  }
  root.querySelector('[data-walk-overview]')!.addEventListener('click', () => {
    transition++; pendingHref = ''; stop(); nextButton.disabled = false; delete root.dataset.walkTransition;
    if (scene) { position = scene.position(); update(); }
    journey.textContent = 'Kitchen → Summit · twelve weeks';
    void scene?.overview(reduced.matches ? 0 : 700);
  }, { signal });
  nextButton.addEventListener('click', () => { void select(nextWeek, nextButton); }, { signal });
  portal.querySelector('[data-walk-close]')!.addEventListener('click', () => portal.close(), { signal });
  portal.addEventListener('close', () => {
    transition++; pendingHref = ''; delete portal.dataset.leaving; delete root.dataset.walkTransition;
    scene?.cancelTravel(); nextButton.disabled = false;
    if (scene) { position = scene.position(); update(); }
    const focus = returnFocus;
    if (!signal.aborted && scene) (focus?.isConnected && !focus.hidden ? focus : surface).focus({ preventScroll: true });
  }, { signal });
  links.forEach(link => link.addEventListener('click', event => {
    if (!ordinaryClick(event)) return;
    event.preventDefault(); void depart(link.href, selected, link.dataset.portalLink!);
  }, { signal }));
  surface.addEventListener('keydown', event => {
    if (event.target !== surface || !scene) return;
    const key = event.key.toLowerCase();
    if (moveKeys.has(key) || key === ' ') event.preventDefault();
    if (key === 'enter' && near) { event.preventDefault(); if (!event.repeat) void select(targets.indexOf(near), surface); return; }
    if (!moveKeys.has(key) || reduced.matches) return;
    transition++; delete root.dataset.walkTransition; nextButton.disabled = false; scene.cancelTravel(); position = scene.position(); keys.add(key); if (!frame) frame = requestAnimationFrame(tick);
  }, { signal });
  surface.addEventListener('keyup', event => { keys.delete(event.key.toLowerCase()); }, { signal });
  surface.addEventListener('pointerdown', event => {
    if (!(event.target as HTMLElement).closest('a')) surface.focus({ preventScroll: true });
  }, { signal });
  surface.addEventListener('focus', instruction, { signal });
  surface.addEventListener('blur', () => { stop(); instruction(); }, { signal });
  anchors.forEach((anchor, index) => {
    anchor.addEventListener('click', event => {
      if (!ordinaryClick(event) || !scene) return;
      event.preventDefault(); void select(index, anchor);
    }, { signal });
    const highlight = () => { hovered = targets[index]; scene?.highlight(hovered); };
    const reset = () => {
      const focused = anchors.indexOf(document.activeElement as HTMLAnchorElement);
      hovered = focused >= 0 ? targets[focused] : undefined; scene?.highlight(hovered ?? near);
    };
    anchor.addEventListener('focus', highlight, { signal }); anchor.addEventListener('pointerenter', highlight, { signal });
    anchor.addEventListener('blur', reset, { signal }); anchor.addEventListener('pointerleave', reset, { signal });
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    stop();
    if (pendingHref) return;
    transition++; scene?.cancelTravel(); nextButton.disabled = false; delete root.dataset.walkTransition;
    if (scene) { position = scene.position(); update(); }
  }, { signal });
  window.addEventListener('blur', stop, { signal });
  desktop.addEventListener('change', () => { void ensure(); }, { signal });
  touch.addEventListener('change', () => { void ensure(); }, { signal });
  mouse.addEventListener('change', () => { void ensure(); }, { signal });
  reduced.addEventListener('change', () => {
    stop(); scene?.cancelTravel();
    if (pendingHref) { void navigate(pendingHref); return; }
    transition++; delete root.dataset.walkTransition; nextButton.disabled = false;
    position = groundPosition(kitchen); scene?.move(position, 0, true); update();
    if (reduced.matches) void scene?.overview(0);
    host.dataset.state = reduced.matches ? 'still' : 'walking';
    instruction();
  }, { signal });
  host.addEventListener('webglcontextlost', release, { signal });
  void ensure();
  return () => { abort.abort(); release(); };
}
