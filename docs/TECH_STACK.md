# ⚙️ Công nghệ Sử dụng (Technology Stack)

Hệ thống được thiết kế theo kiến trúc **Microservices (Dịch vụ vi mô)** để đảm bảo tính mở rộng, dễ dàng bảo trì, chia nhỏ rủi ro và tận dụng tối đa thế mạnh của từng công nghệ cho các tác vụ cụ thể.

## 1. Môi trường & Triển khai chung
- **Docker & Docker Compose:** Container hóa toàn bộ service để môi trường phát triển (Dev) và môi trường thật (Prod) đồng nhất. Dễ dàng với chỉ một lệnh `docker compose up`.
- **Monorepo Structure:** Tất cả các dịch vụ được lưu trong cùng một Repository để tiện chia sẻ mã nguồn chung (ví dụ `packages/shared` chứa format event và type definitions).

## 2. Frontend (Giao diện người dùng)
- **Framework:** ReactJS (với Vite JS để build nhanh hơn).
- **Ngôn ngữ:** JavaScript / JSX.
- **UI Library:** Ant Design (AntD) cho các component chuẩn, Recharts để vẽ biểu đồ và đồ thị biểu diễn số liệu quảng cáo.
- **Quản lý state & API:** Context API & Axios.

## 3. Backend (Các Microservices chính)
- **API Gateway (`api-gateway`):**
  - **Công nghệ:** Node.js, Express, `http-proxy-middleware`.
  - **Nhiệm vụ:** Định tuyến các request từ Frontend xuống đúng Service, xác thực Token (JWT), giới hạn tỷ lệ request (Rate Limiting).
- **Auth Service (`auth-service`):**
  - **Công nghệ:** Node.js, Express.
  - **Nhiệm vụ:** Quản lý quy trình Đăng nhập, Đăng ký, làm mới Token OAuth, xử lý JWT nội bộ.
- **Campaign Service (`campaign-service`):**
  - **Công nghệ:** Node.js, Express.
  - **Nhiệm vụ:** Trái tim của hệ thống. Xử lý CRUD cho Campaign, AdSet, Ad. Theo dõi luồng trạng thái, tổng hợp metrics và gửi lệnh phân phối lên Queue.
- **Adapters (`facebook-adapter`, `google-adapter`, `tiktok-adapter`):**
  - **Công nghệ:** Node.js (với SDK của các đối tác FB, Google, TikTok).
  - **Nhiệm vụ:** Đóng vai trò là "công nhân" phiên dịch dữ liệu từ hệ thống của ta sang định dạng mà FB/Google/TikTok Marketing API yêu cầu và gọi lên API của họ.
- **AI Optimizer (`ai-optimizer`):**
  - **Công nghệ:** Python, FastAPI, Pandas, Scikit-learn (Machine Learning).
  - **Nhiệm vụ:** Nhận dữ liệu metrics, chấm điểm (scoring), kiểm tra các tập luật Auto-Pause và gửi trả hành động tối ưu về hệ thống. Chọn Python vì lợi thế mạnh mẽ trong xử lý dữ liệu và AI.

## 4. Cơ sở Dữ liệu & Lưu trữ (Databases)
- **Database Chính:** PostgreSQL 16. Lý tưởng cho lưu trữ quan hệ có tính toàn vẹn cao (User, Campaign, AdAccount).
- **Time-series Database:** TimescaleDB (Mở rộng từ Postgres). Rất cần thiết và siêu tối ưu cho việc lưu các metrics theo thời gian thực (Lượt xem/click vào các thời điểm trong ngày).
- **Data Cache:** Redis 7. Dùng để cache dữ liệu truy xuất nhiều, session của user.
- **Object Storage:** MinIO (Tương thích S3). Dùng để upload và lưu trữ hình ảnh/video quảng cáo của người dùng trước khi đẩy lên nền tảng.

## 5. Giao tiếp giữa các Services (Message Broker)
- **Apache Kafka:** Là "xương sống" giao tiếp nội bộ cho các tác vụ bất đồng bộ.
  - Khi một chiến dịch cần tạo lên Facebook -> Campaign Service gửi message qua Kafka -> Facebook Adapter nhận và xử lý mà không làm treo hệ thống.
  - Khi có metrics mới về, Adapter gửi vào Kafka -> AI Optimizer đọc để phân tích, Campaign Service đọc để lưu vào DB.
