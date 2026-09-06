import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {MeshoptSimplifier} from 'meshoptimizer';
await MeshoptSimplifier.ready;
import * as THREE from 'three';
import {LDrawConditionalLineMaterial} from 'three/addons/materials/LDrawConditionalLineMaterial.js';
import {LDrawLoader} from 'three/addons/loaders/LDrawLoader.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
const library=process.argv[2];if(!library)throw Error('Pass extracted LDraw library directory');
globalThis.ProgressEvent=class{constructor(type,values){this.type=type;Object.assign(this,values)}};
const lookup=new Map();async function index(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await index(p);else lookup.set(path.relative(library,p).toLowerCase().replaceAll('\\','/'),p)}}await index(library);
const usedFiles=new Set();const originalFetch=globalThis.fetch;globalThis.fetch=async(request,options)=>{const u=typeof request==='string'?request:request.url;if(!u.startsWith('http://ldraw.local/'))return originalFetch(request,options);const key=decodeURIComponent(u.slice('http://ldraw.local/'.length)).toLowerCase();const file=lookup.get(key);if(!file)return new Response('Not found',{status:404});usedFiles.add(file);return new Response(await fs.readFile(file),{headers:{'Content-Type':'text/plain'}})};
const loader=new LDrawLoader();loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);loader.setPartsLibraryPath('http://ldraw.local/');await loader.preloadMaterials('http://ldraw.local/LDConfig.ldr');
let mpd=await fs.readFile('scripts/source/porsche.mpd','utf8');
const embeddedNames=[...mpd.matchAll(/^0 FILE (.+)\r?$/gm)].map(m=>m[1].trim()).filter(n=>/[\\/]/.test(n));
for(const n of embeddedNames.sort((a,b)=>b.length-a.length))mpd=mpd.replaceAll(n,n.replaceAll('\\','_').replaceAll('/','_'));

const model=await new Promise((resolve,reject)=>loader.parse(mpd,resolve,reject));
model.updateMatrixWorld(true);

let groupCount=0,meshes=0;const types={};model.traverse(x=>{if(x.isGroup){groupCount++;types[x.userData.type]=(types[x.userData.type]??0)+1}if(x.isMesh)meshes++});console.log('PARSED',groupCount,meshes,types,model.userData);
const parts=[],geoMeta=[],geometries=[],geoCache=new Map(),steps=[],groupIds=new Map();
const rawFiles={};let rawName='';for(const l of mpd.split(/\r?\n/)){if(l.startsWith('0 FILE ')){rawName=l.slice(7).replaceAll('\\','/').toLowerCase();rawFiles[rawName]=[]}else if(rawName)rawFiles[rawName].push(l)}
const atomic=(g)=>g.isGroup&&((g.userData.fileName??g.name??'').toLowerCase().endsWith('.dat')||/^(?:Unofficial_)?Part$/.test(g.userData.type??'')||/shock-|technicrib|technicflex/i.test(g.name));
let phase=0;
function groupFor(name){const n=name.toLowerCase();if(/engine/.test(n))return 'engine';if(/frontaxle|steering|shocksupport|shock-/.test(n))return 'suspension';if(/seat|dashboard/.test(n))return 'cockpit';if(/door/.test(n))return 'doors';if(/roof/.test(n))return 'roof';if(/spoiler|rearbump/.test(n))return 'rear';if(/front|hood|headlight/.test(n))return 'front';return 'chassis'}
const reflect=new THREE.Matrix4().makeRotationX(Math.PI);
const dirnames={chassis:'Khung & kết nối',engine:'Động cơ boxer',suspension:'Hệ treo & tay lái',cockpit:'Khoang lái',doors:'Cửa xe',roof:'Mui & thân trên',rear:'Đuôi & cánh gió',front:'Đầu xe',wheels:'Bánh xe'};
function extractPart(g,group,step){
 const name=g.userData.fileName||g.name;const inv=g.matrixWorld.clone().invert();let color=String(g.userData.colorCode??'16');const key=name+'|'+color;
 let geo=geoCache.get(key);if(geo===undefined){
  const chunks=[];const colors=[];
  g.traverse(m=>{if(!m.isMesh||!m.geometry.attributes.position)return;const a=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();a.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,m.matrixWorld));const mats=Array.isArray(m.material)?m.material:[m.material];const count=a.attributes.position.count;const c=new Float32Array(count*3);const runs=a.groups.length?a.groups:[{start:0,count,materialIndex:0}];for(const r of runs){const mat=mats[r.materialIndex??0]??mats[0];for(let v=r.start;v<Math.min(r.start+r.count,count);v++){c[v*3]=mat.color.r;c[v*3+1]=mat.color.g;c[v*3+2]=mat.color.b}}a.setAttribute('color',new THREE.BufferAttribute(c,3));a.clearGroups();for(const k of Object.keys(a.attributes))if(!['position','normal','color'].includes(k))a.deleteAttribute(k);if(!a.attributes.normal)a.computeVertexNormals();chunks.push(a)});
  if(!chunks.length)throw Error('No faces for '+name);
  const merged=mergeVertices(mergeGeometries(chunks),0.001);chunks.forEach(x=>x.dispose());geo=geometries.length;geoCache.set(key,geo);geometries.push(merged);
  merged.computeBoundingBox();const box=merged.boundingBox;const c=merged.attributes.color;const sample=new THREE.Color(c.getX(0),c.getY(0),c.getZ(0));const desc=(rawFiles[name?.toLowerCase()]??[]).find(l=>l.startsWith('0 ')&&!/^0 (FILE|Name:|Author:|!)/.test(l))?.slice(2)||name;
  geoMeta.push({name,description:desc,colorHex:'#'+sample.getHexString(),bounds:[box.min.toArray(),box.max.toArray()]});
 }
 if(/(56908|15038|56145|44777|44771|6595)\.dat$/i.test(name))group='wheels';
 const matrix=new THREE.Matrix4().multiplyMatrices(reflect,g.matrixWorld);
 const part={id:parts.length,geo,group,step,matrix:matrix.toArray()};parts.push(part);return part;
}
function walk(g,parentGroup='chassis'){
 const group=groupFor(g.name);const currentGroup=group==='chassis'?parentGroup:group;
 let direct=[];
 function flush(){if(direct.length){phase++;for(const p of direct)p.step=phase;steps.push({step:phase,group:currentGroup,parts:direct.map(p=>p.id),name:g.name.replace(/^42096 - /,'').replace(/\.ldr$/,'')});direct=[]}}
 for(const child of g.children){
  if(!child.isGroup)continue;
  if(child.userData.startingBuildingStep)flush();
  if(atomic(child))direct.push(extractPart(child,currentGroup,0));
  else{flush();walk(child,currentGroup)}
 }
 flush();
}
walk(model);
if(parts.length<1500)throw Error('Suspicious part count '+parts.length);
const bounds=new THREE.Box3();parts.forEach(p=>{const b=geometries[p.geo].boundingBox.clone().applyMatrix4(new THREE.Matrix4().fromArray(p.matrix));bounds.union(b)});
const center=bounds.getCenter(new THREE.Vector3());const scale=1/100;for(const p of parts){p.matrix[12]=(p.matrix[12]-center.x)*scale;p.matrix[13]=(p.matrix[13]-center.y)*scale;p.matrix[14]=(p.matrix[14]-center.z)*scale;for(const j of [0,1,2,4,5,6,8,9,10])p.matrix[j]*=scale}
let offset=0;const buffers=[];for(let i=0;i<geometries.length;i++){const g=geometries[i];const desc=geoMeta[i];for(const key of ['position','normal','color']){const ar=new Float32Array(g.attributes[key].array);desc[key]={offset,count:ar.length};const b=Buffer.from(ar.buffer);buffers.push(b);offset+=b.length}const index=new Uint32Array(g.index.array);desc.index={offset,count:index.length};const b=Buffer.from(index.buffer);buffers.push(b);offset+=b.length;const [low,err]=MeshoptSimplifier.simplify(index,g.attributes.position.array,3,Math.max(3,Math.floor(index.length*.42/3)*3),.008);desc.indexLow={offset,count:low.length,error:err};const lb=Buffer.from(low.buffer,low.byteOffset,low.byteLength);buffers.push(lb);offset+=lb.length}
const groups=Object.entries(dirnames).map(([id,label])=>({id,label,count:parts.filter(p=>p.group===id).length})).filter(g=>g.count);
for(const info of geoMeta){const p=lookup.get('parts/'+info.name.toLowerCase());if(p){const content=await fs.readFile(p,'utf8');info.description=content.split(/\r?\n/)[0].replace(/^0 /,'')}}
const out={partCount:parts.length,phaseCount:phase,geometries:geoMeta,parts,steps,groups,bounds:bounds.getSize(new THREE.Vector3()).multiplyScalar(scale).toArray(),source:{author:'Philippe Hurbain (Philo)',url:'https://forums.ldraw.org/thread-23139.html',license:'CC BY 2.0',notes:'Mô hình không có đầy đủ sticker. Các pha 3D theo MPD, chưa ánh xạ 1:1 với 503 bước PDF.'}};
await fs.mkdir('public/model',{recursive:true});await fs.writeFile('public/model/model.json',JSON.stringify(out));await fs.writeFile('public/model/geometry.bin.gz',gzipSync(Buffer.concat(buffers),{level:9}));
console.log('DONE',parts.length,phase,geometries.length,offset,groups);

const credits=[];for(const file of [...usedFiles].sort()){const content=await fs.readFile(file,'utf8');credits.push(path.relative(library,file)+'\n'+content.split(/\r?\n/).filter(l=>/^0 (Author:|!LICENSE|Name:)/.test(l)).join('\n'))}await fs.writeFile('public/ldraw-part-credits.txt',credits.join('\n\n'));for(const file of ['CAreadme.txt','CAlicense.txt','CAlicense4.txt'])await fs.copyFile(path.join(library,file),'public/'+file);
