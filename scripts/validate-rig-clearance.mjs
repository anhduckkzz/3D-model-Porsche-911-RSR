/** Optional offline full-resolution mesh check. No BVH dependency is sent to the browser.
 * npm install --prefix /tmp/lego-audit --no-package-lock three-mesh-bvh@0.9.15
 * LEGO_BVH_MODULE=/tmp/lego-audit/node_modules/three-mesh-bvh/build/index.module.js node scripts/validate-rig-clearance.mjs
 */
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import ts from 'typescript';
import * as T from 'three';
const {MeshBVH}=await import(process.env.LEGO_BVH_MODULE||'three-mesh-bvh');
async function load(n){return import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(fs.readFileSync('app/'+n+'.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replaceAll("'three'",JSON.stringify(import.meta.resolve('three')))).toString('base64'))}
const model=JSON.parse(fs.readFileSync('public/model/model.json'));
const {resolvePhoneMountInstallation}=await load('phone-mount-install'),{buildMountParts,mountCatalog,phoneEnvelope}=await load('phone-mount-parts'),{mountPreparation}=await load('phone-mount-preparation');
const install=resolvePhoneMountInstallation(model),plan=buildMountParts(install),removed=mountPreparation(model);
const root=new T.Matrix4().compose(new T.Vector3(...install.origin),new T.Quaternion(...install.rotation),new T.Vector3(1,1,1));
const box=(g,m)=>new T.Box3(new T.Vector3(...g.bounds[0]),new T.Vector3(...g.bounds[1])).applyMatrix4(m);
const rig=plan.parts.map((p,i)=>{const g=model.geometries.find(g=>g.name===p.code+'.dat'&&g.colorHex===mountCatalog[p.code].color),m=new T.Matrix4().compose(new T.Vector3(...p.position),new T.Quaternion(...p.quaternion),new T.Vector3(.01,.01,.01));return {i,p,g,m,b:box(g,m)}});
const car=model.parts.map(p=>{const g=model.geometries[p.geo],m=root.clone().invert().multiply(new T.Matrix4().fromArray(p.matrix));return {p,g,m,b:box(g,m)}});
const raw=gunzipSync(fs.readFileSync('public/model/geometry.bin.gz')),binary=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),cache=new Map();
function geometry(info){if(cache.has(info))return cache.get(info);const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(binary,info.position.offset,info.position.count),3));g.setIndex(new T.BufferAttribute(new Uint32Array(binary,info.index.offset,info.index.count).slice(),1));g.boundsTree=new MeshBVH(g);cache.set(info,g);return g}
function intersects(a,b){return a.b.clone().expandByScalar(-.0005).intersectsBox(b.b)&&geometry(a.g).boundsTree.intersectsGeometry(geometry(b.g),a.m.clone().invert().multiply(b.m))}
function intendedMaleMating(a,b){if(a.p.code!=='15100')return false;const male=new T.Vector3(20,0,0).applyMatrix4(a.m),axis=new T.Vector3(1,0,0).transformDirection(a.m),bore=new T.Vector3(0,1,0).transformDirection(b.m);if(Math.abs(axis.dot(bore))<.9995)return false;const holes={'41239':13,'40490':9,'32525':11,'32524':7,'32316':5,'18654':1}[b.p.code]??0;for(let i=0;i<holes;i++)if(new T.Vector3(0,0,(i-(holes-1)/2)*20).applyMatrix4(b.m).distanceTo(male)<.003)return true;return false}
const structuralHits=[],selfHits=[],stockHits=[];
for(const r of rig)for(const c of car){if(!intersects(r,c))continue;if(r.p.role==='chassis hardpoint'&&[337,338].includes(c.p.id))continue;stockHits.push(c.p.id);if(!removed.has(c.p.id))structuralHits.push([r.i,c.p.id]);}
for(let i=0;i<rig.length;i++)for(let j=i+1;j<rig.length;j++){const a=rig[i],b=rig[j];if(['2780','6558'].includes(a.p.code)||['2780','6558'].includes(b.p.code)||intendedMaleMating(a,b)||intendedMaleMating(b,a))continue;if(intersects(a,b))selfHits.push([i,j]);}
const e=phoneEnvelope,phoneGeo=new T.BoxGeometry(e.width,e.height,e.depth);phoneGeo.boundsTree=new MeshBVH(phoneGeo);const phoneM=new T.Matrix4().makeTranslation(...plan.phonePose.position),phoneIntersects=r=>phoneGeo.boundsTree.intersectsGeometry(geometry(r.g),phoneM.clone().invert().multiply(r.m));
const phoneCar=car.filter(c=>!removed.has(c.p.id)&&phoneIntersects(c)).map(c=>c.p.id),phoneRig=rig.filter(phoneIntersects).map(r=>r.i);
const report={scope:'Static triangle-surface intersections; mating friction surfaces excluded. Not a load, insertion-path, containment or suspension-travel certification.',removedParts:[...removed].sort((a,b)=>a-b),stockConflicts:[...new Set(stockHits)].sort((a,b)=>a-b),rigCarIntersections:structuralHits,rigSelfIntersections:selfHits,phoneCarIntersections:phoneCar,phoneRigIntersections:phoneRig};
console.log(JSON.stringify(report,null,2));
assert.equal(structuralHits.length+selfHits.length+phoneCar.length+phoneRig.length,0,'Unexpected surface intersection');
fs.writeFileSync('public/camera-bridge-clearance.json',JSON.stringify(report,null,2)+'\n');
