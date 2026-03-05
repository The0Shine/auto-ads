# 🌟 Tổng quan Dự án (Project Overview)

## 1. Giới thiệu chung
**Auto-Ads Platform** là một nền tảng tự động hóa việc thiết lập, quản lý và tối ưu hóa các chiến dịch quảng cáo đa kênh (Cross-channel Advertising). Với hệ thống này, người dùng chỉ cần tạo một chiến dịch duy nhất trên hệ thống, và nó sẽ tự động phân phối lên các nền tảng quảng cáo lớn như **Facebook, Google (sắp tới) và TikTok (sắp tới)**.

Điểm nổi bật nhất của dự án là khả năng **AI Auto-Optimization** (Tối ưu hóa tự động): AI sẽ liên tục theo dõi hiệu suất của các nhóm quảng cáo (ad sets) dựa trên các chỉ số như CPA, CTR, ROAS, v.v. và tự động đưa ra quyết định tạm dừng (pause) các nhóm quảng cáo hoạt động kém hiệu quả, giúp tiết kiệm ngân sách và tối ưu hóa ROI cho người dùng.

## 2. Các Tính năng Chính (Features)

### 👤 Quản lý Người dùng & Trợ lý
- Đăng ký, đăng nhập an toàn bằng JWT.
- Hệ thống Workspace cho phép chia sẻ công việc, quản lý đội nhóm.
- Tích hợp Gateway để xác thực mọi request trước khi vào các service bên trong.

### 📢 Quản lý Chiến dịch Quảng cáo Đa kênh
- Trải nghiệm tạo Chiến dịch hợp nhất: Thiết lập mọi thứ (Mục tiêu, Ngân sách, Content, Media) từ một Dashboard duy nhất.
- Hỗ trợ tạo cấu trúc chuẩn: Campaign -> Ad Set -> Ad Creative giống Facebook/Google.
- Phân phối chiến dịch tự động qua các API adapter (Facebook Adapter, Google Adapter, TikTok Adapter).
- Theo dõi trạng thái đồng bộ (Sync/Failed/Draft).

### 🤖 AI Tối ưu Hóa (AI Optimizer)
- Phân tích hiệu suất theo thời gian thực dựa vào dữ liệu phân tích.
- Thuật toán chấm điểm (Scoring Algorithm) cho mỗi ad set.
- Tự động hóa các quy tắc dừng (Auto-Pause Rules):
  - Dừng quảng cáo có CPA quá cao (ví dụ: > 3x Target CPA).
  - Dừng quảng cáo có CTR thấp.
  - Cảnh báo "Audience fatigue" nếu tần suất hiển thị lặp lại quá cao.
- Lưu lại lịch sử các hành động tối ưu để minh bạch và theo dõi.

### 📊 Báo cáo & Phân tích (Analytics - Sắp hoàn thiện)
- Dashboard biểu diễn các số liệu tổng quan về chi tiêu, lượt nhấp, chuyển đổi trên tất cả các nền tảng.
- Lọc theo thời gian, theo chiến dịch.

## 3. Mục tiêu Phát triển của Sản phẩm
Hệ thống sinh ra để giải quyết nỗi đau của các nhà quảng cáo (Advertisers / Marketers):
1. **Tiết kiệm thời gian:** Không phải đăng nhập vào 3-4 nền tảng khác nhau để lên 1 chiến dịch.
2. **Theo dõi tập trung:** Xem mọi chỉ số và hiệu suất ở một màn hình duy nhất.
3. **Cắt lỗ kịp thời:** Không phải trực chờ xem quảng cáo nào đắt để tắt, AI sẽ làm việc đó 24/7.
