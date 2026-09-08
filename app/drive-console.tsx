'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUp,ArrowDown,ArrowLeft,ArrowRight,Square,Bluetooth,Check} from 'lucide-react';
import {DriveIntent,type Direction} from './vehicle-protocol';
import {VehicleLink,type VehicleState} from './vehicle-link';

export default function DriveConsole({onState}:{onState:(state:VehicleState)=>void}){
 const [state,setState]=useState<VehicleState>({connected:false,armed:false,fb:0,lr:0,message:'Chưa kết nối'}),[busy,setBusy]=useState(false),[connectError,setConnectError]=useState('');
 const speed=100;
 const report=useRef(onState);report.current=onState;
 const link=useRef<VehicleLink|null>(null),intent=useRef(new DriveIntent());
 function transmit(){const command=intent.current.sample(performance.now(),speed,500);link.current?.drive(command)}
 function halt(){intent.current.clear();link.current?.stop()}
 function press(source:string,direction:Direction){if(!link.current?.state.armed)return;intent.current.press(source,direction);transmit()}
 function release(source:string){intent.current.release(source);transmit()}
 useEffect(()=>{
  let mounted=true;const current=new VehicleLink(s=>{if(mounted){setState(s);report.current({...s,fb:-s.fb,lr:-s.lr});if(!s.armed)intent.current.clear()}});link.current=current;
  const tick=setInterval(transmit,100),keys:Record<string,Direction>={KeyW:'forward',ArrowUp:'forward',KeyS:'backward',ArrowDown:'backward',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
  const down=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,select,textarea,[role=slider]'))return;if(e.code==='Space'||e.code==='Escape'){e.preventDefault();halt();return}const d=keys[e.code];if(d){e.preventDefault();if(!e.repeat)press('key:'+e.code,d)}};
  const up=(e:KeyboardEvent)=>{if(keys[e.code]){e.preventDefault();release('key:'+e.code)}};
  const hidden=()=>{if(document.hidden)halt()};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',halt);window.addEventListener('pagehide',halt);document.addEventListener('visibilitychange',hidden);
  return()=>{mounted=false;report.current({connected:false,armed:false,fb:0,lr:0,message:'Chưa kết nối'});clearInterval(tick);intent.current.clear();void current.close();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',halt);window.removeEventListener('pagehide',halt);document.removeEventListener('visibilitychange',hidden)};
 },[]);
 async function connect(){
  if(busy)return;if(state.connected){link.current?.arm();return;}setBusy(true);setConnectError('');
  try{await link.current?.connect();link.current?.arm()}
  catch(error){setConnectError(error instanceof Error?(error.name&&error.name!=='Error'?`${error.name}: ${error.message}`:error.message):'Không kết nối được xe.')}
  finally{setBusy(false)}
 }
 const arrows=[['forward','Tiến',ArrowUp],['left','Rẽ trái',ArrowLeft],['right','Rẽ phải',ArrowRight],['backward','Lùi',ArrowDown]] as const;
 return <>
  <div className="drive-identity"><span className="small-label">VEHICLE CONTROL</span><h2>Porsche 911 RSR</h2></div>
  <aside className="drive-panel">
   <button className="connect-button" disabled={busy} onClick={()=>void connect()} aria-label={state.connected?(state.armed?'Đã kết nối':'Tiếp tục điều khiển'):'Kết nối xe'} title={!state.connected&&connectError?connectError:undefined} style={state.connected?{color:'#1f9d55',borderColor:'#bfe7cf',background:'#f4fbf7'}:undefined}>{state.connected?<><Check size={19} strokeWidth={2.4}/>{!state.armed&&<span>Tiếp tục</span>}</>:<><Bluetooth size={16}/><span>{busy?'Connecting…':'Connect'}</span></>}</button>
   {!state.connected&&connectError&&<p role="status" style={{margin:'8px 2px 0',fontSize:11,lineHeight:1.45,color:'#a65346',maxWidth:260}}>{connectError}</p>}
   <div className="command-readout"><span>Lệnh đang gửi</span><strong>{state.fb>0?'Tiến':state.fb<0?'Lùi':'Dừng'}{state.lr<0?' · Trái':state.lr>0?' · Phải':''}</strong></div>
   {state.connected&&<button className="disconnect-link" onClick={()=>void link.current?.close()}>Ngắt kết nối</button>}
  </aside>
  <span className="drive-motion-label">{state.connected?'Bánh xe + mặt đường mô phỏng đồng bộ theo lệnh':'Kết nối xe để điều khiển'}</span>
  <div className="drive-pad-area"><div className="drive-pad">{arrows.map(([direction,label,Icon])=><button key={direction} className={'direction '+direction} disabled={!state.armed} aria-label={label} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);press('pointer:'+e.pointerId,direction)}} onPointerUp={e=>release('pointer:'+e.pointerId)} onPointerCancel={e=>release('pointer:'+e.pointerId)} onLostPointerCapture={e=>release('pointer:'+e.pointerId)} onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();press('button:'+direction,direction)}}} onKeyUp={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();release('button:'+direction)}}}><Icon size={20}/></button>)}<button className="stop-button" aria-label="Dừng" onClick={halt}><Square size={15} fill="currentColor"/></button></div></div>
 </>;
}
