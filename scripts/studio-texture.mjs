import fs from 'node:fs';
import {inflateSync} from 'node:zlib';
import * as THREE from 'three';

// BrickLink Studio / Part Designer stores decorated custom-part textures in
// proprietary PE_TEX_INFO records. The 17-argument form contains a projection
// transform, 2D bounds, and an inline base64 PNG. We bake that texture into the
// existing vertex-color stream at import time, so the runtime renderer stays
// lightweight and instancing-friendly.

const PNG_SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);

function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c}

function decodePng(buffer){
 if(buffer.length<8||!buffer.subarray(0,8).equals(PNG_SIGNATURE))throw Error('Unsupported Studio texture: invalid PNG');
 let offset=8,width=0,height=0,bitDepth=0,colorType=0,interlace=0;const idat=[];
 while(offset+12<=buffer.length){
  const length=buffer.readUInt32BE(offset),type=buffer.toString('ascii',offset+4,offset+8),data=buffer.subarray(offset+8,offset+8+length);offset+=12+length;
  if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);bitDepth=data[8];colorType=data[9];interlace=data[12]}
  else if(type==='IDAT')idat.push(data);else if(type==='IEND')break;
 }
 if(bitDepth!==8||interlace!==0||![0,2,4,6].includes(colorType))throw Error(`Unsupported Studio PNG format depth=${bitDepth} type=${colorType} interlace=${interlace}`);
 const channels={0:1,2:3,4:2,6:4}[colorType],stride=width*channels,raw=inflateSync(Buffer.concat(idat)),scan=new Uint8Array(height*stride);let src=0;
 for(let y=0;y<height;y++){
  const filter=raw[src++],row=y*stride,prev=(y-1)*stride;
  for(let x=0;x<stride;x++){
   const value=raw[src++],a=x>=channels?scan[row+x-channels]:0,b=y?scan[prev+x]:0,c=y&&x>=channels?scan[prev+x-channels]:0;let out=value;
   if(filter===1)out=(value+a)&255;else if(filter===2)out=(value+b)&255;else if(filter===3)out=(value+Math.floor((a+b)/2))&255;else if(filter===4)out=(value+paeth(a,b,c))&255;else if(filter!==0)throw Error('Unsupported PNG filter '+filter);
   scan[row+x]=out;
  }
 }
 const rgba=new Uint8Array(width*height*4);
 for(let i=0,j=0;i<scan.length;i+=channels,j+=4){
  if(colorType===6){rgba[j]=scan[i];rgba[j+1]=scan[i+1];rgba[j+2]=scan[i+2];rgba[j+3]=scan[i+3]}
  else if(colorType===2){rgba[j]=scan[i];rgba[j+1]=scan[i+1];rgba[j+2]=scan[i+2];rgba[j+3]=255}
  else if(colorType===4){rgba[j]=rgba[j+1]=rgba[j+2]=scan[i];rgba[j+3]=scan[i+1]}
  else{rgba[j]=rgba[j+1]=rgba[j+2]=scan[i];rgba[j+3]=255}
 }
 return {width,height,rgba};
}

function srgbToLinear(v){v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}

function sample(texture,u,v){
 if(!Number.isFinite(u)||!Number.isFinite(v)||u<0||u>1||v<0||v>1)return null;
 const {width,height,rgba}=texture,x=u*(width-1),y=(1-v)*(height-1),x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),tx=x-x0,ty=y-y0,out=[0,0,0,0];
 for(const [px,py,w] of [[x0,y0,(1-tx)*(1-ty)],[x1,y0,tx*(1-ty)],[x0,y1,(1-tx)*ty],[x1,y1,tx*ty]]){const i=(py*width+px)*4;out[0]+=rgba[i]*w;out[1]+=rgba[i+1]*w;out[2]+=rgba[i+2]*w;out[3]+=rgba[i+3]*w}
 return [srgbToLinear(out[0]),srgbToLinear(out[1]),srgbToLinear(out[2]),out[3]/255];
}

// Port of Studio's AABB/triangle test as reverse engineered by ldr_tools.
function intersectTriBox([a,b,c],r){
 const edges=[new THREE.Vector3().subVectors(b,a),new THREE.Vector3().subVectors(c,b),new THREE.Vector3().subVectors(a,c)],tri=[a,b,c];
 for(const e of edges){
  for(const [rhs,num] of [[new THREE.Vector3(0,-e.z,e.y),r.y*Math.abs(e.z)+r.z*Math.abs(e.y)],[new THREE.Vector3(e.z,0,-e.x),r.x*Math.abs(e.z)+r.z*Math.abs(e.x)],[new THREE.Vector3(-e.y,e.x,0),r.x*Math.abs(e.y)+r.y*Math.abs(e.x)]]){
   const d=tri.map(v=>v.dot(rhs)),min=Math.min(...d),max=Math.max(...d);if(Math.max(-max,min)>num)return false;
  }
 }
 for(const k of ['x','y','z']){const d=tri.map(v=>v[k]);if(Math.max(...d)<-r[k]||Math.min(...d)>r[k])return false}
 const n=new THREE.Vector3().crossVectors(edges[0],edges[1]);return n.dot(a)<=Math.abs(n.x)*r.x+Math.abs(n.y)*r.y+Math.abs(n.z)*r.z;
}

function checkFaceNormal([a,b,c]){const ab=new THREE.Vector3().subVectors(b,a),bc=new THREE.Vector3().subVectors(c,b),n=new THREE.Vector3().crossVectors(ab,bc);return n.lengthSq()>0&&n.normalize().y<-.0001}

function parseTextureLine(line){
 const fields=line.trim().split(/\s+/).slice(2);if(fields.length!==17)return null;
 const nums=fields.slice(0,16).map(Number);if(nums.some(n=>!Number.isFinite(n)))return null;
 const [x,y,z,a,b,c,d,e,f,g,h,i,minX,minY,maxX,maxY]=nums;
 // PE_TEX_INFO uses an LDraw-style 3x3 transform plus translation.
 const matrix=new THREE.Matrix4().set(a,b,c,x,d,e,f,y,g,h,i,z,0,0,0,1),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();matrix.decompose(position,rotation,scale);
 // Studio uses scale as the projection box dimensions, while only the sign is
 // retained in the transform used to project points into texture-local space.
 const mirror=new THREE.Vector3(Math.sign(scale.x)||1,Math.sign(scale.y)||1,Math.sign(scale.z)||1),boxExtents=new THREE.Vector3(Math.abs(scale.x),Math.abs(scale.y),Math.abs(scale.z)).multiplyScalar(.5),inverse=new THREE.Matrix4().compose(position,rotation,mirror).invert();
 return {inverse,boxExtents,pointMin:new THREE.Vector2(minX,minY),pointDiff:new THREE.Vector2(maxX-minX,maxY-minY),image:decodePng(Buffer.from(fields[16],'base64'))};
}

export function createStudioTextureBaker(lookup){
 const cache=new Map();
 function metadata(name){
  const normalized=(name??'').replaceAll('\\','/').toLowerCase();if(cache.has(normalized))return cache.get(normalized);
  const candidates=[normalized,normalized.startsWith('parts/')?null:'parts/'+normalized].filter(Boolean),file=candidates.map(k=>lookup.get(k)).find(Boolean);if(!file){cache.set(normalized,null);return null}
  let text;try{text=fs.readFileSync(file,'utf8')}catch{cache.set(normalized,null);return null}
  // The Peugeot source uses -1: apply the texture to geometry in this part.
  if(!/^0 PE_TEX_PATH -1\s*$/m.test(text)){cache.set(normalized,null);return null}
  const textures=text.split(/\r?\n/).filter(l=>l.startsWith('0 PE_TEX_INFO ')).map(parseTextureLine).filter(Boolean),result=textures.length?textures:null;cache.set(normalized,result);return result;
 }
 return function bake(name,geometry,colors){
  const textures=metadata(name);if(!textures?.length)return 0;
  const pos=geometry.attributes.position,count=pos.count;let mapped=0;
  for(let start=0;start+2<count;start+=3){
   const world=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(pos,start+j));
   for(const tex of textures){
    const local=world.map(v=>v.clone().applyMatrix4(tex.inverse));
    // Studio performs two collection passes: box intersection and facing normal.
    if(!intersectTriBox(local,tex.boxExtents)&&!checkFaceNormal(local))continue;
    for(let j=0;j<3;j++){
     const p=local[j],u=(p.x-tex.pointMin.x)/tex.pointDiff.x,v=(-p.z-tex.pointMin.y)/tex.pointDiff.y,s=sample(tex.image,u,v);if(!s)continue;
     const idx=(start+j)*3,alpha=s[3];colors[idx]=colors[idx]*(1-alpha)+s[0]*alpha;colors[idx+1]=colors[idx+1]*(1-alpha)+s[1]*alpha;colors[idx+2]=colors[idx+2]*(1-alpha)+s[2]*alpha;
    }
    mapped++;break;
   }
  }
  if(mapped)console.log('STUDIO_TEXTURE',name,mapped,'triangles');
  return mapped;
 };
}
