# 🛠 Hướng dẫn Khởi chạy & Vận hành (Operation Guide)

Tài liệu này hướng dẫn cách hệ thống hoạt động, cách cài đặt cho môi trường local và vòng đời của một quy trình tạo quảng cáo từ đầu đến cuối.

## 1. Cách cài đặt & Khởi chạy (Dành cho Developer)

1. **Clone project** về máy.
2. Dưới thư mục gốc (root), copy file cấu hình biến môi trường:
   ```bash
   cp .env.example .env
   ```
3. Cập nhật các thông tin trong `.env` (Ví dụ ID ứng dụng Facebook, thông tin Database nếu gọi ra ngoài). Nếu chạy ở local thì các biến default trong `.env.example` hầu như đã đủ để dùng.
4. Cài đặt các modules cho Frontend (và các dịch vụ backend nếu muốn chạy không qua Docker):
   ```bash
   cd services/frontend && npm install
   ```
5. **Khởi chạy Docker:** Để chạy tất cả database (Postgres, Redis, Kafka, MinIO) và các service backend, hãy chạy lệnh sau từ thư mục root:
   ```bash
   docker compose up -d
   ```
6. **Khởi chạy Frontend:** (Có thể config docker nhưng chạy ngoài sẽ tiện debug React hơn)
   ```bash
   cd services/frontend
   npm run dev
   ```
7. Truy cập vào giao diện web qua URL: `http://localhost:5173`. Các API backend sẽ đi qua `http://localhost:3000` (Gateway).

## 2. Luồng hoạt động của hệ thống (System Flow)

### Luồng 1: Người dùng Đăng ký & Đăng nhập
1. Frontend gõ thông tin và gửi POST đến Gateway (`/api/v1/auth/login`).
2. Gateway forward đến Auth Service. Auth Service kiểm tra Postgres DB, nếu đúng thì ký và trả về JWT.
3. Lần sau gọi các lệnh API khác, Frontend cần gắn header `Authorization: Bearer <token>`.
4. Gateway kiểm tra Token hợp lệ -> Cấp quyền đi qua tới các service khác bên trong.

### Luồng 2: Tạo và Phân phối Quảng cáo
1. Người dùng trên Frontend tạo Campaign -> Gửi API lên `Campaign Service`.
2. Hệ thống lưu trạng thái `DRAFT` vào PostgreSQL. Hình ảnh quảng cáo nếu có sẽ được đẩy lên `MinIO` lấy URL tải tĩnh.
3. Người dùng ấn "Publish/Distribute" lên Facebook:
   - Campaign Service đổi trạng thái thành `PUBLISHING`.
   - Campaign Service đẩy sự kiện (Event) `CampaignDistributedToFacebook` kèm payload ID vào hệ thống Kafka.
4. `Facebook Adapter Service` luôn lắng nghe Kafka. Khi thấy message về việc tạo ads, nó:
   - Đọc chi tiết Campaign qua API hoặc trực tiếp.
   - Giao tiếp với Facebook Marketing API để tạo lần lượt: Chiến dịch, Nhóm Q.cáo, rồi đến Mẫu Q.cáo.
   - Khi hoàn tất luồng API, nó sinh sự kiện trả kết quả thành công qua Kafka.
5. Campaign Service bắt event này và update DB sang trạng thái `ACTIVE`. Frontend khi reload sẽ nhận trạng thái mới.

### Luồng 3: Tự động hóa đánh giá (AI Auto-Pause)
1. Theo định kỳ, Scheduler hoặc các hàm cron từ Adapter kéo số liệu (Metrics: lượt xem, chi phí...) từ FB API xuống.
2. Dữ liệu này được lưu xuống bảng `TimescaleDB` cho hiệu suất cao với truy vấn series thời gian và đẩy qua Kafka.
3. `AI Optimizer` nhận metrics mới, chạy phân tích:
   - Tính toán xem CPA thực tế có quá giới hạn thiết lập của hệ thống không (VD: threshold > 3x limit).
   - Nếu điều kiện Tắt Quảng Cáo thỏa mãn, hệ thống bắn ra lệnh `PauseAdSetCommand` qua Kafka.
4. Tương tự như luồng sinh ads, `Facebook Adapter` nhận lệnh pause, nó gọi Facebook API để Tắt (Pause) nhóm dở ngay lập tức.
5. Lệnh thực hiện được lưu log lại hệ thống để user truy vết vì sao quảng cáo của mình bị cắt.
