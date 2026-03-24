# AutoAds — Test Plan (UI Flow)

## Chuẩn bị
```bash
# Rebuild backend services sau khi fix
docker compose up -d --build campaign-service auth-service api-gateway

# Start frontend
cd services/frontend && npm run dev
```

---

## Flow 1: Đăng ký & Đăng nhập

### TC-1.1: Đăng ký tài khoản mới
1. Mở `/register`
2. Để trống tất cả → nhấn "Tạo tài khoản"
3. **Expected:** Hiện lỗi validation trên tất cả các field bắt buộc
4. Nhập email sai format (vd: `abc`) → **Expected:** "Email không hợp lệ"
5. Nhập password < 8 ký tự → **Expected:** "Mật khẩu phải có ít nhất 8 ký tự"
6. Nhập password khác confirmPassword → **Expected:** "Mật khẩu không khớp"
7. Điền đúng tất cả: fullName, email, password >= 8 ký tự, confirm khớp
8. Nhấn "Tạo tài khoản"
9. **Expected:** Chuyển về `/`, hiện dashboard, sidebar có menu đầy đủ

### TC-1.2: Đăng nhập
1. Mở `/login`
2. Nhập email/password sai → **Expected:** "Email hoặc mật khẩu không đúng"
3. Nhập đúng tài khoản vừa tạo
4. **Expected:** Chuyển về `/`, hiện dashboard

### TC-1.3: Đăng xuất
1. Click nút Logout trên header
2. **Expected:** Quay lại `/login`
3. Truy cập `/campaigns` → **Expected:** Redirect về `/login`

---

## Flow 2: Tạo Campaign (Wizard 4 bước)

### TC-2.1: Bước 1 — Campaign Info (validation)
1. Mở `/campaigns/create`
2. Nhấn "Tiếp theo" ngay → **Expected:** Lỗi trên các field bắt buộc (tên, objective, totalBudget)
3. Nhập tên 1 ký tự → **Expected:** "Tối thiểu 2 ký tự"
4. Nhập tên > 100 ký tự → **Expected:** "Tối đa 100 ký tự"
5. Chọn objective = TRAFFIC
6. Nhập totalBudget = 0 → **Expected:** "Tối thiểu 1"
7. Nhập totalBudget = 500
8. Nhập dailyBudget = 600 → **Expected:** "Ngân sách ngày không được lớn hơn tổng ngân sách"
9. Nhập dailyBudget = 50
10. Chọn dateRange: start = hôm qua → **Expected:** "Ngày bắt đầu không được trong quá khứ"
11. Chọn dateRange: start = hôm nay, end = trước start → **Expected:** "Ngày kết thúc phải sau ngày bắt đầu"
12. Chọn dateRange hợp lệ (hoặc bỏ trống)
13. Nhấn "Tiếp theo" → **Expected:** Chuyển sang Bước 2

### TC-2.2: Bước 2 — Ad Set (validation)
1. Nhấn "Tiếp theo" ngay → **Expected:** Lỗi trên adset_name, adset_budget, countries
2. Nhập tên ad set hợp lệ
3. Nhập budget = 0 → **Expected:** "Tối thiểu 1"
4. Nhập budget = 50
5. Để countries trống → nhấn "Tiếp theo" → **Expected:** "Vui lòng nhập ít nhất 1 quốc gia"
6. Nhập countries = VN
7. Đặt ageMin = 30, ageMax = 25 → **Expected:** "Tuổi đến phải >= Tuổi từ"
8. Sửa ageMax = 45
9. (Tùy chọn) Chọn genders, interests, positions
10. Nhấn "Tiếp theo" → **Expected:** Chuyển sang Bước 3

### TC-2.3: Bước 3 — Creative + Ad (validation)
1. Nhấn "Tiếp theo" ngay → **Expected:** Lỗi trên creative_name, creative_type, headline, destinationUrl, ad_name
2. Nhập creative_name = "Banner Sale"
3. Chọn creative_type = IMAGE
4. Nhập headline > 125 ký tự → **Expected:** "Tối đa 125 ký tự"
5. Nhập headline = "Sale 50% hôm nay"
6. Nhập destinationUrl = "abc" → **Expected:** "URL không hợp lệ"
7. Nhập destinationUrl = "https://shop.com"
8. **Không upload file** → nhấn "Tiếp theo" → **Expected:** "Vui lòng upload ít nhất 1 file media cho loại creative này" (vì type=IMAGE)
9. Đổi type = TEXT → nhấn "Tiếp theo" → **Expected:** Chuyển bước (TEXT không cần file)
10. Hoặc: upload file → nhấn "Tiếp theo"
11. Nhập ad_name = "Ad 1"
12. Nhấn "Tiếp theo" → **Expected:** Chuyển sang Bước 4

### TC-2.4: Bước 4 — Review & Tạo
1. **Kiểm tra:** Tất cả thông tin hiển thị đúng (campaign name, objective, budget, ad set name, targeting, creative info, ad name)
2. Nhấn "← Quay lại" → **Expected:** Quay về bước 3, data vẫn giữ nguyên
3. Nhấn "Tiếp theo" lại → về bước 4
4. Nhấn "Tạo Campaign"
5. **Expected:** Progress bar hiện (10% → 35% → 60% → 85% → 100%)
6. **Expected:** Thông báo "Tạo campaign thành công!"
7. **Expected:** Chuyển tự động sang `/campaigns/{id}` (CampaignDetail)

---

## Flow 3: Campaign Detail — Quản lý sau khi tạo

### TC-3.1: Overview tab
1. Kiểm tra thông tin campaign: objective, budget, ngày tạo, status = DRAFT
2. **Expected:** Alert checklist hiện "Cần hoàn thành trước khi phân phối"
3. Bước 1 ✅ Tạo Campaign
4. Bước 2 ✅ Thêm ít nhất 1 Ad Set (nếu wizard đã tạo)
5. Bước 3 ✅ Thêm Ad vào Ad Set (nếu wizard đã tạo)

### TC-3.2: Distribute button (nếu tạo từ wizard — đã có ad set + ad)
1. Nút "Phân phối" phải **enabled** (vì wizard đã tạo đầy đủ)
2. Nhấn "Phân phối"
3. **Expected:** Campaign status → DISTRIBUTING → ACTIVE
4. Nút "Phân phối" biến mất, nút "Tạm dừng" xuất hiện

### TC-3.3: Distribute button (nếu thiếu ad set/ad)
1. Tạo campaign mới qua API (hoặc xóa hết ad sets)
2. Campaign DRAFT + 0 ad sets → **Expected:** Nút "Phân phối" disabled, hover hiện tooltip "Cần thêm ít nhất 1 Ad Set trước khi phân phối"
3. Thêm Ad Set (không có ad) → **Expected:** Nút disabled, tooltip "Mỗi Ad Set cần có ít nhất 1 Ad"
4. Thêm Ad vào Ad Set → **Expected:** Nút enabled

### TC-3.4: Pause / Resume
1. Campaign ACTIVE → nhấn "Tạm dừng" → **Expected:** Status = PAUSED
2. Campaign PAUSED → nhấn "Tiếp tục" → **Expected:** Status = ACTIVE
3. Campaign DRAFT → **Expected:** Không có nút Pause/Resume

### TC-3.5: Lưu trữ (Archive)
1. Nhấn "Lưu trữ" → **Expected:** Modal xác nhận
2. Xác nhận → **Expected:** Campaign status → ARCHIVED, chuyển về `/campaigns`

---

## Flow 4: Thêm Ad Set (từ CampaignDetail)

### TC-4.1: Tạo Ad Set
1. Vào tab "Ad Sets" → nhấn "Thêm Ad Set"
2. Để trống tên → nhấn "Tạo Ad Set" → **Expected:** Lỗi validation
3. Nhập tên, budget = 0 → **Expected:** InputNumber không cho nhập dưới 1 (min=1)
4. Điền đầy đủ: tên, budget, quốc gia
5. Đặt ageMin = 40, ageMax = 30 → **Expected:** "Tuổi đến phải >= Tuổi từ"
6. Sửa ageMax = 50 → nhấn "Tạo Ad Set"
7. **Expected:** Tạo thành công → tự động mở modal "Thêm Ad vào Ad Set"

### TC-4.2: Sửa Ad Set
1. Click icon Edit trên row ad set → **Expected:** Modal mở với data hiện tại
2. Sửa tên, budget → nhấn "Cập nhật"
3. **Expected:** Cập nhật thành công, table refresh

### TC-4.3: Xóa Ad Set
1. Click icon Delete → **Expected:** Modal xác nhận
2. Xác nhận → **Expected:** Ad Set biến mất khỏi table

---

## Flow 5: Thêm Ad + Creative (từ CampaignDetail)

### TC-5.1: Thêm Ad — chọn creative có sẵn
1. Expand Ad Set → nhấn "Thêm Ad" (hoặc nút "Thêm Ad" trên row)
2. **Expected:** Modal 2 bước hiện: Bước 1 tạo creative, Bước 2 chọn creative + lưu ad
3. Bỏ qua bước 1
4. Nếu đã có creative → dropdown hiện danh sách
5. Chọn creative, nhập tên Ad → nhấn "Lưu Ad"
6. **Expected:** Ad xuất hiện trong nested table

### TC-5.2: Thêm Ad — tạo creative mới inline
1. Nhấn "Thêm Ad" trên row ad set
2. **Bước 1:** Nhập tên creative, chọn loại, nhập headline, destination URL
3. (Tùy chọn) Chọn CTA: "Mua ngay"
4. Nhấn "+ Tạo creative này"
5. **Expected:** Thông báo "Đã tạo creative — đã tự chọn bên dưới"
6. **Expected:** Dropdown creative ở Bước 2 tự động chọn creative vừa tạo
7. Nhập tên Ad → nhấn "Lưu Ad"
8. **Expected:** Ad được tạo với creative vừa tạo

### TC-5.3: Thêm Ad — không có creative
1. Xóa hết creative (hoặc tài khoản mới)
2. Nhấn "Thêm Ad"
3. **Expected:** Dropdown creative trống, placeholder hiện "Tạo creative ở Bước 1 trước..."
4. Nút "Lưu Ad" disabled
5. Tạo creative ở Bước 1 → dropdown tự có data, nút enabled

### TC-5.4: Xóa Ad
1. Click icon Delete trên row ad → **Expected:** Modal xác nhận
2. Xác nhận → **Expected:** Ad biến mất

---

## Flow 6: Creative Library

### TC-6.1: Tạo Creative
1. Vào menu "Creatives" → nhấn "Tạo Creative"
2. Để trống tên, loại → nhấn "Tạo" → **Expected:** Lỗi validation
3. Nhập URL đích sai format → **Expected:** "URL không hợp lệ"
4. Điền đúng: tên, loại = IMAGE, headline, URL
5. (Tùy chọn) Upload ảnh
6. Nhấn "Tạo" → **Expected:** Card mới xuất hiện trong grid

### TC-6.2: Sửa Creative
1. Click icon Edit trên card → **Expected:** Modal mở với data cũ
2. Sửa headline → "Cập nhật"
3. **Expected:** Card cập nhật

### TC-6.3: Xóa Creative
1. Click icon Delete → **Expected:** Modal cảnh báo (file MinIO cũng xóa)
2. Xác nhận → **Expected:** Card biến mất

### TC-6.4: Preview ảnh
1. Click vào ảnh preview trên card → **Expected:** Mở Image preview toàn màn hình

### TC-6.5: Loại creative
1. Tạo creative với type = TEXT → **Expected:** Tạo thành công, tag "TEXT" màu cam
2. Tạo creative với type = COLLECTION → **Expected:** Tạo thành công

---

## Flow 7: Full E2E — Từ đăng ký đến Distribute

### TC-7.1: Happy path
1. Đăng ký tài khoản mới
2. Vào `/campaigns/create`
3. Bước 1: Tên = "Test Campaign", Objective = TRAFFIC, Budget = 100 USD
4. Bước 2: Ad Set = "Vietnam Users", Budget = 50/ngày, Countries = VN, Age 18-45
5. Bước 3: Creative = "Banner", Type = TEXT, Headline = "Mua ngay!", URL = https://shop.com, Ad = "Ad 1"
6. Bước 4: Review → "Tạo Campaign"
7. **Expected:** Tạo thành công → chuyển sang CampaignDetail
8. **Expected:** Status = DRAFT, alert checklist hiện ✅ cho cả 3 bước
9. Nhấn "Phân phối"
10. **Expected:** Status → DISTRIBUTING → ACTIVE
11. Vào tab "Insights" → **Expected:** Hiện metrics (nếu mock mode)
12. Nhấn "Tạm dừng" → **Expected:** Status = PAUSED
13. Nhấn "Tiếp tục" → **Expected:** Status = ACTIVE

### TC-7.2: Thêm Ad Set + Ad sau khi tạo campaign
1. Từ TC-7.1 campaign (hoặc tạo mới)
2. Vào tab "Ad Sets" → "Thêm Ad Set"
3. Tạo ad set mới → tự mở "Thêm Ad"
4. Tạo creative inline → chọn → "Lưu Ad"
5. **Expected:** Ad set mới hiện trong table, expand thấy ad bên trong
6. Nhấn "Phân phối" → **Expected:** Thành công (2 ad sets)

---

## Flow 8: Validation Edge Cases

### TC-8.1: Backend budget validation
```bash
# Gửi request thiếu totalBudget
curl -X POST http://localhost:3000/api/v1/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Test","objective":"TRAFFIC"}'
# Expected: 400 "totalBudget is required"

# dailyBudget > totalBudget
curl -X POST http://localhost:3000/api/v1/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Test","objective":"TRAFFIC","totalBudget":100,"dailyBudget":200}'
# Expected: 400 "dailyBudget must not exceed totalBudget"

# Ad set budget = 0
curl -X POST http://localhost:3000/api/v1/campaigns/<id>/ad-sets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Test","budget":0}'
# Expected: 400 "budget must be at least 1"
```

### TC-8.2: Distribute validation
1. Campaign DRAFT + 0 ad sets → **Expected:** Button disabled
2. Campaign DRAFT + ad set + 0 ads → **Expected:** Button disabled
3. Campaign DRAFT + ad set + ad (có creative) → **Expected:** Button enabled
4. Gọi API distribute trực tiếp khi thiếu ad → **Expected:** 400 error

---

## Flow 9: Giao diện Dark Theme

### TC-9.1: Kiểm tra tổng thể
1. **Login/Register:** Background gradient, card có backdrop-filter blur, input có border rõ
2. **Dashboard:** Stat cards có hover effect, sidebar màu đồng nhất
3. **Tables:** Header uppercase, row hover highlight tím nhẹ
4. **Modals:** Background tối, text đọc được rõ
5. **Forms:** Input focus có border highlight, label màu sáng
6. **Tags:** Màu phân biệt theo status (DRAFT=default, ACTIVE=green, PAUSED=warning)

### TC-9.2: Insights tab (fix duplicate style)
1. Mở campaign → tab Insights
2. Khi đang loading → **Expected:** Spinner card có background tối (không trắng)
3. Khi có data → **Expected:** Stat cards + chart hiển thị đúng

---

## Flow 10: Virtual Server — Metrics Simulation

### Luồng tổng thể
```
Distribute → facebook-adapter → POST /simulate/metrics (virtual server)
  → Ghi ad_metrics vào TimescaleDB mỗi 3s × 10 lần (30s)
  → Campaign Insights hiển thị data
```

### TC-10.1: Trigger simulation qua Distribute
1. Tạo campaign đầy đủ (wizard) → nhấn "Phân phối"
2. Chờ 5-10 giây
3. Vào tab "Insights"
4. **Expected:** Có data metrics (impressions, clicks, spend > 0)
5. Chờ thêm 10 giây → refresh Insights
6. **Expected:** Các số tăng lên (simulation đang chạy mỗi 3s)
7. Chờ tổng 30 giây → refresh lại
8. **Expected:** Số ngừng tăng (simulation auto-stop sau 30s)

### TC-10.2: Kiểm tra metrics hợp lý
1. Sau khi distribute 30s, vào Insights
2. **Expected:** Các chỉ số nằm trong khoảng hợp lý:
   - CTR: 0-5%
   - CPC: ~$0.15
   - ROAS: ~3x
   - Impressions: 500-10,000 (10 lần × 50-1050)
   - Reach: ~80% of impressions
3. **Expected:** Có đủ metrics: impressions, clicks, spend, CTR, CPC, CPM, conversions, ROAS

### TC-10.3: Simulation cho nhiều Ad Sets
1. Tạo campaign với 2 ad sets, mỗi ad set 2 ads
2. Distribute
3. **Expected:** Virtual server tạo simulation riêng cho mỗi ad (4 simulation loops)
4. Insights hiện tổng hợp, expand ad set thấy metrics riêng cho từng ad

### TC-10.4: Virtual server health
```bash
curl http://localhost:4001/health
# Expected: {"status":"ok","service":"ads-virtual-server","timestamp":"..."}
```

### TC-10.5: Xem logs simulation
```bash
docker logs autoads-ads-virtual-server --tail 50
# Expected: Thấy log "[Simulate] Starting metrics for campaign ..."
# và "[Simulate] Iteration X/10 for ..."
```

---

## Flow 11: AI Optimizer — Tự động phân tích & hành động

### Luồng tổng thể
```
Metrics tích lũy → Scheduler chạy mỗi 60 phút
  → Lấy danh sách campaign ACTIVE
  → Cho từng campaign: lấy ad_sets → lấy metrics → XGBoost predict
  → Quyết định: PAUSE / SCALE / KEEP
  → PAUSE: tự gọi API pause campaign
  → SCALE/KEEP: ghi log (alert, không tự động)
```

### TC-11.1: AI Optimizer Health (UI)
1. Vào Dashboard
2. **Expected:** Card "AI Optimizer" hiện trạng thái (online/offline)
3. Nếu ai-optimizer chưa chạy → **Expected:** Card hiện "Offline" hoặc lỗi kết nối
4. Start: `docker compose up -d ai-optimizer`
5. Refresh Dashboard → **Expected:** Card hiện "Online", có thông tin model

### TC-11.2: AI Optimizer Health (API)
```bash
curl http://localhost:8000/health
# Expected: {"status":"healthy","model_loaded":true,...}

# Nếu chưa start:
# Expected: Connection refused
```

### TC-11.3: Manual Trigger (Dashboard)
1. Vào Dashboard → card AI Optimizer → nhấn "Trigger Optimization"
2. **Expected:** Thông báo thành công
3. **Expected:** Optimizer chạy phân tích tất cả campaign ACTIVE
4. Xem logs:
```bash
docker logs autoads-ai-optimizer --tail 30
# Expected: "[Optimizer] Analyzing campaign ..."
# "[Optimizer] Ad Set xxx: action=KEEP confidence=0.75"
```

### TC-11.4: Prediction Simulator (trang /optimizer)
1. Vào menu "AI Optimizer" → trang `/optimizer`
2. Phần "Prediction Simulator":
   - Nhập impressions = 5000, clicks = 200, spent = 30
   - Nhấn "Predict"
3. **Expected:** Hiện kết quả:
   - Action badge (PAUSE/SCALE/KEEP) với màu tương ứng
   - Confidence progress bar (VD: 75%)
4. Test các kịch bản:
   - CPA thấp (impressions=10000, clicks=500, spent=50) → **Expected:** SCALE
   - CPA trung bình (impressions=5000, clicks=100, spent=40) → **Expected:** KEEP
   - CPA cao (impressions=1000, clicks=10, spent=100) → **Expected:** PAUSE

### TC-11.5: Campaign AI Analysis (CampaignDetail)
1. Campaign ACTIVE (đã distribute + có metrics)
2. Vào tab "AI Optimizer"
3. **Expected:** Performance Scores hiển thị cho từng Ad Set (0-100, màu đỏ/vàng/xanh)
4. Nhấn "Analyze Now"
5. **Expected:** Kết quả phân tích hiện (action + confidence)
6. **Expected:** Bảng "Lịch sử tối ưu" hiện các record mới

### TC-11.6: Performance Score ranges
1. Score 0-40 (PAUSE vùng) → **Expected:** Badge đỏ (#E17055)
2. Score 40-70 (KEEP vùng) → **Expected:** Badge vàng (#FDCB6E)
3. Score 70-100 (SCALE vùng) → **Expected:** Badge xanh (#00CEC9)

### TC-11.7: Optimization History
1. Vào `/optimizer` → phần "Campaign History"
2. Chọn campaign từ dropdown
3. **Expected:** Table hiện lịch sử: thời gian, action, confidence, applied, lý do
4. Nhấn "Analyze" → **Expected:** Record mới xuất hiện trong table

---

## Flow 12: AI Auto-Pause Campaign

### Luồng tự động
```
Campaign ACTIVE → Scheduler chạy → AI phân tích
  → Nếu model dự đoán PAUSE (confidence <= 0.30, CPA > 30)
  → Gọi POST /campaigns/:id/pause
  → Campaign status: ACTIVE → PAUSED
  → Ghi optimization_log: action_type='AUTO_PAUSE'
```

### TC-12.1: Kịch bản AI tự động pause
1. Tạo campaign, distribute, chờ metrics
2. Giả sử metrics kém (CPA > $30, CTR rất thấp)
3. Trigger optimization: Dashboard → "Trigger Optimization"
4. **Expected nếu AI quyết định PAUSE:**
   - Campaign status chuyển PAUSED
   - Optimization log: action = "PAUSE", applied = true
   - Ad set: auto_paused = true, auto_pause_reason có nội dung
5. **Expected nếu AI quyết định KEEP:**
   - Campaign vẫn ACTIVE
   - Optimization log: action = "KEEP", applied = false (chỉ alert)

### TC-12.2: Resume sau khi AI pause
1. Campaign bị AI pause (status = PAUSED)
2. User nhấn "Tiếp tục" trên CampaignDetail
3. **Expected:** Campaign status → ACTIVE
4. Vào lần optimization cycle tiếp theo:
   - AI sẽ phân tích lại
   - Nếu metrics vẫn kém → có thể pause lại

### TC-12.3: Threshold configuration
```
Mặc định:
  ai_confidence_threshold = 0.70
  min_impressions_for_eval = 1000

Logic:
  pause_threshold = 1.0 - 0.70 = 0.30
  → PAUSE nếu confidence <= 0.30
```

### TC-12.4: Skip khi chưa đủ data
1. Campaign vừa distribute (< 1000 impressions)
2. Trigger optimization
3. **Expected:** AI skip ad set này
4. Logs hiện: "Skipped — not enough impressions (< 1000)"

### TC-12.5: SCALE recommendation
1. Campaign có metrics tốt (CPA < $15, CTR cao)
2. Trigger optimization
3. **Expected:** Optimization log hiện action = "SCALE"
4. **Lưu ý:** SCALE chỉ là gợi ý, không tự động thực hiện
5. User cần tự tăng budget nếu muốn scale

---

## Flow 13: Scheduler tự động (không cần trigger thủ công)

### TC-13.1: Scheduler chạy đúng interval
```bash
# Start ai-optimizer
docker compose up -d ai-optimizer

# Xem logs theo thời gian
docker logs -f autoads-ai-optimizer

# Expected sau 60 phút:
# "[Scheduler] Running optimization cycle..."
# "[Optimizer] Found X active campaigns"
# "[Optimizer] Campaign xxx: paused=0 scaled=1 kept=1 skipped=0"

# Expected sau 15 phút:
# "[Scheduler] Running metrics sync..."
# "[Scheduler] X ad_sets with metrics in last 24h"
```

### TC-13.2: Scheduler không crash khi service offline
1. Stop campaign-service: `docker compose stop campaign-service`
2. Chờ scheduler cycle
3. **Expected:** Log hiện lỗi connection nhưng KHÔNG crash
4. Restart campaign-service → scheduler cycle tiếp theo OK

---

## Flow 14: Full E2E — Distribute → Simulation → AI Analysis

### TC-14.1: Happy path toàn bộ
1. **Đăng ký** tài khoản mới
2. **Tạo Campaign** (wizard 4 bước):
   - Campaign: "E2E Test", TRAFFIC, $500
   - Ad Set: "VN Users", $50/ngày, countries=VN, age 18-45
   - Creative: TEXT, headline="Test Ad", URL=https://example.com
   - Review → Tạo
3. **Distribute:**
   - Nhấn "Phân phối" → status DISTRIBUTING
   - Chờ 5s → status ACTIVE
4. **Metrics chạy:**
   - Chờ 10s → tab Insights → **Expected:** impressions, clicks > 0
   - Chờ 30s → metrics ngừng tăng (simulation auto-stop)
5. **AI Analysis:**
   - Tab "AI Optimizer" → nhấn "Analyze Now"
   - **Expected:** Score badge hiện cho ad set
   - **Expected:** Optimization history có 1 record mới
6. **Dashboard:**
   - Quay về Dashboard → **Expected:** Campaign hiện trong list
   - AI Optimizer card hiện online
   - Recent optimization actions hiện
7. **Pause/Resume:**
   - Nhấn "Tạm dừng" → status PAUSED
   - Nhấn "Tiếp tục" → status ACTIVE
8. **Lưu trữ:**
   - Nhấn "Lưu trữ" → confirm → chuyển về `/campaigns`
   - **Expected:** Campaign không còn trong danh sách (hoặc hiện ARCHIVED)

### TC-14.2: Nhiều campaigns chạy song song
1. Tạo 3 campaigns, distribute tất cả
2. **Expected:** Virtual server chạy simulation riêng cho từng campaign
3. Trigger AI optimization
4. **Expected:** AI phân tích cả 3 campaigns, mỗi cái có kết quả riêng
5. Kiểm tra Insights từng campaign → **Expected:** Data khác nhau (random)

### TC-14.3: Campaign bị AI pause rồi user resume
1. Tạo campaign → distribute → chờ metrics
2. Trigger optimization → nếu AI pause:
   - **Expected:** Status = PAUSED, lý do hiện trong optimization log
   - User nhấn "Tiếp tục"
   - **Expected:** Status = ACTIVE
   - Trigger optimization lại → AI phân tích lại

---

## Checklist tổng hợp

| # | Test Flow | Trạng thái |
|---|-----------|-----------|
| 1 | Đăng ký / Đăng nhập / Đăng xuất | ☐ |
| 2 | Wizard tạo Campaign (4 bước + validation) | ☐ |
| 3 | Campaign Detail: Overview, Distribute, Pause/Resume | ☐ |
| 4 | Thêm/Sửa/Xóa Ad Set | ☐ |
| 5 | Thêm Ad + inline Creative / Chọn Creative có sẵn | ☐ |
| 6 | Creative Library CRUD + URL validation | ☐ |
| 7 | Full E2E: Đăng ký → Distribute | ☐ |
| 8 | Backend validation edge cases | ☐ |
| 9 | Dark theme UI consistency | ☐ |
| 10 | Virtual Server: Metrics simulation sau Distribute | ☐ |
| 11 | AI Optimizer: Health, Predict, Analyze, Scores | ☐ |
| 12 | AI Auto-Pause: Campaign tự động bị pause | ☐ |
| 13 | Scheduler: Chạy tự động đúng interval | ☐ |
| 14 | Full E2E: Distribute → Simulation → AI → Pause/Resume | ☐ |
