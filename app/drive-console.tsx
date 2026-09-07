'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUp,ArrowDown,ArrowLeft,ArrowRight,Square,Bluetooth,Settings2,Power} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Slider} from '@/components/ui/slider';
import {DriveIntent,type Direction} from './vehicle-protocol';
import {VehicleLink,type VehicleState,type LinkSettings} from './vehicle-link';

export default function DriveConsole(){
 const [state,setState]=useState<VehicleState>({connected:false,armed:false,fb:0,lr:0,message:'Chưa kết nối'}),[settingsOpen,setSettingsOpen]=useState(false),[busy,setBusy]=useState(false),[speed,setSpeed]=useState(30),[pulse,setPulse]=useState(200),[origin,setOrigin]=useState('http://localhost:3000');
 const [settings,setSettings]=useState<LinkSettings>({transport:'bridge',endpoint:'ws://127.0.0.1:8765',token:'',service:''});
 const pulseTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const link=useRef<VehicleLink|null>(null),intent=useRef(new DriveIntent()),config=useRef({speed,pulse});config.current={speed,pulse};
 function transmit(){const command=intent.current.sample(performance.now(),config.current.speed,config.current.pulse);link.current?.drive(command)}
 function halt(){if(pulseTimer.current)clearTimeout(pulseTimer.current);intent.current.clear();link.current?.stop()}
 function press(source:string,direction:Direction){if(!link.current?.state.armed)return;intent.current.press(source,direction,performance.now(),config.current.pulse);transmit();if(direction==='left'||direction==='right'){if(pulseTimer.current)clearTimeout(pulseTimer.current);pulseTimer.current=setTimeout(transmit,config.current.pulse+1)}}
 function release(source:string){intent.current.release(source);transmit()}
 useEffect(()=>{
  setOrigin(location.origin);let mounted=true;const current=new VehicleLink(s=>{if(mounted){setState(s);if(!s.armed)intent.current.clear()}});link.current=current;
  const tick=setInterval(transmit,100),keys:Record<string,Direction>={KeyW:'forward',ArrowUp:'forward',KeyS:'backward',ArrowDown:'backward',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
  const down=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,select,textarea,[role=dialog],[role=slider],[role=combobox]'))return;if(e.code==='Space'||e.code==='Escape'){e.preventDefault();halt();return}const d=keys[e.code];if(d){e.preventDefault();if(!e.repeat)press('key:'+e.code,d)}};
  const up=(e:KeyboardEvent)=>{if(keys[e.code]){e.preventDefault();release('key:'+e.code)}};
  const hidden=()=>{if(document.hidden)halt()};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',halt);window.addEventListener('pagehide',halt);document.addEventListener('visibilitychange',hidden);
  return()=>{mounted=false;clearInterval(tick);if(pulseTimer.current)clearTimeout(pulseTimer.current);intent.current.clear();void current.close();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',halt);window.removeEventListener('pagehide',halt);document.removeEventListener('visibilitychange',hidden)};
 },[]);
 async function connect(){if(busy)return;setBusy(true);try{await link.current?.connect(settings);setSettingsOpen(false)}catch{}finally{setBusy(false)}}
 const arrows=[['forward','Tiến',ArrowUp],['left','Rẽ trái',ArrowLeft],['right','Rẽ phải',ArrowRight],['backward','Lùi',ArrowDown]] as const;
 return <>
  <div className="drive-identity"><span className="small-label">VEHICLE CONTROL</span><h2>Porsche 911 RSR</h2><div className="connection-state"><span className={state.connected?'online':''}/>{state.connected?'Hub đã kết nối':'Offline'}</div></div>
  <aside className="drive-panel">
   <div className="drive-panel-heading"><div><span className="small-label">ĐIỀU KHIỂN THỦ CÔNG</span><h2>{state.armed?'Sẵn sàng nhận lệnh':'Đang khóa truyền động'}</h2></div><button className="icon-button" aria-label="Cài đặt kết nối" onClick={()=>{halt();setSettingsOpen(true)}}><Settings2 size={17}/></button></div>
   <button className="connect-button" disabled={busy} onClick={()=>state.connected?void link.current?.close():setSettingsOpen(true)}><Bluetooth size={16}/>{state.connected?'Ngắt kết nối':'Kết nối xe'}</button>
   <div className="drive-section"><div className="drive-label"><span>Mức truyền động</span><strong>{speed}<small>%</small></strong></div><Slider min={25} max={100} step={1} value={[speed]} aria-label="Mức truyền động" onValueChange={v=>{setSpeed(v[0]);intent.current.clear()}}/><div className="drive-presets">{[30,50,100].map(v=><button key={v} className={speed===v?'chosen':''} onClick={()=>{setSpeed(v);intent.current.clear()}}>{v}%</button>)}</div></div>
   <div className="drive-section"><div className="drive-label"><span>Xung rẽ</span><strong>{pulse}<small>ms</small></strong></div><Slider min={100} max={500} step={25} value={[pulse]} aria-label="Thời lượng xung rẽ" onValueChange={v=>setPulse(v[0])}/><p>Nhấn một lần để rẽ. Cơ cấu tự hồi tâm khi cắt lệnh.</p></div>
   <div className="command-readout"><span>Lệnh đang gửi</span><strong>{state.fb>0?'Tiến':state.fb<0?'Lùi':'Dừng'}{state.lr<0?' · Trái':state.lr>0?' · Phải':''}</strong></div>
   <button className="arm-button" disabled={!state.connected||busy} onClick={()=>{intent.current.clear();state.armed?halt():link.current?.arm()}}><Power size={15}/>{state.armed?'Khóa điều khiển':'Bật điều khiển'}</button>
   <p className="drive-status" role="status">{state.message}</p>
  </aside>
  <div className="drive-pad-area"><div className="drive-pad">{arrows.map(([direction,label,Icon])=><button key={direction} className={'direction '+direction} disabled={!state.armed} aria-label={label} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);press('pointer:'+e.pointerId,direction)}} onPointerUp={e=>release('pointer:'+e.pointerId)} onPointerCancel={e=>release('pointer:'+e.pointerId)} onLostPointerCapture={e=>release('pointer:'+e.pointerId)} onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();press('button:'+direction,direction)}}} onKeyUp={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();release('button:'+direction)}}}><Icon size={20}/></button>)}<button className="stop-button" aria-label="Dừng và khóa điều khiển" onClick={halt}><Square size={15} fill="currentColor"/></button></div><div className="drive-pad-copy"><strong>Giữ để chạy. Thả để dừng.</strong><span>W A S D / phím mũi tên · Space để dừng</span></div></div>
  <span className="telemetry-note">Mô hình tham chiếu · Hub chưa cung cấp telemetry</span>
  <Dialog open={settingsOpen} onOpenChange={open=>{if(open)halt();setSettingsOpen(open)}}><DialogContent className="connection-dialog"><DialogTitle>Kết nối xe</DialogTitle><DialogDescription>Chọn đường kết nối tới hub BLE của xe.</DialogDescription>
   <Select value={settings.transport} onValueChange={v=>setSettings(s=>({...s,transport:v as LinkSettings['transport']}))}><SelectTrigger aria-label="Phương thức kết nối"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="bridge">Python local</SelectItem><SelectItem value="bluetooth">Bluetooth trình duyệt</SelectItem></SelectContent></Select>
   {settings.transport==='bridge'?<><p>Chạy bridge trên cùng máy đang mở web:</p><code>pip install -r controller/requirements.txt</code><code>python controller/bridge.py --origin {origin}</code><label>Địa chỉ bridge<input value={settings.endpoint} onChange={e=>setSettings(s=>({...s,endpoint:e.target.value}))}/></label><label>Token từ Python<input type="password" autoComplete="off" value={settings.token} onChange={e=>setSettings(s=>({...s,token:e.target.value}))}/></label></>:<><p>Dùng trình duyệt hỗ trợ Web Bluetooth trên HTTPS. Chọn đúng hub QY / CB26 trong hộp thoại của trình duyệt.</p><label>Service UUID<input placeholder="UUID service chứa characteristic điều khiển" value={settings.service} onChange={e=>setSettings(s=>({...s,service:e.target.value.trim()}))}/></label><p>File gốc chỉ có characteristic UUID. Lấy service thực tế bằng:</p><code>python controller/bridge.py --discover</code></>}
   <p className="connection-error" role="status">{state.message}</p><button className="connect-button" disabled={busy||state.connected} onClick={()=>void connect()}>{busy?'Đang kết nối…':'Kết nối'}</button>
  </DialogContent></Dialog>
 </>;
}
