# Quy tắc làm việc với CaféSync

Áp dụng cho mọi AI agent làm việc trong repository này, bao gồm Codex và các agent được người dùng yêu cầu đọc file này. Đọc file trước khi thao tác source code, trình duyệt, API hoặc database. Hướng dẫn trong thư mục con vẫn áp dụng cho phần tương ứng; không được dùng chúng để bỏ qua các quy tắc bảo vệ dữ liệu dưới đây.

## Phạm vi và quyền truy cập

- Người dùng cho phép truy cập trình duyệt và database để thực hiện công việc được giao. Quyền truy cập không đồng nghĩa với quyền xóa hoặc thay đổi dữ liệu tùy ý.
- Mặc định bắt đầu bằng thao tác chỉ đọc. Chỉ sửa những gì cần thiết cho yêu cầu hiện tại; không tự mở rộng sang dọn dẹp, đổi kiến trúc, sửa dữ liệu khác hoặc triển khai.
- Yêu cầu viết hướng dẫn, đọc dự án, phân tích hoặc đề xuất hướng làm không cho phép cập nhật database hay hành vi ứng dụng.
- Khi đã được giao triển khai rõ ràng, thực hiện các thay đổi cần thiết trong phạm vi đó; không hỏi lại cho từng thao tác thông thường. Nếu thao tác vượt phạm vi, không rõ mục tiêu hoặc không thể bảo toàn dữ liệu, dừng phần phụ thuộc và hỏi người dùng.

## Database và dữ liệu dùng chung

- MongoDB Atlas của CaféSync là dữ liệu dùng chung giữa các thành viên. Compass là công cụ truy cập, không phải một bản dữ liệu thử nghiệm riêng.
- Trước khi ghi: xác minh cluster và tên database mục tiêu mà không tiết lộ thông tin đăng nhập; đọc các document liên quan, xác nhận số lượng và tiêu chí cập nhật.
- Trước khi sửa dữ liệu hiện có, sao lưu các document bị ảnh hưởng theo Extended JSON có giữ BSON ObjectId và ghi rõ cách khôi phục. Không ghi database nếu chưa tạo được bản sao lưu có thể đọc lại.
- Đặt bản sao lưu và export dữ liệu trong thư mục cục bộ không được Git theo dõi; không commit dữ liệu riêng tư. Kiểm tra quy tắc ignore trước khi tạo file.
- Cập nhật bằng bộ lọc cụ thể, ưu tiên `_id` đã xác minh và `$set` các field cần sửa. Không thay thế toàn bộ document để sửa một vài field.
- Nếu mapping theo tên, kiểm tra tên thiếu hoặc trùng trước khi ghi; không tự đoán hoặc chọn document đầu tiên.
- Script migration phải có chế độ xem trước không ghi, có thể chạy lại mà không tạo dữ liệu trùng, và đối chiếu kết quả sau khi chạy. Không tự chạy migration khi khởi động server.
- Giữ nguyên `_id`, dữ liệu đơn hàng, tài khoản, thanh toán, ảnh và các field không thuộc yêu cầu. Không sửa lịch sử đơn hàng chỉ để khớp menu mới.
- Không dùng `dropDatabase`, `drop`, `deleteMany`, `deleteOne`, xóa collection/document, reset hoặc ghi đè hàng loạt trừ khi người dùng đã yêu cầu rõ hành động đó và phạm vi cụ thể. Không dùng bộ lọc rỗng cho cập nhật hàng loạt dữ liệu hiện có.
- Nếu phát hiện sai lệch hoặc lỗi sau một phần cập nhật, dừng ghi tiếp, báo chính xác phần đã thay đổi và đưa phương án khôi phục; không tự thực hiện khôi phục hàng loạt có thể đè thay đổi của người khác.

## Trình duyệt, API và dịch vụ bên ngoài

- Ưu tiên xem và kiểm tra. Không bấm Xóa, Reset, Import, Save, Publish hoặc nút tạo thay đổi nếu hành động đó không cần cho yêu cầu đã được giao.
- Không tạo đơn hàng, thực hiện thanh toán thật, gửi thông báo/email, sửa tài khoản hoặc cấu hình Atlas để thử tính năng nếu chưa được yêu cầu.
- Kiểm thử bằng môi trường thử nghiệm hoặc mock khi có thể. Nếu cần ghi vào dữ liệu dùng chung để kiểm thử, xác định dữ liệu và tác động trước, xin phép nếu ngoài phạm vi đã được giao.

## Bí mật và source code

- Có thể đọc cấu hình `.env` khi cần kết nối, nhưng không in nội dung, URI có thông tin đăng nhập, token hoặc mật khẩu vào chat, log, ảnh chụp, patch hay file export.
- Không commit `.env`, khóa API, bản sao lưu hoặc export chứa dữ liệu riêng tư. Không đổi mật khẩu, khóa, quyền truy cập hoặc cấu hình kết nối khi không được yêu cầu.
- Kiểm tra thay đổi sẵn có trước khi sửa. Không xóa, ghi đè hoặc hoàn tác công việc của người dùng/thành viên khác.
- Không chạy `git reset --hard`, `git clean`, force push hoặc xóa file không liên quan. Không tự commit, push hoặc deploy nếu người dùng chưa yêu cầu.
- Sửa tối thiểu, giữ phong cách code hiện tại, kiểm tra các ứng dụng dùng chung API khi thay đổi kiểu dữ liệu. Chạy kiểm tra phù hợp và báo lỗi/giới hạn còn lại trung thực.

## Quy ước giao diện

- Không thêm icon hoặc emoji vào giao diện mới/chỉnh sửa (tiêu đề, tab, nút, trạng thái rỗng và hình trang trí), trừ khi người dùng yêu cầu rõ. Ưu tiên nhãn chữ; giữ badge số khi cần đếm dữ liệu.

## Báo cáo

- Trước thao tác ghi quan trọng, thông báo ngắn gọn mục tiêu và phạm vi.
- Sau khi hoàn tất, nêu file đã sửa, collection/field đã cập nhật, số lượng document thực tế, nơi lưu backup/export và kết quả kiểm tra.
- Phân biệt rõ code đã sửa, migration đã viết và dữ liệu đã thực sự cập nhật. Không khẳng định đã đọc, chạy hoặc kiểm thử khi chưa làm.
