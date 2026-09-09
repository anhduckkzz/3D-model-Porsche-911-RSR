'use client';
import {useMemo} from 'react';
import type {ModelData} from './model-types';
import {resolvePhoneMountInstallation} from './phone-mount-install';
import {buildMountParts,mountInventory} from './phone-mount-parts';
import {auditPhoneMount} from './phone-mount-audit';
import {mountPreparation} from './phone-mount-preparation';
import {ChevronLeft,ChevronRight,ArrowUpRight} from 'lucide-react';
const stages=[
 {title:'Neo vào hai rail chassis',body:'Dùng hai beam 9L đặt sát mặt ngoài hai rail 15L có sẵn. Mỗi beam mới được giữ bằng hai pin đen 2L, xuyên lỗ 6 và 14 của rail chassis — khoảng cách 64 mm. Đếm lỗ theo đầu beam được đánh dấu H1/H3 trên model; hai vòng còn lại là H2/H4. Lắp bốn pin neo trước khi dựng giằng.'},
 {title:'Khóa hai tam giác giằng',body:'Trên mỗi đáy 9L, dùng lỗ 2 và 8 làm chân tam giác: dựng beam 9L ở chân trước, nối beam chéo 11L từ chân sau lên đỉnh. Khoảng tâm tạo tam giác 48 × 64 × 80 mm. Chân chéo dùng spacer 1L và pin xanh 3L; chân đứng và đỉnh dùng pin đen 2L. Các beam nằm ở các lớp kề nhau, không chồng xuyên vật liệu.'},
 {title:'Nối cầu ngang ở hai cao độ',body:'Cắm hai connector 15100 vào lỗ 5 và 7 của mỗi beam đứng. Mỗi thanh ngang ghép hai beam 13L chồng ba lỗ, khóa bằng hai pin ở hai đầu vùng chồng. Hai thanh cách nhau 16 mm để chống lật cradle quanh một trục. Bên phải thêm spacer 1L và pin 3L để bù đúng một lớp chiều sâu.'},
 {title:'Lắp cradle và các mặt tựa',body:'Hai beam 11L đứng ở hai mép được khóa vào cả hai thanh ngang. Bốn connector 15100 ở thanh dưới tạo ledge ngắn đỡ đáy máy; bốn rail 5L chặn cạnh ở hai cao độ. Hai beam 7L bù lớp mặt lưng bên trái. Dán bốn đệm EVA 6 mm vào chặn cạnh và hai đệm 1 mm vào mặt lưng. EVA là phụ kiện ngoài LEGO.'},
 {title:'Đặt máy và khóa hai vòng giữ',body:'Đặt Aris nằm ngang, camera sau hướng đầu xe, đáy tựa trên bốn ledge và lưng tựa đệm. Luồn hai vòng đàn hồi 6,4 mm ôm cả điện thoại lẫn cầu ngang, rồi căng đều. Vòng giữ kéo máy về mặt lưng và xuống ledge; không buộc riêng quanh điện thoại. Kiểm tra camera, nút bấm và cổng kết nối trước khi chạy.'}
];
type Props={data:ModelData|null;step:number;onStep:(n:number)=>void;context:boolean;onContext:(v:boolean)=>void;exploded:boolean;onExploded:(v:boolean)=>void};
export default function AdvancedPanel({data,step,onStep,context,onContext,exploded,onExploded}:Props){
 const review=useMemo(()=>{if(!data)return null;const install=resolvePhoneMountInstallation(data);if(!install)return null;const plan=buildMountParts(install);return {install,plan,audit:auditPhoneMount(data,install,plan.parts),removed:mountPreparation(data).size}},[data]);
 const inventory=review?mountInventory(review.plan.parts,step):[];
 return <>
 <div className="advanced-title"><span className="small-label">CAMERA RIG / 03</span><h1>Chassis camera bridge.</h1><p>42096 · Open-cockpit conversion · Vsmart Aris</p></div>
 <div className="advanced-view-options"><button aria-pressed={!context} onClick={()=>onContext(false)}>Cụm lắp ráp</button><button aria-pressed={context} onClick={()=>onContext(true)}>Trên chassis</button><button aria-pressed={exploded} onClick={()=>onExploded(!exploded)}>Tách lớp</button></div>
 <aside className="advanced-panel" aria-label="Thiết kế giá đỡ điện thoại">
  <div className="advanced-meta"><span>FOUR CHASSIS ANCHORS</span><span>0{step+1} / 05</span></div>
  {step===0&&<div className="mount-audit"><strong>Chuẩn bị: mở phần thân trên</strong><p>Thiết kế này cần tháo mui, cửa, ghế và các cụm đỡ thân trên được chỉ định. Giữ hai rail chassis, động cơ, hệ treo và bánh xe. Xem danh sách tháo cụ thể bên dưới; đây là một biến thể xe camera, không phải phụ kiện lắp trên thân xe nguyên trạng.</p></div>}
  <h2>{stages[step].title}</h2><p className="mount-parts">{inventory.map(p=>`${p.quantity} × ${p.code}`).join(' · ')||'Aris · 2 vòng đàn hồi'}</p><p>{stages[step].body}</p>
  <nav className="mount-stages" aria-label="Các bước lắp giá đỡ">{stages.map((s,i)=><button key={s.title} aria-current={i===step?'step':undefined} onClick={()=>onStep(i)}><span>0{i+1}</span>{s.title}</button>)}</nav>
  <div className="mount-nav"><button disabled={step===0} onClick={()=>onStep(step-1)} aria-label="Bước trước"><ChevronLeft size={17}/></button><span>{step===4?'Cố định camera':'Chassis → giằng → bridge → cradle'}</span><button disabled={step===4} onClick={()=>onStep(step+1)} aria-label="Bước tiếp"><ChevronRight size={17}/></button></div>
  <details open={context}><summary>Bốn điểm neo và kết nối</summary>{review?.install.anchors.map((a,i)=><p key={i}>H{i+1} · beam {a.code} · instance {a.partId} · lỗ {a.hole+1}</p>)}<p>{review?.audit.ok?`${review.audit.pinCount} fastener khớp tâm, trục và chiều dài; không có lỗ bị dùng trùng. Mọi mảnh có liên kết về chassis.`:'Model chưa đáp ứng bộ lỗ neo của bản thiết kế này.'}</p>{review?.audit.issues.map(issue=><p key={issue}>{issue}</p>)}</details>
  <details><summary>Tháo cụm nào trước khi lắp?</summary><p>Tháo nguyên cụm mui, hai cửa và ghế; tháo hai cụm chassis6/chassis9, các cụm thân trên ở bước nguồn 159–162 và 213, cùng các beam/pin nối được liệt kê trong bản thiết kế. Tổng cộng {review?.removed??'…'} mảnh tạm tháo. Số bước nguồn là của model MPD, không phải số trang PDF.</p><p>Chế độ Trên chassis ẩn thêm vỏ đầu/đuôi để thấy đường lắp. Tab Điều khiển hiển thị cấu hình xe sau chuyển đổi. Khám phá và hướng dẫn xe nguyên bản vẫn giữ đủ mảnh.</p><a href="/camera-bridge-design.md" target="_blank" rel="noreferrer">Bản thiết kế, danh sách tháo và trình tự lắp ↗</a></details>
  <details><summary>Kích thước và danh sách mảnh</summary><dl><div><dt>Aris theo asset</dt><dd>156,55 × 76,18 × 10,71 mm</dd></div><div><dt>Khoảng neo dọc</dt><dd>64 mm · 8 khoảng lỗ</dd></div><div><dt>Hai truss</dt><dd>48 × 64 × 80 mm</dd></div><div><dt>Cradle</dt><dd>23 vị trí lỗ · tâm hai mép cách 176 mm</dd></div></dl>{review&&mountInventory(review.plan.parts).map(p=><p key={p.code}>{p.quantity} × {p.code} — {p.name}</p>)}<p>Toàn bộ mảnh LEGO dùng geometry LDraw có sẵn, không kéo giãn. Vòng đàn hồi và EVA được ghi riêng là phụ kiện ngoài LEGO. <a href="/ldraw-part-credits.txt" target="_blank" rel="noreferrer">Nguồn asset ↗</a></p></details>
  <details><summary>Đường truyền lực và phạm vi kiểm tra</summary><p>Trọng lượng máy → bốn ledge → cầu ngang → hai chân đứng và giằng chéo → đáy 9L → bốn pin neo chassis. Hai thanh ngang cách cao độ và hai pin ở mỗi vùng nối giúp hạn chế xoay; vòng đàn hồi giữ máy vào các mặt tựa.</p><p>Đã kiểm tra kết nối và giao cắt bề mặt với model xe sau tháo cụm. Đây là đề xuất cơ khí dựa trên hình học; chưa thử tải, rung, dung sai mảnh thật hay toàn hành trình hệ treo. Kiểm tra lắc tay và chạy chậm trước khi cố định camera để thu dữ liệu.</p></details>
  <details><summary>Lộ trình VLA</summary><p>Điện thoại thu hình; máy tính chạy policy và gửi lệnh qua bộ giám sát. Cố định camera pose trước khi thu dataset.</p><a className="roadmap-link" href="/VLA-roadmap.md" target="_blank" rel="noreferrer">Dữ liệu, training & triển khai <ArrowUpRight size={16}/></a></details>
 </aside>
 <div className="advanced-footnote">Đề xuất lắp trên chassis 42096 · mảnh LEGO thật · cần thử nghiệm vật lý</div>
 </>;
}
