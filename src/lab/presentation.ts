/** Enlarge the live instance without copying it or restarting its computation. */
export function presentation(root:HTMLElement) {
  let expanded=false,native=false,previous:HTMLElement|null=null,overflow='';
  const disabled:{el:HTMLElement;inert:boolean}[]=[];
  const refresh=()=>root.querySelectorAll<HTMLElement>('[data-example-action="expand"],[data-action="expand"]').forEach(b=>{b.textContent=expanded?'Exit expanded view':'Expand view';b.setAttribute('aria-expanded',String(expanded));});
  function restore(){
    if(!expanded)return;
    expanded=false;native=false;root.classList.remove('lab-expanded');root.removeAttribute('role');root.removeAttribute('aria-modal');root.removeAttribute('aria-label');
    document.body.style.overflow=overflow;for(const {el,inert} of disabled.splice(0))el.inert=inert;
    refresh();(previous?.isConnected?previous:root.querySelector<HTMLElement>('[data-example-action="expand"],[data-action="expand"]'))?.focus({preventScroll:true});
  }
  async function close(){if(document.fullscreenElement===root)await document.exitFullscreen().catch(()=>{});restore();}
  async function toggle(){
    if(expanded){await close();return;}
    previous=document.activeElement as HTMLElement;overflow=document.body.style.overflow;expanded=true;
    root.classList.add('lab-expanded');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Expanded experiment');document.body.style.overflow='hidden';
    for(let node:HTMLElement|null=root;node?.parentElement;node=node.parentElement){for(const sibling of node.parentElement.children)if(sibling!==node&&sibling instanceof HTMLElement&&!['SCRIPT','STYLE','LINK'].includes(sibling.tagName)){disabled.push({el:sibling,inert:sibling.inert});sibling.inert=true;}if(node.parentElement===document.body)break;}
    refresh();root.querySelector<HTMLElement>('[aria-expanded="true"]')?.focus({preventScroll:true});
    try{await root.requestFullscreen();native=document.fullscreenElement===root;}catch{/* The full-window view also works when browser fullscreen is unavailable. */}
  }
  const fullscreen=()=>{if(native&&document.fullscreenElement!==root)restore();};
  const key=(event:KeyboardEvent)=>{
    if(!expanded)return;
    if(event.key==='Escape'){event.preventDefault();void close();}
    else if(event.key==='Tab'){
      const controls=[...root.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea,summary,[tabindex="0"]')].filter(e=>e.getClientRects().length>0);
      const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  };
  document.addEventListener('fullscreenchange',fullscreen);document.addEventListener('keydown',key);
  return {toggle,refresh,dispose(){document.removeEventListener('fullscreenchange',fullscreen);document.removeEventListener('keydown',key);if(document.fullscreenElement===root)void document.exitFullscreen().catch(()=>{});restore();}};
}
