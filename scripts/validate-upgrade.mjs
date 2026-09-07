import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {assemblyFrame} from '../app/assembly-guide.ts';
import {createExplosionPlan,sampleExplosion,advanceExplosion} from '../app/explosion-layout.ts';
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
const out=()=>({position:new T.Vector3(),quaternion:new T.Quaternion(),scale:new T.Vector3(),center:new T.Vector3()});
for(const aspect of [.4,1,1.8,3]){
 const explosion=createExplosionPlan(model.parts,model,aspect);assert(explosion.split>0&&explosion.split<1);
 // Equal scalar progress covers equal average world-space distance on either side of the stage boundary.
 const speed=(a,b)=>model.parts.reduce((total,p)=>total+sampleExplosion(explosion,p.id,a,out()).center.distanceTo(sampleExplosion(explosion,p.id,b,out()).center),0)/(b-a);
 assert(Math.abs(speed(explosion.split*.2,explosion.split*.4)-speed(explosion.split+(1-explosion.split)*.2,explosion.split+(1-explosion.split)*.4))<1e-6);
 for(const amount of [explosion.split,explosion.split+(1-explosion.split)*.5,1]){
  for(const p of model.parts){const ps=sampleExplosion(explosion,p.id,amount,out()),g=model.geometries[p.geo],box=new T.Box3(new T.Vector3().fromArray(g.bounds[0]),new T.Vector3().fromArray(g.bounds[1])).applyMatrix4(new T.Matrix4().compose(ps.position,ps.quaternion,ps.scale)),cell=explosion.cells.get(p.group);
   assert(box.min.x>=cell.x-cell.width/2-1e-5&&box.max.x<=cell.x+cell.width/2+1e-5,'Piece escapes group cell');assert(box.min.y>=cell.y-cell.height/2-1e-5&&box.max.y<=cell.y+cell.height/2+1e-5);
  }
 }
 const boxes=model.parts.map(p=>{const ps=sampleExplosion(explosion,p.id,1,out()),g=model.geometries[p.geo];return new T.Box3(new T.Vector3().fromArray(g.bounds[0]),new T.Vector3().fromArray(g.bounds[1])).applyMatrix4(new T.Matrix4().compose(ps.position,ps.quaternion,ps.scale))});
 for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++){const x=boxes[a],y=boxes[b];assert(x.max.x<y.min.x||y.max.x<x.min.x||x.max.y<y.min.y||y.max.y<x.min.y,'Flat pieces overlap')}
}
for(const fps of [30,60,120]){let value=0;for(let i=0;i<fps;i++)value=advanceExplosion(value,1,1/fps);assert.equal(value,1)}
assert.deepEqual([...motorFrame(-30,-100)],[171,205,1,226,156,0,0,126]);assert.deepEqual([...motorFrame(0,0)],[171,205,1,0,0,0,0,0]);
const drive=new DriveIntent();drive.press('w','forward',0,200);assert.equal(drive.sample(0,30,200).fb,30);drive.press('s','backward',0,200);assert.equal(drive.sample(0,30,200).fb,0);drive.release('s');drive.press('a','left',0,200);drive.press('a','left',100,200);assert.equal(drive.sample(199,30,200).turn,-1);assert.equal(drive.sample(201,30,200).turn,0);drive.clear();assert.equal(drive.sample(0,30,200).fb,0);assert.equal(drive.held.size,0);
console.log({passed:true,assemblyNodes:plan.nodes.length,assemblyOperations:plan.events.length,uniqueParts:introduced.length,packingAspects:4,protocolAndInputChecks:true});
