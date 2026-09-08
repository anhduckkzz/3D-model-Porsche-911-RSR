# Porsche 42096 × Vsmart Aris — kế hoạch xây dựng hệ tự hành

Thiết kế đề xuất ngày 08/09/2026. Đây là lộ trình triển khai, chưa phải model đã train hay hệ tự hành đã được kiểm chứng trên xe. Tab Advanced hiện cung cấp thiết kế giá đỡ 3D; chưa stream camera, thu dataset hoặc chạy inference.

## 1. Quyết định kiến trúc

**Khuyến nghị: baseline MobileNetV3-Small + GRU trước; SmolVLA 450M là ứng viên VLA để thử sau. Điện thoại làm camera, laptop chạy inference và kết nối BLE.** Không train một foundation model từ đầu.

Bạn đúng rằng model nhiều tỷ tham số có thể quá tốn kém cho vài thao tác tiến, lùi, trái, phải. Nhưng số lượng nút ít không làm bài toán thị giác dễ: che khuất, rung camera, nền phản sáng, mất Wi-Fi và góc nhìn thấp vẫn khó. Quyết định model bằng kết quả chạy kín vòng, không bằng số tham số đơn thuần.

Nếu xe chỉ bám đường hoặc đi đến điểm đánh dấu, policy thị giác là đủ; đó chưa phải VLA. Nếu cùng một giao lộ, câu “rẽ trái” và “rẽ phải” phải tạo hai hành vi khác nhau, mới có lý do đưa ngôn ngữ vào policy. Một model nhận chuỗi văn bản nhưng bỏ qua nó cũng chưa đáp ứng mục tiêu này.

| Lựa chọn | Vai trò trong dự án | Điều cần bổ sung |
| --- | --- | --- |
| MobileNetV3-Small + GRU | Baseline nhẹ, học lịch sử hình ảnh và lệnh, dễ đo lỗi | Action head riêng; không mặc định hiểu ngôn ngữ |
| ACT | Baseline imitation learning có action chunk trong LeRobot | Action adapter xe; không phải VLA ngôn ngữ mặc định |
| SmolVLA 450M | Ứng viên chính khi cần lệnh ngôn ngữ | Fine-tune dữ liệu xe, schema action/state riêng, kiểm tra temporal context |
| ViNT / NoMaD | Hướng khác nếu mục tiêu là visual navigation đến ảnh đích | Đầu ra waypoint cần controller và ước lượng chuyển động; không nối thẳng thành byte BLE |

MobileNetV3-Small bản phân loại chuẩn có khoảng 2,54 triệu tham số; tổng model của mình thay đổi khi bỏ classifier và thêm GRU/head. [TorchVision](https://docs.pytorch.org/vision/stable/models/generated/torchvision.models.mobilenet_v3_small.html). ACT dự đoán chuỗi hành động; dùng làm mốc so sánh, không suy diễn hiệu quả trên tay robot thành hiệu quả trên xe. [ACT](https://huggingface.co/docs/lerobot/en/act).

SmolVLA là model 450M được phát hành kèm pretrained weights; dữ liệu/đánh giá gốc chủ yếu phục vụ thao tác robot. Không có bằng chứng rằng checkpoint gốc có thể lái Porsche này ngay. [Model card](https://huggingface.co/lerobot/smolvla_base), [tài liệu fine-tune](https://huggingface.co/docs/lerobot/en/smolvla). ViNT/NoMaD được nghiên cứu cho điều hướng thị giác; vẫn có khác biệt embodiment và action. [ViNT](https://general-navigation-models.github.io/vint/), [NoMaD](https://general-navigation-models.github.io/nomad/).

## 2. Phần cứng và giá đỡ

Dùng **Aris thường**, không lấy camera trước của Aris Pro làm tham chiếu. Envelope tạm dùng 156,2 × 75,04 × 8,55 mm, 178 g theo [thông số Aris](https://www.devicespecifications.com/en/model/ac6c5490). Nguồn bán lẻ khác ghi 156,1 × 75,4 mm: phải đo máy thật, ốp, cụm camera và nút cạnh. Không coi số lẻ công bố là dung sai chế tạo.

Đặt ngang làm giảm chiều cao so với dựng dọc. Lưng máy hướng đầu xe, màn hình hướng đuôi. Tải truyền qua khay, tháp có giằng, rồi vào chassis; không dùng panel mui làm chân chịu lực. Khay ghép hai beam 13L lệch lớp mỗi mép, chồng 5 lỗ, tổng nhịp 21 stud. Khe lắp mục tiêu 158–162 × 78–82 × 12–16 mm cần được chỉnh bằng spacer/đệm theo máy thật. Chỉ kẹp cạnh/góc, để thoáng camera, cổng sạc và nút.

Danh sách sơ bộ: 2 beam 15L; 4 beam 13L; 4 beam 11L; 4 beam 9L; 2 beam 5L; 2 beam 3L. Thêm pin 2L/3L, đầu nối góc đúng trục, spacer, đệm mỏng và dây giữ dự phòng. Chưa chốt số connector vì chưa đo điểm neo của chassis đã độ motor. Các beam đen/xám là nguyên lý; khối xanh trên xe là **vùng tìm điểm neo**, không phải pin socket đã được xác nhận. Linh kiện này có thể phải mua bổ sung.

Bản 3D thể hiện envelope và pitch lỗ, chưa kiểm tra va chạm toàn bộ connector, tải, độ võng hoặc khả năng lắp đúng từng pin. Trước khi mua linh kiện: đo khoảng cách bốn điểm chassis có thể tiếp cận, khe qua mui, dây motor/hub; chốt lại BOM theo thực tế. Nếu phải tháo một phần mui, giữ riêng cụm đó để lắp trả. Không ép panel để khớp bản vẽ.

Camera cao hơn giúp nhìn qua mui nhưng tăng trọng tâm. Lắp thấp nhất có thể sau khi kiểm tra khung hình thật. Kiểm tra trượt/tuột máy, độ rơ, hệ treo khi chịu thêm 178 g và hiện tượng lật khi rẽ. Đệm rất mềm làm camera rung chậm; ưu tiên khung cứng với đệm mỏng, không treo máy bằng dây chun như một hệ treo.

## 3. Luồng chạy thực tế

Aris camera → video Wi-Fi trong LAN → laptop giải mã → policy → supervisor → Python BLE owner → hub CB26.

Web là giao diện teleop, xem trạng thái và sau này thu demo. Chỉ **một process sở hữu BLE** trong phiên tự hành. Không cho trình duyệt và Python cùng giành GATT. Tab Drive hiện vẫn giữ Web Bluetooth trực tiếp như bản bạn sửa. Khi xây pipeline tự hành, đóng đường kết nối đó rồi dùng Python làm owner, hoặc chuyển UI gửi teleop đến cùng owner. Đây là phần triển khai tiếp theo, chưa được tự động bật trong web.

Bắt đầu camera 640×480, 20–30 fps; policy 10 Hz, input 224×224 hoặc resize giữ tỷ lệ rồi pad. Đây là cấu hình thử, không phải tốc độ đã đo trên Aris. Dùng camera sau chính 1×, khóa orientation, tránh tự đổi lens. Khóa focus/exposure sau khi kiểm tra điều kiện sáng nếu ứng dụng camera hỗ trợ. Đo crop thực sau giải mã; không giả định FOV theo hình nón ở Advanced.

Có thể dùng một camera streaming app hỗ trợ RTSP trước, hoặc viết Android Camera2/WebRTC khi cần timestamp capture tốt hơn. Pipeline cần queue giữ **frame mới nhất**; bỏ frame cũ, không đợi giải mã cả hàng đợi. Mỗi frame có ID, thời gian chụp và thời gian nhận. Đo offset/drift giữa đồng hồ máy và điện thoại; không trừ trực tiếp hai monotonic clock khác thiết bị.

Không chọn mua GPU trước khi benchmark. Prototype trên laptop hiện có; CPU thử baseline, GPU nếu có để fine-tune. Với SmolVLA, đo bộ nhớ và latency trên batch 1; chưa hứa chạy realtime trên Snapdragon 730. Sau khi có baseline ổn mới thử quantization và inference on-device; thermal throttling sau 20 phút quan trọng hơn một lần suy luận nhanh.

## 4. Giao thức action phù hợp với xe này

Đã đối chiếu script bluetooth.py và controller/protocol.py: frame là `AB CD 01 FB LR 00 00 checksum`; FB/LR là signed byte; checksum là tổng hai byte modulo 256. Drive UI mới luôn gửi FB thuộc {-100, 0, 100}; không còn thanh chỉnh công suất. **100% là biên độ lệnh motor, không phải vận tốc đo được.**

LR là bang-bang ±100, rẽ theo xung 100–500 ms rồi trả 0. Không coi LR=50 là nửa góc lái. Script mô tả cơ cấu hồi tâm; vẫn đo lại khi có tải điện thoại.

Action đề xuất ở tầng policy:

- `drive ∈ {reverse, stop, forward}`.
- `steer_event ∈ {none, left, right}`.
- `pulse_ms ∈ {100, 200, 300}` trong giai đoạn đầu; thêm 400/500 chỉ khi calibration và dữ liệu hỗ trợ.
- Dừng do supervisor luôn ưu tiên hơn mọi action khác.

Đây là **sự kiện bắt đầu xung**, không phải “bắt đầu xung mới ở mỗi frame thấy đang rẽ”. Runtime giữ turn_id cho cùng một xung và tắt LR đúng deadline. Khi model muốn kéo dài/rẽ tiếp, cần sự kiện mới sau khoảng nghỉ đã đo. Đầu vào phải có hướng rẽ hiện tại, thời gian xung còn lại và lệnh trước đó. Nếu chỉ có nhãn LR từng frame, converter phải gom cạnh chuyển trạng thái thành sự kiện trước khi train.

Ví dụ mapping tới bridge có sẵn:

```json
{"type":"drive","fb":100,"turn":-1,"pulse_ms":200,"turn_id":42}
```

Heartbeat tiếp theo của cùng xung dùng cùng ID 42. Một xung mới dùng ID mới. Chưa arm thì không truyền động. Đây là ví dụ format, không phải lệnh đã được gửi tới xe.

Dự đoán chunk 5 bước × 100 ms nhưng chỉ thực thi bước đầu rồi quan sát lại; không phát mù cả chuỗi 0,5 giây. Executor giữ timer xung độc lập với thời gian inference. Nếu dùng ACT/SmolVLA với action vector liên tục, cần processor mã hóa/giải mã các class và duration, hysteresis, kiểm tra out-of-range; không làm tròn tùy ý rồi nối vào hub.

100% có thể quá nhanh để học trong phòng. Giữ nguyên yêu cầu UI, nhưng autonomy phải vượt bài kiểm tra quãng dừng. Nếu không đạt, đổi tỷ số truyền hoặc thử pulse/coast cho tiến/lùi sau calibration; không lén thay biên độ hoặc giả định duty-cycle tỷ lệ tuyến tính với vận tốc. Nếu phần cứng không thể chạy chậm và dừng tin cậy, đó là giới hạn phải giải quyết trước model.

## 5. Calibration trước khi thu dữ liệu

Đo với điện thoại và giá đỡ đã lắp: vận tốc khi tiến/lùi ở 100%, thời gian phản ứng, quãng trôi khi FB=0, bán kính rẽ ở các pulse, thời gian hồi tâm, ảnh hưởng pin đầy/cạn và mặt sàn. Đo bằng video ngoài xe có thước/marker; đừng lấy animation trên web làm ground truth.

Hiệu chuẩn nội tại camera bằng checkerboard ở đúng resolution/crop; đo pitch và yaw camera so với chassis. Ghi calibration_id, lens_id, chiều xoay và vị trí giá đỡ trong metadata. Đổi vị trí mount nghĩa là đổi phân bố ảnh; phải kiểm tra lại.

Đo capture→decode→inference→write, cùng độ trễ cơ khí. Khoảng trống cần thiết ít nhất phải tính `v × độ trễ p95 + quãng trôi khi dừng + biên dự phòng` với v đo thật. Không chọn ngưỡng 200 ms chỉ vì nghe nhanh. Một camera trước không quan sát phía sau: tắt reverse tự hành mặc định cho đến khi có quan sát phía sau hoặc quy trình xác nhận vùng lùi trống. Teleop vẫn có thể lùi dưới quan sát của người.

## 6. Dataset cần thu

Dataset chính là video và lệnh của **chính chiếc xe**, cùng mount, camera, mặt sàn và protocol. Dataset tay robot SmolVLA/SO100 không có nhãn động học xe phù hợp. Dữ liệu ViNT/NoMaD có thể dùng nghiên cứu pretraining/navigation, nhưng không thay thế demo CB26. Chưa có dataset public đã xác minh là plug-and-play cho cấu hình này.

Dùng LeRobotDataset cho video, bảng trạng thái/action và metadata episode; format v3 tách video và dữ liệu bảng, có thông tin task/episode. [LeRobotDataset](https://huggingface.co/docs/lerobot/lerobot-dataset-v3). Pin phiên bản thư viện, commit adapter và schema trong manifest.

Schema riêng đề xuất, cần viết converter sang feature names của version LeRobot đã pin:

| Trường | Ý nghĩa |
| --- | --- |
| episode_id, frame_id, task_id | Nhận diện episode và lệnh ngôn ngữ |
| capture_ts, receive_ts, write_ts | Thời gian đã đồng bộ; giữ cả timestamp gốc |
| observation.images.front | Ảnh camera trước, đúng crop/lens |
| observation.command_history | FB trước, LR trước, pulse_remaining_ms, command_age |
| action.drive, action.steer_event, action.pulse_ms | Nhãn expert theo mốc ra quyết định |
| requested_action, executed_command | Trước/sau supervisor, không ghi đè nhau |
| intervention, terminal_reason, success | Takeover, mất hình, hoàn thành, va chạm |
| scene_id, session_id, calibration_id | Chia tập đúng và truy vết môi trường |

Không điền “speed”, “yaw” hoặc “steering_angle” bằng lệnh motor rồi gọi đó là telemetry. Cảm biến chưa có thì không tạo dữ liệu giả. Nếu bổ sung IMU, lưu là cảm biến điện thoại, cùng timestamps và extrinsics; IMU không tự mang lại odometry không drift.

Thu thử 20 episode để kiểm tra đồng bộ trước. Sau đó dự kiến 300–600 episode dài 20–40 giây, khoảng 2–7 giờ demo sạch, cho một sân trong nhà nhỏ. Đây là ngân sách khởi đầu do mình đề xuất, không bảo đảm đủ. Chia đều chạy thẳng, cua trái/phải, dừng trước vật, đến marker; thêm vị trí lệch tâm và expert recovery. Không thu toàn đường thẳng rồi mong model tự biết cứu sai lệch.

Ngôn ngữ: bắt đầu 5–8 ý định hẹp, dùng tiếng Anh chuẩn hóa nếu tận dụng pretrained language backbone; UI có thể map câu Việt đã biết sang task. Nếu muốn hiểu tiếng Việt tự do, phải có tập kiểm tra riêng. Thu **cùng bối cảnh nhưng lệnh khác nhau**, và nhiều bối cảnh cho cùng lệnh, tránh shortcut “thấy góc phòng này thì luôn rẽ trái”.

Chia train/validation/test 70/15/15 theo session, bố trí đường và ngày thu, không random từng frame. Có một layout test giữ kín; thêm test ánh sáng, vật liệu sàn và paraphrase mới. Recovery thất bại được giữ để phân tích; chỉ đưa action expert chất lượng vào tập cloning.

## 7. Training policy

**Giai đoạn A — baseline.** MobileNetV3-Small pretrained làm encoder; GRU 128–256 hidden; input 4–8 frame quá khứ ở 10 Hz cộng command history; đầu ra drive class, steer-event class và duration class có mask. Không gọi baseline này là VLA. Với lệnh chọn task đơn giản có thể thêm task embedding; đó là policy điều kiện theo task, chưa chứng minh hiểu ngôn ngữ mới.

Hyperparameter đề xuất để bắt đầu: AdamW, backbone LR 1e-5, head/GRU 3e-4, weight decay 1e-4, batch 32 sequence, clip grad 1.0. Train 20–50 epoch và chọn checkpoint theo validation; đây không phải cấu hình đã chạy. Loss là tổng CE drive + CE steer-event + CE duration chỉ tại sự kiện rẽ. Cân bằng mẫu rẽ/dừng và episode; kiểm tra precision/recall sự kiện, không chỉ accuracy nền “none”. Không đưa bất kỳ frame tương lai nào vào observation.

Augment sáng/tương phản, blur nhẹ, nén video và noise vừa phải. Không random crop làm mất mặt đường/đích. Không flip ngang trừ khi đồng thời đổi nhãn left/right, camera geometry và câu lệnh. Giữ validation/test ảnh nguyên bản.

**Giai đoạn B — kiểm tra giá trị ngôn ngữ.** Fine-tune `lerobot/smolvla_base` trên cùng dữ liệu chia tập. Viết custom robot adapter/action processor cho xe, không khai báo giả là SO101. Chuẩn hóa command history riêng với state có đo; duration/action classes theo contract ở trên. Xác minh loader, normalization và action dimension bằng một batch trước khi train.

Bắt đầu đông cứng phần vision-language theo cấu hình hỗ trợ của version đã pin, train action expert; sau đó thử mở một phần backbone nếu underfit. Batch vật lý 4–8, tích lũy gradient đến effective batch 32 nếu framework hỗ trợ, 10k–30k update làm khoảng tìm kiếm ban đầu. Kiểm tra peak VRAM và checkpoint thường xuyên. Không khẳng định thời gian train khi chưa biết GPU. Dùng CLI trong tài liệu sau khi adapter đã hoàn thiện; lệnh mẫu dành cho SO101 không phải lệnh chạy xe này.

Kiểm tra implementation SmolVLA được dùng có temporal input như mong muốn hay không; camera nhiều góc không đồng nghĩa có nhiều frame thời gian. Nếu chỉ quan sát một frame, bổ sung command-state và temporal adapter riêng có test, hoặc giữ baseline temporal để điều khiển thấp tầng. Không nối một video rồi mặc định model hiểu vận tốc.

Để chứng minh dùng ngôn ngữ: so đúng lệnh, hoán đổi trái/phải, bỏ lệnh và paraphrase; giữ cùng cảnh. Nếu hoán đổi lệnh không đổi hành vi, chưa đạt VLA. So SmolVLA với baseline trên cùng action contract, episode test, latency và ngân sách thu dữ liệu.

**Giai đoạn C — sửa phân bố lỗi.** Chạy shadow mode trước, model chỉ dự đoán. Sau đó chạy có người giám sát; takeover ngay khi lệch, lưu frame trước sự cố và action sửa của expert. Gộp demo sửa lỗi và train lại 2–4 vòng theo tinh thần dataset aggregation. Không tự lấy action sai của model làm nhãn expert. Chưa cần reinforcement learning trên xe thật; chỉ cân nhắc RL trong simulator đã hiệu chuẩn nếu imitation đã đạt trần rõ ràng.

## 8. Supervisor và quyền phát lệnh

Model đề xuất action, supervisor mới được phép gửi. Một supervisor cục bộ quản lý manual/autonomous/stop; manual takeover xóa mọi chunk cũ. Arm chỉ từ thao tác rõ ràng của người, không tự re-arm sau reconnect. Mỗi packet có sequence ID, model/calibration ID, tuổi frame và TTL. Lệnh sai schema, NaN, quá hạn, frame đứng hình, mất stream hoặc lỗi inference phải trở về stop.

Bridge Python hiện có lease lệnh và timer rẽ; tái sử dụng chúng, thêm kiểm tra freshness của camera và policy. Watchdog không được để inference blocking làm chậm timer. Khi camera mất, ngừng gửi heartbeat chuyển động cũ. Lưu log lý do dừng. Nếu muốn dùng WebSocket, giữ local origin/token checks của bridge, không mở motor endpoint trực tiếp ra Internet.

**Giới hạn thực tế:** Web Bluetooth write-without-response chỉ cho biết stack đã nhận việc ghi, không xác nhận xe đã di chuyển hay đã dừng. Nếu BLE/process chết, phần mềm không còn bảo đảm byte stop tới hub. Trước autonomous, thử mất kết nối và xác minh hub tự dừng; nếu không, cần watchdog tại hub/MCU hoặc bộ ngắt truyền động độc lập. Model lớn hơn không giải quyết được vấn đề này.

Chỉ thử trong khu vực trong nhà được quây, không ở đường giao thông. Với camera trước đơn, không coi depth đơn mắt là thước đo khoảng cách tin cậy khi chưa calibration. Cảm biến khoảng cách phía trước và watchdog độc lập là nâng cấp đáng ưu tiên hơn tăng model size.

## 9. Evaluation và tiêu chí qua cổng

Trước hết thử trên kê bánh: frame motor đúng, phím nhả về zero, turn không bị kéo dài do heartbeat, mất stream/timeout/exception thực sự dừng. Sau đó hạ xe trong sân có biên an toàn.

Mục tiêu thử nghiệm ban đầu (do dự án đặt, chưa đạt): ít nhất 30 lượt mỗi task trên layout giữ kín; báo số thành công/tổng số và khoảng bất định, không chỉ một video đẹp. Ghi collision, số takeover trên phút/mét, quãng dừng, thời gian hoàn thành, p50/p95 latency, frame drop và drift nhiệt sau 20 phút. Không báo tỷ lệ thành công 100% như bảo đảm an toàn.

Cổng 1: data timestamps, action contract và stop path đạt kiểm tra lỗi. Cổng 2: baseline tự hoàn thành task hẹp trong nhiều session, không chỉ replay layout train. Cổng 3: language ablation chứng minh hành vi đổi đúng theo lệnh; SmolVLA chỉ được chọn nếu cải thiện hiệu quả thực so với baseline. Cổng 4: test ánh sáng/layout/pin/mất mạng, xác minh quãng dừng vẫn nằm trong vùng trống.

Chọn checkpoint theo cả performance và latency. Nếu SmolVLA tốt hơn nhưng chậm, có thể dùng ở tầng chọn subgoal chậm, baseline/controller chạy nhanh; đây là kiến trúc phân tầng, không còn là end-to-end VLA thuần. Nêu đúng khi báo kết quả.

## 10. Kế hoạch thực hiện có đầu ra rõ ràng

1. Chốt mount trên xe thật, camera 1× và calibration. Đầu ra: ảnh mount, BOM chốt, calibration JSON.
2. Camera stream + logger + một BLE owner. Đầu ra: 20 episode có timeline hình/lệnh xem lại được.
3. Sân 3–5 task và bộ test giữ kín. Đầu ra: manifest dataset, kiểm tra leakage, phân bố action.
4. Baseline + shadow inference. Đầu ra: checkpoint, báo latency, replay dự đoán không phát motor.
5. Supervisor/watchdog + supervised rollout + recovery data. Đầu ra: log stop-path, collision/takeover report.
6. Fine-tune SmolVLA và language ablation. Đầu ra: so sánh có cùng điều kiện; giữ baseline nếu VLA không mang lại lợi ích.
7. Khi đạt cổng mới tính inference trên điện thoại, quantization, nhiệm vụ dài và perception nâng cao.

Một mốc 4–6 tuần có thể dùng để lập kế hoạch prototype nếu camera/protocol ổn và bạn thu dữ liệu đều; không phải cam kết thời gian. Ưu tiên đầu tiên là **camera ổn định + dữ liệu đúng thời điểm + stop tin cậy**. Sau đó mới có ý nghĩa bàn model nào lái tốt hơn.
