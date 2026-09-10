import * as T from 'three';
import {auditPhoneMount} from './phone-mount-audit';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {ModelData} from './model-types';
import {resolvePhoneMountInstallation,type MountInstallation} from './phone-mount-install';
import {buildMountParts,mountCatalog,mountInventory} from './phone-mount-parts';

const PHONE_MODEL='/model/vsmart-aris-xam-nhat-thuc.glb',Z=new T.Vector3(0,0,1);

/**
 * Low roll-cage camera bridge. LEGO geometry is always an original LDraw mesh
 * at uniform 0.01 scale. The installation frame comes from real chassis beam
 * holes in model.json, never from a guessed whole-rig xyz.
 */
export function createPhoneMount(model:ModelData,sourceGeometries:T.BufferGeometry[],installation?:MountInstallation|null){
 const install=installation===undefined?resolvePhoneMountInstallation(model):installation;
 const root=new T.Group(),assembly=new T.Group(),stages=Array.from({length:5},()=>new T.Group());root.add(assembly);stages.forEach(g=>assembly.add(g));
 const materials:T.Material[]=[],geometries:T.BufferGeometry[]=[],instances:T.InstancedMesh[]=[];
 const importedGeometries=new Set<T.BufferGeometry>(),importedMaterials=new Set<T.Material>(),importedTextures=new Set<T.Texture>();
 const mat=(color:number,options:Partial<T.MeshStandardMaterialParameters>={})=>{const m=new T.MeshStandardMaterial({color,roughness:.3,...options});materials.push(m);return m};
 const plastic=mat(0xffffff,{vertexColors:true,metalness:.03,side:T.DoubleSide}),phoneFallback=mat(0x59636a,{metalness:.28,roughness:.28});
 const aidMaterial=new T.MeshBasicMaterial({color:0x2f78a2,transparent:true,opacity:.88,depthTest:false});materials.push(aidMaterial);
 const plan=install?buildMountParts(install):null,parts=plan?.parts??[];
 const audit=install?auditPhoneMount(model,install,parts):null;
 const scale=new T.Vector3(.01,.01,.01),matrix=new T.Matrix4();

 for(let stage=0;stage<5;stage++)for(const [code,spec] of Object.entries(mountCatalog)){
  const entries=parts.filter(p=>p.stage===stage&&p.code===code);if(!entries.length)continue;
  const geo=model.geometries.findIndex(g=>g.name===code+'.dat'&&g.colorHex===spec.color);
  if(geo<0||!sourceGeometries[geo])throw new Error('Thiếu asset LDraw '+code+'.dat');
  const mesh=new T.InstancedMesh(sourceGeometries[geo],plastic,entries.length);mesh.userData={ldraw:code+'.dat',stage,description:model.geometries[geo].description};
  entries.forEach((part,i)=>{matrix.compose(new T.Vector3(...part.position),new T.Quaternion(...part.quaternion),scale);mesh.setMatrixAt(i,matrix)});
  mesh.computeBoundingSphere();stages[stage].add(mesh);instances.push(mesh);
 }

 // Step 01 exposes the exact authored chassis holes selected by the resolver.
 // Rings are inspection aids only and disappear on the Drive installation.
 const hardpointAids=new T.Group();stages[0].add(hardpointAids);
 if(install)for(const anchor of install.anchors){const g=new T.TorusGeometry(.105,.017,8,24);geometries.push(g);const ring=new T.Mesh(g,aidMaterial);ring.position.fromArray(anchor.local);ring.rotation.x=Math.PI/2;ring.renderOrder=8;ring.userData={anchor:true,partId:anchor.partId,hole:anchor.hole,code:anchor.code};hardpointAids.add(ring)}

 const phoneGroup=new T.Group();stages[4].add(phoneGroup);
 if(plan){phoneGroup.position.fromArray(plan.phonePose.position);phoneGroup.rotation.x=plan.phonePose.tilt}else phoneGroup.visible=false;
 function box(size:[number,number,number],pos:[number,number,number],material:T.Material,parent:T.Object3D=phoneGroup){const g=new T.BoxGeometry(...size);geometries.push(g);const mesh=new T.Mesh(g,material);mesh.position.fromArray(pos);parent.add(mesh);return mesh}
 const fallback=box([156.55*.025,76.175*.025,10.71*.025],[0,0,0],phoneFallback);fallback.name='Vsmart Aris loading fallback';
 const phoneAsset=new T.Group();phoneAsset.name='Vsmart Aris supplied GLB';phoneGroup.add(phoneAsset);
 let cancelled=false;
 new GLTFLoader().load(PHONE_MODEL,gltf=>{
  if(cancelled)return;const handset=gltf.scene;handset.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(handset),center=bounds.getCenter(new T.Vector3());handset.position.sub(center);
  phoneAsset.scale.setScalar(25);phoneAsset.rotation.set(0,Math.PI,-Math.PI/2);phoneAsset.add(handset);
  handset.traverse(o=>{if(!(o instanceof T.Mesh))return;importedGeometries.add(o.geometry);const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){importedMaterials.add(m);for(const value of Object.values(m)){if(value instanceof T.Texture)importedTextures.add(value)}}});
  fallback.visible=false;root.updateMatrixWorld(true);
 },undefined,error=>{console.warn('Không tải được Vsmart Aris GLB, giữ envelope fallback.',error)});

 const cameraAids=new T.Group();phoneGroup.add(cameraAids);const eye=new T.Vector3(1.52,.15,.22);
 const sight=new T.ArrowHelper(Z.clone(),eye,2.5,0x487b9a,.24,.13);cameraAids.add(sight);
 const corners=[new T.Vector3(-1.25,-.75,2.8),new T.Vector3(2.25,-.75,2.8),new T.Vector3(2.25,.85,2.8),new T.Vector3(-1.25,.85,2.8)],lines:number[]=[];
 corners.forEach((p,i)=>lines.push(...eye.toArray(),...p.toArray(),...p.toArray(),...corners[(i+1)%4].toArray()));
 const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(lines,3));geometries.push(fg);const fm=new T.LineBasicMaterial({color:0x8aa7b9,transparent:true,opacity:.42});materials.push(fm);cameraAids.add(new T.LineSegments(fg,fm));

 // A single installation frame; no guessed root offset or render-time compensation.
 if(install){root.position.fromArray(install.origin);root.quaternion.fromArray(install.rotation)}
 function syncInstallation(){root.updateMatrixWorld(true)}
 return {
  root,audit,resolved:!!install,installation:install,inventory:mountInventory(parts),
  update(step:number,exploded:boolean){stages.forEach((g,i)=>{g.visible=i<=step;g.position.y=exploded?i*.82:0});syncInstallation();root.updateMatrixWorld(true)},
  setAids(visible:boolean){cameraAids.visible=visible;hardpointAids.visible=visible},
  setContext(context:boolean){const show=!!plan;instances.forEach(m=>m.visible=show);phoneGroup.visible=show;hardpointAids.visible=show&&context;cameraAids.visible=show&&!context},
  setInstalled(_installed:boolean){syncInstallation()},
  dispose(){cancelled=true;root.onBeforeRender=()=>{};instances.forEach(m=>m.dispose());sight.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());importedGeometries.forEach(g=>g.dispose());importedMaterials.forEach(m=>m.dispose());importedTextures.forEach(t=>t.dispose())}
 };
}
