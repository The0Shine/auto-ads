# Ads Conversion AI -- Mô hình XGBoost

Dự án này xây dựng một **mô hình machine learning để dự đoán xác suất chuyển đổi (conversion) của quảng cáo và tự động quyết định nên SCALE, KEEP hay PAUSE một chiến dịch quảng cáo** dựa trên các chỉ số hiệu suất.

Hệ thống sử dụng **dataset KAG Facebook Ads Conversion** và huấn luyện một **mô hình phân loại XGBoost** để ước lượng xác suất một quảng cáo có thể tạo ra chuyển đổi.

Đầu tiên, dataset `KAG_conversion_data.csv` được tải bằng Pandas. Dataset này chứa thông tin về các chiến dịch quảng cáo bao gồm:

- Nhóm tuổi  
- Giới tính  
- Nhóm sở thích (interest category)  
- Lượt hiển thị (impressions)  
- Lượt click (clicks)  
- Chi phí quảng cáo (ad spend)  
- Chuyển đổi (conversions)

Một số bước **tiền xử lý dữ liệu** được thực hiện để chuyển các biến dạng danh mục (categorical) thành dạng số.

- Giới tính được mã hóa:  
  - `M = 0`  
  - `F = 1`

- Nhóm tuổi được ánh xạ thành các chỉ số số học:  
  - `30-34`  
  - `35-39`  
  - `40-44`  
  - `45-49`

---

## Feature Engineering

Một số **chỉ số marketing** được tạo ra từ dữ liệu gốc:

- **CTR (Click Through Rate)** = Clicks / Impressions  
- **CPC (Cost Per Click)** = Spent / Clicks  
- **CPM (Cost Per 1000 Impressions)** = Spent / Impressions × 1000  
- **CVR (Conversion Rate)** = Conversions / Clicks  
- **Log Impressions** = biến đổi log của impressions để ổn định phương sai dữ liệu

---

## Target Variable

Một biến mục tiêu có tên **`converted`** được tạo ra để xác định liệu một quảng cáo có tạo ra **ít nhất một chuyển đổi được duyệt** hay không.

---

## Huấn luyện mô hình (Model Training)

Dataset được chia thành **tập huấn luyện và tập kiểm tra (80/20)** bằng `train_test_split`.

Mô hình được huấn luyện bằng **XGBoost**, một thuật toán rất hiệu quả cho dữ liệu dạng bảng và có khả năng mô hình hóa các mối quan hệ phi tuyến.

Vì sự kiện chuyển đổi thường hiếm, nên **mất cân bằng dữ liệu (class imbalance)** được xử lý bằng tham số `scale_pos_weight`.

### Cấu hình mô hình

- 300 estimators  
- Maximum tree depth: 6  
- Learning rate: 0.05  
- Subsample: 0.8  
- Column sample by tree: 0.8  
- Evaluation metric: logloss

---

## Đánh giá mô hình (Model Evaluation)

Sau khi huấn luyện, mô hình được đánh giá trên tập test bằng **classification report**, bao gồm các chỉ số:

- Precision  
- Recall  
- F1-score

---

## Lưu mô hình (Model Saving)

Mô hình đã huấn luyện được lưu bằng thư viện **joblib**:

Việc này cho phép **tái sử dụng mô hình sau này mà không cần huấn luyện lại**.

---

## AI Decision Engine

Dự án bao gồm một **AI Decision Engine** có nhiệm vụ:

- Dự đoán xác suất chuyển đổi của dữ liệu quảng cáo mới
- Đưa ra khuyến nghị hành động

### Quy trình hoạt động

1. Nhận dữ liệu quảng cáo đầu vào (age, gender, interest, impressions, clicks, spend)
2. Tạo các feature giống với quá trình training
3. Dự đoán **xác suất chuyển đổi (conversion probability)**

Sau đó hệ thống ước lượng:

- **Expected Conversions** = Probability × Clicks  
- **Estimated CPA** = Spend / Expected Conversions

---

## Quy tắc ra quyết định (Decision Rules)

- **SCALE** – nếu Estimated CPA < 15  
- **KEEP** – nếu Estimated CPA nằm trong khoảng 15 – 30  
- **PAUSE** – nếu Estimated CPA > 30 hoặc Expected Conversions = 0

Hệ thống sẽ trả về:

- Hành động được đề xuất  
- Độ tin cậy của mô hình (confidence score)

---

## Ví dụ kiểm tra (Example Test)

Ví dụ dữ liệu quảng cáo đầu vào:

```python
test_ad = {
    'age':0,
    'gender':1,
    'interest':15,
    'Impressions':1200,
    'Clicks':5,
    'Spent':25.0
}
