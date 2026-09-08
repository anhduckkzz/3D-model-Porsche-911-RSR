import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {assemblyFrame} from '../app/assembly-guide.ts';
import {createFlatLayout,groupOffsets,sampleLegacyExplosion,advanceExplosion} from '../app/explosion-layout.ts';
import {DriveIntent,motorFrame} from '../app/vehicle-protocol.ts';
const model=JSON.parse(fs.readFileSync('public/model/model.json')),plan=JSON.parse(fs.readFileSync('public/model/assembly.json'));
const introduced=[];
for(const [index,event]of plan.events.entries()){
 const frame=assemblyFrame(plan,index+1);assert.equal(frame.node.id,event.node);assert(frame.localStep>0);
 assert([...frame.visible].every(id=>frame.node.parts.includes(id)));
 if(event.kind==='part'){assert.equal(event.parts.length,1);introduced.push(...event.parts)}
 else{const child=plan.nodes[event.child];assert.equal(child.parent,event.node);assert.equal(child.end,index);assert.deepEqual(event.parts,child.parts);assert.deepEqual([...assemblyFrame(plan,child.end).visible].sort((a,b)=>a-b),[...child.parts].sort((a,b)=>a-b))}
}
assert.equal(new Set(introduced).size,model.parts.length);assert.equal(introduced.length,model.parts.length);
assert.equal(assemblyFrame(plan,plan.events.length).visible.size,model.parts.length);
const poseFromPart=part=>{const matrix=new T.Matrix4().fromArray(part.matrix),position=new T.Vector3(),quaternion=new T.Quaternion(),scale=new T.Vector3();matrix.decompose(position,quaternion,scale);return {position,quaternion,scale,center:position.clone()}};
const out=()=>({position:new T.Vector3(),quaternion:new T.Quaternion(),scale:new T.Vector3(),center:new T.Vector3()});
const transformedBox=(part,pose)=>{const info=model.geometries[part.geo];return new T.Box3(new T.Vector3().fromArray(info.bounds[0]),new T.Vector3().fromArray(info.bounds[1])).applyMatrix4(new T.Matrix4().compose(pose.position,pose.quaternion,pose.scale))};
for(const aspect of [.4,1,1.8,3]){
 const layout=createFlatLayout(model.parts,model,aspect),offsets=groupOffsets(model),bases=model.parts.map(poseFromPart);
 // Every stage remains the old path, but samples are linear rather than eased.
 const sample=(id,amount)=>sampleLegacyExplosion(bases[id],layout.poses.get(id),offsets.get(model.parts[id].group)??new T.Vector3(),amount,out());
 const speed=(a,b)=>model.parts.reduce((total,p)=>total+sample(p.id,a).center.distanceTo(sample(p.id,b).center),0)/(b-a);
 assert(Math.abs(speed(0,.2)-speed(.2,.4))<1e-6);
 assert(Math.abs(speed(.55,.75)-speed(.75,.95))<1e-6);
 for(const p of model.parts){const start=sample(p.id,0),grouped=sample(p.id,.4),flat=sample(p.id,1);assert(start.position.distanceTo(bases[p.id].position)<1e-6);assert(grouped.position.distanceTo(bases[p.id].position.clone().add(offsets.get(p.group)??new T.Vector3()))<1e-6);assert(flat.position.distanceTo(layout.poses.get(p.id).position)<1e-6)}
 const boxes=model.parts.map(p=>transformedBox(p,layout.poses.get(p.id)));
 for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++){const x=boxes[a],y=boxes[b];assert(x.max.x<y.min.x||y.max.x<x.min.x||x.max.y<y.min.y||y.max.y<x.min.y,'Flat pieces overlap')}
}
for(const fps of [30,60,120]){let value=0;for(let i=0;i<fps;i++)value=advanceExplosion(value,1,1/fps);assert.equal(value,1)}
assert.deepEqual([...motorFrame(-30,-100)],[171,205,1,226,156,0,0,126]);assert.deepEqual([...motorFrame(0,0)],[171,205,1,0,0,0,0,0]);
const drive=new DriveIntent();drive.press('w','forward',0,200);assert.equal(drive.sample(0,30,200).fb,30);drive.press('s','backward',0,200);assert.equal(drive.sample(0,30,200).fb,0);drive.release('s');drive.press('a','left',0,200);assert.equal(drive.sample(199,30,200).turn,-1);assert.equal(drive.sample(2000,30,200).turn,-1,'Held steering must remain active until release');drive.release('a');assert.equal(drive.sample(2001,30,200).turn,0);drive.clear();assert.equal(drive.sample(0,30,200).fb,0);assert.equal(drive.held.size,0);
console.log({passed:true,assemblyNodes:plan.nodes.length,assemblyOperations:plan.events.length,uniqueParts:introduced.length,packingAspects:4,protocolAndInputChecks:true});
