import assert from 'node:assert/strict';
import fs from 'node:fs';
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
assert.equal(audit.ok,false,'Existing incomplete adapters must not be presented as mechanically assembled');
assert(audit.unconnectedParts>0||audit.axleConflicts>0);
const missingPin=plan.parts.filter(p=>p.code!=='2780'&&p.code!=='6558');assert.equal(auditPhoneMount(model,installation,missingPin).ok,false);
const state=restingDrive();for(let i=0;i<30;i++)advanceDrive(state,0,-100,1/60,.86,6.4,true);assert.equal(state.distance,0);assert.equal(state.roll,0);assert.equal(state.heading,0);assert(state.steer<0);
Object.assign(state,restingDrive());for(let i=0;i<20;i++)advanceDrive(state,100,0,1/60,.86,6.4,true);assert(state.distance>0);assert(Math.abs(state.roll-state.distance/.86)<1e-8,'Wheel rotation must match road travel');
Object.assign(state,restingDrive());for(let i=0;i<20;i++)advanceDrive(state,-100,0,1/60,.86,6.4,true);assert(state.roll<0);assert(state.distance<0);
for(let i=0;i<120;i++)advanceDrive(state,0,0,1/60,.86,6.4,false);assert.equal(state.speed,0);assert.equal(state.steer,0);
console.log({passed:true,rollingDistance:true,stationarySteering:true,reverse:true,installation:installation.anchors.map(a=>({part:a.partId,hole:a.hole+1})),mechanicalAudit:audit});
