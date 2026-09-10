# Camera cage 42096 — revision 04

## Ráp thêm hoàn toàn, giữ nguyên xe

Bản này thay thế thiết kế xuyên qua cockpit. **Không tháo hoặc di chuyển mảnh nào của xe gốc. Không có vòng đàn hồi, dây, keo, đệm EVA hay mảnh tự chế.** Khung và các cơ cấu chặn đều dùng geometry LDraw của các mảnh LEGO có sẵn trong dự án.

Giá neo từ mặt dưới hai frame Technic 5 × 7, đưa hai trụ ra ngoài thân xe và nối cầu phía trên mui. Đây là lựa chọn ưu tiên giữ nguyên xe; khung rộng và cao hơn một giá đặt trong cockpit. Tâm hai trụ ngoài cách nhau 304 mm. Khối lượng và độ cứng thực tế chưa được đo.

## Bốn hardpoint thật

| Điểm | Frame gốc | Mã mảnh | Tâm lỗ trong LDraw |
|---|---:|---|---|
| H1 | instance 110 | 64179 | (-40, 0, -60) |
| H2 | instance 110 | 64179 | (40, 0, -60) |
| H3 | instance 118 | 64179 | (-40, 0, -60) |
| H4 | instance 118 | 64179 | (40, 0, -60) |

Đây là các lỗ góc ở mép trước hai frame nằm dưới chassis. Mỗi cặp cách nhau 32 mm. Trục lỗ hướng xuống gầm. Tọa độ được biến đổi bằng matrix thật của từng frame; hệ trục giá theo độ nghiêng có sẵn trong model. Không lấy tâm của một panel rồi coi đó là điểm neo.

Hai beam 15L mới nằm sát mặt dưới frame, lệch đúng một lớp 8 mm. Bốn pin 2780 xuyên qua lỗ thật để giữ các beam này. Nâng xe lên để tiếp cận từ dưới, lắp từng bên, rồi đặt xe xuống; không cần tháo các cụm thân xe.

## Trình tự lắp

1. **Hai beam dưới gầm.** Lắp hai beam 32278 15L bằng bốn pin đen 2780. Beam đi từ phía trong frame ra ngoài thân xe. Hai pin mỗi bên chống xoay tại điểm neo.
2. **Hai giằng ngoài thân.** Trên mỗi beam dưới gầm, lắp hai connector 15100 để đổi trục lỗ sang phương trước–sau. Trụ chính dùng 32278 15L, chéo dùng 32525 11L. Khoảng tâm tạo tam giác 48–64–80 mm. Chân chéo có spacer 18654 và pin xanh 6558; chân đứng và đỉnh tam giác dùng 2780. Nối phần trên bằng 40490 9L, chồng ba lỗ và khóa hai đầu vùng chồng.
3. **Cầu ngang trên mui.** Mỗi cao độ dùng ba beam 15L: hai beam ngoài ở cùng lớp và beam giữa ở lớp kế tiếp. Khóa mỗi vùng chồng bằng hai pin. Có hai thanh ngang cách cao độ 16 mm. Chúng liên kết hai trụ; không tựa lên mui.
4. **Đáy, lưng và chặn cạnh.** Bốn thân connector 15100 là ledge ngắn đỡ đáy. Beam 11L phía sau cùng hai spacer tạo mặt tựa lưng. Hai beam 15L bên lồng có các lỗ dẫn hướng ngang cho bốn axle 32073 5L. Mỗi axle có một bush 3713 ở đầu trong làm mặt chặn và hai half-bush 32123b áp hai phía beam dẫn hướng để giữ vị trí.
5. **Đặt máy, đóng lồng và chỉnh chặn.** Tựa điện thoại lên đáy và lưng. Lắp cặp thanh phía trên và hai cặp thanh phía trước. Thanh trước được giữ qua các axle 3707 8L, spacer và bush chặn hai đầu; đường axle nằm ngoài bề rộng điện thoại. Hai axle 3706 6L điều chỉnh chặn trên. Bốn axle 32073 5L điều chỉnh chặn trước. Đẩy chặn đến gần mặt máy, rồi khóa half-bush sát hai mặt beam dẫn hướng. Không dùng lực ép màn hình.

Để tháo điện thoại, mở thanh trước/nắp của lồng mới lắp, không tháo xe gốc. Lắp các phần đóng lồng sau khi đã đặt điện thoại; không cố ép máy qua các mặt chặn đã khóa.

## Giữ máy bằng các mặt chặn điều chỉnh

Kích thước lấy theo envelope của asset Aris đã cung cấp: **156,55 × 76,175 × 10,71 mm** ở tư thế ngang.

- Đáy và lưng là hai mặt tựa cố định.
- Bốn bush cạnh giới hạn dịch ngang và giúp giữ hướng máy.
- Bốn bush phía trước chặn máy rời mặt tựa lưng.
- Hai bush phía trên chặn máy nhấc khỏi ledge.
- Axle được trượt để chỉnh vị trí; hai half-bush giữ nó ở hai phía beam. Đây là cơ cấu LEGO lắp thật, không phải kéo giãn mesh hay ép kích thước theo lưới lỗ.

Model chừa **0,2 mm** ở các mặt chặn điều chỉnh để tránh xuyên vào envelope. Đây là khe hở danh nghĩa cho kiểm tra hình học, không phải độ chính xác bảo đảm của đồ chơi hoặc điện thoại thật. Chỉnh theo máy thực tế, tránh nút bấm và kiểm tra khả năng bush trượt dưới tải. Cơ cấu giữ bằng ma sát bush/axle cần được thử rung trước khi dùng camera để thu dữ liệu.

Camera sau hướng đầu xe. Các đường sight trong chế độ xem riêng là aid hình học, không đại diện cho FOV đã hiệu chuẩn.

## Đường truyền tải và đánh đổi

Trọng lượng điện thoại đi từ ledge xuống cầu ngang, qua trụ và giằng, vào hai beam dưới gầm và bốn pin của frame chassis. Mui, cửa, ghế và panel thân xe không làm điểm tì tải.

Giữ nguyên thân xe đòi hỏi đi vòng bên ngoài: khung có bề rộng lớn, camera cao hơn mui và các beam dưới gầm làm giảm khoảng sáng. Không suy từ việc khớp lỗ ra rằng kết cấu đủ cứng. Cần kiểm tra độ uốn của beam, độ rơ tại connector, độ bền pin neo, khoảng sáng gầm và hành trình hệ treo trên xe thật. Việc thêm khung và điện thoại cũng thay đổi khối lượng và trọng tâm.

## Phạm vi kiểm tra

Kiểm tra socket xét tâm, trục, chiều dài ăn khớp, lỗ bị chiếm trùng và đường liên kết về chassis. Các axle xuyên qua lỗ tròn được nhận diện riêng với pin ma sát; bush/half-bush là lỗ axle. Kiểm tra cũng yêu cầu đủ các nhóm mặt chặn và bộ khóa giữ.

Kiểm tra bề mặt dùng toàn bộ mesh LDraw độ phân giải cao của xe nguyên vẹn và giá mới. [Báo cáo](camera-bridge-clearance.json) phải có `removedParts: []`, không có giao cắt ngoài các cặp tiếp xúc lắp ráp được nhận diện. Envelope điện thoại được kiểm tra với cả xe và giá.

Các kiểm tra này không thay thế thử tải, thử rung, dung sai mảnh, kiểm tra lực giữ, kiểm tra vật thể bị bao kín hoặc mô phỏng hết hành trình cơ cấu chuyển động. Phần độ motor/hub chưa được mô hình hóa không nằm trong kiểm tra này.

## Chạy lại kiểm tra

`npm test` chạy kiểm tra asset, chức năng cũ và socket/drive rig. Kiểm tra mesh chạy bằng `scripts/validate-rig-clearance.mjs` với `LEGO_BVH_MODULE` trỏ đến bản cài tạm `three-mesh-bvh@0.9.15`. Thư viện BVH chỉ phục vụ kiểm tra offline, không tải vào web.

[Nguồn LDraw và tác giả](ldraw-part-credits.txt). Danh sách số lượng mảnh của từng bước nằm trong tab Advanced.
