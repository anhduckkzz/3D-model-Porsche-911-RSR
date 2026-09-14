import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import * as T from 'three';
import {assemblyFrame} from '../app/assembly-guide.ts';
import {createFlatLayout} from '../app/explosion-layout.ts';
const cars=JSON.parse(fs.readFileSync('public/showroom.json'));
assert.equal(new Set(cars.map(c=>c.id)).size,cars.length);
assert(!cars.some(c=>c.id==='8653'));
assert.deepEqual(cars.filter(c=>c.ownerTools).map(c=>c.id),['42096']);
const report=[];
for(const car of cars.filter(c=>c.available)){
 const dir='public'+car.assetPath,m=JSON.parse(fs.readFileSync(dir+'/model.json')),plan=JSON.parse(fs.readFileSync(dir+'/assembly.json'));
 const bytes=gunzipSync(fs.readFileSync(dir+'/geometry.bin.gz'));const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 assert.equal(m.partCount,m.parts.length);assert(m.partCount>=car.minimumParts);assert.equal(plan.nodes[plan.root].label,car.name);
 const built=new Set();for(const [i,e] of plan.events.entries()){
  assert(plan.nodes[e.node]);assert(e.parts.length,'Empty assembly operation');
  for(const id of e.parts)assert(m.parts[id]);
  if(e.kind==='part')for(const id of e.parts){assert(!built.has(id),'Part built twice');built.add(id)}
  else{assert(plan.nodes[e.child].end<=i,'Attaching an unbuilt subassembly');assert.deepEqual(e.parts,plan.nodes[e.child].parts);for(const id of e.parts)assert(built.has(id))}
 }
 assert.equal(built.size,m.partCount);assert.equal(assemblyFrame(plan,plan.events.length).visible.size,m.partCount,'Final assembly omits parts');
 for(const [i,p] of m.parts.entries()){assert.equal(p.id,i);assert(m.geometries[p.geo]);assert(p.matrix.every(Number.isFinite));assert(Math.abs(new T.Matrix4().fromArray(p.matrix).determinant())>1e-10)}
 for(const g of m.geometries){for(const k of ['position','normal','color','index','indexLow']){const a=g[k];assert(a.offset%4===0&&a.offset+a.count*4<=buffer.byteLength);const values=new (k.startsWith('index')?Uint32Array:Float32Array)(buffer,a.offset,a.count);assert(values.every(Number.isFinite));if(k.startsWith('index'))assert(values.every(v=>v<g.position.count/3))}}
 for(const aspect of [.6,1.8]){const layout=createFlatLayout(m.parts,m,aspect),cells=[...layout.cells.values()];assert.equal(cells.length,m.partCount);for(let a=0;a<cells.length;a++)for(let b=a+1;b<cells.length;b++){const p=cells[a],q=cells[b];assert(Math.abs(p.x-q.x)>=(p.width+q.width)/2-1e-8||Math.abs(p.y-q.y)>=(p.height+q.height)/2-1e-8,`Flatten overlaps ${car.id}: ${p.id}/${q.id}`)}}
 report.push({id:car.id,parts:m.partCount,assemblies:plan.nodes.length,operations:plan.events.length,geometryMB:+(bytes.byteLength/1e6).toFixed(2)});
}
console.log(JSON.stringify({passed:true,models:report,pending:cars.filter(c=>!c.available).map(c=>c.id)},null,2));
