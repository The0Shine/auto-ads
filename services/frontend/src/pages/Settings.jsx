import { useState } from 'react';
import { Tabs, Card, Form, Input, Button, Switch, Typography, Space, Avatar, Descriptions, Alert, Row, Col, message, Divider } from 'antd';
import { UserOutlined, BellOutlined, KeyOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;
const CARD_STYLE = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 };

const NOTIFICATION_EVENTS = [
  { key: 'auto_pause',       label: 'AI tự động dừng campaign' },
  { key: 'budget_alert',     label: 'Cảnh báo ngân sách' },
  { key: 'campaign_status',  label: 'Thay đổi trạng thái campaign' },
  { key: 'daily_report',     label: 'Báo cáo hàng ngày' },
];

const NOTIFICATION_CHANNELS = [
  { key: 'email',  label: 'Email' },
  { key: 'in_app', label: 'In-App' },
  { key: 'slack',  label: 'Slack' },
];

function defaultPrefs() {
  try {
    return JSON.parse(localStorage.getItem('notification_prefs') || '{}');
  } catch { return {}; }
}

export default function Settings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(defaultPrefs);
  const fbToken     = localStorage.getItem('fb_access_token') || '';
  const fbAccountId = localStorage.getItem('fb_ad_account_id') || '';

  const togglePref = (event, channel) => {
    const key = `${event}__${channel}`;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    localStorage.setItem('notification_prefs', JSON.stringify(updated));
    message.success('Đã lưu tùy chọn');
  };

  return (
    <div>
      <div className="page-header">
        <Title level={2} style={{ color: '#fff', margin: 0 }}>Cài đặt</Title>
      </div>

      <Tabs
        defaultActiveKey="profile"
        items={[
          // ── Tab 1: Profile ──────────────────────────────────────────────
          {
            key: 'profile',
            label: <span><UserOutlined /> Hồ sơ</span>,
            children: (
              <Card style={CARD_STYLE}>
                <Space size={20} align="start" style={{ marginBottom: 24 }}>
                  <Avatar size={72} icon={<UserOutlined />} style={{ background: '#6C5CE7' }} />
                  <div>
                    <div style={{ color: '#E2E8F0', fontSize: 18, fontWeight: 600 }}>{user?.full_name || user?.email || '—'}</div>
                    <div style={{ color: '#94A3B8', fontSize: 13 }}>{user?.email}</div>
                    <div style={{ color: '#636E72', fontSize: 12, marginTop: 4 }}>ID: {user?.id}</div>
                  </div>
                </Space>

                <Descriptions column={1} labelStyle={{ color: '#94A3B8', width: 140 }} contentStyle={{ color: '#E2E8F0' }}>
                  <Descriptions.Item label="Họ và tên">{user?.full_name || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Email">{user?.email || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">
                    {user?.is_active ? <Text style={{ color: '#00B894' }}>Hoạt động</Text> : <Text style={{ color: '#E17055' }}>Bị khóa</Text>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày tham gia">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('vi') : '—'}
                  </Descriptions.Item>
                </Descriptions>

                <Alert
                  style={{ marginTop: 16 }}
                  type="info"
                  showIcon
                  message="Chỉnh sửa hồ sơ hiện chưa hỗ trợ. Tính năng sẽ được bổ sung."
                />
              </Card>
            ),
          },

          // ── Tab 2: Notifications ────────────────────────────────────────
          {
            key: 'notifications',
            label: <span><BellOutlined /> Thông báo</span>,
            children: (
              <Card style={CARD_STYLE}>
                <Alert
                  type="info"
                  showIcon
                  message="Tùy chọn được lưu cục bộ trong trình duyệt. Tích hợp backend đang phát triển."
                  style={{ marginBottom: 16 }}
                />

                {/* Grid: rows = events, cols = channels */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', color: '#94A3B8', padding: '8px 12px', fontWeight: 400, fontSize: 13 }}>
                          Sự kiện
                        </th>
                        {NOTIFICATION_CHANNELS.map(ch => (
                          <th key={ch.key} style={{ textAlign: 'center', color: '#94A3B8', padding: '8px 16px', fontWeight: 400, fontSize: 13 }}>
                            {ch.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {NOTIFICATION_EVENTS.map((ev, i) => (
                        <tr key={ev.key} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ color: '#E2E8F0', padding: '12px 12px', fontSize: 13 }}>{ev.label}</td>
                          {NOTIFICATION_CHANNELS.map(ch => (
                            <td key={ch.key} style={{ textAlign: 'center', padding: '12px 16px' }}>
                              <Switch
                                size="small"
                                checked={!!prefs[`${ev.key}__${ch.key}`]}
                                onChange={() => togglePref(ev.key, ch.key)}
                                style={{ background: prefs[`${ev.key}__${ch.key}`] ? '#6C5CE7' : undefined }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ),
          },

          // ── Tab 3: API Keys ─────────────────────────────────────────────
          {
            key: 'apikeys',
            label: <span><KeyOutlined /> API & Keys</span>,
            children: (
              <Card style={CARD_STYLE}>
                <Title level={5} style={{ color: '#E2E8F0' }}>Facebook</Title>
                <Descriptions column={1} labelStyle={{ color: '#94A3B8', width: 140 }} contentStyle={{ color: '#E2E8F0' }}>
                  <Descriptions.Item label="Ad Account ID">{fbAccountId || <Text style={{ color: '#636E72' }}>Chưa đặt</Text>}</Descriptions.Item>
                  <Descriptions.Item label="Access Token">
                    {fbToken
                      ? <Text style={{ color: '#E2E8F0' }}>{fbToken.slice(0, 24)}…</Text>
                      : <Text style={{ color: '#636E72' }}>Chưa có</Text>
                    }
                  </Descriptions.Item>
                </Descriptions>
                <Button size="small" href="/platforms" style={{ marginTop: 8 }}>
                  Quản lý tại Platforms →
                </Button>

                <Divider style={{ borderColor: 'rgba(255,255,255,0.08)' }} />

                <Title level={5} style={{ color: '#E2E8F0' }}>Thông tin hệ thống</Title>
                <Descriptions column={1} labelStyle={{ color: '#94A3B8', width: 140 }} contentStyle={{ color: '#E2E8F0' }}>
                  <Descriptions.Item label="User ID">{user?.id || '—'}</Descriptions.Item>
                  <Descriptions.Item label="API Base URL">/api/v1</Descriptions.Item>
                  <Descriptions.Item label="Workspace">
                    {user?.workspace_id || '—'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
