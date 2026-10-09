# Điều phối pha chế

Trang admin `/orders` mặc định mở Đang phục vụ. Đơn mới có `paymentStatus: paid` mới vào hàng đợi Chờ pha chế → Đang pha chế → Hoàn thành. Socket `new_order` chỉ phát sau thanh toán; `order_updated` đồng bộ thao tác. Frontend cập nhật cache trực tiếp, tải lại khi kết nối lại và polling dự phòng mỗi 5 giây.

POS yêu cầu nhân viên xác nhận đã thu tiền, gửi JWT để backend kiểm tra vai trò. Đơn tiền mặt đặt trên website vẫn chờ thanh toán; nhân viên vào tab Tất cả, bấm Xác nhận thu tiền sau khi thu đủ tiền. Chuyển trạng thái chỉ cho phép bước kế tiếp, kiểm tra trạng thái cũ để tránh thao tác đồng thời. Không còn nút xóa đơn ở màn hình pha chế.

Webhook PayOS phải có chữ ký hợp lệ và code thành công. Return URL chỉ yêu cầu backend đối chiếu trạng thái PAID với PayOS, không tự chứng minh đã thanh toán. Mã đơn đối chiếu chính xác, tiền nhận phải khớp tổng đơn. Webhook lặp không reset pha chế hoặc phát đơn mới lần nữa. Hủy từ return URL giữ lịch sử và không tác động đơn đã trả tiền.

Không migration dữ liệu cũ. Đơn cũ không có paymentStatus không tự vào hàng đợi; tra cứu ở Tất cả, đơn hoàn thành cũ ở Lịch sử. Các đơn tiền mặt cũ còn Chờ xác nhận có thể xác nhận thu tiền bằng thao tác nhân viên. Client/mobile tiếp tục nhận các chuỗi Đang pha chế và Hoàn thành hiện có; Chờ pha chế là bước chờ ban đầu. Phát hành backend và admin cùng phiên bản.

Dashboard quản lý/nhân viên thêm ba biểu đồ dưới khu vực doanh thu: lượt dùng bàn, khách mới/quay lại, top 5 bán chạy/chậm. Đây là mock data được ghi nhãn rõ, chưa nối API. Dashboard tài khoản admin hiện là quản lý nhân sự, giữ bố cục hiện có.

Kiểm thử không kết nối Atlas hoặc thanh toán thật:

```powershell
node --test Backend_API/tests/order-workflow.test.js
npm.cmd --prefix frontend-admin run build
```

Kiểm tra thủ công ở localhost:3000/orders: 5 tab, mặc định Đang phục vụ; đơn chưa thanh toán không có Bắt đầu làm. Chỉ thử chuyển trạng thái trên dữ liệu test trong môi trường riêng, không đổi đơn thật để kiểm thử. Dashboard cho quản lý/nhân viên có 3 biểu đồ minh họa. Không thay đổi dữ liệu Atlas hoặc tạo đơn trong quá trình kiểm thử tự động.
