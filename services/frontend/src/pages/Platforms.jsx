import { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Tag, Button, Typography, Space, Statistic, Alert, Input, Form, Modal, message } from 'antd';
import { ApiOutlined, ReloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { campaignAPI } from '../api/campaign.api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const CARD_STYLE = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 };

const syncColors = { SYNCED: 'success', PENDING: 'warning', SYNCING: 'processing', ERROR: 'error' };

export default function Platforms() {
  const [campaigns, setCampaigns]       = useState([]);
  const [syncData, setSyncData]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [fbToken, setFbToken]           = useState(() => localStorage.getItem('fb_access_token') || '');
  const [fbAccountId, setFbAccountId]   = useState(() => localStorage.getItem('fb_ad_account_id') || '');
  const [tokenModal, setTokenModal]     = useState(false);
  const [tokenForm]                     = Form.useForm();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await campaignAPI.list({ limit: 100 });
      const clist = data.data || [];
      setCampaigns(clist);
      await loadSyncStatuses(clist);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  };

  const loadSyncStatuses = async (clist) => {
    const distributed = clist.filter(c => !['DRAFT'].includes(c.status));
    const rows = [];
    await Promise.all(distributed.map(async (c) => {
      try {
        const { data } = await campaignAPI.status(c.id);
        const mappings = data.data?.platforms || [];
        mappings.forEach(m => rows.push({
          key: m.id,
          campaign_name: c.name,
          campaign_id: c.id,
          platform: m.platform,
          platform_id: m.platform_id,
          entity_type: m.entity_type,
          sync_status: m.sync_status,
          last_synced_at: m.last_synced_at,
          error_message: m.error_message,
        }));
      } catch { /* skip */ }
    }));
    setSyncData(rows);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSyncStatuses(campaigns);
    setRefreshing(false);
  };

  const handleSaveToken = (values) => {
    localStorage.setItem('fb_access_token', values.accessToken || '');
    localStorage.setItem('fb_ad_account_id', values.adAccountId || '');
    setFbToken(values.accessToken || '');
    setFbAccountId(values.adAccountId || '');
    setTokenModal(false);
    message.success('Đã lưu token');
  };

  const handleDisconnect = () => {
    Modal.confirm({
      title: 'Xóa kết nối Facebook?',
      onOk: () => {
        localStorage.removeItem('fb_access_token');
        localStorage.removeItem('fb_ad_account_id');
        setFbToken('');
        setFbAccountId('');
        message.success('Đã ngắt kết nối');
      },
    });
  };

  const isConnected = !!fbToken;
  const synced      = syncData.filter(r => r.sync_status === 'SYNCED').length;
  const errors      = syncData.filter(r => r.sync_status === 'ERROR').length;
  const lastSync    = syncData.reduce((max, r) => r.last_synced_at > max ? r.last_synced_at : max, '');

  return (
    <div>
      <div className="page-header">
        <Title level={2} style={{ color: '#fff', margin: 0 }}>
          <ApiOutlined style={{ marginRight: 8 }} />Platforms
        </Title>
      </div>

      {/* Summary Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { title: 'Đã Sync', value: synced, color: '#00B894' },
          { title: 'Lỗi Sync', value: errors, color: '#E17055' },
          { title: 'Tổng Mappings', value: syncData.length, color: '#6C5CE7' },
        ].map((s, i) => (
          <Col key={i} xs={24} sm={8}>
            <div className="stat-card">
              <div style={{ color: '#94A3B8', fontSize: 12 }}>{s.title}</div>
              <div style={{ color: s.color, fontSize: 28, fontWeight: 700 }}>{s.value}</div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Facebook Connection */}
      <Card
        title={<Space><span style={{ color: '#E2E8F0' }}>Facebook Connection</span></Space>}
        style={{ ...CARD_STYLE, marginBottom: 16 }}
        headStyle={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        extra={
          isConnected
            ? <Button danger size="small" onClick={handleDisconnect}>Ngắt kết nối</Button>
            : <Button type="primary" size="small" onClick={() => { tokenForm.setFieldsValue({ accessToken: fbToken, adAccountId: fbAccountId }); setTokenModal(true); }}>Kết nối</Button>
        }
      >
        {isConnected ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              type="success"
              icon={<CheckCircleOutlined />}
              showIcon
              message="Facebook đã kết nối"
              description={
                <div>
                  <div><Text style={{ color: '#94A3B8' }}>Ad Account ID: </Text><Text style={{ color: '#E2E8F0' }}>{fbAccountId || '(chưa đặt)'}</Text></div>
                  <div><Text style={{ color: '#94A3B8' }}>Token: </Text><Text style={{ color: '#E2E8F0' }}>{fbToken.slice(0, 20)}…</Text></div>
                </div>
              }
            />
            <Button size="small" onClick={() => { tokenForm.setFieldsValue({ accessToken: fbToken, adAccountId: fbAccountId }); setTokenModal(true); }}>
              Cập nhật token
            </Button>
          </Space>
        ) : (
          <Alert
            type="warning"
            icon={<ExclamationCircleOutlined />}
            showIcon
            message="Chưa kết nối Facebook"
            description="Nhấn 'Kết nối' để nhập Access Token và Ad Account ID của bạn."
          />
        )}
      </Card>

      {/* Sync Status Table */}
      <Card
        title={<span style={{ color: '#E2E8F0' }}>Trạng thái đồng bộ</span>}
        style={CARD_STYLE}
        headStyle={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        extra={
          <Button icon={<ReloadOutlined />} size="small" loading={refreshing} onClick={handleRefresh}>
            Refresh
          </Button>
        }
      >
        {lastSync && (
          <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 8 }}>
            Lần cuối sync: {dayjs(lastSync).format('DD/MM/YYYY HH:mm')}
          </div>
        )}
        <div className="dark-table">
          <Table
            dataSource={syncData}
            loading={loading}
            rowKey="key"
            pagination={{ pageSize: 15 }}
            locale={{ emptyText: <span style={{ color: '#94A3B8' }}>Chưa có dữ liệu sync (phân phối campaign để bắt đầu)</span> }}
            columns={[
              { title: 'Campaign', dataIndex: 'campaign_name', render: v => <Text style={{ color: '#E2E8F0' }}>{v}</Text> },
              { title: 'Entity', dataIndex: 'entity_type', width: 90, render: v => <Tag>{v}</Tag> },
              { title: 'Platform', dataIndex: 'platform', width: 90 },
              { title: 'Platform ID', dataIndex: 'platform_id', width: 160, render: v => <Text style={{ color: '#94A3B8', fontSize: 12 }}>{v}</Text> },
              {
                title: 'Sync Status', dataIndex: 'sync_status', width: 110,
                render: v => <Tag color={syncColors[v] || 'default'}>{v}</Tag>,
              },
              { title: 'Last Synced', dataIndex: 'last_synced_at', width: 130, render: v => v ? dayjs(v).format('DD/MM HH:mm') : '—' },
              { title: 'Lỗi', dataIndex: 'error_message', render: v => v ? <Text style={{ color: '#E17055', fontSize: 12 }}>{v}</Text> : '—' },
            ]}
          />
        </div>
      </Card>

      {/* Token Modal */}
      <Modal title="Facebook Access Token" open={tokenModal} onCancel={() => setTokenModal(false)} footer={null}>
        <Form form={tokenForm} layout="vertical" onFinish={handleSaveToken}>
          <Form.Item name="accessToken" label="Access Token" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="EAAi..." />
          </Form.Item>
          <Form.Item name="adAccountId" label="Ad Account ID">
            <Input placeholder="act_123456789" />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            message="Token được lưu trong trình duyệt (localStorage). Không gửi lên server."
            style={{ marginBottom: 12 }}
          />
          <Form.Item>
            <Button type="primary" htmlType="submit" block>Lưu</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
