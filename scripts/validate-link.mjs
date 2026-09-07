import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=fs.readFileSync('app/vehicle-link.ts','utf8').replace("'./vehicle-protocol'",JSON.stringify(new URL('../app/vehicle-protocol.ts',import.meta.url).href));
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {VehicleLink}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
class FakeSocket{
 static OPEN=1;readyState=1;bufferedAmount=0;sent=[];
 constructor(){FakeSocket.instance=this;queueMicrotask(()=>this.onopen?.())}
 send(raw){this.sent.push(JSON.parse(raw))}
 close(){this.readyState=3;this.onclose?.()}
 state(patch={}){this.onmessage?.({data:JSON.stringify({type:'state',connected:true,armed:false,fb:0,lr:0,...patch})})}
}
globalThis.WebSocket=FakeSocket;
const link=new VehicleLink(()=>{}),connecting=link.connect({transport:'bridge',endpoint:'ws://127.0.0.1:8765',token:'test-token',service:''});
await Promise.resolve();const socket=FakeSocket.instance;socket.state();await connecting;
assert.equal(socket.sent[0].type,'auth');assert.equal(link.state.armed,false);
link.arm();socket.state({armed:true});assert.equal(link.state.armed,true);
link.drive({fb:30,turn:0,pulse_ms:200,turn_id:0});assert.equal(socket.sent.at(-1).fb,30);
link.stop();socket.state({armed:true,fb:30});assert.equal(link.state.armed,false,'Old acknowledgments cannot rearm');assert.equal(link.state.fb,0);
link.drive({fb:100,turn:1,pulse_ms:500,turn_id:1});assert.equal(socket.sent.at(-1).type,'stop');await link.close();
const ble=new VehicleLink(()=>{}),writes=[],resolvers=[];
ble.device={gatt:{connected:true,disconnect(){this.connected=false}}};ble.char={writeValueWithoutResponse(data){writes.push([...data]);return new Promise(resolve=>resolvers.push(resolve))}};
ble.state={connected:true,armed:true,fb:0,lr:0,message:''};ble.lastAck=performance.now();
ble.drive({fb:30,turn:0,pulse_ms:200,turn_id:0});ble.drive({fb:50,turn:1,pulse_ms:200,turn_id:1});ble.stop();assert.equal(writes.length,1);
resolvers.shift()();await new Promise(r=>setTimeout(r,0));assert.deepEqual(writes[1],[171,205,1,0,0,0,0,0]);resolvers.shift()();await new Promise(r=>setTimeout(r,0));ble.char=undefined;await ble.close();
console.log({passed:true,staleAckCannotRearm:true,stopSupersedesQueuedMovement:true,serializedBleWrites:true});
