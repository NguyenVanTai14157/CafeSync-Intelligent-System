# CaféSync Mobile

Ứng dụng khách hàng Android/iOS của CaféSync, xây bằng Expo SDK 57, React Native,
TypeScript và Expo Router. Ứng dụng dùng chung REST API và tài khoản email/mật khẩu
với `frontend-client` và `frontend-admin`; backend quản lý dữ liệu trong MongoDB.

[Tổng quan hệ thống](../README.md) · [Workflow kiểm tra mobile](../.github/workflows/mobile-ci.yml)

## Chức năng

- Thực đơn lấy trực tiếp từ `GET /api/products` và `GET /api/categories`.
- Tìm kiếm, lọc danh mục và gợi ý theo lịch sử mua.
- Chi tiết món, size, đường, đá, topping và ghi chú.
- Giỏ hàng và yêu thích lưu trên thiết bị bằng AsyncStorage.
- Đăng nhập/đăng ký bằng cùng tài khoản website; token trên Android/iOS lưu bằng SecureStore.
- Đặt món tại bàn hoặc mang đi, thanh toán tiền mặt hoặc PayOS.
- TanStack Query quản lý cache, retry, refresh và server state.
- Dữ liệu thực đơn công khai đã tải được cache tối đa 24 giờ; order history không được persist vào Query cache. Chưa hỗ trợ đặt hàng offline.
- Socket.IO cập nhật trạng thái đơn theo thời gian thực; màn hình chi tiết đơn đồng bộ thêm bằng REST mỗi 30 giây cho đến khi đơn kết thúc.
- Jest và React Native Testing Library kiểm tra pricing rules và UI interaction.

## Chạy ứng dụng

Dùng Node.js 22.13.1 hoặc bản Node.js 22 mới hơn tương thích. Các thư mục trong
repository có `package.json` riêng, nên lệnh chạy phụ thuộc vào thư mục terminal:

| Thư mục hiện tại | Chạy Expo Go | Lint, typecheck và test |
| --- | --- | --- |
| Thư mục gốc `CafeSync-Intelligent-System` | `npm run mobile` | `npm run mobile:check` |
| `mobile-client` | `npm start` | `npm run check` |

Lần đầu clone repository, cài dependency và chạy từ thư mục gốc:

```powershell
npm --prefix mobile-client ci
npm run mobile
```

Sau khi Metro chạy, nhấn `a` để mở Android emulator hoặc quét QR bằng Expo Go.
Với chế độ LAN, điện thoại và laptop phải kết nối được với nhau qua mạng nội bộ.
Có thể mở app trên điện thoại thật và emulator cùng lúc.

`npm run mobile` cố ý dùng Expo Go để việc học và test nhanh vẫn hoạt động. Khi đã cài
development build riêng của CaféSync, chạy:

```powershell
npm run mobile:dev-client
```

## Kiến trúc dữ liệu

```text
Screen (Expo Router)
  ├── TanStack Query ── REST API ── Express/MongoDB
  ├── RealtimeProvider ── Socket.IO ── order_updated
  ├── AuthContext ── SecureStore (JWT)
  └── CommerceContext ── AsyncStorage (cart/favorites)
```

- **Server state**: sản phẩm, gợi ý và đơn hàng đi qua TanStack Query.
- **Local state**: giỏ hàng, yêu thích và bàn đang chọn nằm trong Commerce Context.
- **Sensitive state**: JWT nằm trong SecureStore; order history không persist vào Query cache.
- **Network state**: NetInfo và AppState giúp query biết lúc mất mạng hoặc app quay lại foreground.

## Cấu hình API

Mặc định ứng dụng gọi backend đang deploy trên Render. Muốn dùng backend local,
tạo file `.env` từ `.env.example`:

```env
# Điện thoại thật: IPv4 Wi-Fi của laptop
EXPO_PUBLIC_API_URL=http://192.168.1.10:5000

# Android emulator có thể dùng địa chỉ máy host này
# EXPO_PUBLIC_API_URL=http://10.0.2.2:5000
```

Sau khi đổi `.env`, trong thư mục `mobile-client` khởi động lại Metro bằng
`npm start -- --clear`. Cả web admin và mobile cần trỏ tới cùng backend để kiểm tra
đồng bộ trạng thái đơn.

Không đặt JWT secret, mật khẩu database hoặc API secret trong biến
`EXPO_PUBLIC_*`, vì chúng được đóng gói vào ứng dụng.

## Cấu trúc

```text
src/
├── app/          # Route và màn hình Expo Router
├── components/   # UI dùng lại
├── config/       # Biến môi trường và URL ảnh
├── constants/    # Màu sắc, kích thước
├── contexts/     # Auth, commerce state và kết nối realtime
├── hooks/        # Logic tải dữ liệu dùng lại
├── providers/    # Query persistence và trạng thái mạng/app
├── queries/      # Query client và query key tập trung
├── services/     # Axios và các API service
├── storage/      # AsyncStorage, SecureStore
├── types/        # Kiểu dữ liệu khớp backend
└── utils/        # Format tiền, ngày, tính giá tùy chọn
```

## Quality checks

Từ thư mục gốc repository, chạy các kiểm tra local:

```powershell
npm run mobile:check
```

Lệnh trên thực hiện lint, TypeScript strict và Jest tests. GitHub Actions chạy thêm
bước kiểm tra Expo có bundle được Android/iOS/Web. Workflow nằm tại
[`mobile-ci.yml`](../.github/workflows/mobile-ci.yml). CI đã được cấu hình; kết quả
chạy trên GitHub sẽ xuất hiện sau khi push hoặc tạo pull request.

Trong `mobile-client`, có thể kiểm tra bundle bằng:

```powershell
npm run export:all -- --output-dir dist-ci
```

## EAS builds

`eas.json` có ba build profile: `development`, `preview` và `production`. Hiện mới có
cấu hình build, chưa có APK hoặc bản phát hành trên store. Lần đầu cần đăng nhập
tài khoản Expo và liên kết project. Chạy từ thư mục gốc:

```powershell
cd mobile-client
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --profile preview --platform android
```

Profile `preview` tạo APK nội bộ để gửi HR hoặc tester cài trực tiếp. Không commit
credential, keystore hoặc secret vào repository.

## Realtime

Mobile lắng nghe event `order_updated`. Backend phát event này khi admin cập nhật
trạng thái hoặc PayOS webhook xác nhận thanh toán. Cần deploy phiên bản Backend mới
nhất để realtime hoạt động với API Render; nếu socket tạm mất kết nối, query sẽ tự
đồng bộ lại bằng REST.

## Lưu ý PayOS

Backend hiện cấu hình `returnUrl` của PayOS về website. Mobile vẫn mở được cổng
thanh toán và theo dõi trạng thái nhờ webhook, nhưng sau khi thanh toán trình
duyệt sẽ hiển thị trang web. Để tự quay lại app cần bổ sung universal link/deep
link được PayOS chấp nhận ở backend.

## Phạm vi hiện tại

- Đã chạy thử Android trên emulator và điện thoại thật trong quá trình phát triển.
- Đã kiểm tra export JavaScript bundle cho Android/iOS/Web; chưa xác nhận trên thiết bị iOS.
- Bộ test hiện có kiểm tra quy tắc phụ thu size/topping, chuẩn hóa tìm kiếm và thao tác nút; chưa có E2E cho toàn bộ luồng đặt hàng.
- Google/Facebook đăng nhập qua web; chưa có luồng đăng nhập tương ứng cho mobile.
- Push notification, Sentry và EAS Update/OTA chưa triển khai. Build profile không đồng nghĩa các tính năng này đã hoạt động.
