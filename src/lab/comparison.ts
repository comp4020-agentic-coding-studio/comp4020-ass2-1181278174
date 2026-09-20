import type { LabRun } from './model';
import { esc } from './render';

export function metricComparison(before:Pick<LabRun,'metrics'|'modelHash'>,after:LabRun,label='Starting case') {
  const same=before.modelHash===after.modelHash;
  return `<section class="run-comparison" aria-label="Before and after"><p><strong>Before and after</strong> · ${same?'Same model and case.':'Model assumptions changed; compare their consequences.'}</p><table><thead><tr><th scope="col">Measure</th><th scope="col">${esc(label)}</th><th scope="col">Current run</th></tr></thead><tbody>${after.metrics.slice(0,6).map(m=>{
    const old=before.metrics.find(x=>x.key===m.key)?.value??'—',changed=old!==m.value;
    return `<tr><th scope="row">${esc(m.label)}</th><td>${esc(old)}</td><td ${changed?'class="cell-changed" data-value-changed':''}>${esc(m.value)}${changed?'<small>changed</small>':''}</td></tr>`;
  }).join('')}</tbody></table><p class="comparison-key">Marked cells changed. A matching value means no change in that measure.</p></section>`;
}

/** Match semantic row labels, so a reordered timetable compares the same order. */
export function markLessonChanges(host:HTMLElement,beforeHtml:string) {
  const before=document.createElement('div');before.innerHTML=beforeHtml;
  const tables=[...before.querySelectorAll('.lesson-table')];
  host.querySelectorAll<HTMLTableElement>('.lesson-table').forEach((table,index)=>{
    const old=tables[index];if(!old||old.querySelector('thead')?.textContent!==table.querySelector('thead')?.textContent)return;
    const rows=new Map([...old.querySelectorAll('tbody tr')].map(r=>[r.firstElementChild?.textContent,r]));
    table.querySelectorAll('tbody tr').forEach(row=>{
      const previous=rows.get(row.firstElementChild?.textContent);if(!previous)return;
      [...row.children].forEach((cell,i)=>{
        const prior=previous.children[i]?.textContent;if(prior===undefined||prior===cell.textContent)return;
        cell.classList.add('cell-changed');cell.setAttribute('data-value-changed','');cell.setAttribute('title','Previously: '+prior);
      });
    });
  });
}
