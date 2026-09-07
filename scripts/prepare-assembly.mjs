/** Recover instance-level subassemblies without reprocessing the geometry library. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
const source=fs.readFileSync('scripts/source/porsche.mpd','utf8');
const model=JSON.parse(fs.readFileSync('public/model/model.json','utf8'));
const normalize=n=>n.trim().replaceAll('\\','_').replaceAll('/','_').toLowerCase();
const files=new Map();let file;
for(const line of source.split(/\r?\n/)){
 if(line.startsWith('0 FILE ')){file={name:line.slice(7).trim(),refs:[]};files.set(normalize(file.name),file)}
 else if(file&&line.startsWith('1 ')){const t=line.trim().split(/\s+/);file.refs.push({name:t.slice(14).join(' '),matrix:new T.Matrix4().set(+t[5],+t[6],+t[7],+t[2],+t[8],+t[9],+t[10],+t[3],+t[11],+t[12],+t[13],+t[4],0,0,0,1)})}
}
// LDrawLoader stores references as Object3D position/quaternion/scale.
for(const file of files.values())for(const ref of file.refs){const p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();ref.matrix.decompose(p,q,s);ref.matrix.compose(p,q,s)}
const atomic=n=>/\.dat$/i.test(n)||/shock-|technicrib|technicflex/i.test(n);
const nodes=[],events=[],leaves=[];
function visit(name,parent,world){
 const f=files.get(normalize(name));assert(f,'Missing submodel '+name);
 const node={id:nodes.length,parent,name:f.name.replace(/^42096 - /i,'').replace(/\.ldr$/i,''),children:[],parts:[],events:[],start:events.length+1,end:0};nodes.push(node);
 for(const ref of f.refs){const matrix=world.clone().multiply(ref.matrix);
  if(atomic(ref.name)){const id=leaves.length;leaves.push({name:ref.name,matrix});node.parts.push(id);node.events.push(events.length);events.push({node:node.id,kind:'part',parts:[id]})}
  else{const child=visit(ref.name,node.id,matrix);node.children.push(child.id);node.parts.push(...child.parts);node.events.push(events.length);events.push({node:node.id,kind:'attach',child:child.id,parts:child.parts})}
 }
 node.end=events.length;return node;
}
// Unwrap the display-only root, retaining its affine transform.
let root=files.values().next().value,world=new T.Matrix4();
while(root.refs.length===1&&!atomic(root.refs[0].name)){world.multiply(root.refs[0].matrix);root=files.get(normalize(root.refs[0].name))}
visit(root.name,null,world);
assert.equal(leaves.length,model.parts.length,'Atomic element count differs');
const reflect=new T.Matrix4().makeRotationX(Math.PI),conversion=new T.Matrix4().makeScale(.01,.01,.01).multiply(reflect);
const first=leaves[0].matrix.clone().premultiply(conversion),offset=new T.Vector3().setFromMatrixPosition(new T.Matrix4().fromArray(model.parts[0].matrix)).sub(new T.Vector3().setFromMatrixPosition(first));
for(const [i,leaf] of leaves.entries()){
 assert.equal(normalize(leaf.name),normalize(model.geometries[model.parts[i].geo].name),'Element ordering mismatch '+i);
 const actual=leaf.matrix.clone().premultiply(conversion);actual.elements[12]+=offset.x;actual.elements[13]+=offset.y;actual.elements[14]+=offset.z;
 assert(actual.elements.every((v,j)=>Math.abs(v-model.parts[i].matrix[j])<.0001),'Element transform mismatch '+i);
}
for(const node of nodes){node.group=model.parts[node.parts[0]]?.group??'chassis';node.label=node.parent===null?'Porsche 911 RSR':node.name.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[-_]/g,' ')}
const result={version:1,root:0,nodes,events};
fs.writeFileSync('public/model/assembly.json',JSON.stringify(result));
console.log({nodes:nodes.length,events:events.length,parts:leaves.length,maximumDepth:Math.max(...nodes.map(n=>{let d=0;while(n.parent!==null){d++;n=nodes[n.parent]}return d}))});
