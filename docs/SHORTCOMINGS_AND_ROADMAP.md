# 📉 Thiếu sót & Hướng Phát triển (Shortcomings & Roadmap)

Dự án hiện tại đã xác định kiến trúc tổng thể về luồng đi (MVP) và Microservices qua Kafka, tuy nhiên ở mức nghiệp vụ cụ thể sẽ còn một số lỗ hổng và cơ chế tinh gọn cần giải quyết.

## 1. Các Thiếu sót đang vướng (Current Shortcomings)

### A. Về tính năng nền tảng quảng cáo (Platform Integration)
- **Thiếu Adapter Thực Sự:** Google Ads và TikTok hiện đang dừng lại ở các block code mang tính định nghĩa chuẩn (stub protocol). Chưa đi sâu vào test thực tiễn qua SDK thật của họ.
- **Chưa Hỗ trợ Rộng loại Quảng Cáo:** API Facebook mới hỗ trợ dạng Single Image/Video. Với các dạng phân rã hay Catalog, Collection, Carousel thì hệ Payload cần định dạng thêm rất nhiều fields.
- **Tính Năng Audience (Tệp Khách) Cứng Ngắc:** Đang phụ thuộc vào set target tĩnh, chưa hỗ trợ user tải lên danh sách sdt/email thành Custom Audience hay phân luồng lookalike chi tiết qua API trực quan.

### B. Về Backend & System Resilience
- **Rolling Back Kém khi Transaction Lỗi (Thiếu Saga/Compensating Transactions):** Campaign Service kêu gọi xuất bản 1 ads qua Kafka -> Adapter Facebook thực hiện và Lỗi (Tài khoản bị cấm). Hệ thống chưa có tính năng dọn dẹp các data tạm lưu lúc nãy chuẩn chỉ (nếu lỡ tạo Campaign nhưng AdSet lỗi, hệ thống bị rác ở Campaign trên FB).
- **Thiếu Giám sát Logging:** Microservices nhiều nhưng chưa gắn hệ thống Tracking Log gộp (ELK stack) hay Application Performance Monitoring APM. Khiến fix bug rất vất vả giữa các repo riêng lẻ. 

### C. Về Frontend UI/UX
- **Đồng bộ Status Thủ Công:** Việc nhận dữ liệu cập nhật Ads Approval từ backend vẫn thiên về việc Frontend phải reload lại bảng. Thay vì push socket sự kiện lên.
- **Media Library Cũ:** Đang upload file rời rạc và không có giao diện xem lại/pick lại các hình ảnh đã đẩy lên CDN (MinIO).
- **Performance:** Bảng liệt kê Campaign chưa phân trang triệt để khi scale vài nghìn record trong store React.

### D. Về AI Optimizer
- AI Auto-pause Engine đang hoạt động giống Rule-based system (`if CPA > Threshold then action`). Nó chưa có thuật toán Học máy dự báo thực thụ để tối giản chỉ số trong nhiều ngày (Predictive Modeling).

---

## 2. Hướng Phát triển tiếp theo (Roadmap)

### Phiên bản Nâng cấp Giới Hạn (Phase Tiếp Theo)
1. Cấu hình xử lý hoàn toàn sạch sẽ Adapter Facebook (vượt qua Review App Policy). Bắt toàn bộ ngoại lệ lỗi tiếng Anh trả về tiếng Việt.
2. Thiết lập Websocket cho Dashboard để update metrics quảng cáo trong thời gian thực.
3. Hoàn thiện Dashboard phân tích số liệu tổng, ghép biểu đồ chạy Recharts trên Frontend.

### Tầm Nhìn Dài Hạn (Phase Nền tảng Doanh Nghiệp)
1. Kết nối triệt để Adapter TikTok và Google Search, chạy quảng cáo Performance Max chung Dashboard.
2. AI Optimizer: Triển khai ML Models để đánh giá chất lượng Text mồi và Ảnh mẫu (Creative Scoring) hoặc báo trước trend chi tiêu.
3. Liên kết GenAI để cho phép AI tự động Generator ra copy (chữ) của Ads dựa vào mô tả keyword công ty, giải quyết việc advertiser bí đề tài content.
