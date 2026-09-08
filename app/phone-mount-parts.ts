/** Only stock LDraw moulds already shipped in public/model/model.json.
 * Positions use the viewer's 0.01 world units / LDU. No part is stretched.
 * The lower rectangle is a four-point saddle: two transverse rails are tied by
 * longitudinal 7L beams so the tower load is carried into four chassis-side
 * corners instead of hanging from a single cross member.
 */
export const mountCatalog={
 '41239':{name:'Beam thẳng 13L',color:'#1b2a34'},
 '40490':{name:'Beam thẳng 9L',color:'#f4f4f4'},
 '32525':{name:'Beam thẳng 11L',color:'#969696'},
 '32524':{name:'Beam thẳng 7L',color:'#1b2a34'},
 '32526':{name:'Beam chữ L 3 × 5',color:'#1b2a34'},
 '32140':{name:'Beam chữ L 2 × 4',color:'#1b2a34'},
 '18654':{name:'Beam 1L / spacer',color:'#1b2a34'},
 '2780':{name:'Pin ma sát 2L',color:'#1b2a34'},
 '6558':{name:'Pin ma sát 3L',color:'#1e5aa8'},
} as const;
export type MountCode=keyof typeof mountCatalog;
export type MountPart={code:MountCode;stage:number;position:[number,number,number];orientation:'beam'|'depth'|'pin';angle:number};
const parts:MountPart[]=[];
function add(code:MountCode,stage:number,x:number,y:number,z:number,angle=0,orientation:MountPart['orientation']='beam'){parts.push({code,stage,position:[x,y,z],angle,orientation})}
function pin(stage:number,x:number,y:number,z:number,long=false){add(long?'6558':'2780',stage,x,y,z,0,'pin')}

// STAGE 0 — closed four-point saddle. Two layered 13L cross rails are tied by
// real 7L longitudinal beams. L-beams turn the load down into four corners;
// pins are rendered at every saddle/tower joint instead of floating members.
for(const z of [-.7,.7]){
 add('41239',0,-1,.2,z);add('41239',0,1,.2,z+.2);
 for(const x of [-.2,.2])pin(0,x,.2,z+.1);
 add('32526',0,-1.6,.2,z+.2);add('32526',0,1.6,.2,z+.4,Math.PI);
 for(const x of [-1.6,-1.2])pin(0,x,.2,z+.1);
 for(const x of [1.2,1.6])pin(0,x,.2,z+.3);
}
// Longitudinal ties close the saddle into a rectangle and stop the two cross
// rails from racking independently under phone inertia.
for(const x of [-1.6,1.6]){
 add('32524',0,x,.2,0,0,'depth');
 pin(0,x,.2,-.7);pin(0,x,.2,.7,true);
}

// STAGE 1 — four uprights plus triangulated side faces. Each side gets two
// tower legs (front/rear layer) and an 11L diagonal, giving the mount a truss
// path rather than a pair of unsupported vertical beams.
for(const z of [-.7,.7]){
 for(const side of [-1,1]){
  const layer=z+(side<0?.4:.6);
  add('40490',1,side*1.6,1,layer,Math.PI/2);
  pin(1,side*1.6,.2,layer-.1);
  add('32525',1,side,1,layer+.2,Math.atan2(1.6,-side*1.2));
  pin(1,side*1.6,.2,layer,true);
  add('18654',2,side*.4,1.8,layer);
  pin(2,side*.4,1.8,layer,true);
 }
 add('41239',2,-1,1.8,z+.2);add('41239',2,1,1.8,z+.4);
 for(const x of [-.2,.2])pin(2,x,1.8,z+.3);
 for(const side of [-1,1])pin(2,side*1.6,1.8,z+(side<0?.3:.5));
}

// STAGE 2 — bottom rails under the handset. They are real 7L moulds and sit
// across the two top cross-members, so the phone load is shared by both towers.
for(const x of [-1.6,1.6])add('32524',2,x,2,.2,0,'depth');

// STAGE 3 — raised side rails and four moulded L retainers. No stretched beams
// or procedural LEGO blocks are used.
for(const side of [-1,1]){
 add('41239',3,side*2.2,3,-.2,Math.PI/2);
 add('32140',3,side*2.2,1.8,0,side<0?0:Math.PI);
 add('32140',3,side*2.2,4.2,0,side<0?0:Math.PI);
 pin(3,side*2.2,1.8,-.1);pin(3,side*2.2,4.2,-.1);
}
export const mountParts:ReadonlyArray<MountPart>=parts;
export function mountInventory(stage?:number){return Object.entries(mountCatalog).map(([code,part])=>({...part,code:code as MountCode,quantity:mountParts.filter(p=>p.code===code&&(stage===undefined||p.stage===stage)).length})).filter(p=>p.quantity>0)}
