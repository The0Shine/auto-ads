import { useState, useEffect } from 'react';
import { Row, Col, Statistic, Card, Typography } from 'antd';
import { RocketOutlined, DollarOutlined, EyeOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { campaignAPI } from '../api/campaign.api';

const { Title, Text } = Typography;

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data } = await campaignAPI.list({ limit: 100 });
      setCampaigns(data.data || []);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'ACTIVE').length,
    totalBudget: campaigns.reduce((sum, c) => sum + Number(c.total_budget || 0), 0),
    totalSpend: campaigns.reduce((sum, c) => sum + Number(c.total_spend || 0), 0),
  };

  const statCards = [
    { title: 'Tổng Campaigns', value: stats.total, icon: <RocketOutlined />, color: '#6C5CE7' },
    { title: 'Đang Hoạt động', value: stats.active, icon: <ThunderboltOutlined />, color: '#00B894' },
    { title: 'Tổng Budget', value: stats.totalBudget, prefix: '$', icon: <DollarOutlined />, color: '#FDCB6E' },
    { title: 'Đã Chi tiêu', value: stats.totalSpend, prefix: '$', icon: <EyeOutlined />, color: '#74B9FF' },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={2} style={{ color: '#fff', margin: 0 }}>Dashboard</Title>
      </div>

      <Row gutter={[16, 16]}>
        {statCards.map((stat, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text className="stat-label">{stat.title}</Text>
                <span style={{ fontSize: 24, color: stat.color }}>{stat.icon}</span>
              </div>
              <div className="stat-value">
                {stat.prefix || ''}{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card
            title={<span style={{ color: '#E2E8F0' }}>Campaigns Gần đây</span>}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}
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
              campaigns.slice(0, 5).map(c => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/campaigns/${c.id}`)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    color: '#E2E8F0',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    <Text style={{ color: '#94A3B8', fontSize: 12 }}>{c.objective}</Text>
                  </div>
                  <span className={`status-${c.status?.toLowerCase()}`} style={{
                    padding: '2px 10px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1px solid',
                  }}>
                    {c.status}
                  </span>
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
