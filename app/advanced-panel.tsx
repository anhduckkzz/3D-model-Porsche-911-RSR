'use client';
import {useMemo} from 'react';
import type {ModelData} from './model-types';
import {resolvePhoneMountInstallation} from './phone-mount-install';
import {buildMountParts,mountInventory} from './phone-mount-parts';
import {auditPhoneMount} from './phone-mount-audit';
import {mountPreparation} from './phone-mount-preparation';
import {ChevronLeft,ChevronRight,ArrowUpRight} from 'lucide-react';

const stages=[
 {title:'Neo add-on vào chassis',body:'Giữ nguyên xe. Resolver tìm một cửa sổ 9L trên cặp rail 15L kết cấu, chỉ chấp nhận khi cả bốn lỗ neo đều đang trống và đường đưa pin từ phía ngoài không bị phần thân nguyên bản chắn. Hai beam 9L mới nằm một lớp Technic ra ngoài rail gốc và được khóa bằng bốn pin 2L.'},
 {title:'Dựng hai side-truss',body:'Mỗi bên dùng beam đứng 9L và beam chéo 11L tạo tam giác thấp 6–8–10. Các thanh nằm ở lớp kế nhau; chân chéo dùng spacer 1L + pin 3L để không xuyên vật liệu. Hai tam giác đưa tải xuống hai base rail thay vì tì lên panel thân xe.'},
 {title:'Khóa bằng cross bridge',body:'Hai cao độ crossbar nối trái–phải thành một khung chống xoắn. Mỗi crossbar ghép từ hai beam 13L stock ở hai lớp chiều sâu, khóa qua vùng overlap bằng pin; connector 15100 truyền bridge vào hai truss. Không có beam nào bị kéo giãn để vừa kích thước.'},
 {title:'Lắp locking cradle LEGO',body:'Hai rail 5L chạy trước–sau làm gờ đỡ đáy; hai rail 9L phía sau tạo mặt tựa. Upright trái đồng thời là chặn trái, còn bên phải có một rail 9L dịch đúng một lỗ Technic vào trong. Cách bố trí lệch 4 mm của máy tạo khoảng hở cage xấp xỉ 160 mm cho Aris rộng 156,55 mm, hoàn toàn không dùng EVA hay cao su.'},
 {title:'Đặt Aris và đóng top yoke',body:'Trượt Vsmart Aris xuống cradle: đáy nằm trên hai ledge, lưng về hai backrest và hai cạnh nằm giữa chặn trái/phải. Sau đó lắp yoke thuần LEGO phía trên gồm hai beam 9L và beam khóa giữa 7L; bốn nhánh pin nối yoke về hai side stop và hai backrest để máy không thể bật khỏi cage.'}
];

type Props={data:ModelData|null;step:number;onStep:(n:number)=>void;context:boolean;onContext:(v:boolean)=>void;exploded:boolean;onExploded:(v:boolean)=>void};
export default function AdvancedPanel({data,step,onStep,context,onContext,exploded,onExploded}:Props){
 const review=useMemo(()=>{if(!data)return null;const install=resolvePhoneMountInstallation(data);if(!install)return null;const plan=buildMountParts(install);return {install,plan,audit:auditPhoneMount(data,install,plan.parts),removed:mountPreparation(data).size}},[data]);
 const inventory=review?mountInventory(review.plan.parts,step):[];
 return <>
 <div className="advanced-title"><span className="small-label">CAMERA RIG / 03</span><h1>Chassis camera bridge.</h1><p>42096 · Zero-removal add-on · Vsmart Aris</p></div>
 <div className="advanced-view-options"><button aria-pressed={!context} onClick={()=>onContext(false)}>Cụm lắp ráp</button><button aria-pressed={context} onClick={()=>onContext(true)}>Trên chassis</button><button aria-pressed={exploded} onClick={()=>onExploded(!exploded)}>Tách lớp</button></div>
 <aside className="advanced-panel" aria-label="Thiết kế giá đỡ điện thoại">
  <div className="advanced-meta"><span>FOUR EMPTY CHASSIS ANCHORS</span><span>0{step+1} / 05</span></div>
  {step===0&&<div className="mount-audit"><strong>Add-on trên xe nguyên bản</strong><p>Không có bước tháo mui, cửa, ghế hay panel. Nếu bốn hardpoint trống/đường đưa pin không tồn tại trên model nguyên trạng, resolver từ chối dựng mount thay vì ẩn mảnh xe hoặc chuyển cả rig sang tọa độ đoán.</p></div>}
  <h2>{stages[step].title}</h2><p className="mount-parts">{inventory.map(p=>`${p.quantity} × ${p.code}`).join(' · ')||(step===4?'Vsmart Aris':'—')}</p><p>{stages[step].body}</p>
  <nav className="mount-stages" aria-label="Các bước lắp giá đỡ">{stages.map((s,i)=><button key={s.title} aria-current={i===step?'step':undefined} onClick={()=>onStep(i)}><span>0{i+1}</span>{s.title}</button>)}</nav>
  <div className="mount-nav"><button disabled={step===0} onClick={()=>onStep(step-1)} aria-label="Bước trước"><ChevronLeft size={17}/></button><span>{step===4?'Đặt máy → đóng yoke':'Chassis → truss → bridge → cradle'}</span><button disabled={step===4} onClick={()=>onStep(step+1)} aria-label="Bước tiếp"><ChevronRight size={17}/></button></div>
  <details open={context}><summary>Bốn điểm neo và kết nối</summary>{review?.install.anchors.map((a,i)=><p key={i}>H{i+1} · beam {a.code} · instance {a.partId} · lỗ {a.hole+1}</p>)}{review?<p>{review.audit.ok?`${review.audit.pinCount} fastener/connector tạo chuỗi liên kết liên tục xuống chassis; 4/4 lỗ neo trống.`:'Cấu hình hiện tại chưa vượt qua audit kết nối.'}</p>:<p>Không tìm thấy bộ bốn hardpoint trống có đường lắp từ ngoài trên cấu hình xe nguyên bản.</p>}{review?.audit.issues.map(issue=><p key={issue}>{issue}</p>)}</details>
  <details><summary>Có phải tháo mảnh gốc không?</summary><p><strong>{review?.removed??0} mảnh gốc tháo.</strong> Cấu hình này được thiết kế như một add-on. Scene không còn ẩn roof, door, cockpit hay cụm chassis để tạo khoảng trống giả cho mount.</p><p>Chế độ Trên chassis chỉ làm gọn ngữ cảnh quan sát; tab Điều khiển vẫn render xe nguyên bản đầy đủ cùng cụm camera đã lắp. Khám phá và hướng dẫn lắp xe không bị thay đổi.</p><a href="/camera-bridge-design.md" target="_blank" rel="noreferrer">Bản thiết kế và trình tự lắp ↗</a></details>
  <details><summary>Kích thước và danh sách mảnh</summary><dl><div><dt>Aris theo asset</dt><dd>156,55 × 76,18 × 10,71 mm</dd></div><div><dt>Khoảng neo dọc</dt><dd>64 mm · 8 khoảng lỗ</dd></div><div><dt>Side-truss</dt><dd>9L đứng + 11L chéo</dd></div><div><dt>Cage ngang</dt><dd>≈160 mm · máy lệch 4 mm để fit grid LEGO</dd></div></dl>{review&&mountInventory(review.plan.parts).map(p=><p key={p.code}>{p.quantity} × {p.code} — {p.name}</p>)}<p>Toàn bộ phần giữ máy là geometry LEGO/LDraw: bottom ledge, backrest, side stop và top yoke. Không có vòng đàn hồi, EVA, foam hay collider vô hình. <a href="/ldraw-part-credits.txt" target="_blank" rel="noreferrer">Nguồn asset ↗</a></p></details>
  <details><summary>Đường truyền lực và phạm vi kiểm tra</summary><p>Aris → hai ledge + backrest/side cage → top yoke → outer uprights/cross bridge → hai side-truss → hai base rail → bốn pin chassis. Yoke được khóa ở bốn nhánh nên không phải một thanh trang trí cantilever.</p><p>Audit hiện kiểm tra tâm lỗ, trục pin, chiều dài fastener, lỗ neo đang trống và chuỗi kết nối xuống chassis. Đây vẫn là đề xuất cơ khí từ hình học model; tải rung, dung sai mảnh thật và độ cứng của điện thoại cần được test vật lý ở tốc độ thấp trước khi dùng để thu dữ liệu.</p></details>
  <details><summary>Lộ trình VLA</summary><p>Điện thoại thu hình; máy tính chạy policy và gửi lệnh qua bộ giám sát. Cố định camera pose trước khi thu dataset.</p><a className="roadmap-link" href="/VLA-roadmap.md" target="_blank" rel="noreferrer">Dữ liệu, training & triển khai <ArrowUpRight size={16}/></a></details>
 </aside>
 <div className="advanced-footnote">Add-on cho chassis 42096 · 0 mảnh tháo · pure LEGO retention · cần thử nghiệm vật lý</div>
 </>;
}
