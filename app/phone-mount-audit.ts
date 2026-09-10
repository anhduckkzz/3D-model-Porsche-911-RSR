import * as T from 'three';
import type {ModelData} from './model-types';
import type {MountInstallation} from './phone-mount-install';
import type {MountPart} from './phone-mount-parts';
const axleLengths:Record<string,number>={'32073':1,'3706':1.2,'3707':1.6};
const lengths:Record<string,number>={'32278':15,'41239':13,'32525':11,'40490':9,'32524':7,'32316':5,'18654':1};
type Socket={point:T.Vector3;axis:T.Vector3;kind:'pin'|'axle';owner:string;half:number};
export type MountAudit={ok:boolean;pinCount:number;unseatedPins:number;axleConflicts:number;unconnectedParts:number;occupiedAnchors:number;sharedSockets:number;issues:string[]};
/** Socket mating check, not a solid collision or structural load solver.
 * Stock round bores and integrated 15100 pins are checked independently.
 * One socket cannot be claimed by two fasteners.
 */
export function auditPhoneMount(model:ModelData,install:MountInstallation,parts:ReadonlyArray<MountPart>):MountAudit{
 const claims=new Map<Socket,number>();const claim=(s:Socket)=>claims.set(s,(claims.get(s)??0)+1);
 const sockets:Socket[]=[],edges=new Map<string,Set<string>>();
 function socket(point:T.Vector3,axis:T.Vector3,kind:Socket['kind'],owner:string,half=.1){sockets.push({point,axis,kind,owner,half})}
 parts.forEach((p,i)=>{const q=new T.Quaternion(...p.quaternion),pos=new T.Vector3(...p.position),owner='rig:'+i;
  const put=(v:T.Vector3,a:T.Vector3,kind:Socket['kind'],half=.1)=>socket(v.multiplyScalar(.01).applyQuaternion(q).add(pos),a.applyQuaternion(q),kind,owner,half);
  if(lengths[p.code])for(let n=0;n<lengths[p.code];n++)put(new T.Vector3(0,0,(n-(lengths[p.code]-1)/2)*20),new T.Vector3(0,1,0),'pin');
  if(p.code==='3713'||p.code==='32123b')put(new T.Vector3(),new T.Vector3(0,0,1),'axle',p.code==='3713'?.1:.05);
  if(p.code==='15100')put(new T.Vector3(),new T.Vector3(0,1,0),'pin');
 });
 const inverse=new T.Quaternion(...install.rotation).invert();
 for(const a of install.anchors){const p=model.parts[a.partId],axis=new T.Vector3(0,1,0).transformDirection(new T.Matrix4().fromArray(p.matrix)).applyQuaternion(inverse);socket(new T.Vector3(...a.local),axis,'pin','chassis')}
 let unseatedPins=0,axleConflicts=0,pinCount=0;
 for(const p of parts){if(p.code!=='2780'&&p.code!=='6558'&&!axleLengths[p.code])continue;pinCount++;
  const axis=new T.Vector3(1,0,0).applyQuaternion(new T.Quaternion(...p.quaternion)),center=new T.Vector3(...p.position),half=axleLengths[p.code]?axleLengths[p.code]/2:p.code==='2780'?.2:.3;
  const aligned=sockets.filter(s=>{const d=s.point.clone().sub(center),along=d.dot(axis);return Math.abs(along)<=half-s.half+.003&&d.addScaledVector(axis,-along).length()<=.003&&Math.abs(s.axis.dot(axis))>.9995});
  if(!axleLengths[p.code]&&aligned.some(s=>s.kind==='axle'))axleConflicts++;
  aligned.filter(s=>s.kind==='pin'||!!axleLengths[p.code]).forEach(claim);
  const owners=[...new Set(aligned.filter(s=>s.kind==='pin'||!!axleLengths[p.code]).map(s=>s.owner))];
  if(owners.length<2){unseatedPins++;continue}
  for(const a of owners)for(const b of owners){if(!edges.has(a))edges.set(a,new Set());edges.get(a)!.add(b)}
 }
 // 15100 has a 1L integrated male pin centred 20 LDU along local +X.
 parts.forEach((p,i)=>{if(p.code!=='15100')return;const q=new T.Quaternion(...p.quaternion),axis=new T.Vector3(1,0,0).applyQuaternion(q),center=new T.Vector3(20,0,0).multiplyScalar(.01).applyQuaternion(q).add(new T.Vector3(...p.position));
  const mate=sockets.filter(s=>s.owner!=='rig:'+i&&s.kind==='pin'&&s.point.distanceTo(center)<.003&&Math.abs(s.axis.dot(axis))>.9995);
  mate.forEach(claim);pinCount++;if(!mate.length){unseatedPins++;return}for(const s of mate){const a='rig:'+i,b=s.owner;if(!edges.has(a))edges.set(a,new Set());if(!edges.has(b))edges.set(b,new Set());edges.get(a)!.add(b);edges.get(b)!.add(a)}
 });
 const reached=new Set(['chassis']),queue=['chassis'];while(queue.length){const n=queue.pop()!;for(const to of edges.get(n)??[])if(!reached.has(to)){reached.add(to);queue.push(to)}}
 const unconnectedParts=parts.filter((p,i)=>p.code!=='2780'&&p.code!=='6558'&&!axleLengths[p.code]&&!reached.has('rig:'+i)).length;
 const occupiedAnchors=install.anchors.filter(a=>{const point=new T.Vector3(...a.world),rail=model.parts[a.partId],axis=new T.Vector3(0,1,0).transformDirection(new T.Matrix4().fromArray(rail.matrix));return model.parts.some(p=>{
  if(!/Pin |Axle /i.test(model.geometries[p.geo].description))return false;
  const d=new T.Vector3(...p.matrix.slice(12,15)).sub(point),along=d.dot(axis);return Math.abs(along)<.4&&d.addScaledVector(axis,-along).length()<.06;
 })}).length;
 const sharedSockets=[...claims.values()].filter(n=>n>1).length;
 const issues=[];if(sharedSockets)issues.push(`${sharedSockets} lỗ bị hai fastener cùng chiếm chỗ.`);if(occupiedAnchors)issues.push(`${occupiedAnchors}/4 lỗ neo có pin/axle hiện hữu ở gần trục; cần xác nhận hoặc đổi lỗ.`);
 if(unseatedPins)issues.push(`${unseatedPins}/${pinCount} pin/axle chưa xuyên đủ các lỗ đồng trục, đúng chiều dài.`);
 if(axleConflicts)issues.push(`${axleConflicts} pin tròn đang được đặt vào vị trí lỗ axle.`);
 if(unconnectedParts)issues.push(`${unconnectedParts} mảnh chưa có chuỗi liên kết pin liên tục xuống chassis.`);
 const required:Record<string,number>={'phone bottom ledge':4,'back datum spine':1,'back datum pin':2,'side contact bush':4,'front contact bush':4,'top contact bush':2,'side guide lock bush':8,'front guide lock bush':8,'top guide lock bush':4};
 for(const [role,count] of Object.entries(required))if(parts.filter(p=>p.role===role).length<count)issues.push(`Thiếu mặt tựa hoặc khóa giữ: ${role}.`);
 return {ok:issues.length===0,pinCount,unseatedPins,axleConflicts,unconnectedParts,occupiedAnchors,sharedSockets,issues};
}
