// Optional exercise tests. These fail until you implement the two skeletons.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mySearch, myNeighbours } from './strategies.mjs';
test('goal discovery is too early',()=>{
  const edges=[{from:'S',to:'G',cost:10},{from:'S',to:'A',cost:1},{from:'A',to:'G',cost:1}];
  assert.equal(mySearch(edges,'S','G').cost,2);
});
test('reopen a closed node with an inconsistent admissible h',()=>{
  const edges=[{from:'S',to:'A',cost:3},{from:'S',to:'B',cost:1},{from:'B',to:'A',cost:1},{from:'A',to:'G',cost:2}];
  assert.equal(mySearch(edges,'S','G',id=>({S:0,A:0,B:3,G:0}[id])).cost,4);
});
test('retain the later wait state while a crossing is occupied',()=>{
  const next=myNeighbours({node:'P',phase:'out',tick:3,energy:0},[{from:'P',to:'G',ticks:2,energy:2,resource:'corridor'}],[{resource:'corridor',start:0,end:6}]);
  assert(next.some(x=>x.node==='P'&&x.tick===4));
  assert(!next.some(x=>x.node==='G'));
});
