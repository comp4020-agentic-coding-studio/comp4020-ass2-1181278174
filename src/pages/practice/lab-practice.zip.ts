import { readFileSync } from 'node:fs';
export function GET(){return new Response(new Uint8Array(readFileSync('.generated/lab-practice.zip')),{headers:{'Content-Type':'application/zip'}});}
