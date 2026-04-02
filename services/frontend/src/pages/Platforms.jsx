import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Row, Col, Card, Table, Tag, Button, Typography, Space, Alert, Modal, message } from 'antd';
import { ApiOutlined, ReloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined, LinkOutlined } from '@ant-design/icons';
import { campaignAPI } from '../api/campaign.api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const CARD_STYLE = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 };
const syncColors = { SYNCED: 'success', PENDING: 'warning', SYNCING: 'processing', ERROR: 'error' };

export default function Platforms() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [connection,  setConnection]  = useState(null);   // platform_connections row
  const [campaigns,   setCampaigns]   = useState([]);
  const [syncData,    setSyncData]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  // Handle redirect back from OAuth
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error     = searchParams.get('error');
    if (connected === 'true') {
      message.success('Kết nối Facebook thành công!');
      setSearchParams({});
    } else if (error) {
      message.error(`Kết nối thất bại: ${decodeURIComponent(error)}`);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [connRes, campRes] = await Promise.all([
        campaignAPI.listPlatformConnections(),
        campaignAPI.list({ limit: 100 }),
      ]);
      const conns = connRes.data.data || [];
      setConnection(conns.find(c => c.platform === 'facebook') || null);

      const clist = campRes.data.data || [];
      setCampaigns(clist);
      await loadSyncStatuses(clist);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  };

  const loadSyncStatuses = async (clist) => {
    const distributed = clist.filter(c => c.status !== 'DRAFT');
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
    await loadData();
    setRefreshing(false);
  };

  const handleConnect = () => {
    const jwtToken = localStorage.getItem('accessToken') || '';
    window.location.href = `/api/v1/auth/oauth/facebook?token=${encodeURIComponent(jwtToken)}`;
  };

  const handleDisconnect = () => {
    Modal.confirm({
      title: 'Ngắt kết nối Facebook?',
      content: 'Token sẽ bị xóa khỏi hệ thống. Bạn có thể kết nối lại bất cứ lúc nào.',
      okText: 'Ngắt kết nối',
      okButtonProps: { danger: true },
      onOk: async () => {
        // Currently no disconnect endpoint — show info
        message.info('Tính năng ngắt kết nối đang phát triển. Liên hệ admin để xóa token.');
      },
    });
  };

  const isConnected = !!connection;
  const adAccounts  = (() => {
    let acc = connection?.ad_accounts;
    if (typeof acc === 'string') { try { acc = JSON.parse(acc); } catch { acc = []; } }
    return Array.isArray(acc) ? acc : [];
  })();
  const synced   = syncData.filter(r => r.sync_status === 'SYNCED').length;
  const errors   = syncData.filter(r => r.sync_status === 'ERROR').length;
  const lastSync = syncData.reduce((max, r) => r.last_synced_at > max ? r.last_synced_at : max, '');

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
            : <Button type="primary" size="small" icon={<LinkOutlined />} onClick={handleConnect}>Kết nối Facebook</Button>
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
                  <div>
                    <Text style={{ color: '#94A3B8' }}>FB User ID: </Text>
                    <Text style={{ color: '#E2E8F0' }}>{connection.platform_user_id}</Text>
                  </div>
                  {connection.token_expires_at && (
                    <div>
                      <Text style={{ color: '#94A3B8' }}>Token hết hạn: </Text>
                      <Text style={{ color: '#E2E8F0' }}>{dayjs(connection.token_expires_at).format('DD/MM/YYYY')}</Text>
                    </div>
                  )}
                  <div>
                    <Text style={{ color: '#94A3B8' }}>Trạng thái: </Text>
                    <Tag color="success">{connection.status}</Tag>
                  </div>
                </div>
              }
            />

            {adAccounts.length > 0 && (
              <div>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>Ad Accounts ({adAccounts.length}):</Text>
                <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {adAccounts.map(acc => (
                    <Tag key={acc.id} color="purple" style={{ margin: 0 }}>
                      {acc.name} ({acc.id})
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </Space>
        ) : (
          <Alert
            type="warning"
            icon={<ExclamationCircleOutlined />}
            showIcon
            message="Chưa kết nối Facebook"
            description={
              <div>
                <div>Nhấn "Kết nối Facebook" để uỷ quyền qua Facebook OAuth.</div>
                <div style={{ marginTop: 8, color: '#94A3B8', fontSize: 12 }}>
                  Token sẽ được lưu an toàn trong database (60 ngày).
                </div>
              </div>
            }
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
    </div>
  );
}
