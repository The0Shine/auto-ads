import { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Tag, Button, Badge, Space, message } from 'antd';
import {
  RocketOutlined, DollarOutlined, EyeOutlined, ThunderboltOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { campaignAPI } from '../api/campaign.api';
import { optimizerAPI } from '../api/optimizer.api';
import MetricsChart from '../components/MetricsChart';

const { Title, Text } = Typography;

const CARD_STYLE = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 };

const statusColors = { DRAFT: 'default', DISTRIBUTING: 'processing', ACTIVE: 'success', PAUSED: 'warning', ARCHIVED: '#636E72' };
const actionColors = { PAUSE: 'error', KEEP: 'processing', SCALE: 'success' };

export default function Dashboard() {
  const [campaigns, setCampaigns]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [optimizerHealth, setOptimizerHealth] = useState(null);
  const [recentActions, setRecentActions] = useState([]);
  const [triggering, setTriggering]       = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data } = await campaignAPI.list({ limit: 100 });
      const clist = data.data || [];
      setCampaigns(clist);

      // Load optimizer health + recent history (non-blocking)
      loadOptimizerData(clist);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  };

  const loadOptimizerData = async (clist) => {
    try {
      const { data } = await optimizerAPI.health();
      setOptimizerHealth(data);
    } catch { setOptimizerHealth(null); }

    // Load history from first 3 active campaigns
    const active = clist.filter(c => c.status === 'ACTIVE').slice(0, 3);
    const allActions = [];
    await Promise.all(active.map(async (c) => {
      try {
        const { data } = await optimizerAPI.history(c.id, 5);
        (data.data || []).forEach(h => allActions.push({ ...h, campaign_name: c.name }));
      } catch { /* skip */ }
    }));
    allActions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setRecentActions(allActions.slice(0, 5));
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await optimizerAPI.trigger();
      message.success('Đã kích hoạt optimization cycle');
      loadOptimizerData(campaigns);
    } catch (err) {
      message.error('Lỗi kích hoạt optimizer');
    } finally {
      setTriggering(false);
    }
  };

  const stats = {
    total:       campaigns.length,
    active:      campaigns.filter(c => c.status === 'ACTIVE').length,
    totalBudget: campaigns.reduce((sum, c) => sum + Number(c.total_budget || 0), 0),
    totalSpend:  campaigns.reduce((sum, c) => sum + Number(c.total_spend || 0), 0),
  };

  const statCards = [
    { title: 'Tổng Campaigns', value: stats.total, icon: <RocketOutlined />, color: '#6C5CE7' },
    { title: 'Đang Hoạt động', value: stats.active, icon: <ThunderboltOutlined />, color: '#00B894' },
    { title: 'Tổng Budget', value: stats.totalBudget.toLocaleString(), prefix: '$', icon: <DollarOutlined />, color: '#FDCB6E' },
    { title: 'Đã Chi tiêu', value: stats.totalSpend.toLocaleString(), prefix: '$', icon: <EyeOutlined />, color: '#74B9FF' },
  ];

  // Chart: budget per campaign (top 8)
  const chartData = campaigns.slice(0, 8).map(c => ({
    name: c.name.length > 10 ? c.name.slice(0, 10) + '…' : c.name,
    budget: Number(c.total_budget || 0),
    spend: Number(c.total_spend || 0),
  }));

  const isOnline = optimizerHealth?.status === 'ok';

  return (
    <div>
      <div className="page-header">
        <Title level={2} style={{ color: '#fff', margin: 0 }}>Dashboard</Title>
      </div>

      {/* Stat Cards */}
      <Row gutter={[16, 16]}>
        {statCards.map((stat, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text className="stat-label">{stat.title}</Text>
                <span style={{ fontSize: 24, color: stat.color }}>{stat.icon}</span>
              </div>
              <div className="stat-value">{stat.prefix || ''}{stat.value}</div>
            </div>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Budget Chart */}
        <Col xs={24} lg={16}>
          <Card
            title={<span style={{ color: '#E2E8F0' }}>Budget & Spend theo Campaign</span>}
            style={CARD_STYLE}
            headStyle={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            loading={loading}
          >
            {chartData.length > 0
              ? <MetricsChart data={chartData} metrics={['budget', 'spend']} type="bar" height={220} />
              : <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Chưa có dữ liệu</div>
            }
          </Card>
        </Col>

        {/* AI Optimizer Status */}
        <Col xs={24} lg={8}>
          <Card
            title={<span style={{ color: '#E2E8F0' }}>AI Optimizer</span>}
            style={CARD_STYLE}
            headStyle={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Badge
                  status={optimizerHealth === null ? 'default' : isOnline ? 'success' : 'error'}
                  text={<span style={{ color: '#E2E8F0' }}>
                    {optimizerHealth === null ? 'Kiểm tra...' : isOnline ? 'Online' : 'Offline'}
                  </span>}
                />
                {isOnline && (
                  <Tag color="success" icon={<CheckCircleOutlined />}>Sẵn sàng</Tag>
                )}
                {optimizerHealth !== null && !isOnline && (
                  <Tag color="error" icon={<ExclamationCircleOutlined />}>Lỗi</Tag>
                )}
              </Space>
            </div>
            <Button type="primary" size="small" loading={triggering} onClick={handleTrigger} block>
              Trigger Optimization
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => navigate('/optimizer')}
              style={{ color: '#A29BFE', marginTop: 8, padding: 0 }}
            >
              Xem chi tiết →
            </Button>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Recent Campaigns */}
        <Col xs={24} lg={14}>
          <Card
            title={<span style={{ color: '#E2E8F0' }}>Campaigns Gần đây</span>}
            style={CARD_STYLE}
            headStyle={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            loading={loading}
          >
            {campaigns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                <RocketOutlined style={{ fontSize: 40, marginBottom: 12 }} />
                <div>Chưa có campaign nào</div>
                <a onClick={() => navigate('/campaigns/create')} style={{ color: '#A29BFE', cursor: 'pointer' }}>
                  Tạo campaign đầu tiên →
                </a>
              </div>
            ) : (
              campaigns.slice(0, 6).map(c => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/campaigns/${c.id}`)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, color: '#E2E8F0' }}>{c.name}</div>
                    <Text style={{ color: '#94A3B8', fontSize: 12 }}>{c.objective}</Text>
                  </div>
                  <Tag color={statusColors[c.status]}>{c.status}</Tag>
                </div>
              ))
            )}
          </Card>
        </Col>

        {/* Recent Optimizer Actions */}
        <Col xs={24} lg={10}>
          <Card
            title={<span style={{ color: '#E2E8F0' }}>Hoạt động AI gần đây</span>}
            style={CARD_STYLE}
            headStyle={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            {recentActions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#94A3B8', fontSize: 13 }}>
                Chưa có hoạt động tối ưu nào
              </div>
            ) : (
              recentActions.map((a, i) => (
                <div key={i} style={{
                  padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                  <div style={{ flex: 1 }}>
                    <Space size={4}>
                      <Tag color={actionColors[a.action] || 'default'} style={{ fontSize: 11 }}>{a.action}</Tag>
                      <Text style={{ color: '#94A3B8', fontSize: 11 }}>{a.campaign_name}</Text>
                    </Space>
                    {a.reason && <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>{a.reason}</div>}
                  </div>
                  <Text style={{ color: '#636E72', fontSize: 11, whiteSpace: 'nowrap', marginLeft: 8 }}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('vi') : ''}
                  </Text>
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
