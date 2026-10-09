# Cập nhật giá món và topping

Chạy từ gốc repository. Script đọc `Backend_API/.env` mà không in bí mật. Database mục tiêu cố định là `CafeSyncDB`.

```powershell
# Chỉ đọc và kiểm tra đủ 31 món, không ghi database:
node Backend_API/scripts/migrate-toppings.js

# Sao lưu, cập nhật giá/topping theo menu-data.js rồi export:
node Backend_API/scripts/migrate-toppings.js --apply

# Kiểm tra API local đang chạy, không tạo đơn hoặc thanh toán:
node Backend_API/scripts/verify-menu-api.js

# Kiểm thử backend dùng mock, không kết nối database:
node --test Backend_API/tests/product-toppings.test.js
```

`--apply` chỉ dùng khi được giao cập nhật dữ liệu. Chế độ mặc định là xem trước. Không gọi script trong server startup. Nếu thiếu hoặc trùng tên món/topping, script dừng trước khi ghi. Tên món được đối chiếu sau khi chuẩn hóa Unicode, khoảng trắng và chữ hoa/thường; tên lưu trong database không bị đổi.

Mỗi lần apply tạo thư mục riêng dưới `.local-data/` (đã được Git ignore):

- `products.before.json`: bản sao đầy đủ của 31 document bị ảnh hưởng.
- `toppings.before.json`: dữ liệu topping trước cập nhật.
- `RESTORE.md`: hướng dẫn khôi phục chọn lọc, giữ thay đổi đồng thời của người khác.
- `products.json`, `toppings.json`: export sau khi đối chiếu thành công, dùng MongoDB Extended JSON, giữ ObjectId.

Script xác minh backup đọc lại được trước khi ghi; chỉ `$set` `products.price` và `products.toppings`, giữ nguyên ID, tên, ảnh, danh mục và tùy chọn khác. Topping được nhận diện lại theo tên khi chạy lại; không tạo trùng. Unique index bảo vệ tên topping. Script dùng điều kiện giá/topping cũ khi cập nhật sản phẩm để phát hiện thay đổi đồng thời. Nếu lỗi giữa chừng, có thể đã cập nhật một phần; dừng kiểm tra backup, không tự khôi phục hoặc chạy lại mù quáng.

Trong Compass, chọn đúng database và collection rồi import file tương ứng theo Extended JSON. Chỉ import sang database cần nhận dữ liệu; **không import lại vào database Atlas dùng chung đã cập nhật**, không drop collection và không ghi đè document đang tồn tại. Import `toppings.json` trước `products.json`. `category` trong products vẫn tham chiếu collection categories hiện có; database nhận phải có các category ID tương ứng.

## Hành vi ứng dụng

- `Product.toppings`: ObjectId tham chiếu `Topping`. API danh sách/chi tiết/gợi ý populate topping đang active.
- `GET /api/toppings`: danh sách topping active để form quản lý chọn bằng ID.
- Form quản lý gửi ID; web khách, POS và mobile hiển thị tên và lấy giá từ API.
- Giá cuối cùng = giá gốc + phụ thu size (S 0, M 5000, L 10000) + giá topping, nhân số lượng.
- Đơn hàng giữ tên topping và đơn giá lúc mua; không migration lịch sử đơn hàng. Khẩu vị cũ chỉ tự chọn topping còn hợp lệ trên món.
- POS sửa món trong giỏ lấy lại giá gốc từ catalog, tránh cộng phụ thu lặp.
- Không tạo đơn thật để kiểm thử và không thay đổi logic PayOS.

Backend và các frontend cần phát hành cùng phiên bản vì API đổi từ `string[]` sang object topping. Code local đã sửa không tự cập nhật Render/Vercel hoặc ứng dụng trên điện thoại. Khi dùng chung Atlas, server và client phiên bản cũ cũng bị ảnh hưởng bởi kiểu dữ liệu mới; cần phối hợp phát hành. Mobile đổi phiên bản cache catalog để bỏ dữ liệu topping dạng chuỗi đã lưu từ phiên bản cũ.
