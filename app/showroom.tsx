'use client';
import {useCallback,useRef,useState} from 'react';
import {ArrowUpRight,ChevronDown} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import Scene from './scene';
import type {ShowroomCar} from './showroom-catalog';
import type {ModelData,ViewerMode} from './model-types';
const parked={connected:false,armed:false,fb:0,lr:0,message:''};
const ignore=()=>{};

export default function Showroom({cars,onOpen,onOwner}:{cars:ShowroomCar[];onOpen:(car:ShowroomCar,mode:ViewerMode)=>void;onOwner:(mode:ViewerMode)=>void}){
 const [car,setCar]=useState(cars[0]),[data,setData]=useState<ModelData|null>(null);
 const previewHost=useRef<HTMLDivElement>(null);
 const ready=useCallback((value:ModelData)=>setData(value),[]);
 const choose=(value:ShowroomCar)=>{if(value.id===car.id)return;setData(null);setCar(value)};
 return <main className="showroom">
  <header className="showroom-header"><a href="/" className="showroom-wordmark">TECHNIC<span>SHOWROOM</span></a><span className="showroom-edition">Bộ sưu tập / 01</span><Popover><PopoverTrigger asChild><button className="owner-menu-trigger">Xe của tôi <ChevronDown size={12}/></button></PopoverTrigger><PopoverContent className="owner-menu" align="end"><p>Porsche 911 RSR · 42096</p><button onClick={()=>onOwner('drive')}>Điều khiển xe</button><button onClick={()=>onOwner('advanced')}>Advanced · Khung camera</button></PopoverContent></Popover></header>
  <section className="showroom-stage" aria-label={car.name}>{car.available?<Scene presentation="showroom" key={car.id} car={car} drive={parked} mountStep={4} mountContext={false} step={1} explode={0} group="all" selected={null} mode="explore" replay={0} followStep={false} bench={false} onExplosionSplit={ignore} onReady={ready} onSelect={ignore} previewHost={previewHost}/>:<div className="source-pending"><span>{car.id}</span><p>Chưa có dữ liệu 3D để mở xe này.</p><a href={car.source.url} target="_blank" rel="noreferrer">Xem nguồn mô hình <ArrowUpRight size={14}/></a></div>}</section>
  <aside className="showroom-collection" aria-label="Chọn xe"><p className="collection-label">Bộ sưu tập <span>{cars.length.toString().padStart(2,'0')}</span></p><nav>{cars.map((item,index)=><button key={item.id} className={`collection-car ${car.id===item.id?'selected':''}`} aria-pressed={car.id===item.id} onClick={()=>choose(item)}><span className="collection-index">{String(index+1).padStart(2,'0')}</span><span><small>{item.brand}</small><strong>{item.shortName}</strong><em>{item.scale} · {item.available?item.category:'Chờ dữ liệu 3D'}</em></span><span className="collection-accent" style={{background:item.accent}}/></button>)}</nav></aside>
  <div className="showroom-detail"><div className="showroom-kicker">{car.category} <span>LEGO TECHNIC / {car.id}</span></div><h1>{car.shortName}</h1><p className="showroom-marque">{car.brand}</p><div className="showroom-specs"><div><span>Tỉ lệ</span><strong>{car.scale}</strong></div><div><span>Phần tử 3D</span><strong>{data?.partCount.toLocaleString('vi-VN')??'—'}</strong></div><div><span>Thao tác lắp</span><strong>{data?.assembly.events.length.toLocaleString('vi-VN')??'—'}</strong></div></div><div className="showroom-actions"><button disabled={!car.available||!data} onClick={()=>onOpen(car,'explore')}>Khám phá 3D <ArrowUpRight size={16}/></button><button disabled={!car.available||!data} onClick={()=>onOpen(car,'build')}>Lắp ráp từng mảnh <ArrowUpRight size={16}/></button></div></div>
  <footer className="showroom-footer"><span>{car.available?'Kéo để xoay · Cuộn để xem gần':'Mô hình chưa sẵn sàng'}</span><span>1:8 / 1:10</span></footer>
 </main>;
}
