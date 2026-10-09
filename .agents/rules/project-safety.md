---
trigger: always_on
---

# CaféSync: bảo vệ source code và dữ liệu dùng chung

Trước khi làm việc, đọc và tuân thủ toàn bộ `AGENTS.md` ở gốc repository. Đây là quy tắc áp dụng thường xuyên cho workspace, bao gồm khi dùng trình duyệt, API, MongoDB Atlas và Compass.

- Quyền truy cập không cho phép tự ý xóa hoặc sửa dữ liệu ngoài yêu cầu.
- Bắt đầu bằng thao tác chỉ đọc; chỉ ghi khi cần cho công việc được giao.
- Xác minh mục tiêu và sao lưu document bị ảnh hưởng trước khi cập nhật database.
- Không xóa/reset/drop, ghi đè hàng loạt, thanh toán thật hoặc triển khai nếu chưa được yêu cầu rõ.
- Không tiết lộ `.env`, thông tin đăng nhập, token hoặc dữ liệu riêng tư.
- Giữ nguyên thay đổi của người dùng và các dữ liệu không liên quan. Nếu vượt phạm vi hoặc không rõ tác động, hỏi trước khi thực hiện phần đó.

Hướng dẫn chi tiết và yêu cầu báo cáo nằm trong `AGENTS.md`; đọc file đó thay vì chỉ dựa vào bản tóm tắt này.
