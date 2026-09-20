import { canonical } from './model';

/** Display names are aliases; exported plans retain the original graph IDs. */
export function placeName(id:string):string {
    if(id==='kitchen')return 'Kitchen';
    const order=canonical.orders.find(o=>o.node===id);
    if(order)return `Home ${order.id.slice(1)}${id==='summit'?' · Hilltop':''}`;
    const landmarks:Record<string,string>={
      's-2-0':'Kitchen Lane','s-3-2':'West Passage Gate','s-3-3':'East Passage Gate',
      's-1-2':'South Block Approach','s-1-3':'South Bypass',
      's-5-2':'North Block Approach','s-5-3':'North Bypass',
      'tower-n':'North Tower','tower-s':'South Tower',
      'ridge-s-2-2':'South Apartment Block','ridge-s-4-2':'North Apartment Block',
    };
    if(landmarks[id])return landmarks[id];
    const street=/^s-(\d+)-(\d+)$/.exec(id);
    if(street){const roads=['Meadow','Orchard','Lower Hill','Pass','Upper Hill','Pine','North Hill'],crossings=['West Lane','Garden Lane','Ridge Lane','East Lane','Summit Lane','Hilltop Lane','Boundary Lane'];return `${roads[Number(street[1])]??'Hill'} / ${crossings[Number(street[2])]??'Boundary Lane'}`;}
    return id.replace(/^block-(\d+)$/,'Building $1');
}
export function placeText(value:unknown):string {
    return String(value??'').replace(/\bridge-s-\d+-\d+\b|\bs-\d+-\d+\b|\bsummit\b|\bblock-\d+\b|\btower-[ns]\b|\bkitchen\b/g,placeName);
}
