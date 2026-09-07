import {CONTROL_CHARACTERISTIC,motorFrame} from './vehicle-protocol';

export type VehicleState={connected:boolean;armed:boolean;fb:number;lr:number;message:string};

const CONTROL_SERVICE='0000ae3a-0000-1000-8000-00805f9b34fb';
const DEVICE_PREFIXES=['QY_','CB26'];

type Characteristic={writeValueWithoutResponse:(data:Uint8Array<ArrayBuffer>)=>Promise<void>};
type Service={getCharacteristic:(uuid:string)=>Promise<Characteristic>};
type GattServer={getPrimaryService:(uuid:string)=>Promise<Service>};
type Gatt={connected:boolean;connect:()=>Promise<GattServer>;disconnect:()=>void};
type Device=EventTarget&{name?:string;gatt?:Gatt};
type Bluetooth={
 getDevices?:()=>Promise<Device[]>;
 requestDevice:(options:{filters?:Array<{namePrefix:string}>;optionalServices:string[]})=>Promise<Device>;
};

export class VehicleLink{
 state:VehicleState={connected:false,armed:false,fb:0,lr:0,message:'Chưa kết nối'};
 device?:Device;char?:Characteristic;pending:Uint8Array<ArrayBuffer>|null=null;writing=false;closed=false;lastAck=0;
 constructor(private notify:(state:VehicleState)=>void){}
 emit(patch:Partial<VehicleState>){this.state={...this.state,...patch};this.notify({...this.state})}

 async connect(){
  this.closed=false;this.emit({message:'Đang kết nối…'});
  try{
   const bluetooth=(navigator as Navigator&{bluetooth?:Bluetooth}).bluetooth;
   if(!bluetooth)throw new Error('Trình duyệt chưa hỗ trợ Web Bluetooth. Hãy dùng Chrome hoặc Edge.');

   let device:Device|undefined;
   if(bluetooth.getDevices){
    const approved=await bluetooth.getDevices();
    device=approved.find(d=>DEVICE_PREFIXES.some(prefix=>(d.name??'').startsWith(prefix)));
    if(!device&&approved.length===1)device=approved[0];
   }
   if(!device){
    device=await bluetooth.requestDevice({
     filters:DEVICE_PREFIXES.map(namePrefix=>({namePrefix})),
     optionalServices:[CONTROL_SERVICE]
    });
   }
   if(this.closed){device.gatt?.disconnect();return}
   if(!device.gatt)throw new Error('Thiết bị không hỗ trợ GATT.');

   this.device=device;
   device.addEventListener('gattserverdisconnected',()=>{
    this.pending=null;this.char=undefined;
    this.emit({connected:false,armed:false,fb:0,lr:0,message:'Đã mất kết nối'});
   },{once:true});

   const server=await device.gatt.connect();
   if(this.closed){device.gatt.disconnect();return}
   const service=await server.getPrimaryService(CONTROL_SERVICE);
   this.char=await service.getCharacteristic(CONTROL_CHARACTERISTIC);
   await this.char.writeValueWithoutResponse(motorFrame());
   this.lastAck=performance.now();
   this.emit({connected:true,armed:false,fb:0,lr:0,message:'Đã kết nối'});
  }catch(e){
   this.pending=null;this.char=undefined;this.device?.gatt?.disconnect();
   this.emit({connected:false,armed:false,fb:0,lr:0,message:e instanceof Error?e.message:'Kết nối thất bại.'});
   throw e;
  }
 }

 // Compatibility alias for the current one-button control UI.
 connectLocal(){return this.connect()}

 arm(){
  if(!this.state.connected||!this.char)return;
  this.lastAck=performance.now();this.emit({armed:true,fb:0,lr:0});this.enqueue(motorFrame());
 }
 drive(command:{fb:number;turn:number;pulse_ms:number;turn_id:number}){
  if(!this.state.connected||!this.state.armed)return;
  if(performance.now()-this.lastAck>500){this.stop();this.emit({message:'Kết nối phản hồi chậm.'});return}
  this.emit({fb:command.fb,lr:command.turn*100});this.enqueue(motorFrame(command.fb,command.turn*100));
 }
 private enqueue(frame:Uint8Array<ArrayBuffer>){this.pending=frame;void this.flush()}
 private async flush(){
  if(this.writing)return;this.writing=true;
  try{
   while(this.pending&&this.char&&this.device?.gatt?.connected){
    const frame=this.pending;this.pending=null;
    await new Promise<void>((resolve,reject)=>{
     const timer=setTimeout(()=>reject(new Error('GATT timeout')),500);
     this.char!.writeValueWithoutResponse(frame).then(()=>{clearTimeout(timer);resolve()},error=>{clearTimeout(timer);reject(error)});
    });
    this.lastAck=performance.now();
   }
  }catch{
   this.pending=null;this.char=undefined;
   this.emit({armed:false,connected:false,fb:0,lr:0,message:'Không gửi được lệnh tới hub.'});
   this.device?.gatt?.disconnect();
  }finally{this.writing=false}
 }
 stop(){
  const wasConnected=this.state.connected;
  this.emit({armed:false,fb:0,lr:0});
  if(wasConnected&&this.char)this.enqueue(motorFrame());
 }
 async close(){
  this.closed=true;this.stop();
  const start=performance.now();while(this.writing&&performance.now()-start<500)await new Promise(r=>setTimeout(r,10));
  this.device?.gatt?.disconnect();this.char=undefined;this.device=undefined;
  this.emit({connected:false,armed:false,fb:0,lr:0,message:'Đã ngắt kết nối'});
 }
}
