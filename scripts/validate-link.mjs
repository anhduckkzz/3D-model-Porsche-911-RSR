import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source=fs.readFileSync('app/vehicle-link.ts','utf8').replace("'./vehicle-protocol'",JSON.stringify(new URL('../app/vehicle-protocol.ts',import.meta.url).href));
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {VehicleLink}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));

const SERVICE='0000ae3a-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC='0000ae3b-0000-1000-8000-00805f9b34fb';
const writes=[];
const characteristic={async writeValueWithoutResponse(data){writes.push([...data])}};
const device=new EventTarget();
device.name='QY_CB26_937B';
device.gatt={
 connected:false,
 async connect(){
  this.connected=true;
  return {async getPrimaryService(uuid){assert.equal(uuid,SERVICE);return {async getCharacteristic(charUuid){assert.equal(charUuid,CHARACTERISTIC);return characteristic}}}};
 },
 disconnect(){if(!this.connected)return;this.connected=false;device.dispatchEvent(new Event('gattserverdisconnected'))}
};
let chooserCalls=0;
const bluetooth={
 async requestDevice(options){chooserCalls++;assert(options.filters.some(f=>f.namePrefix==='QY_'));assert(options.optionalServices.includes(SERVICE));return device}
};
Object.defineProperty(globalThis,'navigator',{value:{bluetooth},configurable:true});

const states=[];
const link=new VehicleLink(state=>states.push(state));
await link.connect();
assert.equal(link.state.connected,true);
assert.equal(link.state.armed,false);
assert.equal(chooserCalls,1);
assert.deepEqual(writes[0],[171,205,1,0,0,0,0,0]);

link.arm();
await new Promise(r=>setTimeout(r,0));
assert.equal(link.state.armed,true);
link.drive({fb:30,turn:0,pulse_ms:200,turn_id:0});
await new Promise(r=>setTimeout(r,0));
assert.deepEqual(writes.at(-1),[171,205,1,30,0,0,0,30]);
link.stop();
await new Promise(r=>setTimeout(r,0));
assert.equal(link.state.armed,false);
assert.deepEqual(writes.at(-1),[171,205,1,0,0,0,0,0]);
await link.close();
assert.equal(link.state.connected,false);

const second=new VehicleLink(()=>{});
await second.connect();
assert.equal(chooserCalls,2,'Each explicit Connect should use the native chooser for a fresh device object');
await second.close();

console.log({passed:true,directWebBluetooth:true,nativeChooser:true,stopFrame:true});
