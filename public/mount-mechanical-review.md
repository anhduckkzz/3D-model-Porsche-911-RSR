# Camera bridge — kiểm tra cơ khí, 09/09/2026

Trạng thái: **chưa phải bản hướng dẫn có thể đem lắp hoàn chỉnh**. Dùng mảnh LDraw thật chỉ xác nhận hình học của từng mảnh, không chứng minh các mảnh ghép được với nhau.

Đã kiểm tra trên model trong repo:

- Loại những lỗ có pin/axle hiện hữu gần trục trước khi chọn hardpoint.
- Lấy phương dọc từ beam chassis, tránh lệch trục do trang trí đầu/đuôi không đối xứng.
- Thu hẹp dung sai ghép hai rail và chọn span cross-beam về 0,003 đơn vị mô hình (0,12 mm).
- Đối chiếu pin 2780/6558 với tâm, trục lỗ và chiều dày cần xuyên. Dựng đồ thị liên kết từ từng beam xuống chassis.
- Phân biệt lỗ axle của 6536 tại gốc, trục X, với lỗ pin tại (0,20,0) LDU, trục Z. Hai lỗ không đồng tâm và không thể dùng pin tròn thay axle để coi là đã khóa.

Kết quả với bản thiết kế hiện tại sau khi lọc hardpoint:

- Bốn lỗ ứng viên: instance 338 và 337, cùng mã 32278, lỗ số 8 và 14 (đếm từ 1 theo local Z của LDraw).
- Chưa phát hiện pin/axle chiếm những lỗ này theo bộ lọc vị trí. Đây không phải kiểm tra toàn bộ không gian đưa pin vào.
- 2 trong 28 pin chưa ghép đủ hai lỗ phù hợp.
- 2 pin tròn xung đột với vị trí lỗ axle.
- 16 mảnh chưa có chuỗi ghép pin liên tục xuống chassis.

Vì vậy, cảnh Điều khiển không gắn cụm này lên xe như thể đã cố định. Advanced giữ bản thiết kế để xem riêng; chế độ Kiểm tra chassis ẩn panel thân và chỉ rõ bốn lỗ ứng viên cùng lỗi kết nối.

Phần còn phải thiết kế/chốt:

1. Interface từ đỉnh side-truss sang cross bridge: đúng axle/pin, đúng offset của 6536, khóa tuột và khóa xoay. Một liên kết xoay tự do ở đỉnh không đủ để giữ camera ổn định.
2. Cầu ngang chống vặn: hai đường nối và ít nhất hai điểm khóa cách nhau để loại bỏ bậc tự do xoay của cradle.
3. Ledge: đáy máy phải chạm bề mặt đỡ; không để máy lơ lửng giữa hai rail. Hai stop phải chặn chuyển động ngang và không đè nút/camera.
4. Strap: đường vòng ngoài máy đã được sửa trong render, nhưng vẫn cần chọn đúng điểm móc lên cradle và kiểm tra lực giữ. Màu vật liệu không chứng minh có điểm neo strap.
5. Đường đi lực: phone → ledge/strap → cradle → hai crossbar → side-truss → bốn lỗ chassis; mỗi interface cần chỉ rõ mảnh, số lỗ, loại pin/axle và khóa chống xoay.
6. Kiểm tra va chạm solid, đường lắp pin, tháo/lắp panel, hành trình lái/treo và tải điện thoại. Bộ kiểm tra hiện tại chưa làm các bước này.

Cần ảnh xe đã độ nhìn từ trên, hai bên vùng cabin và mặt dưới chassis, thấy vị trí motor/hub/dây và lỗ còn trống; kèm kích thước điện thoại khi dùng ốp. Những dữ liệu này dùng để chốt vị trí thực, không thay thế việc thử khung ngoài đời.

Kiểm tra có thể chạy lại: `node --experimental-strip-types scripts/validate-drive-rig.mjs`. Test xác nhận hệ thống phát hiện và không trình bày một cụm chưa liên kết như cụm đã lắp; không chứng nhận kết cấu đạt tải.
