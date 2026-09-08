import * as T from 'three';

/** Dimensioned design study. 0.2 world units = 1 Technic pitch = 8 mm.
 * Beam holes are rendered at that pitch; anchors/connectors require physical fit.
 * Not a certified LDraw assembly or a claim that the original set has spare parts.
 */
export function createPhoneMount(){
 const root=new T.Group(),stages=Array.from({length:5},()=>new T.Group());
 stages.forEach(g=>root.add(g));root.position.set(0,.3,.6);
 const materials:T.Material[]=[],geometries:T.BufferGeometry[]=[];
 const mat=(color:number,options:Partial<T.MeshStandardMaterialParameters>={})=>{const m=new T.MeshStandardMaterial({color,roughness:.55,...options});materials.push(m);return m};
 const black=mat(0x293841),gray=mat(0x82919a),blue=mat(0x416c8a),rubber=mat(0x21282e),phone=mat(0x354653,{metalness:.35}),glass=mat(0x101c25,{metalness:.4,roughness:.17});
 const beamCache=new Map<number,T.ExtrudeGeometry>();
 function beam(stage:number,holes:number,x:number,y:number,z:number,angle=0,material=black){
  let geometry=beamCache.get(holes);
  if(!geometry){const l=(holes-1)*.2,r=.095,shape=new T.Shape();shape.moveTo(0,-r);shape.lineTo(l,-r);shape.absarc(l,0,r,-Math.PI/2,Math.PI/2,false);shape.lineTo(0,r);shape.absarc(0,0,r,Math.PI/2,Math.PI*1.5,false);
   for(let n=0;n<holes;n++){const hole=new T.Path();hole.absarc(n*.2,0,.058,0,Math.PI*2,true);shape.holes.push(hole)}
   geometry=new T.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false,curveSegments:10});geometry.translate(-l/2,0,-.09);beamCache.set(holes,geometry);geometries.push(geometry);
  }
  const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.rotation.z=angle;stages[stage].add(mesh);return mesh;
 }
 function box(stage:number,size:number[],pos:number[],material:T.Material){const g=new T.BoxGeometry(...size as [number,number,number]);geometries.push(g);const mesh=new T.Mesh(g,material);mesh.position.fromArray(pos);stages[stage].add(mesh);return mesh}
 // Four pads mark proposed chassis attachment zones, not verified pin locations.
 for(const x of [-1.6,1.6])for(const z of [-.6,.6])box(0,[.4,.16,.4],[x,0,z],blue);
 for(const z of [-.6,.6]){beam(0,15,-.4,.16,z,0,gray);beam(0,5,1.4,.16,z+.2,0,gray)}
 // Four uprights and paired diagonal braces form a rigid tower below the cradle.
 for(const x of [-1.6,1.6])for(const z of [-.6,.6])beam(1,9,x,1,z,Math.PI/2);
 for(const x of [-1.6,1.6]){const m=beam(1,11,0,0,0,0,gray);m.position.set(x,1,0);m.rotation.set(0,Math.PI/2,Math.atan2(1.6,1.2))}
 // Two staggered 13L beams per edge: 21-pitch cradle, 5-hole lap joint.
 for(const z of [-.28,.28]){beam(2,13,-.8,1.8,z);beam(2,13,.8,1.8,z+.19)}
 for(const z of [-.28,.28])for(const x of [-.2,.2]){const g=new T.CylinderGeometry(.048,.048,.4,12);geometries.push(g);const pin=new T.Mesh(g,blue);pin.rotation.x=Math.PI/2;pin.position.set(x,1.8,z+.095);stages[2].add(pin)}
 for(const x of [-1.6,1.6]){box(2,[.4,.14,.7],[x,1.94,.09],rubber)}
 // Edge retainers. Central rear camera region remains completely open.
 for(const x of [-2.1,2.1]){
  beam(3,11,x,2.8,-.05,Math.PI/2);
  for(const y of [2.15,3.7])box(3,[.16,.3,.6],[x,y,.08],rubber);
  beam(3,3,x-Math.sign(x)*.1,3.98,.08);
 }
 // Normal Aris nominal envelope; reserve clearance for measured case/camera bump.
 box(4,[156.2*.025,75.04*.025,8.55*.025],[0,2.96,.09],phone);
 box(4,[3.76,1.74,.015],[0,2.96,-.025],glass);
 // Approximate location of rear camera island after landscape rotation.
 // Actual active lens and optical FOV must be calibrated on the handset.
 box(4,[.58,.58,.06],[1.32,3.37,.23],black);
 for(const x of [1.17,1.47])for(const y of [3.22,3.52]){const g=new T.CylinderGeometry(.082,.082,.035,16);geometries.push(g);const m=new T.Mesh(g,glass);m.rotation.x=Math.PI/2;m.position.set(x,y,.28);stages[4].add(m)}
 const sight=new T.ArrowHelper(new T.Vector3(0,0,1),new T.Vector3(1.17,3.52,.3),2.3,0x487b9a,.25,.14);stages[4].add(sight);
 // Wire frustum is an aiming aid only, intentionally not labeled as calibrated FOV.
 const lines:number[]=[];const eye=[1.17,3.52,.3],corners=[[-.8,2.8,2.6],[3.1,2.8,2.6],[3.1,4.4,2.6],[-.8,4.4,2.6]];
 corners.forEach((p,i)=>lines.push(...eye,...p,...p,...corners[(i+1)%4]));
 const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(lines,3));geometries.push(fg);const fm=new T.LineBasicMaterial({color:0x8aa7b9,transparent:true,opacity:.45});materials.push(fm);stages[4].add(new T.LineSegments(fg,fm));
 return {root,update(step:number,exploded:boolean){stages.forEach((g,i)=>{g.visible=i<=step;g.position.y=exploded?i*.85:0});root.updateMatrixWorld(true)},dispose(){sight.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}};
}
