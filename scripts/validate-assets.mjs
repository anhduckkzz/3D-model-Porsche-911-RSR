import {createFlatLayout,insertionOffset} from "../app/explosion-layout.ts";
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import * as T from 'three';
const m=JSON.parse(fs.readFileSync('public/model/model.json'));
const packed=fs.readFileSync('public/model/geometry.bin.gz'),buf=gunzipSync(packed);const binary=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength);
assert.equal(m.parts.length,m.partCount);assert.equal(m.steps.length,m.phaseCount);assert.equal(new Set(m.parts.map(p=>p.id)).size,m.partCount);
const used=new Set();for(const s of m.steps){assert.equal(s.step,m.steps.indexOf(s)+1);for(const id of s.parts){assert(!used.has(id));used.add(id);assert.equal(m.parts[id].step,s.step)}}assert.equal(used.size,m.partCount);
for(const g of m.geometries){const count=g.position.count/3;for(const key of ['position','normal','color']){const a=g[key];assert.equal(a.offset%4,0);assert(a.offset+a.count*4<=binary.byteLength);assert.equal(a.count,g.position.count);const v=new Float32Array(binary,a.offset,a.count);assert(v.every(Number.isFinite))}for(const key of ['index','indexLow']){const a=g[key];assert(a.count%3===0);const idx=new Uint32Array(binary,a.offset,a.count);assert(idx.every(n=>n<count))}assert(g.indexLow.count<=g.index.count)}
for(const p of m.parts){assert(p.matrix.length===16&&p.matrix.every(Number.isFinite));assert(m.geometries[p.geo]);assert(m.groups.some(g=>g.id===p.group));assert(Math.abs(new T.Matrix4().fromArray(p.matrix).determinant())>1e-10)}
// Verify packing against the actual geometry bounds, across phones and desktops.
let packingCases=0;
for (const aspect of [.35,.7,1,1.8,3]) {
 const layout=createFlatLayout(m.parts,m,aspect),cells=[...layout.cells.values()];
 assert.equal(cells.length,m.partCount);
 for (let a=0;a<cells.length;a++) for (let b=a+1;b<cells.length;b++) {
  const p=cells[a],q=cells[b];
  assert(Math.abs(p.x-q.x)>=(p.width+q.width)/2-1e-8 || Math.abs(p.y-q.y)>=(p.height+q.height)/2-1e-8,`Overlapping pieces ${p.id}/${q.id}`);
 }
 for(const p of m.parts){
  const cell=layout.cells.get(p.id),pose=layout.poses.get(p.id),matrix=new T.Matrix4().compose(pose.position,pose.quaternion,pose.scale);
  const g=m.geometries[p.geo],box=new T.Box3(new T.Vector3().fromArray(g.bounds[0]),new T.Vector3().fromArray(g.bounds[1])).applyMatrix4(matrix);
  assert(box.min.x>=cell.x-cell.width/2 && box.max.x<=cell.x+cell.width/2);
  assert(box.min.y>=cell.y-cell.height/2 && box.max.y<=cell.y+cell.height/2);
  assert(Math.abs(box.getCenter(new T.Vector3()).z)<1e-5);
  assert(matrix.elements.every(Number.isFinite));
  const offset=insertionOffset(p,m);assert(offset.toArray().every(Number.isFinite));assert(offset.length()>=.799 && offset.length()<=2.801);
 }
 packingCases++;
}
for(const group of m.groups){const parts=m.parts.filter(p=>p.group===group.id);const layout=createFlatLayout(parts,m,1.5);assert.equal(layout.poses.size,parts.length);assert([...layout.cells.keys()].every(id=>parts.some(p=>p.id===id)))}
assert.equal(createFlatLayout([],m,1).poses.size,0);
const first=createFlatLayout(m.parts,m,1.8),second=createFlatLayout([...m.parts].reverse(),m,1.8);assert.deepEqual([...first.cells],[...second.cells]);
const batches=m.geometries.map((g,id)=>({parts:m.parts.filter(p=>p.geo===id),mesh:new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial(),m.parts.filter(p=>p.geo===id).length)}));const times=[],matrix=new T.Matrix4();for(let n=0;n<100;n++){const start=performance.now();for(const b of batches){b.parts.forEach((p,j)=>{matrix.fromArray(p.matrix);matrix.elements[12]+=p.matrix[12]*n*.01;b.mesh.setMatrixAt(j,matrix)});b.mesh.instanceMatrix.needsUpdate=true;b.mesh.computeBoundingSphere()}if(n>9)times.push(performance.now()-start)}times.sort((a,b)=>a-b);
console.log(JSON.stringify({passed:true,modelElements:m.partCount,phases:m.phaseCount,geometries:m.geometries.length,highTriangles:m.parts.reduce((n,p)=>n+m.geometries[p.geo].index.count/3,0),lowTriangles:m.parts.reduce((n,p)=>n+m.geometries[p.geo].indexLow.count/3,0),gzipBytes:packed.length,nonOverlappingPackingCases:packingCases,matrixUpdateP95Ms:times[Math.floor(times.length*.95)],note:'CPU-only benchmark in this container; not browser/GPU FPS.'},null,2));
