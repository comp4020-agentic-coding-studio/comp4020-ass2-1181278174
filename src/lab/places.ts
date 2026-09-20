import { canonical } from './model';

/** Display names are aliases; exported plans retain the original graph IDs. */
export function placeName(id:string):string {
    if(id==='kitchen')return 'Kitchen';
    const order=canonical.orders.find(o=>o.node===id);
    if(order)return `Home ${order.id.slice(1)}${id==='summit'?' · Hilltop':''}`;
    const street=/^s-(\d+)-(\d+)$/.exec(id);
    if(street)return `Junction ${String.fromCharCode(65+Number(street[1]))}${Number(street[2])+1}`;
    return id.replace(/^block-(\d+)$/,'Building $1');
}
export function placeText(value:unknown):string {
    return String(value??'').replace(/\bs-\d+-\d+\b|\bsummit\b|\bblock-\d+\b|\bkitchen\b/g,placeName);
}
