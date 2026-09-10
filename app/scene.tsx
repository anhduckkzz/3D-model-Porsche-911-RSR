'use client';
import {forwardRef,useEffect,useImperativeHandle,useRef,useState,type RefObject} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createFlatLayout,groupOffsets,sampleLegacyExplosion,advanceExplosion,insertionOffset,type PiecePose,FLAT_ROTATION} from './explosion-layout';
import {assemblyFrame} from './assembly-guide';
import {advanceDrive,restingDrive} from './drive-motion';
import {createPhoneMount} from './phone-mount';
import type {VehicleState} from './vehicle-link';
import type {ModelData,Part,ViewerMode} from './model-types';

export type SceneHandle={fit:()=>void;view:(v:'iso'|'top'|'side')=>void;focus:()=>void};
type Props={drive:VehicleState;mountStep:number;mountContext:boolean;step:number;explode:number;group:string;selected:number|null;mode:ViewerMode;replay:number;followStep:boolean;bench:boolean;onExplosionSplit:(n:number)=>void;onReady:(d:ModelData)=>void;onSelect:(id:number|null)=>void;previewHost:RefObject<HTMLDivElement|null>};
type Batch={mesh:T.InstancedMesh;parts:Part[];ids:number[];styles:T.InstancedBufferAttribute};
type Motion={part:Part;from:PiecePose;to:PiecePose;delay:number};
const ISO=new T.Vector3(1,.63,1).normalize();
const smooth=(t:number)=>t*t*(3-2*t);
function pose(matrix:T.Matrix4):PiecePose{const position=new T.Vector3(),quaternion=new T.Quaternion(),scale=new T.Vector3();matrix.decompose(position,quaternion,scale);return {position,quaternion,scale,center:position.clone()}}
function clonePose(p:PiecePose):PiecePose{return {position:p.position.clone(),quaternion:p.quaternion.clone(),scale:p.scale.clone(),center:p.center.clone()}}

const Scene=forwardRef<SceneHandle,Props>(function Scene(props,ref){
 const wake=useRef<(()=>void)|null>(null);
 const host=useRef<HTMLDivElement>(null),latest=useRef(props),api=useRef<SceneHandle|null>(null),apply=useRef<(()=>void)|null>(null);
 const [status,setStatus]=useState('Đang tải mô hình…'),[error,setError]=useState(false);latest.current=props;
 useImperativeHandle(ref,()=>({fit:()=>api.current?.fit(),view:v=>api.current?.view(v),focus:()=>api.current?.focus()}),[]);
 useEffect(()=>{apply.current?.()},[props.step,props.explode,props.group,props.selected,props.mode,props.replay,props.followStep,props.bench,props.mountStep,props.mountContext]);
 useEffect(()=>{wake.current?.()},[props.drive]);
 useEffect(()=>{
  const el=host.current!;let disposed=false,ready=false,raf=0,worker:Worker|undefined,renderer:T.WebGLRenderer|undefined,controls:OrbitControls|undefined,resize:ResizeObserver|undefined,previewResize:ResizeObserver|undefined;
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-10,10,10,-10,.01,2000),previewScene=new T.Scene(),previewCamera=new T.OrthographicCamera(-3,3,3,-3,.01,100);
  let previewRenderer:T.WebGLRenderer|undefined,previewControls:OrbitControls|undefined,previewKey='',previewDirty=true;
  const vehicle=new T.Group();scene.add(vehicle);let mount:ReturnType<typeof createPhoneMount>|undefined,driveMount:ReturnType<typeof createPhoneMount>|undefined;
  const drivetrain=restingDrive();let wheelRadius=.86,wheelbase=6.4,roadHeight=-2.08;
  const road=new T.GridHelper(24,24,0xb4c4ce,0xd9e1e6);road.position.y=-2.08;road.visible=false;scene.add(road);
  let roadOffset=0,driveYaw=0,wheelAngle=0;
  const driveForward=new T.Vector3(0,0,1),driveRight=new T.Vector3(1,0,0),driveCamera=new T.Vector3(0,.48,-1).normalize();
  let driveWheels:Part[]=[],frontWheelIds=new Set<number>();
  const previewGroup=new T.Group(),arrows=new T.Group();previewScene.add(previewGroup);scene.add(arrows);
  let model:ModelData,geometries:T.BufferGeometry[]=[],lowIndices:T.BufferAttribute[]=[],highIndices:T.BufferAttribute[]=[],batches:Batch[]=[],current:PiecePose[]=[],base:PiecePose[]=[],destinations:PiecePose[]=[],visible:Part[]=[],layout:ReturnType<typeof createFlatLayout>|undefined;
  const slots=new Map<number,{batch:Batch;index:number}>(),mats:T.Material[]=[],cleanups:(()=>void)[]=[];let environment:T.WebGLRenderTarget|undefined;
  let motions:Motion[]=[],motionStart=0,motionDuration=900,lastKey='',lastSelection:number|null=null,lastMode:ViewerMode='explore',lastStep=-1,lastReplay=0,lastBench=true,layoutKey='',flat=false,span=12,aspect=1,lowDetail=window.innerWidth<768,pixelRatio=Math.min(devicePixelRatio,1.7),dirty=true;
  let amount=0,explosionTarget=0,buildFrame:ReturnType<typeof assemblyFrame>|undefined;
  let cameraMotion:{start:number;fromTarget:T.Vector3;toTarget:T.Vector3;fromDir:T.Vector3;toDir:T.Vector3;fromSpan:number;toSpan:number}|null=null;
  const marker=new T.Box3Helper(new T.Box3(),0x47749b);marker.visible=false;scene.add(marker);
  const matrix=new T.Matrix4(),position=new T.Vector3(),quaternion=new T.Quaternion(),scale=new T.Vector3();
  let lastFrame=0,slowTime=0,samples:number[]=[];
  function request(){dirty=true;if(!raf&&!disposed&&!document.hidden)raf=requestAnimationFrame(frame)}
  wake.current=request;
  function configureCamera(){camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix()}
  function write(p:Part,ps:PiecePose){const slot=slots.get(p.id);if(!slot)return;matrix.compose(ps.position,ps.quaternion,ps.scale);slot.batch.mesh.setMatrixAt(slot.index,matrix);slot.batch.mesh.instanceMatrix.needsUpdate=true;if(!current[p.id])current[p.id]=clonePose(ps);else{current[p.id].position.copy(ps.position);current[p.id].quaternion.copy(ps.quaternion);current[p.id].scale.copy(ps.scale);current[p.id].center.copy(ps.center)}}
  function boundsFor(parts:Part[],poses=destinations){const bounds=new T.Box3();for(const p of parts){const ps=poses[p.id];if(!ps)continue;matrix.compose(ps.position,ps.quaternion,ps.scale);bounds.union(geometries[p.geo].boundingBox!.clone().applyMatrix4(matrix))}return bounds}
  function viewport(){const narrow=el.clientWidth<700,building=latest.current.mode!=='explore';const left=narrow?24:36,right=latest.current.mode==='advanced'&&!narrow?420:building&&!narrow?320:36,top=narrow?(latest.current.mode==='advanced'?250:190):(latest.current.mode==='advanced'?280:105),bottom=narrow?(latest.current.mode==='advanced'?Math.max(210,el.clientHeight*.34+35):building?350:165):(latest.current.mode==='advanced'?100:175);return {left,right,top,bottom,width:Math.max(120,el.clientWidth-left-right),height:Math.max(120,el.clientHeight-top-bottom)}}
  function availableAspect(){const area=viewport();return area.width/area.height}
  function fitBounds(bounds:T.Box3,direction:T.Vector3,instant=false){
   if(!controls||bounds.isEmpty())return;
   const center=bounds.getCenter(new T.Vector3()),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize(),up=new T.Vector3().crossVectors(direction,right).normalize();if(right.lengthSq()<.01){right.set(1,0,0);up.set(0,0,-1)}
   let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(let n=0;n<8;n++){const v=new T.Vector3(n&1?bounds.max.x:bounds.min.x,n&2?bounds.max.y:bounds.min.y,n&4?bounds.max.z:bounds.min.z).sub(center);const x=v.dot(right),y=v.dot(up);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
   const area=viewport();const nextSpan=Math.max(.6,(maxY-minY)*el.clientHeight/area.height,(maxX-minX)*el.clientHeight/area.width)*1.12;
   center.addScaledVector(right,(area.right-area.left)*nextSpan/el.clientHeight/2);
   center.addScaledVector(up,-(area.bottom-area.top)*nextSpan/el.clientHeight/2);
   const oldDirection=camera.position.clone().sub(controls.target).normalize();const oldSpan=span/camera.zoom;camera.zoom=1;
   if(instant||matchMedia('(prefers-reduced-motion: reduce)').matches){span=nextSpan;configureCamera();controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,250);camera.lookAt(center);controls.update();cameraMotion=null}
   else cameraMotion={start:performance.now(),fromTarget:controls.target.clone(),toTarget:center,fromDir:oldDirection,toDir:direction,fromSpan:oldSpan,toSpan:nextSpan};request();
  }
  function autoFit(instant=false){
   if(!ready||!controls)return;let focus=visible;const s=latest.current;
   if(s.mode==='build'&&buildFrame)focus=visible.filter(p=>buildFrame!.visible.has(p.id));
   let bounds=boundsFor(focus);if(bounds.isEmpty())bounds=new T.Box3(new T.Vector3(-2,-1,-2),new T.Vector3(2,1,2));
   if(s.mode==='build')bounds.expandByScalar(.55);
   if(s.mode==='advanced'){bounds=new T.Box3().setFromObject(mount!.root);if(s.mountContext)bounds.union(boundsFor(visible))}
   if(s.mode==='drive'){if(driveMount)bounds.union(new T.Box3().setFromObject(driveMount.root));bounds.expandByScalar(.9)}
   fitBounds(bounds,s.mode==='drive'?driveCamera:(flat?new T.Vector3(0,0,1):ISO),instant);
  }
  function stylePieces(){
   const s=latest.current;for(const b of batches){for(let j=0;j<b.ids.length;j++){const p=model.parts[b.ids[j]];b.styles.setX(j,p.id===s.selected?2:s.mode==='build'&&buildFrame?.fresh.has(p.id)?1:s.mode==='build'&&!buildFrame?.visible.has(p.id)?3:0)}b.styles.needsUpdate=true}
   if(s.selected!==null&&slots.has(s.selected)){const p=model.parts[s.selected],ps=current[p.id];matrix.compose(ps.position,ps.quaternion,ps.scale);marker.box.copy(geometries[p.geo].boundingBox!).applyMatrix4(matrix);marker.visible=true}else marker.visible=false;
  }
  function clearArrows(){for(const child of [...arrows.children]){arrows.remove(child);if(child instanceof T.ArrowHelper)child.dispose()}}
  function rebuildPreview(){
   const s=latest.current;const ids=s.mode==='build'?(buildFrame?.event.parts??[]):s.selected!==null?[s.selected]:[];const unique=[...new Set(ids.map(id=>model.parts[id].geo))];
   const attachment=s.mode==='build'&&buildFrame?.event.kind==='attach';const key=s.mode+':'+(attachment?s.step:unique.join(','));const host=s.previewHost.current;if(!host)return;
   if(!previewRenderer){try{previewRenderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});previewRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));previewRenderer.setClearColor(0xf6f7f8);previewRenderer.outputColorSpace=T.SRGBColorSpace;previewRenderer.toneMapping=T.ACESFilmicToneMapping;previewRenderer.toneMappingExposure=1.1;host.appendChild(previewRenderer.domElement);previewRenderer.domElement.setAttribute('aria-label','Các mảnh cần dùng trong bước này, xem trong không gian 3D');previewControls=new OrbitControls(previewCamera,previewRenderer.domElement);previewControls.enablePan=false;previewControls.enableDamping=false;previewControls.minZoom=.6;previewControls.maxZoom=5;previewControls.addEventListener('change',()=>{previewDirty=true;request()});previewScene.add(new T.HemisphereLight(0xffffff,0x9ca5ad,2));const light=new T.DirectionalLight(0xffffff,2);light.position.set(4,8,5);previewScene.add(light);previewResize=new ResizeObserver(()=>{previewDirty=true;previewKey='';rebuildPreview();request()});previewResize.observe(host)}catch{return}}
   if(previewRenderer.domElement.parentElement!==host){host.appendChild(previewRenderer.domElement);previewResize?.disconnect();previewResize?.observe(host);previewKey=''}
   if(key===previewKey)return;previewKey=key;previewGroup.clear();
   const columns=Math.max(1,Math.ceil(Math.sqrt(unique.length*1.7))),rows=Math.ceil(unique.length/columns);
   if(attachment){
    const box=boundsFor(ids.map(id=>model.parts[id]),base),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),factor=2.8/Math.max(size.x,size.y,size.z,.1);
    for(const id of ids){const p=model.parts[id],ps=base[id],mesh=new T.Mesh(geometries[p.geo],previewMaterial);mesh.position.copy(ps.position).sub(center).multiplyScalar(factor);mesh.quaternion.copy(ps.quaternion);mesh.scale.copy(ps.scale).multiplyScalar(factor);previewGroup.add(mesh)}
   }else{
   unique.forEach((geo,n)=>{const mesh=new T.Mesh(geometries[geo],previewMaterial);const bounds=geometries[geo].boundingBox!,center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());const factor=1.25/Math.max(size.x,size.y,size.z,.1);mesh.quaternion.copy(FLAT_ROTATION);mesh.scale.setScalar(factor);mesh.position.copy(center.multiplyScalar(-factor).applyQuaternion(FLAT_ROTATION)).add(new T.Vector3((n%columns-(columns-1)/2)*1.65,((rows-1)/2-Math.floor(n/columns))*1.65,0));previewGroup.add(mesh)});
   }
   const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight),a=w/h;const half=Math.max(attachment?3:rows*1.65,attachment?3/a:columns*1.65/a,2)/2*1.12;previewCamera.left=-half*a;previewCamera.right=half*a;previewCamera.top=half;previewCamera.bottom=-half;previewCamera.zoom=1;previewCamera.position.set(0,0,20);previewCamera.lookAt(0,0,0);previewCamera.updateProjectionMatrix();previewControls?.target.set(0,0,0);previewControls?.update();previewRenderer.setSize(w,h,false);previewDirty=true;
  }
  const previewMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.36,metalness:.04,side:T.DoubleSide});mats.push(previewMaterial);
  function updateState(){
   if(!ready)return;const s=latest.current;const extent=s.mode==='explore'?s.explode:0;
   const key=[s.mode,s.step,s.group,extent.toFixed(4),s.replay,s.followStep,s.bench,s.mountStep,s.mountContext,aspect.toFixed(3)].join(':');
   if(key===lastKey){stylePieces();rebuildPreview();request();return}
   const modeChanged=s.mode!==lastMode,contextChanged=s.bench!==lastBench;const enteringBuild=s.mode==='build'&&lastMode!=='build';const animateBuild=s.mode==='build'&&(s.step!==lastStep||s.replay!==lastReplay||enteringBuild);
   lastKey=key;lastMode=s.mode;lastStep=s.step;lastReplay=s.replay;lastBench=s.bench;
   road.visible=s.mode==='drive';
   mount!.root.visible=s.mode==='advanced';mount!.update(s.mountStep);mount!.setContext(s.mountContext);
   driveMount!.root.visible=s.mode==='drive'&&!!driveMount!.audit?.ok;driveMount!.update(4);driveMount!.setAids(false);
   vehicle.visible=s.mode!=='advanced'||s.mountContext;
   if(s.mode!=='drive'){vehicle.position.set(0,0,0);vehicle.rotation.set(0,0,0);driveYaw=0;roadOffset=0;Object.assign(drivetrain,restingDrive());road.rotation.y=0;road.position.x=0;road.position.z=0}
   if(controls)controls.enabled=s.mode!=='drive';
   const previousVisible=new Set(slots.keys());buildFrame=s.mode==='build'?assemblyFrame(model.assembly,s.step):undefined;
   visible=model.parts.filter(p=>buildFrame?(buildFrame.visible.has(p.id)||(!s.bench&&buildFrame.context.has(p.id))):(s.mode==='advanced'||s.mode==='drive'||s.group==='all'||p.group===s.group));
   destinations=base.map(clonePose);
   if(s.mode==='explore'){
    const nextKey=s.group+':'+availableAspect().toFixed(3);
    const offsets=groupOffsets(model);
    if(!layout||nextKey!==layoutKey){layout=createFlatLayout(visible,model,availableAspect());layoutKey=nextKey;latest.current.onExplosionSplit(.4)}
    explosionTarget=extent;if(matchMedia('(prefers-reduced-motion: reduce)').matches)amount=extent;
    for(const p of visible){const goal=layout.poses.get(p.id);if(goal)sampleLegacyExplosion(base[p.id],goal,offsets.get(p.group)??new T.Vector3(),amount,destinations[p.id])}
   }else {amount=0;explosionTarget=0}
   if(buildFrame&&s.bench){const center=boundsFor(model.assembly.nodes[buildFrame.node.id].parts.map(id=>model.parts[id]),base).getCenter(new T.Vector3());for(const p of visible){destinations[p.id].position.sub(center);destinations[p.id].center.sub(center)}}
   slots.clear();const visibleIds=new Set(visible.map(p=>p.id));for(const b of batches){b.ids=[];for(const p of b.parts){if(!visibleIds.has(p.id))continue;slots.set(p.id,{batch:b,index:b.ids.length});b.ids.push(p.id)}b.mesh.count=b.ids.length}
   motions=[];clearArrows();let newIndex=0;
   for(const p of visible){const to=destinations[p.id],from=current[p.id]?clonePose(current[p.id]):clonePose(to);const fresh=s.mode==='build'&&!!buildFrame?.fresh.has(p.id)&&animateBuild;
    if(fresh){const offset=buildFrame?.event.kind==='attach'?new T.Vector3(0,2.5,1.5):insertionOffset(p,model);from.position.copy(to.position).add(offset);from.quaternion.copy(to.quaternion);if(buildFrame?.event.kind==='attach'?newIndex===0:newIndex<18){const localCenter=new T.Vector3().fromArray(model.geometries[p.geo].bounds[0]).add(new T.Vector3().fromArray(model.geometries[p.geo].bounds[1])).multiplyScalar(.5);const end=localCenter.multiply(to.scale).applyQuaternion(to.quaternion).add(to.position);const arrow=new T.ArrowHelper(offset.clone().normalize().negate(),end.clone().add(offset),offset.length()*.8,0xb95426,.16,.075);arrows.add(arrow)}newIndex++}
    else if(s.mode!=='build'||!previousVisible.has(p.id)||enteringBuild||s.bench)Object.assign(from,clonePose(to));
    write(p,from);
    const needsMotion=from.position.distanceToSquared(to.position)>1e-8||Math.abs(from.quaternion.dot(to.quaternion))<.999999;
    if(s.mode==='explore'){if(Math.abs(amount-explosionTarget)<=1e-7)write(p,to)}
    else if(needsMotion)motions.push({part:p,from,to,delay:0});else write(p,to);
   }
   motionStart=performance.now();motionDuration=s.mode==='build'?1100:700;if(matchMedia('(prefers-reduced-motion: reduce)').matches){for(const p of visible)write(p,destinations[p.id]);motions=[];arrows.visible=false}else arrows.visible=s.mode==='build'&&motions.length>0;
   for(const b of batches)b.mesh.computeBoundingSphere();stylePieces();
   flat=s.mode==='explore'&&amount>.92;if(controls){controls.enableRotate=!flat;controls.mouseButtons.LEFT=flat?T.MOUSE.PAN:T.MOUSE.ROTATE;controls.touches.ONE=flat?T.TOUCH.PAN:T.TOUCH.ROTATE}
   if(s.mode!=='explore'&&(s.followStep||modeChanged||contextChanged||s.mode==='advanced'))autoFit();else if(s.mode==='explore'&&amount===explosionTarget)fitBounds(boundsFor(visible),amount>.92?new T.Vector3(0,0,1):ISO,true);rebuildPreview();request();
  }
  function frame(now:number){
   raf=0;if(disposed||!renderer||!controls||document.hidden)return;
   const delta=lastFrame?now-lastFrame:0;lastFrame=now;
   const ds=latest.current.drive,driving=latest.current.mode==='drive';
   let driveMoving=false;
   if(driving){
    const active=ds.connected&&ds.armed,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dt=Math.min(delta||16,50)/1000;
    driveMoving=advanceDrive(drivetrain,ds.fb,ds.lr,dt,wheelRadius,wheelbase,active&&!reduced);
    if(!active||reduced){drivetrain.speed=0;drivetrain.steer=0;driveMoving=false}
    // Chase camera holds the chassis steady. Only wheels steer at rest.
    vehicle.rotation.set(0,0,0);vehicle.position.set(0,0,0);
    roadOffset=drivetrain.distance%1;road.rotation.y=-drivetrain.heading;
    road.position.copy(driveForward).multiplyScalar(-roadOffset);road.position.y=roadHeight;
    const steerQ=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),drivetrain.steer);
    const rollQ=new T.Quaternion().setFromAxisAngle(driveRight,drivetrain.roll);
    for(const p of driveWheels){
     const ps=clonePose(base[p.id]);ps.quaternion.premultiply(rollQ);
     if(frontWheelIds.has(p.id))ps.quaternion.premultiply(steerQ);
     write(p,ps);
    }
    // Refresh culling bounds only for the wheel batches (eight instances).
    const changed=new Set<Batch>();for(const p of driveWheels){const slot=slots.get(p.id);if(slot)changed.add(slot.batch)}
    for(const b of changed)b.mesh.computeBoundingSphere();
    dirty=true;
   }
   const exploring=latest.current.mode==='explore'&&Math.abs(amount-explosionTarget)>1e-7;
   if(exploring){
    amount=advanceExplosion(amount,explosionTarget,delta?delta/1000:1/60);
    const offsets=groupOffsets(model);
    for(const p of visible){const goal=layout?.poses.get(p.id);if(goal){sampleLegacyExplosion(base[p.id],goal,offsets.get(p.group)??new T.Vector3(),amount,destinations[p.id]);write(p,destinations[p.id])}}
    for(const b of batches)b.mesh.computeBoundingSphere();
    const direction=ISO.clone().lerp(new T.Vector3(0,0,1),Math.max(0,Math.min(1,(amount-.4)/.6))).normalize();
    fitBounds(boundsFor(visible),direction,true);flat=amount>.92;controls.enableRotate=!flat;controls.mouseButtons.LEFT=flat?T.MOUSE.PAN:T.MOUSE.ROTATE;controls.touches.ONE=flat?T.TOUCH.PAN:T.TOUCH.ROTATE;stylePieces();dirty=true;
   }
   if(motions.length){const elapsed=Math.min(1,(now-motionStart)/motionDuration);const changed=new Set<Batch>();for(const m of motions){const t=smooth(Math.max(0,Math.min(1,(elapsed-m.delay)/(1-m.delay))));position.copy(m.from.position).lerp(m.to.position,t);quaternion.copy(m.from.quaternion).slerp(m.to.quaternion,t);scale.copy(m.from.scale).lerp(m.to.scale,t);write(m.part,{position,quaternion,scale,center:position});const slot=slots.get(m.part.id);if(slot)changed.add(slot.batch)}for(const b of changed)b.mesh.computeBoundingSphere();if(elapsed>=1){motions=[];arrows.visible=false}stylePieces();dirty=true}
   if(cameraMotion){const a=smooth(Math.min(1,(now-cameraMotion.start)/700));span=T.MathUtils.lerp(cameraMotion.fromSpan,cameraMotion.toSpan,a);configureCamera();controls.target.copy(cameraMotion.fromTarget).lerp(cameraMotion.toTarget,a);const direction=cameraMotion.fromDir.clone().lerp(cameraMotion.toDir,a).normalize();camera.position.copy(controls.target).addScaledVector(direction,250);camera.lookAt(controls.target);if(a>=1)cameraMotion=null;dirty=true}
   const moving=controls.update();if(dirty||moving){renderer.render(scene,camera);dirty=false;if(delta>0&&delta<120){samples.push(delta);if(samples.length>=45){const avg=samples.reduce((a,b)=>a+b,0)/samples.length;samples=[];if(avg>23){slowTime++;if(slowTime>=2){if(!lowDetail){lowDetail=true;geometries.forEach((g,i)=>g.setIndex(lowIndices[i]));previewDirty=true}else if(pixelRatio>.8){pixelRatio=Math.max(.8,pixelRatio*.8);renderer.setPixelRatio(pixelRatio);renderer.setSize(el.clientWidth,el.clientHeight,false)}slowTime=0;dirty=true}}else slowTime=0}}}
   if(previewDirty&&previewRenderer&&latest.current.previewHost.current?.offsetParent!==null){previewRenderer.render(previewScene,previewCamera);previewDirty=false}
   if(driveMoving||exploring||motions.length||cameraMotion||moving||dirty)request();else lastFrame=0;
  }
  async function start(){try{
   renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setClearColor(0xf1f3f4);renderer.setPixelRatio(pixelRatio);renderer.setSize(el.clientWidth,el.clientHeight,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;el.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Porsche 911 RSR tương tác. Kéo để xoay, cuộn để zoom, chạm để chọn mảnh.');renderer.domElement.tabIndex=0;
   aspect=el.clientWidth/Math.max(1,el.clientHeight);configureCamera();camera.position.copy(ISO).multiplyScalar(250);camera.lookAt(0,0,0);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.1;controls.minZoom=.35;controls.maxZoom=90;controls.maxPolarAngle=Math.PI*.97;controls.addEventListener('change',request);controls.addEventListener('start',()=>{cameraMotion=null});
   const generator=new T.PMREMGenerator(renderer),room=new RoomEnvironment();environment=generator.fromScene(room,.04);scene.environment=environment.texture;room.dispose();generator.dispose();scene.add(new T.HemisphereLight(0xffffff,0x969da6,1.5));const key=new T.DirectionalLight(0xffffff,2.1);key.position.set(-4,10,6);scene.add(key);const fill=new T.DirectionalLight(0xffffff,1);fill.position.set(7,4,-7);scene.add(fill);
   const loaded=await new Promise<{model:ModelData;buffer:ArrayBuffer}>((resolve,reject)=>{worker=new Worker('/model-worker.js');worker.onmessage=e=>{if(e.data.error)reject(new Error(e.data.error));else resolve(e.data);worker?.terminate()};worker.onerror=()=>reject(new Error('Không tải được mô hình.'));worker.postMessage({load:true})});if(disposed)return;model=loaded.model;const binary=loaded.buffer;setStatus('Chuẩn bị cảnh 3D…');
   for(const info of model.geometries){const g=new T.BufferGeometry();for(const k of ['position','normal','color'] as const){const a=info[k];g.setAttribute(k,new T.BufferAttribute(new Float32Array(binary,a.offset,a.count),3))}const hi=new T.BufferAttribute(new Uint32Array(binary,info.index.offset,info.index.count),1),lo=new T.BufferAttribute(new Uint32Array(binary,info.indexLow.offset,info.indexLow.count),1);highIndices.push(hi);lowIndices.push(lo);g.setIndex(lowDetail?lo:hi);g.computeBoundingBox();g.computeBoundingSphere();geometries.push(g)}
   mount=createPhoneMount(model,geometries);mount.root.visible=false;scene.add(mount.root);
   driveMount=createPhoneMount(model,geometries);driveMount.root.visible=false;driveMount.update(4);driveMount.setAids(false);vehicle.add(driveMount.root);
   const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.3,metalness:.03,side:T.DoubleSide});material.onBeforeCompile=shader=>{shader.vertexShader='attribute float pieceStyle; varying float vPieceStyle;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPieceStyle = pieceStyle;');shader.fragmentShader='varying float vPieceStyle;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif (vPieceStyle > 2.5) { diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.75,0.79,0.82), 0.9); } else if (vPieceStyle > 1.5) { diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12,0.34,0.64), 0.82); } else if (vPieceStyle > 0.5) { diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.85,0.24,0.065), 0.76); }')};mats.push(material);
   const byGeo=new Map<number,Part[]>();for(const p of model.parts){if(!byGeo.has(p.geo))byGeo.set(p.geo,[]);byGeo.get(p.geo)!.push(p);base[p.id]=pose(new T.Matrix4().fromArray(p.matrix));current[p.id]=clonePose(base[p.id])}

   // Infer longitudinal direction from authored front/rear assemblies rather
   // than assuming a model axis. This makes Drive always read as a chase view:
   // rear nearest the camera, nose pointing forward into the scene.
   const allBounds=boundsFor(model.parts,base),carCenter=allBounds.getCenter(new T.Vector3()),carSize=allBounds.getSize(new T.Vector3());
   const frontParts=model.parts.filter(p=>p.group==='front'),rearParts=model.parts.filter(p=>p.group==='rear');
   if(frontParts.length&&rearParts.length){const a=boundsFor(frontParts,base).getCenter(new T.Vector3()),b=boundsFor(rearParts,base).getCenter(new T.Vector3());driveForward.copy(a.sub(b));driveForward.y=0;if(driveForward.lengthSq()<.01)driveForward.set(0,0,1);else driveForward.normalize()}
   driveRight.set(driveForward.z,0,-driveForward.x).normalize();driveCamera.copy(driveForward).multiplyScalar(-1).add(new T.Vector3(0,.5,0)).normalize();
   roadHeight=allBounds.min.y-.012;road.position.y=roadHeight;
   const wheelCode=/(56908|15038|56145|44777|44771|6595)\.dat$/i;
   driveWheels=model.parts.filter(p=>p.group==='wheels'&&wheelCode.test(model.geometries[p.geo].name));
   frontWheelIds=new Set(driveWheels.filter(p=>base[p.id].position.clone().sub(carCenter).dot(driveForward)>0).map(p=>p.id));
   const tire=driveWheels.find(p=>model.geometries[p.geo].name==='44771.dat');if(tire){const bounds=geometries[tire.geo].boundingBox!;wheelRadius=Math.max(bounds.max.x-bounds.min.x,bounds.max.y-bounds.min.y)*.005}
   const frontAxle=driveWheels.filter(p=>frontWheelIds.has(p.id)),rearAxle=driveWheels.filter(p=>!frontWheelIds.has(p.id));if(frontAxle.length&&rearAxle.length)wheelbase=Math.abs(base[frontAxle[0].id].position.clone().sub(base[rearAxle[0].id].position).dot(driveForward));

   for(const [geo,parts] of byGeo){const styles=new T.InstancedBufferAttribute(new Float32Array(parts.length),1);styles.setUsage(T.DynamicDrawUsage);geometries[geo].setAttribute('pieceStyle',styles);const mesh=new T.InstancedMesh(geometries[geo],material,parts.length);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.count=0;vehicle.add(mesh);batches.push({mesh,parts,ids:[],styles})}
   ready=true;apply.current=updateState;api.current={fit:()=>autoFit(),view:v=>{if(latest.current.mode==='drive')return;const direction=flat?new T.Vector3(0,0,1):v==='top'?new T.Vector3(0,1,.001).normalize():v==='side'?new T.Vector3(1,.1,0).normalize():ISO;const bounds=latest.current.mode==='advanced'?new T.Box3().setFromObject(mount!.root):boundsFor(visible);if(latest.current.mode==='advanced'&&latest.current.mountContext)bounds.union(boundsFor(visible));fitBounds(bounds,direction)},focus:()=>{const p=model.parts[latest.current.selected??-1];if(p&&slots.has(p.id))fitBounds(boundsFor([p],current).expandByScalar(.15),flat?new T.Vector3(0,0,1):ISO)}};
   const ray=new T.Raycaster(),pointer=new T.Vector2(),pointers=new Set<number>();let sx=0,sy=0,multi=false,dragged=false;
   const down=(e:PointerEvent)=>{pointers.add(e.pointerId);if(pointers.size>1)multi=true;else{sx=e.clientX;sy=e.clientY;multi=false;dragged=false}};const move=(e:PointerEvent)=>{if(Math.hypot(e.clientX-sx,e.clientY-sy)>6)dragged=true};const cancel=(e:PointerEvent)=>{pointers.delete(e.pointerId);dragged=true};
   const up=(e:PointerEvent)=>{pointers.delete(e.pointerId);if((latest.current.mode==='drive'||latest.current.mode==='advanced')||multi||dragged||Math.hypot(e.clientX-sx,e.clientY-sy)>6||!renderer)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(batches.map(b=>b.mesh),false);if(hits[0]){const b=batches.find(b=>b.mesh===hits[0].object)!;latest.current.onSelect(b.ids[hits[0].instanceId!]);return}latest.current.onSelect(null)};
   for(const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel]] as const){renderer.domElement.addEventListener(name,fn);cleanups.push(()=>renderer?.domElement.removeEventListener(name,fn))}
   const lost=(e:Event)=>{e.preventDefault();setError(true);setStatus('Phiên 3D bị gián đoạn. Tải lại để tiếp tục.')};renderer.domElement.addEventListener('webglcontextlost',lost);cleanups.push(()=>renderer?.domElement.removeEventListener('webglcontextlost',lost));
   resize=new ResizeObserver(()=>{if(!renderer)return;aspect=el.clientWidth/Math.max(el.clientHeight,1);renderer.setSize(el.clientWidth,el.clientHeight,false);configureCamera();lastKey='';updateState()});resize.observe(el);
   const visibility=()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0}else request()};document.addEventListener('visibilitychange',visibility);cleanups.push(()=>document.removeEventListener('visibilitychange',visibility));
   latest.current.onReady(model);updateState();autoFit(true);setStatus('');request();
  }catch(e){if(disposed)return;setError(true);setStatus(e instanceof Error?e.message:'Không thể mở cảnh 3D.');console.error(e)}}
  start();return()=>{disposed=true;worker?.terminate();if(raf)cancelAnimationFrame(raf);resize?.disconnect();previewResize?.disconnect();controls?.dispose();previewControls?.dispose();cleanups.forEach(fn=>fn());clearArrows();marker.dispose();batches.forEach(b=>b.mesh.dispose());geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());environment?.dispose();renderer?.dispose();previewRenderer?.dispose();renderer?.domElement.remove();previewRenderer?.domElement.remove();mount?.dispose();driveMount?.dispose();road.geometry.dispose();(road.material as T.Material).dispose();wake.current=null;apply.current=null;api.current=null};
 },[]);
 return <><div className="canvas-host" ref={host}/>{status&&<div className="loading-state" role="status">{!error&&<span className="loading-dot"/>}<span>{status}</span>{error&&<button onClick={()=>location.reload()}>Tải lại</button>}</div>}</>;
});export default Scene;
