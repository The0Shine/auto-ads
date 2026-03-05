# 🚀 Auto-Ads Platform

> Nền tảng tự động hóa thiết lập và tối ưu quảng cáo xuyên biên giới.  
> Tạo 1 chiến dịch → Tự động phân phối lên Facebook, Google, TikTok → AI tự động tắt nhóm quảng cáo kém hiệu quả.



### Auth (`/api/v1/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Đăng ký tài khoản |
| POST | `/login` | Đăng nhập |
| POST | `/refresh-token` | Làm mới token |
| GET | `/me` | Profile (auth required) |

### Campaigns (`/api/v1/campaigns`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Tạo chiến dịch |
| GET | `/` | Danh sách chiến dịch |
| GET | `/:id` | Chi tiết chiến dịch |
| PUT | `/:id` | Cập nhật |
| POST | `/:id/distribute` | Phân phối lên các platform |
| POST | `/:id/pause` | Tạm dừng |
| POST | `/:id/resume` | Tiếp tục |
| GET | `/:id/status` | Trạng thái đồng bộ |

### AI Optimizer (`http://localhost:8000`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/optimizer/analyze/:id` | Phân tích AI cho campaign |
| GET | `/optimizer/history/:id` | Lịch sử tối ưu |
| GET | `/optimizer/score/:id` | Điểm hiệu suất ad set |

## 🧠 AI Auto-Pause Rules

| Rule | Default Threshold |
|------|-------------------|
| CPA quá cao | > 3x target CPA |
| CTR quá thấp | < 0.5% (search), < 0.8% (social) |
| ROAS quá thấp | < 1.0 |
| Chi tiêu không chuyển đổi | > 30% daily budget |
| Audience fatigue | Frequency > 3.0 |

Tất cả thresholds có thể cấu hình qua API hoặc biến môi trường.

## 📋 Development Status

- ✅ Phase 1: Foundation (monorepo, Docker, DB, Gateway, Auth, Campaign)
- ⬜ Phase 2: Core Campaign UI
- ⬜ Phase 3: Platform Integration (FB/Google/TikTok API)
- ⬜ Phase 4: Analytics & Dashboard
- ⬜ Phase 5: AI Auto-Optimization
- ⬜ Phase 6: Polish & Scale
