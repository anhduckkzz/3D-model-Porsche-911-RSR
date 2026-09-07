import {CONTROL_CHARACTERISTIC,motorFrame} from './vehicle-protocol';

export type VehicleState={connected:boolean;armed:boolean;fb:number;lr:number;message:string};

const CONTROL_SERVICE='49535343-fe7d-4ae5-8fa9-9fafd205e455';
const DEVICE_PREFIXES=['QY_','CB26'];

type CharacteristicProperties={writeWithoutResponse?:boolean;write?:boolean};
type Characteristic={
 properties?:CharacteristicProperties;
 writeValueWithoutResponse?:(data:BufferSource)=>Promise<void>;
 writeValueWithResponse?:(data:BufferSource)=>Promise<void>;
 writeValue?:(data:BufferSource)=>Promise<void>;
};
type Service={getCharacteristic:(uuid:string)=>Promise<Characteristic>};
type GattServer={getPrimaryService:(uuid:string)=>Promise<Service>};
type Gatt={connected:boolean;connect:()=>Promise<GattServer>;disconnect:()=>void};
type Device=EventTarget&{name?:string;gatt?:Gatt};
type Bluetooth={requestDevice:(options:{filters:Array<{namePrefix:string}>;optionalServices:string[]})=>Promise<Device>};

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

export class VehicleLink{
 state:VehicleState={connected:false,armed:false,fb:0,lr:0,message:'Chưa kết nối'};
 device?:Device;char?:Characteristic;pending:Uint8Array<ArrayBuffer>|null=null;writing=false;closed=false;lastAck=0;
 constructor(private notify:(state:VehicleState)=>void){}
 emit(patch:Partial<VehicleState>){this.state={...this.state,...patch};this.notify({...this.state})}

 private async writeCharacteristic(char:Characteristic,frame:Uint8Array<ArrayBuffer>){
  const data=frame as BufferSource;
  // ae3b is a WRITE WITHOUT RESPONSE characteristic on this hub. Prefer the
  // modern method, but keep Chrome's older writeValue() as a compatibility
  // fallback because Web Bluetooth implementations differ across releases.
  if(char.writeValueWithoutResponse)return char.writeValueWithoutResponse(data);
  if(char.writeValue)return char.writeValue(data);
  if(char.writeValueWithResponse)return char.writeValueWithResponse(data);
  throw new Error('Characteristic ae3b không hỗ trợ ghi dữ liệu trong trình duyệt này.');
 }

 private async withTimeout<T>(promise:Promise<T>,ms:number,label:string){
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([promise,new Promise<T>((_,reject)=>{timer=setTimeout(()=>reject(new Error(label)),ms)})])}
  finally{if(timer)clearTimeout(timer)}
 }

 async connect(){
  this.closed=false;this.emit({message:'Đang chờ chọn xe…'});
  try{
   const bluetooth=(navigator as Navigator&{bluetooth?:Bluetooth}).bluetooth;
   if(!bluetooth)throw new Error('Web Bluetooth không khả dụng. Hãy mở bằng Chrome hoặc Edge trên máy có Bluetooth.');

   const device=await bluetooth.requestDevice({
    filters:DEVICE_PREFIXES.map(namePrefix=>({namePrefix})),
    optionalServices:[CONTROL_SERVICE]
   });
   if(this.closed){device.gatt?.disconnect();return}
   if(!device.gatt)throw new Error('Thiết bị đã chọn không có BLE GATT.');

   this.device=device;
   this.emit({message:'Đang mở kết nối Bluetooth…'});
   device.addEventListener('gattserverdisconnected',()=>{
    this.pending=null;this.char=undefined;
    this.emit({connected:false,armed:false,fb:0,lr:0,message:'Đã mất kết nối'});
   },{once:true});

   let server:GattServer|undefined,lastError:unknown;
   for(let attempt=0;attempt<3&&!server;attempt++){
    try{server=await this.withTimeout(device.gatt.connect(),8000,'Bluetooth GATT connect timeout.');}
    catch(error){lastError=error;if(attempt<2){try{device.gatt.disconnect()}catch{}await sleep(250)}}
   }
   if(!server)throw lastError instanceof Error?lastError:new Error('Không mở được BLE GATT.');
   if(this.closed){device.gatt.disconnect();return}

   this.emit({message:'Đang mở service điều khiển…'});
   let service:Service|undefined;
   for(let attempt=0;attempt<3&&!service;attempt++){
    try{service=await this.withTimeout(server.getPrimaryService(CONTROL_SERVICE),3000,'Không tìm thấy service điều khiển.');}
    catch(error){lastError=error;if(attempt<2)await sleep(200)}
   }
   if(!service)throw lastError instanceof Error?lastError:new Error('Không tìm thấy service điều khiển.');

   this.emit({message:'Đang mở characteristic điều khiển…'});
   const char=await this.withTimeout(service.getCharacteristic(CONTROL_CHARACTERISTIC),3000,'Không tìm thấy characteristic ae3b.');
   this.char=char;

   this.emit({message:'Đang kiểm tra lệnh điều khiển…'});
   await this.withTimeout(this.writeCharacteristic(char,motorFrame()),2500,'Không ghi được lệnh thử tới xe.');
   this.lastAck=performance.now();
   this.emit({connected:true,armed:false,fb:0,lr:0,message:'Đã kết nối'});
  }catch(e){
   this.pending=null;this.char=undefined;
   try{this.device?.gatt?.disconnect()}catch{}
   const message=e instanceof Error?(e.name&&e.name!=='Error'?`${e.name}: ${e.message}`:e.message):'Kết nối thất bại.';
   console.error('[Porsche Web Bluetooth]',e);
   this.emit({connected:false,armed:false,fb:0,lr:0,message});
   throw e;
  }
 }

 connectLocal(){return this.connect()}

 arm(){
  if(!this.state.connected||!this.char)return;
  this.lastAck=performance.now();this.emit({armed:true,fb:0,lr:0});this.enqueue(motorFrame());
 }
 drive(command:{fb:number;turn:number;pulse_ms:number;turn_id:number}){
  if(!this.state.connected||!this.state.armed)return;
  if(performance.now()-this.lastAck>700){this.stop();this.emit({message:'Kết nối phản hồi chậm.'});return}
  this.emit({fb:command.fb,lr:command.turn*100});this.enqueue(motorFrame(command.fb,command.turn*100));
 }
 private enqueue(frame:Uint8Array<ArrayBuffer>){this.pending=frame;void this.flush()}
 private async flush(){
  if(this.writing)return;this.writing=true;
  try{
   while(this.pending&&this.char&&this.device?.gatt?.connected){
    const frame=this.pending;this.pending=null;
    await this.withTimeout(this.writeCharacteristic(this.char,frame),700,'GATT write timeout.');
    this.lastAck=performance.now();
   }
  }catch(error){
   this.pending=null;this.char=undefined;
   console.error('[Porsche BLE write]',error);
   this.emit({armed:false,connected:false,fb:0,lr:0,message:error instanceof Error?error.message:'Không gửi được lệnh tới hub.'});
   try{this.device?.gatt?.disconnect()}catch{}
  }finally{this.writing=false}
 }
 stop(){
  const wasConnected=this.state.connected;
  this.emit({armed:false,fb:0,lr:0});
  if(wasConnected&&this.char)this.enqueue(motorFrame());
 }
 async close(){
  this.closed=true;this.stop();
  const start=performance.now();while(this.writing&&performance.now()-start<700)await sleep(10);
  try{this.device?.gatt?.disconnect()}catch{}
  this.char=undefined;this.device=undefined;
  this.emit({connected:false,armed:false,fb:0,lr:0,message:'Đã ngắt kết nối'});
 }
}
