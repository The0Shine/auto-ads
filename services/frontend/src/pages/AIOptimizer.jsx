import { useState, useEffect } from 'react';
import {
  Row, Col, Card, Button, Form, InputNumber, Select, Typography,
  Table, Tag, Progress, Alert, Space, Badge, Spin, Empty,
} from 'antd';
import { ThunderboltOutlined, ExperimentOutlined } from '@ant-design/icons';
import { campaignAPI } from '../api/campaign.api';
import { optimizerAPI } from '../api/optimizer.api';
import ScoreBadge from '../components/ScoreBadge';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const CARD_STYLE = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 };
const actionColors = { PAUSE: 'error', KEEP: 'processing', SCALE: 'success' };

export default function AIOptimizer() {
  const [health, setHealth]               = useState(null);
  const [triggering, setTriggering]       = useState(false);
  const [predResult, setPredResult]       = useState(null);
  const [predicting, setPredicting]       = useState(false);
  const [campaigns, setCampaigns]         = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignDetail, setCampaignDetail] = useState(null);
  const [history, setHistory]             = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [scores, setScores]               = useState({});
  const [analyzing, setAnalyzing]         = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const [predForm] = Form.useForm();

  useEffect(() => {
    loadHealth();
    loadCampaigns();
  }, []);

  const loadHealth = async () => {
    try { const { data } = await optimizerAPI.health(); setHealth(data); }
    catch { setHealth({ status: 'error' }); }
  };

  const loadCampaigns = async () => {
    try {
      const { data } = await campaignAPI.list({ limit: 100 });
      setCampaigns(data.data || []);
    } catch { /* empty */ }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await optimizerAPI.trigger();
      loadHealth();
    } catch { /* empty */ } finally {
      setTriggering(false);
    }
  };

  const handlePredict = async (values) => {
    setPredicting(true);
    setPredResult(null);
    try {
      const { data } = await optimizerAPI.predict(values);
      setPredResult(data.data);
    } catch { /* empty */ } finally {
      setPredicting(false);
    }
  };

  const handleSelectCampaign = async (campaignId) => {
    setSelectedCampaign(campaignId);
    setHistory([]);
    setScores({});
    setAnalysisResult(null);
    setLoadingHistory(true);
    try {
      const [histRes, detailRes] = await Promise.all([
        optimizerAPI.history(campaignId, 50),
        campaignAPI.get(campaignId),
      ]);
      setHistory(histRes.data.data || []);
      const detail = detailRes.data.data;
      setCampaignDetail(detail);
      // Load scores per ad set
      const s = {};
      await Promise.all((detail.ad_sets || []).map(async (as) => {
        try { const { data } = await optimizerAPI.score(as.id); s[as.id] = data.data?.score; }
        catch { /* skip */ }
      }));
      setScores(s);
    } catch { /* empty */ } finally {
      setLoadingHistory(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedCampaign || !campaignDetail) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const { data } = await optimizerAPI.analyze(selectedCampaign, {
        campaign_id: selectedCampaign,
        workspace_id: campaignDetail.workspace_id,
        force: true,
      });
      setAnalysisResult(data.data);
      await handleSelectCampaign(selectedCampaign);
    } catch (err) {
      setAnalysisResult({ error: err.response?.data?.error?.message || 'Lỗi phân tích' });
    } finally {
      setAnalyzing(false);
    }
  };

  const isOnline = health?.status === 'ok';

  return (
    <div>
      <div className="page-header">
        <Title level={2} style={{ color: '#fff', margin: 0 }}>
          <ExperimentOutlined style={{ marginRight: 8 }} />AI Optimizer
        </Title>
      </div>

      {/* ── Section 1: Status & Controls ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card style={CARD_STYLE}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Trạng thái dịch vụ</div>
                <Badge
                  status={health === null ? 'default' : isOnline ? 'success' : 'error'}
                  text={<span style={{ color: '#E2E8F0', fontWeight: 500 }}>
                    {health === null ? 'Kiểm tra...' : isOnline ? 'Online' : 'Offline'}
                  </span>}
                />
              </div>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={triggering}
                onClick={handleTrigger}
                disabled={!isOnline}
              >
                Trigger Full Cycle
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card style={CARD_STYLE}>
            <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Tổng quan</div>
            <Row gutter={16}>
              <Col span={8}><div style={{ color: '#6C5CE7', fontSize: 20, fontWeight: 700 }}>{campaigns.length}</div><div style={{ color: '#94A3B8', fontSize: 11 }}>Campaigns</div></Col>
              <Col span={8}><div style={{ color: '#00B894', fontSize: 20, fontWeight: 700 }}>{campaigns.filter(c => c.status === 'ACTIVE').length}</div><div style={{ color: '#94A3B8', fontSize: 11 }}>Active</div></Col>
              <Col span={8}><div style={{ color: '#FDCB6E', fontSize: 20, fontWeight: 700 }}>{history.filter(h => h.applied).length}</div><div style={{ color: '#94A3B8', fontSize: 11 }}>Applied</div></Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* ── Section 2: Prediction Simulator ── */}
      <Card
        title={<span style={{ color: '#E2E8F0' }}>Prediction Simulator</span>}
        style={{ ...CARD_STYLE, marginBottom: 16 }}
        headStyle={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Row gutter={16}>
          <Col xs={24} md={14}>
            <Form form={predForm} layout="inline" onFinish={handlePredict}>
              <Form.Item name="impressions" label={<span style={{ color: '#94A3B8' }}>Impressions</span>} initialValue={1000}>
                <InputNumber min={0} style={{ width: 100 }} />
              </Form.Item>
              <Form.Item name="clicks" label={<span style={{ color: '#94A3B8' }}>Clicks</span>} initialValue={50}>
                <InputNumber min={0} style={{ width: 80 }} />
              </Form.Item>
              <Form.Item name="spent" label={<span style={{ color: '#94A3B8' }}>Spent ($)</span>} initialValue={20}>
                <InputNumber min={0} style={{ width: 80 }} />
              </Form.Item>
              <Form.Item name="age" label={<span style={{ color: '#94A3B8' }}>Age</span>} initialValue={1}>
                <Select style={{ width: 110 }} options={[
                  { value: 0, label: '30–34' },
                  { value: 1, label: '35–39' },
                  { value: 2, label: '40–44' },
                  { value: 3, label: '45–49' },
                ]} />
              </Form.Item>
              <Form.Item name="gender" label={<span style={{ color: '#94A3B8' }}>Gender</span>} initialValue={0}>
                <Select style={{ width: 90 }} options={[{ value: 0, label: 'Nam' }, { value: 1, label: 'Nữ' }]} />
              </Form.Item>
              <Form.Item name="interest" label={<span style={{ color: '#94A3B8' }}>Interest</span>} initialValue={15}>
                <InputNumber min={0} max={20} style={{ width: 70 }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={predicting}>Predict</Button>
              </Form.Item>
            </Form>
          </Col>
          <Col xs={24} md={10}>
            {predResult && (
              <div style={{ padding: '8px 16px', background: 'rgba(108,92,231,0.1)', borderRadius: 8 }}>
                <Space align="center" size={12}>
                  <Tag
                    color={actionColors[predResult.action] || 'default'}
                    style={{ fontSize: 16, padding: '4px 12px', fontWeight: 700 }}
                  >
                    {predResult.action}
                  </Tag>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}>
                      Confidence: {predResult.confidence != null ? `${(predResult.confidence * 100).toFixed(1)}%` : '—'}
                    </div>
                    <Progress
                      percent={predResult.confidence != null ? Math.round(predResult.confidence * 100) : 0}
                      strokeColor={predResult.action === 'PAUSE' ? '#E17055' : predResult.action === 'SCALE' ? '#00B894' : '#6C5CE7'}
                      trailColor="rgba(255,255,255,0.08)"
                      size="small"
                      showInfo={false}
                    />
                  </div>
                </Space>
              </div>
            )}
          </Col>
        </Row>
      </Card>

      {/* ── Section 3: Campaign History ── */}
      <Card
        title={<span style={{ color: '#E2E8F0' }}>Lịch sử tối ưu theo Campaign</span>}
        style={{ ...CARD_STYLE, marginBottom: 16 }}
        headStyle={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        extra={
          <Space>
            <Select
              placeholder="Chọn campaign..."
              style={{ width: 220 }}
              onChange={handleSelectCampaign}
              options={campaigns.map(c => ({ value: c.id, label: c.name }))}
              showSearch
              filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
            />
            <Button
              type="primary"
              size="small"
              icon={<ThunderboltOutlined />}
              loading={analyzing}
              disabled={!selectedCampaign || !isOnline}
              onClick={handleAnalyze}
            >
              Analyze
            </Button>
          </Space>
        }
      >
        {analysisResult && (
          <Alert
            style={{ marginBottom: 12 }}
            type={analysisResult.error ? 'error' : 'info'}
            message={analysisResult.error ? 'Lỗi phân tích' : `Kết quả: ${analysisResult.action || 'Xem bên dưới'}`}
            description={!analysisResult.error ? JSON.stringify(analysisResult) : analysisResult.error}
            showIcon closable
          />
        )}
        <div className="dark-table">
          {loadingHistory ? <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div> : (
            <Table
              dataSource={history}
              rowKey={(r, i) => r.id || i}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: <Empty description={<span style={{ color: '#94A3B8' }}>Chọn campaign để xem lịch sử</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              columns={[
                { title: 'Thời gian', dataIndex: 'created_at', width: 130, render: v => v ? dayjs(v).format('DD/MM HH:mm') : '—' },
                { title: 'Action', dataIndex: 'action', width: 90, render: v => <Tag color={actionColors[v] || 'default'}>{v}</Tag> },
                { title: 'Confidence', dataIndex: 'confidence', width: 110, render: v => v != null ? `${(Number(v) * 100).toFixed(1)}%` : '—' },
                { title: 'Applied', dataIndex: 'applied', width: 80, render: v => <Tag color={v ? 'success' : 'default'}>{v ? 'Yes' : 'No'}</Tag> },
                { title: 'Lý do', dataIndex: 'reason', render: v => <Text style={{ color: '#94A3B8', fontSize: 12 }}>{v || '—'}</Text> },
              ]}
            />
          )}
        </div>
      </Card>

      {/* ── Section 4: Performance Scores ── */}
      {campaignDetail && (campaignDetail.ad_sets || []).length > 0 && (
        <Card
          title={<span style={{ color: '#E2E8F0' }}>Performance Scores — {campaignDetail.name}</span>}
          style={CARD_STYLE}
          headStyle={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Row gutter={[12, 12]}>
            {[...(campaignDetail.ad_sets || [])]
              .sort((a, b) => (scores[a.id] || 0) - (scores[b.id] || 0))
              .map(as => (
                <Col key={as.id} xs={24} sm={12} md={8} lg={6}>
                  <Card style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }} bodyStyle={{ padding: 12 }}>
                    <Space align="start">
                      <ScoreBadge score={scores[as.id]} size={44} />
                      <div>
                        <div style={{ color: '#E2E8F0', fontWeight: 500, fontSize: 13 }}>{as.name}</div>
                        <Tag color={statusColors[as.status]} style={{ fontSize: 10, marginTop: 4 }}>{as.status}</Tag>
                        <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>
                          Budget: {as.budget ? Number(as.budget).toLocaleString() : '—'}
                        </div>
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
          </Row>
        </Card>
      )}
    </div>
  );
}

const statusColors = { DRAFT: 'default', DISTRIBUTING: 'processing', ACTIVE: 'success', PAUSED: 'warning' };
