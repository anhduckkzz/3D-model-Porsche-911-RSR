import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {advanceDrive,restingDrive} from '../app/drive-motion.ts';

async function load(name){const code=ts.transpileModule(fs.readFileSync('app/'+name+'.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replaceAll("'three'",JSON.stringify(import.meta.resolve('three')));return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))}
const {resolvePhoneMountInstallation}=await load('phone-mount-install');
const {buildMountParts,mountCatalog}=await load('phone-mount-parts');
const {auditPhoneMount}=await load('phone-mount-audit');
const {mountPreparation}=await load('phone-mount-preparation');
const model=JSON.parse(fs.readFileSync('public/model/model.json'));

const installation=resolvePhoneMountInstallation(model);assert(installation,'Intact stock chassis should expose four empty/reachable add-on hardpoints');
assert.equal(mountPreparation(model).size,0,'Camera bridge must not remove or hide any stock LEGO piece');
assert.equal(installation.anchors[1].hole-installation.anchors[0].hole,8,'Left base rail must span exactly one 9L window');
assert.equal(installation.anchors[3].hole-installation.anchors[2].hole,8,'Right base rail must span exactly one 9L window');
assert.equal(installation.anchors[0].hole,installation.anchors[2].hole,'Both chassis sides must use the same longitudinal hole window');
assert.equal(installation.anchors[1].hole,installation.anchors[3].hole,'Both chassis sides must remain symmetric');

const plan=buildMountParts(installation);
for(const p of plan.parts){
 assert(model.geometries.some(g=>g.name===p.code+'.dat'&&g.colorHex===mountCatalog[p.code].color),'Every specified mould/color must have an existing LDraw asset');
 assert([...p.position,...p.quaternion].every(Number.isFinite));
 assert(Math.abs(p.quaternion.reduce((n,v)=>n+v*v,0)-1)<1e-5);
}
assert.equal(plan.parts.some(p=>/elastic|EVA|foam|rubber/i.test(p.role)),false,'Retention must be pure LEGO');
assert(plan.parts.filter(p=>p.role.includes('bottom ledge')).length>=2,'Two LEGO bottom ledges are required');
assert(plan.parts.filter(p=>p.role.includes('backrest rail')).length>=2,'Two LEGO backrest rails are required');
assert(plan.parts.some(p=>p.role.includes('left side retainer')),'Left rigid side constraint is required');
assert(plan.parts.some(p=>p.role.includes('right pure-LEGO side retainer')),'Right rigid side constraint is required');
assert(plan.parts.filter(p=>p.role.includes('top locking yoke')).length>=3,'Closing top yoke must contain three stock beams');
assert(plan.parts.some(p=>p.stage===4&&p.role.includes('top locking yoke')),'Top yoke must close only after the phone/cradle stages');

const audit=auditPhoneMount(model,installation,plan.parts);
assert.equal(audit.occupiedAnchors,0,'Reject occupied candidate holes before assembly');
assert.equal(audit.ok,true,'Every rigid retention part needs a seated connection back to the four chassis holes');
const missingPin=plan.parts.filter(p=>p.code!=='2780'&&p.code!=='6558');assert.equal(auditPhoneMount(model,installation,missingPin).ok,false);
const duplicate=[...plan.parts,structuredClone(plan.parts.find(p=>p.code==='2780'))];assert(auditPhoneMount(model,installation,duplicate).sharedSockets>0,'A second pin cannot reuse an occupied socket');
const shifted=structuredClone(plan.parts);shifted[0].position[1]+=.02;assert.equal(auditPhoneMount(model,installation,shifted).ok,false,'Reject a 0.8 mm hole misalignment');
const changed=structuredClone(model);changed.parts[338].matrix[12]-=.1;assert.equal(resolvePhoneMountInstallation(changed),null,'Do not silently float the rig when the structural rail geometry changes');

const state=restingDrive();for(let i=0;i<30;i++)advanceDrive(state,0,-100,1/60,.86,6.4,true);assert.equal(state.distance,0);assert.equal(state.roll,0);assert.equal(state.heading,0);assert(state.steer<0);
Object.assign(state,restingDrive());for(let i=0;i<20;i++)advanceDrive(state,100,0,1/60,.86,6.4,true);assert(state.distance>0);assert(Math.abs(state.roll-state.distance/.86)<1e-8,'Wheel rotation must match road travel');
Object.assign(state,restingDrive());for(let i=0;i<20;i++)advanceDrive(state,-100,0,1/60,.86,6.4,true);assert(state.roll<0);assert(state.distance<0);
for(let i=0;i<120;i++)advanceDrive(state,0,0,1/60,.86,6.4,false);assert.equal(state.speed,0);assert.equal(state.steer,0);
console.log({passed:true,zeroRemoval:true,pureLegoRetention:true,rollingDistance:true,stationarySteering:true,reverse:true,installation:installation.anchors.map(a=>({part:a.partId,hole:a.hole+1})),mechanicalAudit:audit});
