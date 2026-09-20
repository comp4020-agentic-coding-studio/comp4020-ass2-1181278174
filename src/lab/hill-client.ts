import { navigate } from 'astro:transitions/client';
import type { SceneData } from './model';

export function mountHill(root: HTMLElement) {
  const host=root.querySelector<HTMLElement>('[data-hill-scene]')!;
  const links=root.querySelector<HTMLElement>('[data-hill-links]')!;
  const leaders=root.querySelector<SVGSVGElement>('[data-hill-leaders]')!;
  const anchors=Array.from(links.querySelectorAll<HTMLAnchorElement>('a'));
  const signs=links.querySelector<HTMLElement>('.hill-signs')!;
  const desktop=matchMedia('(min-width: 900px)'), reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const abort=new AbortController(), {signal}=abort;
  let scene: ReturnType<typeof import('./scene')['mountScene']> | undefined;
  let loading=false, inView=false, frame=0, last=0, elapsed=0, generation=0, navigating=false;
  const data: SceneData=JSON.parse(root.querySelector('[data-hill-initial]')!.textContent!);
  const start=Math.min(...data.events.map(e=>e.start)), end=Math.max(...data.events.map(e=>e.end));
  const lines=anchors.slice(0,12).map(()=>{
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('stroke','#f4dfb3');line.setAttribute('stroke-width','1');line.setAttribute('opacity','.7');leaders.append(line);return line;
  });
  const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(n,max));
  function project() {
    if(!scene)return;
    const width=host.clientWidth,height=host.clientHeight;
    const kitchen=scene.project(data.map.kitchen);
    const sx=clamp(kitchen.x-signs.offsetWidth/2,12,width-signs.offsetWidth-12), sy=clamp(kitchen.y+100,80,height-signs.offsetHeight-16);
    signs.style.left=sx+'px';signs.style.top=sy+'px';
    const placed=[{x:sx,y:sy,w:signs.offsetWidth,h:signs.offsetHeight}];
    // Offset each pair together: separate screen labels, never map coordinates.
    const groups = [
      {weeks:[4,12],dx:0,dy:-85}, {weeks:[9,10],dx:-50,dy:-60},
      {weeks:[2,3],dx:0,dy:-60}, {weeks:[7,8],dx:0,dy:65},
      {weeks:[1],dx:-65,dy:15}, {weeks:[5,6],dx:100,dy:25}, {weeks:[11],dx:190,dy:10},
    ];
    for(const group of groups) {
      const items=group.weeks.map(week=>anchors[week-1]);
      const p=scene.project(items[0].dataset.node!,items[0].dataset.place);
      const w=items.reduce((sum,a)=>sum+a.offsetWidth,0)+(items.length-1)*12, h=Math.max(...items.map(a=>a.offsetHeight));
      const x=clamp(p.x+group.dx-w/2,12,width-w-12),base=clamp(p.y+group.dy-h/2,12,height-h-12);
      let y=base;
      for(let n=0;n<40;n++) {
        y=clamp(base+Math.ceil(n/2)*(h+12)*(n%2?-1:1),12,height-h-12);
        if(!placed.some(b=>x<b.x+b.w+12&&x+w+12>b.x&&y<b.y+b.h+10&&y+h+10>b.y))break;
      }
      placed.push({x,y,w,h});let left=x;
      for(const a of items) {
        a.style.left=left+'px';a.style.top=y+'px';
        const line=lines[Number(a.dataset.week)-1];
        line.setAttribute('x1',String(clamp(p.x,0,width)));line.setAttribute('y1',String(clamp(p.y,0,height)));
        line.setAttribute('x2',String(left+a.offsetWidth/2));line.setAttribute('y2',String(y+h/2));left+=a.offsetWidth+12;
      }
    }
  }

  function stopFlight() { cancelAnimationFrame(frame);frame=0;last=0; }
  function flight(now:number) {
    if(!scene||!inView||document.hidden||reduced.matches||navigating){stopFlight();return;}
    if(last)elapsed+=Math.min(100,now-last);
    last=now;
    scene.time(start+(elapsed/1000*12)%Math.max(1,end-start));
    host.dataset.flightTime=String(elapsed);
    frame=requestAnimationFrame(flight);
  }
  function motion() {
    stopFlight();
    if(reduced.matches) {elapsed=0;scene?.time(0);host.dataset.flightTime='0';}
    else if(scene&&inView&&!document.hidden&&!navigating) frame=requestAnimationFrame(flight);
  }
  function release() {
    generation++;stopFlight();scene?.dispose();scene=undefined;loading=false;
    links.hidden=true;leaders.style.visibility='hidden';host.replaceChildren();
  }
  async function ensureScene() {
    if(!desktop.matches){release();return;}
    if(!inView||scene||loading||signal.aborted)return;
    loading=true;const current=++generation;
    try {
      const {mountScene}=await import('./scene');
      if(signal.aborted||current!==generation||!desktop.matches)return;
      scene=mountScene(host,data,()=>{},{mode:'hub',lighting:'evening',labels:false});
      links.hidden=false;leaders.style.visibility='visible';scene.onRender(project);motion();
    } catch { release(); }
    finally {if(current===generation)loading=false;}
  }
  anchors.forEach(a=>{
    const highlight=()=>scene?.highlightNode(a.dataset.node,a.dataset.place);
    a.addEventListener('focus',highlight,{signal});a.addEventListener('pointerenter',highlight,{signal});
    a.addEventListener('blur',()=>scene?.highlightNode(),{signal});
    a.addEventListener('pointerleave',()=>{if(document.activeElement!==a)scene?.highlightNode();},{signal});
    a.addEventListener('click',async e=>{
      if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||reduced.matches||!scene)return;
      e.preventDefault();if(navigating)return;
      navigating=true;stopFlight();
      if(await scene.flyTo(a.dataset.node!,a.dataset.place) && !signal.aborted) void navigate(a.href);
    },{signal});
  });
  const observer=new IntersectionObserver(entries=>{
    inView=entries[0].isIntersecting;
    void ensureScene();motion();
  },{threshold:.05});
  observer.observe(host);
  desktop.addEventListener('change',()=>{void ensureScene();},{signal});
  reduced.addEventListener('change',motion,{signal});
  document.addEventListener('visibilitychange',motion,{signal});
  host.addEventListener('webglcontextlost',()=>{if(!signal.aborted)release();},{signal});
  return ()=>{abort.abort();observer.disconnect();release();leaders.replaceChildren();};
}
