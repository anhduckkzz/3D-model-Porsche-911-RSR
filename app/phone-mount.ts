import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {ModelData} from './model-types';
import {mountCatalog,mountParts} from './phone-mount-parts';

const PHONE_MODEL='/model/vsmart-aris-xam-nhat-thuc.glb';

/** Every LEGO mesh references an existing, unmodified LDraw geometry buffer.
 * The handset is loaded from the supplied Vsmart Aris GLB. The simple box is
 * only a loading/failure fallback so the mount never renders empty.
 */
export function createPhoneMount(model:ModelData,sourceGeometries:T.BufferGeometry[]){
 const root=new T.Group(),stages=Array.from({length:5},()=>new T.Group());
 stages.forEach(g=>root.add(g));root.position.set(0,.3,.6);
 const materials:T.Material[]=[],geometries:T.BufferGeometry[]=[],instances:T.InstancedMesh[]=[];
 const importedGeometries=new Set<T.BufferGeometry>(),importedMaterials=new Set<T.Material>(),importedTextures=new Set<T.Texture>();
 const mat=(color:number,options:Partial<T.MeshStandardMaterialParameters>={})=>{const m=new T.MeshStandardMaterial({color,roughness:.3,...options});materials.push(m);return m};
 const plastic=mat(0xffffff,{vertexColors:true,metalness:.03,side:T.DoubleSide});
 const phoneFallback=mat(0x59636a,{metalness:.28,roughness:.28});
 // LDraw straight beams: length +Z, bores Y. Map to length X, bores Z.
 const canonical=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0,1,0),new T.Vector3(0,0,1),new T.Vector3(1,0,0)));
 const pinRotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-Math.PI/2);
 const axis=new T.Vector3(0,0,1),scale=new T.Vector3(.01,.01,.01),matrix=new T.Matrix4();
 for(let stage=0;stage<4;stage++)for(const [code,spec] of Object.entries(mountCatalog)){
  const entries=mountParts.filter(p=>p.stage===stage&&p.code===code);if(!entries.length)continue;
  const geo=model.geometries.findIndex(g=>g.name===code+'.dat'&&g.colorHex===spec.color);
  if(geo<0||!sourceGeometries[geo])throw new Error('Thiếu asset LDraw '+code+'.dat');
  const mesh=new T.InstancedMesh(sourceGeometries[geo],plastic,entries.length);
  mesh.userData={ldraw:code+'.dat',stage,description:model.geometries[geo].description};
  entries.forEach((part,i)=>{
   const rotation=new T.Quaternion().setFromAxisAngle(axis,part.angle);
   if(part.orientation==='beam')rotation.multiply(canonical);
   else if(part.orientation==='pin')rotation.multiply(pinRotation);
   matrix.compose(new T.Vector3(...part.position),rotation,scale);mesh.setMatrixAt(i,matrix);
  });
  mesh.computeBoundingSphere();stages[stage].add(mesh);instances.push(mesh);
 }
 function box(stage:number,size:number[],pos:number[],material:T.Material){const g=new T.BoxGeometry(...size as [number,number,number]);geometries.push(g);const mesh=new T.Mesh(g,material);mesh.position.fromArray(pos);stages[stage].add(mesh);return mesh}

 // Fallback uses the real handset envelope only while the supplied GLB loads.
 const fallback=box(4,[156.55*.025,76.175*.025,10.71*.025],[0,2.96,.09],phoneFallback);
 fallback.name='Vsmart Aris loading fallback';
 const phoneAsset=new T.Group();phoneAsset.name='Vsmart Aris supplied GLB';phoneAsset.position.set(0,2.96,.09);stages[4].add(phoneAsset);
 let cancelled=false;
 new GLTFLoader().load(PHONE_MODEL,gltf=>{
  if(cancelled)return;
  const handset=gltf.scene;
  handset.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(handset),center=bounds.getCenter(new T.Vector3());
  handset.position.sub(center);
  // Supplied asset is authored in metres, portrait along +Y, rear cameras on -Z.
  // Viewer units are 0.025 per mm, so 1 metre = 25 viewer units. Rotate to
  // landscape and flip the rear-camera face toward the same side as the old rig.
  phoneAsset.scale.setScalar(25);
  phoneAsset.rotation.set(0,Math.PI,-Math.PI/2);
  phoneAsset.add(handset);
  handset.traverse(o=>{
   if(!(o instanceof T.Mesh))return;
   importedGeometries.add(o.geometry);
   const mats=Array.isArray(o.material)?o.material:[o.material];
   for(const m of mats){importedMaterials.add(m);for(const value of Object.values(m)){if(value instanceof T.Texture)importedTextures.add(value)}}
  });
  fallback.visible=false;root.updateMatrixWorld(true);
 },undefined,error=>{console.warn('Không tải được Vsmart Aris GLB, giữ envelope fallback.',error)});

 // Camera direction/FOV are inspection aids only. They stay available in the
 // Advanced design view, but are hidden on the installed rig in Drive mode.
 // Position follows the supplied model's main rear camera after landscape rotation.
 const aids=new T.Group();stages[4].add(aids);
 const sight=new T.ArrowHelper(new T.Vector3(0,0,1),new T.Vector3(1.49,3.10,.31),2.3,0x487b9a,.25,.14);aids.add(sight);
 const lines:number[]=[];const eye=[1.49,3.10,.31],corners=[[-.7,2.35,2.6],[3.55,2.35,2.6],[3.55,3.95,2.6],[-.7,3.95,2.6]];
 corners.forEach((p,i)=>lines.push(...eye,...p,...p,...corners[(i+1)%4]));
 const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(lines,3));geometries.push(fg);const fm=new T.LineBasicMaterial({color:0x8aa7b9,transparent:true,opacity:.45});materials.push(fm);aids.add(new T.LineSegments(fg,fm));
 return {
  root,
  update(step:number,exploded:boolean){stages.forEach((g,i)=>{g.visible=i<=step;g.position.y=(i===4?.1:0)+(exploded?i*.85:0)});root.updateMatrixWorld(true)},
  setAids(visible:boolean){aids.visible=visible},
  dispose(){cancelled=true;instances.forEach(m=>m.dispose());sight.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());importedGeometries.forEach(g=>g.dispose());importedMaterials.forEach(m=>m.dispose());importedTextures.forEach(t=>t.dispose())}
 };
}
