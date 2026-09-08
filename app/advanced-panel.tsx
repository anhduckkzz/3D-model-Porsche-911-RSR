'use client';
import {ChevronLeft,ChevronRight,ArrowUpRight} from 'lucide-react';
const stages=[
 {title:'Điểm neo vào chassis',parts:'2 × beam 15L · 2 × beam 5L · 4 vùng neo',body:'Tháo panel cần thiết để tiếp cận dầm chassis. Chọn bốn vùng neo đối xứng, mỗi vùng dùng ít nhất hai chốt chống xoay. Các khối xanh là vùng cần tìm lỗ phù hợp trên xe thật, chưa phải vị trí pin đã xác nhận.'},
 {title:'Tháp đỡ có giằng chéo',parts:'4 × beam 9L · 2 × beam 11L',body:'Dựng bốn chân từ chassis lên phía trên mui. Giằng tam giác hai bên để hạn chế rung khi rẽ. Chân không tì lên kính, cửa hay panel mui; chừa đường đi cho dây và hệ lái.'},
 {title:'Khay ngang, đệm hai điểm',parts:'4 × beam 13L · 2 miếng đệm mỏng',body:'Mỗi mép khay ghép hai beam 13L lệch lớp, chồng 5 lỗ để tạo nhịp 21 stud. Khóa mối nối bằng pin đúng chiều dài. Đệm dưới hai đầu điện thoại, để thông thoáng phần giữa và cổng sạc.'},
 {title:'Chặn cạnh và khóa trên',parts:'2 × beam 11L · 2 chặn 3L · đầu nối góc',body:'Đặt hai trụ cạnh cách nhau 21 stud, lót đệm mỏng và chỉnh theo máy thật. Hai chặn trên chỉ ôm góc máy; dùng dây giữ dự phòng ở mép màn hình. Không ép nút nguồn, âm lượng hoặc che camera.'},
 {title:'Lắp Aris, căn đường nhìn',parts:'Vsmart Aris thường · camera sau hướng đầu xe',body:'Đặt máy ngang, màn hình quay về đuôi xe. Chọn camera sau chính 1× và khóa chiều xoay video. Căn ảnh để thấy mặt sàn phía trước, kiểm tra mui không che tầm nhìn. Nón nhìn trong 3D chỉ minh họa hướng, chưa phải FOV đo.'}
];
type Props={step:number;onStep:(n:number)=>void;context:boolean;onContext:(v:boolean)=>void;exploded:boolean;onExploded:(v:boolean)=>void};
export default function AdvancedPanel({step,onStep,context,onContext,exploded,onExploded}:Props){return <>
 <div className="advanced-title"><span className="small-label">CAMERA RIG / 01</span><h1>Aris on board.</h1><p>Khung Technic tháo rời · Camera sau</p></div>
 <div className="advanced-view-options"><button aria-pressed={!context} onClick={()=>onContext(false)}>Giá đỡ</button><button aria-pressed={context} onClick={()=>onContext(true)}>Vị trí trên xe</button><button aria-pressed={exploded} onClick={()=>onExploded(!exploded)}>Tách lớp</button></div>
 <aside className="advanced-panel" aria-label="Thiết kế giá đỡ điện thoại">
  <div className="advanced-meta"><span>THIẾT KẾ NGUYÊN MẪU</span><span>0{step+1} / 05</span></div>
  <h2>{stages[step].title}</h2><p className="mount-parts">{stages[step].parts}</p><p>{stages[step].body}</p>
  <nav className="mount-stages" aria-label="Các bước lắp giá đỡ">{stages.map((s,i)=><button key={s.title} aria-current={i===step?'step':undefined} onClick={()=>onStep(i)}><span>0{i+1}</span>{s.title}</button>)}</nav>
  <div className="mount-nav"><button disabled={step===0} onClick={()=>onStep(step-1)} aria-label="Bước giá đỡ trước"><ChevronLeft size={17}/></button><span>{step===4?'Hoàn chỉnh':'Lắp lần lượt từng lớp'}</span><button disabled={step===4} onClick={()=>onStep(step+1)} aria-label="Bước giá đỡ tiếp"><ChevronRight size={17}/></button></div>
  <details><summary>Kích thước & linh kiện</summary><dl><div><dt>Thân máy tham chiếu</dt><dd>156,2 × 75,04 × 8,55 mm</dd></div><div><dt>Khối lượng máy</dt><dd>178 g · chưa gồm ốp</dd></div><div><dt>Khay dự kiến</dt><dd>21 stud · 168 mm</dd></div><div><dt>Khe lắp mục tiêu</dt><dd>158–162 × 78–82 × 12–16 mm</dd></div></dl><p>Danh sách beam: 2×15L, 4×13L, 4×11L, 4×9L, 2×5L, 2×3L; dự trù pin 2L/3L, đầu nối góc, spacer, đệm và dây giữ. Phải chốt số lượng connector sau khi chọn lỗ neo. Đây là linh kiện bổ sung, không giả định có sẵn trong bộ 42096.</p><p>Đo lại máy, ốp và camera bump trước khi lắp. Các nguồn công bố kích thước hơi khác nhau. <a href="https://www.devicespecifications.com/en/model/ac6c5490" target="_blank" rel="noreferrer">Thông số Aris ↗</a></p></details>
  <details><summary>Kiểm tra trước khi chạy</summary><p>Đo khe mui, hành trình hệ treo và độ rơ của pin. Giữ camera thấp nhất có thể mà vẫn nhìn qua mui; kiểm tra rung, trượt máy và nguy cơ lật khi rẽ. Nếu bốn chân không đi được xuống chassis, đổi vị trí neo trước khi lắp — không ép panel để vừa bản vẽ.</p></details>
  <details><summary>Lộ trình VLA</summary><p>Bắt đầu bằng MobileNetV3 + GRU học từ video lái xe của chính bạn. Khi cần hiểu “rẽ trái ở giao lộ” hoặc “đến vật màu đỏ”, fine-tune SmolVLA 450M trên dữ liệu xe. Điện thoại thu hình; máy tính chạy policy và gửi lệnh qua bộ giám sát.</p><a className="roadmap-link" href="/VLA-roadmap.md" target="_blank" rel="noreferrer">Đọc kế hoạch dữ liệu, training & triển khai <ArrowUpRight size={16}/></a></details>
 </aside>
 <div className="advanced-footnote">Mô hình nguyên lý có kích thước · điểm neo và đầu nối cần thử trên xe thật</div>
 </>}
