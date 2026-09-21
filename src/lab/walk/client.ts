import { navigate } from 'astro:transitions/client';
import type { SceneData } from '../model';
import { advance, groundPosition, nearbyTarget, walkTargets } from './navigation';
import type { createWalkScene } from './scene';
import { supportsWalking } from './availability';

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
  const moveKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright']);

  function project() {
    if (!scene) return;
    const occupied: { x: number; y: number; width: number; height: number }[] = [];
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
    const prompt = near ? `Enter: enter ${near.label}` : 'Follow the coloured trail uphill, or choose any week.';
    if (hint.textContent !== prompt) hint.textContent = prompt;
    scene?.highlight(hovered ?? near);
    host.dataset.x = position.x.toFixed(2); host.dataset.y = position.y.toFixed(2); host.dataset.elevation = position.z.toFixed(3);
  }
  function stop() { keys.clear(); cancelAnimationFrame(frame); frame = 0; last = 0; }
  function instruction() {
    status.textContent = reduced.matches ? 'Motion is reduced. Choose a stop or use the list.'
      : document.activeElement === surface ? 'W A S D or arrows: walk. Enter: open the nearby stop.'
      : 'Click the hill or Tab to it, then use W A S D or the arrow keys.';
  }
  function tick(now: number) {
    if (!scene || reduced.matches || document.hidden) { stop(); return; }
    const seconds = last ? Math.min((now - last) / 1000, .05) : 1 / 60; last = now;
    if (keys.size) { position = advance(position, keys, seconds, data.map); update(); }
    const following = scene.move(position, seconds);
    frame = keys.size || following ? requestAnimationFrame(tick) : 0;
    if (!frame) last = 0;
  }
  function release() {
    generation++; transition++; pendingHref = ''; stop(); scene?.dispose(); scene = undefined; loading = false;
    hovered = undefined; portal.close(); delete portal.dataset.leaving; delete root.dataset.walkTransition;
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
      void scene.overview(reduced.matches ? 0 : 900);
      instruction();
    } catch { release(); }
    finally { if (current === generation) loading = false; }
  }
  const ordinaryClick = (event: MouseEvent) => !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0;
  async function select(index: number, trigger?: HTMLElement) {
    if (!scene) return;
    if (!targets[index].week) { await depart(anchors[index].href, index); return; }
    stop(); const current = ++transition; selected = index; returnFocus = trigger;
    position = targets[index].position; scene.highlight(targets[index]);
    const course = courses.find(course => course.week === targets[index].week)!;
    portal.dataset.stage = course.stage;
    portal.querySelector('[data-portal-week]')!.textContent = `Week ${course.week} of 12`;
    portalTitle.textContent = course.title;
    portal.querySelector('[data-portal-description]')!.textContent = course.description;
    links.forEach(link => { link.href = course[link.dataset.portalLink as 'lecture' | 'tutorial' | 'lab']; });
    portal.querySelector('[data-walk-departure]')!.textContent = '';
    delete portal.dataset.leaving;
    root.dataset.walkTransition = 'approach';
    const completed = await scene.visit(position, reduced.matches ? 0 : 800);
    if (!completed || current !== transition || signal.aborted) return;
    delete root.dataset.walkTransition;
    update();
    portal.showModal(); portalTitle.focus({ preventScroll: true });
  }
  async function depart(href: string, index = selected, label = 'Assignment') {
    if (pendingHref) return;
    stop(); const current = ++transition; pendingHref = href;
    portal.querySelector('[data-walk-departure]')!.textContent = `Opening ${label}…`;
    root.dataset.walkTransition = 'leaving'; portal.dataset.leaving = 'true';
    const completed = scene ? await scene.visit(targets[index].position, reduced.matches ? 0 : 360, true) : true;
    if (completed && current === transition && !signal.aborted) void navigate(href);
  }
  root.querySelector('[data-walk-overview]')!.addEventListener('click', () => {
    transition++; pendingHref = ''; stop(); delete root.dataset.walkTransition;
    void scene?.overview(reduced.matches ? 0 : 700);
  }, { signal });
  portal.querySelector('[data-walk-close]')!.addEventListener('click', () => portal.close(), { signal });
  portal.addEventListener('close', () => {
    transition++; pendingHref = ''; delete portal.dataset.leaving; delete root.dataset.walkTransition;
    const focus = returnFocus;
    void scene?.overview(reduced.matches ? 0 : 650).then(completed => { if (completed && focus?.isConnected) focus.focus({ preventScroll: true }); });
  }, { signal });
  links.forEach(link => link.addEventListener('click', event => {
    if (!ordinaryClick(event)) return;
    event.preventDefault(); void depart(link.href, selected, link.dataset.portalLink!);
  }, { signal }));
  surface.addEventListener('keydown', event => {
    if (event.target !== surface || !scene) return;
    const key = event.key.toLowerCase();
    if (moveKeys.has(key) || key === ' ') event.preventDefault();
    if (key === 'enter' && near) { event.preventDefault(); void select(targets.indexOf(near), surface); return; }
    if (!moveKeys.has(key) || reduced.matches) return;
    transition++; delete root.dataset.walkTransition; scene.cancelTravel(); keys.add(key); if (!frame) frame = requestAnimationFrame(tick);
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
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, { signal });
  window.addEventListener('blur', stop, { signal });
  desktop.addEventListener('change', () => { void ensure(); }, { signal });
  touch.addEventListener('change', () => { void ensure(); }, { signal });
  mouse.addEventListener('change', () => { void ensure(); }, { signal });
  reduced.addEventListener('change', () => {
    stop(); scene?.cancelTravel();
    if (pendingHref) { void navigate(pendingHref); return; }
    transition++; delete root.dataset.walkTransition;
    position = groundPosition(kitchen); scene?.move(position, 0, true); update();
    if (portal.open) void scene?.visit(targets[selected].position, 0); else void scene?.overview(0);
    host.dataset.state = reduced.matches ? 'still' : 'walking';
    instruction();
  }, { signal });
  host.addEventListener('webglcontextlost', release, { signal });
  void ensure();
  return () => { abort.abort(); release(); };
}
