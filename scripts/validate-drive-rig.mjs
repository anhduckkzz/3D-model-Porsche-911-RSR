import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {advanceDrive,restingDrive} from '../app/drive-motion.ts';
async function load(name){const code=ts.transpileModule(fs.readFileSync('app/'+name+'.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replaceAll("'three'",JSON.stringify(import.meta.resolve('three')));return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))}
const {resolvePhoneMountInstallation}=await load('phone-mount-install');
const {buildMountParts,mountCatalog}=await load('phone-mount-parts');
const {auditPhoneMount}=await load('phone-mount-audit');
const model=JSON.parse(fs.readFileSync('public/model/model.json'));
const installation=resolvePhoneMountInstallation(model);assert(installation,'Stock chassis should expose a candidate, not invented fallback coordinates');
const plan=buildMountParts(installation);for(const p of plan.parts){assert(model.geometries.some(g=>g.name===p.code+'.dat'&&g.colorHex===mountCatalog[p.code].color),'Every specified mould/color must have an existing LDraw asset');assert([...p.position,...p.quaternion].every(Number.isFinite));assert(Math.abs(p.quaternion.reduce((n,v)=>n+v*v,0)-1)<1e-5)}
const audit=auditPhoneMount(model,installation,plan.parts);
assert.equal(audit.occupiedAnchors,0,'Reject occupied candidate holes before assembly');
assert.equal(audit.ok,true,'Every rig part needs a seated connection back to the four chassis holes');
const missingPin=plan.parts.filter(p=>p.code!=='2780'&&p.code!=='6558');assert.equal(auditPhoneMount(model,installation,missingPin).ok,false);
const duplicate=[...plan.parts,structuredClone(plan.parts.find(p=>p.code==='2780'))];assert(auditPhoneMount(model,installation,duplicate).sharedSockets>0,'A second pin cannot reuse an occupied socket');
const shifted=structuredClone(plan.parts);shifted[0].position[1]+=.02;assert.equal(auditPhoneMount(model,installation,shifted).ok,false,'Reject a 0.8 mm hole misalignment');
const changed=structuredClone(model);changed.parts[110].matrix[12]-=.1;assert.equal(resolvePhoneMountInstallation(changed),null,'Do not silently select new hardpoints on a changed chassis');
assert.deepEqual(installation.anchors.map(a=>a.hole),[0,1,0,1]);
const incomplete=plan.parts.filter(p=>p.role!=='top contact bush');assert.equal(auditPhoneMount(model,installation,incomplete).ok,false,'Connected rails alone do not retain the handset');
for(const a of installation.anchors){const p=model.parts.find(p=>p.id===a.partId);assert.equal(model.geometries[p.geo].name,'64179.dat');assert.deepEqual(a.socket.slice(1),[0,-60]);}
const report=JSON.parse(fs.readFileSync('public/camera-bridge-clearance.json')),hash=x=>createHash('sha256').update(x).digest('hex');
assert.equal(report.planSha256,hash(JSON.stringify(plan)),'Re-run offline clearance check after changing the rig');
assert.equal(report.modelSha256,hash(fs.readFileSync('public/model/model.json')));assert.equal(report.geometrySha256,hash(fs.readFileSync('public/model/geometry.bin.gz')));
for(const key of ['removedParts','rigCarIntersections','rigSelfIntersections','phoneCarIntersections','phoneRigIntersections','anchorApproachIntersections'])assert.deepEqual(report[key],[],key);
const state=restingDrive();for(let i=0;i<30;i++)advanceDrive(state,0,-100,1/60,.86,6.4,true);assert.equal(state.distance,0);assert.equal(state.roll,0);assert.equal(state.heading,0);assert(state.steer<0);
Object.assign(state,restingDrive());for(let i=0;i<20;i++)advanceDrive(state,100,0,1/60,.86,6.4,true);assert(state.distance>0);assert(Math.abs(state.roll-state.distance/.86)<1e-8,'Wheel rotation must match road travel');
Object.assign(state,restingDrive());for(let i=0;i<20;i++)advanceDrive(state,-100,0,1/60,.86,6.4,true);assert(state.roll<0);assert(state.distance<0);
for(let i=0;i<120;i++)advanceDrive(state,0,0,1/60,.86,6.4,false);assert.equal(state.speed,0);assert.equal(state.steer,0);
console.log({passed:true,rollingDistance:true,stationarySteering:true,reverse:true,installation:installation.anchors.map(a=>({part:a.partId,hole:a.hole+1})),mechanicalAudit:audit});
