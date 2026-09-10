'use client';
import {useMemo} from 'react';
import type {ModelData} from './model-types';
import {resolvePhoneMountInstallation} from './phone-mount-install';
import {buildMountParts,mountInventory} from './phone-mount-parts';
import {auditPhoneMount} from './phone-mount-audit';
import {ChevronLeft,ChevronRight,ArrowUpRight} from 'lucide-react';
const stages=[
 {title:'Bốn pin vào mặt dưới chassis',body:'Neo vào bốn lỗ góc phía trước của hai frame 5 × 7 có sẵn dưới gầm. Áp hai beam 15L vào mặt dưới frame, mỗi beam dùng hai pin đen 2L. Đường lắp đi từ dưới lên; không tháo mui, cửa, ghế hay pin cũ. Hai beam này đưa chân giá đỡ ra ngoài thân xe.'},
 {title:'Dựng hai giằng ngoài thân xe',body:'Mỗi bên có một trụ 15L và một giằng chéo 11L, tạo tam giác 48 × 64 × 80 mm cùng beam dưới gầm. Connector 15100 đổi hướng lỗ; chân chéo dùng spacer 1L và pin 3L. Nối thêm trụ 9L bằng hai pin cách nhau hai khoảng lỗ. Toàn bộ trụ nằm ngoài vỏ xe.'},
 {title:'Khóa cầu phía trên mui',body:'Ở mỗi cao độ, ghép ba beam 15L thành thanh ngang: hai beam ngoài và một beam giữa ở lớp kế tiếp. Khóa mỗi vùng chồng bằng hai pin. Hai thanh ngang cách cao độ 16 mm, nối cả hai trụ ngoài thân xe. Mui xe nằm dưới cầu và không mang tải điện thoại.'},
 {title:'Lắp đáy, lưng và chặn cạnh',body:'Bốn connector 15100 đỡ đáy máy. Spine phía sau và hai spacer tạo mặt tựa lưng. Hai rail bên dẫn hướng bốn axle 5L; bush ở đầu trong là mặt chặn điện thoại. Trượt axle để chỉnh chiều rộng, rồi ép hai half-bush sát hai mặt rail để giữ vị trí. Đây đều là mảnh LEGO, không có đệm dán.'},
 {title:'Đặt Aris rồi khóa lồng',body:'Đặt máy nằm ngang, tựa đáy và lưng, camera sau hướng đầu xe. Lắp hai thanh trước và nắp trên, rồi điều chỉnh các axle chặn trước/trên; khóa mỗi axle bằng half-bush ở hai phía thanh dẫn. Chặn được đặt sát máy, không siết ép màn hình. Muốn lấy máy ra, mở các thanh của lồng; xe gốc vẫn nguyên vẹn.'}
];
type Props={data:ModelData|null;step:number;onStep:(n:number)=>void;context:boolean;onContext:(v:boolean)=>void;exploded:boolean;onExploded:(v:boolean)=>void};
export default function AdvancedPanel({data,step,onStep,context,onContext,exploded,onExploded}:Props){
 const review=useMemo(()=>{if(!data)return null;const install=resolvePhoneMountInstallation(data);if(!install)return null;const plan=buildMountParts(install);return {install,plan,audit:auditPhoneMount(data,install,plan.parts)}},[data]);
 const inventory=review?mountInventory(review.plan.parts,step):[];
 return <>
 <div className="advanced-title"><span className="small-label">CAMERA RIG / 04</span><h1>Add-on camera cage.</h1><p>Giữ nguyên xe · Khóa bằng LEGO · Vsmart Aris</p></div>
 <div className="advanced-view-options"><button aria-pressed={!context} onClick={()=>onContext(false)}>Cụm lắp ráp</button><button aria-pressed={context} onClick={()=>onContext(true)}>Trên xe nguyên vẹn</button><button aria-pressed={exploded} onClick={()=>onExploded(!exploded)}>Tách lớp</button></div>
 <aside className="advanced-panel" aria-label="Thiết kế giá đỡ điện thoại">
  <div className="advanced-meta"><span>0 MẢNH THÁO KHỎI XE</span><span>0{step+1} / 05</span></div>
  <h2>{stages[step].title}</h2><p className="mount-parts">{inventory.map(p=>`${p.quantity} × ${p.code}`).join(' · ')}</p><p>{stages[step].body}</p>
  <nav className="mount-stages" aria-label="Các bước lắp giá đỡ">{stages.map((s,i)=><button key={s.title} aria-current={i===step?'step':undefined} onClick={()=>onStep(i)}><span>0{i+1}</span>{s.title}</button>)}</nav>
  <div className="mount-nav"><button disabled={step===0} onClick={()=>onStep(step-1)} aria-label="Bước trước"><ChevronLeft size={17}/></button><span>{step===4?'Khóa các mặt chặn':'Chassis → giằng → cầu → lồng'}</span><button disabled={step===4} onClick={()=>onStep(step+1)} aria-label="Bước tiếp"><ChevronRight size={17}/></button></div>
  <details open={context}><summary>Vị trí bốn lỗ neo</summary>{review?.install.anchors.map((a,i)=><p key={i}>H{i+1} · frame {a.code} · instance {a.partId}<br/>Lỗ góc trước {a.socket[0]<0?'trái':'phải'} · tọa độ LDraw ({a.socket.join(', ')})</p>)}<p>{review?.audit.ok?`${review.audit.pinCount} pin/axle khớp trục và chiều dài; không có lỗ dùng trùng. Mọi mảnh nối về chassis.`:'Chưa xác nhận được bộ lỗ neo trên model này.'}</p>{review?.audit.issues.map(issue=><p key={issue}>{issue}</p>)}</details>
  <details><summary>Cơ chế giữ máy thuần LEGO</summary><p>Đáy và lưng là hai mặt tựa cố định. Bốn chặn cạnh, bốn chặn trước và hai chặn trên dùng axle trượt; bush tạo mặt chặn, half-bush khóa hai phía thanh dẫn. Các thanh ngang đóng thành lồng để máy không thoát ra trước hoặc phía trên.</p><p>Model chừa 0,2 mm tại các chặn điều chỉnh. Khi lắp thật, chỉnh theo máy thực tế và kiểm tra bush có trượt dưới tải hay không. Không dùng dây, vòng đàn hồi, keo hay EVA.</p></details>
  <details><summary>Kích thước và danh sách mảnh</summary><dl><div><dt>Aris theo asset</dt><dd>156,55 × 76,18 × 10,71 mm</dd></div><div><dt>Khoảng neo mỗi bên</dt><dd>32 mm · 4 khoảng lỗ</dd></div><div><dt>Hai truss</dt><dd>48 × 64 × 80 mm</dd></div><div><dt>Tâm hai trụ ngoài</dt><dd>304 mm</dd></div></dl>{review&&mountInventory(review.plan.parts).map(p=><p key={p.code}>{p.quantity} × {p.code} — {p.name}</p>)}<p>Mảnh dùng đúng geometry và kích thước LDraw có sẵn. Axle được trượt để chỉnh chặn, không kéo giãn asset.</p><a href="/camera-bridge-design.md" target="_blank" rel="noreferrer">Bản thiết kế và trình tự lắp chi tiết ↗</a></details>
  <details><summary>Đánh đổi và kiểm tra</summary><p>Để giữ nguyên xe, giá đi ngoài thân và phía trên mui: rộng, cao hơn một giá lắp xuyên cockpit. Đây là phương án ưu tiên không tháo mảnh; không phải cấu hình nhỏ gọn nhất.</p><p>Đã kiểm tra kết nối và giao cắt bề mặt với toàn bộ xe gốc. Chưa đo độ cứng, độ rung, lực giữ của bush hay thử hết hành trình hệ treo. Cần thử tải và kiểm tra gầm trước khi chạy; không xem kiểm tra hình học là chứng nhận cơ khí.</p></details>
  <details><summary>Lộ trình VLA</summary><p>Điện thoại thu hình; máy tính chạy policy và gửi lệnh qua bộ giám sát. Cố định camera pose trước khi thu dataset.</p><a className="roadmap-link" href="/VLA-roadmap.md" target="_blank" rel="noreferrer">Dữ liệu, training & triển khai <ArrowUpRight size={16}/></a></details>
 </aside>
 <div className="advanced-footnote">Ráp thêm hoàn toàn · không dây giữ · đề xuất cần thử tải thực tế</div>
 </>;
}
