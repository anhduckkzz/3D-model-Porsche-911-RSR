import {CONTROL_CHARACTERISTIC,motorFrame} from './vehicle-protocol';
export type VehicleState={connected:boolean;armed:boolean;fb:number;lr:number;message:string};
type Characteristic={writeValueWithoutResponse:(data:Uint8Array<ArrayBuffer>)=>Promise<void>};
type Device=EventTarget&{name?:string;gatt?:{connected:boolean;connect:()=>Promise<{getPrimaryService:(uuid:string)=>Promise<{getCharacteristic:(uuid:string)=>Promise<Characteristic>}>}>;disconnect:()=>void}};
type Bluetooth={requestDevice:(options:{acceptAllDevices:boolean;optionalServices:string[]})=>Promise<Device>};
export type LinkSettings={transport:'bridge'|'bluetooth';endpoint:string;token:string;service:string};
const LOCAL_SETTINGS:LinkSettings={transport:'bridge',endpoint:'ws://127.0.0.1:8765',token:'42096-local',service:''};
export class VehicleLink{
 state:VehicleState={connected:false,armed:false,fb:0,lr:0,message:'Chưa kết nối'};
 ws?:WebSocket;device?:Device;char?:Characteristic;pending:Uint8Array<ArrayBuffer>|null=null;writing=false;closed=false;requestedArm=false;lastAck=0;
 constructor(private notify:(state:VehicleState)=>void){}
 emit(patch:Partial<VehicleState>){this.state={...this.state,...patch};this.notify({...this.state})}
 connectLocal(){return this.connect(LOCAL_SETTINGS)}
 async connect(settings:LinkSettings){
  this.closed=false;this.emit({message:'Đang kết nối…'});
  try{
   if(settings.transport==='bluetooth'){
    const bluetooth=(navigator as Navigator&{bluetooth?:Bluetooth}).bluetooth;
    if(!bluetooth)throw new Error('Trình duyệt này chưa hỗ trợ Bluetooth trực tiếp.');
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(settings.service))throw new Error('Service UUID không hợp lệ.');
    const device=await bluetooth.requestDevice({acceptAllDevices:true,optionalServices:[settings.service]});this.device=device;
    if(this.closed){device.gatt?.disconnect();return}
    device.addEventListener('gattserverdisconnected',()=>{this.pending=null;this.emit({connected:false,armed:false,fb:0,lr:0,message:'Đã mất kết nối hub'})});
    const server=await device.gatt?.connect();if(!server)throw new Error('Không mở được kết nối GATT.');
    this.char=await (await server.getPrimaryService(settings.service)).getCharacteristic(CONTROL_CHARACTERISTIC);
    if(this.closed){device.gatt?.disconnect();return}
    await this.char.writeValueWithoutResponse(motorFrame());this.lastAck=performance.now();this.emit({connected:true,armed:false,message:device.name??'Hub BLE'});
   }else{
    const url=new URL(settings.endpoint);if(!['ws:','wss:'].includes(url.protocol))throw new Error('Bridge local không hợp lệ.');
    await new Promise<void>((resolve,reject)=>{
     const ws=new WebSocket(url);this.ws=ws;const timeout=setTimeout(()=>{ws.close();reject(new Error('Không kết nối được xe.'))},20000);
     ws.onopen=()=>{if(this.closed||this.ws!==ws){ws.close();return}ws.send(JSON.stringify({type:'auth',token:settings.token}))};
     ws.onmessage=e=>{if(this.closed||this.ws!==ws){ws.close();return}try{const msg=JSON.parse(e.data);if(msg.type==='error'){clearTimeout(timeout);reject(new Error(msg.message));this.emit({armed:false,message:msg.message});return}if(msg.type==='state'){
      this.lastAck=performance.now();this.emit({connected:!!msg.connected,armed:this.requestedArm&&!!msg.armed,fb:this.requestedArm?(Number(msg.fb)||0):0,lr:this.requestedArm?(Number(msg.lr)||0):0,message:msg.connected?'Đã kết nối':'Đã mất kết nối hub'});if(msg.connected){clearTimeout(timeout);resolve()}
     }}catch{this.stop();this.emit({message:'Kết nối không hợp lệ.'})}};
     ws.onerror=()=>{clearTimeout(timeout);reject(new Error('Không kết nối được xe.'))};
     ws.onclose=()=>{if(this.ws!==ws)return;clearTimeout(timeout);this.emit({connected:false,armed:false,fb:0,lr:0,message:'Đã ngắt kết nối'});reject(new Error('Đã ngắt kết nối'))};
    });
   }
  }catch(e){this.device?.gatt?.disconnect();this.ws?.close();this.emit({connected:false,armed:false,message:e instanceof Error?e.message:'Kết nối thất bại.'});throw e}
 }
 arm(){if(!this.state.connected)return;this.requestedArm=true;if(this.ws){this.ws.send(JSON.stringify({type:'arm'}))}else{this.lastAck=performance.now();this.emit({armed:true,fb:0,lr:0});this.enqueue(motorFrame())}}
 drive(command:{fb:number;turn:number;pulse_ms:number;turn_id:number}){
  if(!this.state.connected||!this.state.armed)return;
  if(performance.now()-this.lastAck>500){this.stop();this.emit({message:'Kết nối phản hồi chậm.'});return}
  if(this.ws){if(this.ws.readyState===WebSocket.OPEN&&this.ws.bufferedAmount<1024)this.ws.send(JSON.stringify({...command,type:'drive'}));else this.stop()}
  else{this.emit({fb:command.fb,lr:command.turn*100});this.enqueue(motorFrame(command.fb,command.turn*100))}
 }
 private enqueue(frame:Uint8Array<ArrayBuffer>){this.pending=frame;void this.flush()}
 private async flush(){if(this.writing)return;this.writing=true;try{while(this.pending&&this.char&&this.device?.gatt?.connected){const frame=this.pending;this.pending=null;await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('GATT timeout')),300);this.char!.writeValueWithoutResponse(frame).then(()=>{clearTimeout(timer);resolve()},error=>{clearTimeout(timer);reject(error)})});this.lastAck=performance.now()}}catch{this.pending=null;this.emit({armed:false,connected:false,fb:0,lr:0,message:'Không gửi được lệnh tới hub.'});this.device?.gatt?.disconnect()}finally{this.writing=false}}
 stop(){this.requestedArm=false;this.emit({armed:false,fb:0,lr:0});if(this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify({type:'stop'}));if(this.char)this.enqueue(motorFrame())}
 async close(){this.closed=true;this.stop();if(this.ws){this.ws.close();this.ws=undefined}if(this.char){const start=performance.now();while(this.writing&&performance.now()-start<300)await new Promise(r=>setTimeout(r,10));this.device?.gatt?.disconnect();this.char=undefined}this.emit({connected:false,armed:false,fb:0,lr:0,message:'Đã ngắt kết nối'})}
}
