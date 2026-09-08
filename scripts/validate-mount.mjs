import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import ts from 'typescript';
import * as T from 'three';
import {mountParts,mountInventory} from '../app/phone-mount-parts.ts';
// Load the same TS factory without changing the application's import conventions.
const compiled=ts.transpileModule(fs.readFileSync('app/phone-mount.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
 .replace("'three'",JSON.stringify(import.meta.resolve('three')))
 .replace("'./phone-mount-parts'",JSON.stringify(new URL('../app/phone-mount-parts.ts',import.meta.url).href));
const {createPhoneMount}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const model=JSON.parse(fs.readFileSync('public/model/model.json'));
const bytes=gunzipSync(fs.readFileSync('public/model/geometry.bin.gz'));
const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const geometries=model.geometries.map(info=>{const g=new T.BufferGeometry();for(const key of ['position','normal','color']){const d=info[key];g.setAttribute(key,new T.BufferAttribute(new Float32Array(buffer,d.offset,d.count),3))}g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,info.index.offset,info.index.count),1));g.computeBoundingBox();return g});
let sourceDisposals=0;geometries.forEach(g=>g.addEventListener('dispose',()=>sourceDisposals++));
const mount=createPhoneMount(model,geometries),counts=new Map();let batches=0;
for(const stage of mount.root.children.slice(0,4))stage.traverse(mesh=>{
 if(mesh===stage)return;
 assert(mesh.isInstancedMesh,'Every LEGO object must use an original part instance');batches++;
 const geo=geometries.indexOf(mesh.geometry);assert(geo>=0,'Geometry must be shared with source assets');assert.equal(mesh.userData.ldraw,model.geometries[geo].name);
 const code=mesh.userData.ldraw.replace('.dat','');counts.set(code,(counts.get(code)||0)+mesh.count);
 for(let i=0;i<mesh.count;i++){const m=new T.Matrix4();mesh.getMatrixAt(i,m);const p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();m.decompose(p,q,s);assert([...m.elements].every(Number.isFinite));for(const v of s)assert(Math.abs(v-.01)<1e-8,'No stretching or mirroring LEGO moulds')}
});
for(const item of mountInventory())assert.equal(counts.get(item.code),item.quantity,'BOM must match rendered instances');
for(let step=0;step<5;step++)for(const split of [false,true]){mount.update(step,split);assert.equal(mount.root.children.filter(g=>g.visible).length,step+1)}
mount.dispose();assert.equal(sourceDisposals,0,'Mount disposal must not destroy vehicle geometry');geometries.forEach(g=>g.dispose());
console.log({passed:true,stockMoulds:counts.size,parts:mountParts.length,instancedBatches:batches,newLegoGeometryBytes:0,sourceGeometryPreserved:true});
