# 🚢 Hướng dẫn Triển khai (Deployment Directions)

Dự án có kiến trúc Microservices thuần và đã được đóng gói Container (Docker). Dưới đây là các hướng triển khai đề xuất cho hệ thống, từ mức khởi tạo tới mức chịu tải theo yêu cầu.

## 1. Khởi chạy trên 1 Server VPS (Đơn giản nhất, Dành cho MVP)
Phù hợp cho giai đoạn Demo, Test nội bộ hoặc mới ra mắt có ít user đồng thời.

- **Môi trường:** Thuê 1 máy chủ ảo (Ví dụ AWS EC2, DigitalOcean Droplet, Vultr) với cấu hình tầm trung: CPU từ 4 cores, RAM 8GB-16GB (Cần để chạy Kafka và Data).
- **Cách thức triển khai:**
  1. Cài đặt Docker và Docker Compose trên server.
  2. Map code repo về server.
  3. Cấp Domain và cài đặt một Reverse Proxy (Nginx, Traefik) chặn phía trước để lấy chứng chỉ bảo mật, sau đó dẫn routing API vào port Gateway `3000`.
  4. Trỏ Frontend tới host qua cổng mặc định 80/443.
  5. Thiết lập `.env` cho môi trường Prod.
  6. Sử dụng `docker compose up -d` để khởi tạo. (Chú ý bỏ các port nội sinh của database như 5432 ngoài whitelist để bảo mật).

## 2. Triển khai theo Cụm (Kubernetes - K8s) (Chuyên nghiệp, Mở rộng tốt)
Phù hợp khi dự án có số lượng truy cập lớn và khả năng scale động vào các khoảng thời gian cao điểm.

- **Kiến trúc Cloud-Native:**
  - Định nghĩa Infrastructure qua Helm Chart/Manifest cho Gateway, API Services, Adapters...
  - Xây dựng hệ thống CI/CD (như Github Actions, GitLab CI/CD) để tự build Docker Image rồi push sang Container Registry.
  - Sử dụng dịch vụ managed Kubernetes như AWS EKS, Google GKE, giúp tự xoay vòng instance nếu một trong số chúng bị sập.
- **Data & Message Queue Tách Biệt:** Khi lên K8s, không nên nhúng Kafka và Postgres vào bên trong. Tốt nhất mua gói Managed Database System ngoài (AWS RDS, Managed Kafka) để giảm gánh nặng lưu trữ bền vững.

## 3. Hệ thống CI/CD Pipeline Tư duy (Tự động hóa)
Nên đưa toàn bộ luồng Release lên đường ống tự động.
- Mọi Pull Requests tạo tới nhánh `main` cần chạy lint và unit tests.
- Code khi merge vào main tự build image các dịch vụ có thay đổi, thay tag latest.
- Một webhook (hoặc CD tool như ArgoCD trên K8s) kéo bản image lên staging, sau đó cập nhật qua production.

## Các Lưu ý Quản lý Rủi ro Bảo mật
- **Che giấu hạ tầng nội bộ:** DB Postgres, Message Broker, MemDB tuyệt đối không lộ public routing.
- **Bảo mật Tokens Cấp Quyền:** Các Secret Token từ Facebook, Google Ads phải lưu ở Secret Manager, không đưa vào file docker-compose thô trong repo.
- **Bảo vệ Gateway:** Setup Rate-limit từ nginx chống DDoS trước khi tới Gateway nodejs xử lý lỗi, tránh các kịch bản API bruteforce.
