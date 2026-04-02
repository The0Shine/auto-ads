import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Descriptions, Tag, Button, Space, Table, message, Modal, Form,
  Input, InputNumber, Select, Typography, Row, Col, Spin, Statistic, Alert, DatePicker, Divider, Tooltip, Upload,
} from 'antd';
import {
  PlayCircleOutlined, PauseCircleOutlined, DeleteOutlined, PlusOutlined,
  ArrowLeftOutlined, ThunderboltOutlined, EditOutlined, UploadOutlined, LoadingOutlined, PictureOutlined,
} from '@ant-design/icons';
import { campaignAPI } from '../api/campaign.api';
import { optimizerAPI } from '../api/optimizer.api';
import TargetingBuilder from '../components/TargetingBuilder';
import ScoreBadge from '../components/ScoreBadge';
import MetricsChart from '../components/MetricsChart';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const CARD_STYLE = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 };

const statusColors = {
  DRAFT: 'default', DISTRIBUTING: 'processing', ACTIVE: 'success',
  PAUSED: 'warning', ARCHIVED: '#636E72', COMPLETED: 'purple',
};

const actionColors = { PAUSE: 'error', KEEP: 'processing', SCALE: 'success' };

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [insights, setInsights]         = useState(null);
  const [optHistory, setOptHistory]     = useState([]);
  const [adSetScores, setAdSetScores]   = useState({});
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing]       = useState(false);

  // AdSet modal state
  const [adSetModal, setAdSetModal]     = useState(false);
  const [editingAdSet, setEditingAdSet] = useState(null);  // null = create, object = edit
  const [adSetForm]                     = Form.useForm();
  const [savingAdSet, setSavingAdSet]   = useState(false);

  // Add Ad modal state
  const [addAdModal, setAddAdModal]       = useState(false);
  const [addAdAdSetId, setAddAdAdSetId]   = useState(null);
  const [adForm]                          = Form.useForm();
  const [savingAd, setSavingAd]           = useState(false);
  const [creatives, setCreatives]         = useState([]);
  const [creativeForm]                    = Form.useForm();
  const [savingCreative, setSavingCreative] = useState(false);
  const [quickMediaUrls, setQuickMediaUrls] = useState([]);
  const [quickUploading, setQuickUploading] = useState(false);
  const [expandedAdSetIds, setExpandedAdSetIds] = useState([]);
  const [syncingInsights, setSyncingInsights]   = useState(false);

  useEffect(() => { loadCampaign(); }, [id]);

  const loadCampaign = async () => {
    setLoading(true);
    try {
      const { data } = await campaignAPI.get(id);
      setCampaign(data.data);
      // Auto-expand all ad sets on load
      setExpandedAdSetIds((data.data?.ad_sets || []).map(as => as.id));
    } catch {
      message.error('Không tìm thấy campaign');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    try {
      const { data } = await campaignAPI.insights(id);
      setInsights(data.data);
    } catch { /* non-fatal */ }
  };

  const handleSyncInsights = async () => {
    setSyncingInsights(true);
    try {
      const { data } = await campaignAPI.insights(id);
      setInsights(data.data);
      message.success('Đã đồng bộ insights');
    } catch {
      message.error('Không thể đồng bộ insights');
    } finally {
      setSyncingInsights(false);
    }
  };

  const loadOptimizerData = async (adSets) => {
    try {
      const { data } = await optimizerAPI.history(id, 50);
      setOptHistory(data.data || []);
    } catch { /* non-fatal */ }
    // Load scores per ad set
    if (adSets?.length) {
      const scores = {};
      await Promise.all(adSets.map(async (as) => {
        try {
          const { data } = await optimizerAPI.score(as.id);
          scores[as.id] = data.data?.score;
        } catch { /* skip */ }
      }));
      setAdSetScores(scores);
    }
  };

  const handleTabChange = async (key) => {
    if (key === 'insights') loadInsights();
    if (key === 'optimizer' && campaign) loadOptimizerData(campaign.ad_sets);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const { data } = await optimizerAPI.analyze(id, { campaign_id: id, workspace_id: campaign.workspace_id, force: true });
      setAnalysisResult(data.data);
      loadOptimizerData(campaign.ad_sets);
      message.success('Phân tích xong');
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi phân tích');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Campaign actions ────────────────────────────────────────────────────
  const handleDistribute = async () => {
    try { await campaignAPI.distribute(id); message.success('Đang phân phối...'); loadCampaign(); }
    catch (err) { message.error(err.response?.data?.error?.message || 'Lỗi'); }
  };
  const handlePause = async () => {
    try { await campaignAPI.pause(id); message.success('Đã tạm dừng'); loadCampaign(); }
    catch (err) { message.error(err.response?.data?.error?.message || 'Lỗi'); }
  };
  const handleResume = async () => {
    try { await campaignAPI.resume(id); message.success('Tiếp tục'); loadCampaign(); }
    catch (err) { message.error(err.response?.data?.error?.message || 'Lỗi'); }
  };
  const handleDelete = () => {
    Modal.confirm({
      title: 'Lưu trữ campaign?',
      onOk: async () => { await campaignAPI.remove(id); message.success('Đã lưu trữ'); navigate('/campaigns'); },
    });
  };

  // ── Ad Set modal ────────────────────────────────────────────────────────
  const openCreateAdSet = () => {
    setEditingAdSet(null);
    adSetForm.resetFields();
    setAdSetModal(true);
  };

  const openEditAdSet = (adSet) => {
    setEditingAdSet(adSet);
    const t = adSet.targeting || {};
    adSetForm.setFieldsValue({
      name: adSet.name,
      budget: adSet.budget,
      budgetType: adSet.budget_type || 'DAILY',
      bidStrategy: adSet.bid_strategy,
      bidAmount: adSet.bid_amount,
      optimizationGoal: adSet.optimization_goal,
      ageMin: t.age_min,
      ageMax: t.age_max,
      genders: t.genders,
      countries: t.countries,
      cities: (t.cities || []).map(c => JSON.stringify(c)),
      interests: (t.interests || []).map(i => JSON.stringify(i)),
      publisherPlatforms: t.publisher_platforms,
      facebookPositions: t.facebook_positions,
      instagramPositions: t.instagram_positions,
    });
    setAdSetModal(true);
  };

  const handleSaveAdSet = async (values) => {
    setSavingAdSet(true);
    try {
      const payload = {
        name: values.name,
        budget: values.budget,
        budgetType: values.budgetType,
        bidStrategy: values.bidStrategy,
        bidAmount: values.bidAmount,
        optimizationGoal: values.optimizationGoal,
        targeting: {
          age_min: values.ageMin,
          age_max: values.ageMax,
          genders: values.genders,
          countries: values.countries,
          cities: (values.cities || []).map(v => { try { return JSON.parse(v); } catch { return v; } }),
          interests: (values.interests || []).map(v => { try { return JSON.parse(v); } catch { return v; } }),
          publisher_platforms: values.publisherPlatforms,
          facebook_positions: values.facebookPositions,
          instagram_positions: values.instagramPositions,
        },
      };
      if (editingAdSet) {
        await campaignAPI.updateAdSet(id, editingAdSet.id, payload);
        message.success('Đã cập nhật Ad Set');
        setAdSetModal(false);
        adSetForm.resetFields();
        setEditingAdSet(null);
        loadCampaign();
      } else {
        const { data: res } = await campaignAPI.createAdSet(id, payload);
        message.success('Đã tạo Ad Set — giờ thêm Ad vào ad set này');
        setAdSetModal(false);
        adSetForm.resetFields();
        setEditingAdSet(null);
        await loadCampaign();
        // Tự động mở modal Thêm Ad cho ad set vừa tạo
        openAddAd(res.data.id);
      }
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi');
    } finally {
      setSavingAdSet(false);
    }
  };

  const handleDeleteAdSet = async (adSetId) => {
    try { await campaignAPI.removeAdSet(id, adSetId); message.success('Đã xóa'); loadCampaign(); }
    catch (err) { message.error(err.response?.data?.error?.message || 'Lỗi'); }
  };

  // ── Add Ad modal ────────────────────────────────────────────────────────
  const openAddAd = async (adSetId) => {
    setAddAdAdSetId(adSetId);
    adForm.resetFields();
    setAddAdModal(true);
    try {
      const { data } = await campaignAPI.listCreatives();
      setCreatives(data.data || []);
    } catch { /* empty */ }
  };

  const handleQuickUpload = async ({ file, onSuccess, onError }) => {
    setQuickUploading(true);
    try {
      const { data } = await campaignAPI.uploadCreativeFile(file);
      setQuickMediaUrls(prev => [...prev, data.data?.url]);
      onSuccess(data);
      message.success(`Đã upload: ${file.name}`);
    } catch (err) {
      onError(err);
      message.error('Upload thất bại');
    } finally {
      setQuickUploading(false);
    }
  };

  const handleQuickCreateCreative = async (values) => {
    setSavingCreative(true);
    try {
      const { data } = await campaignAPI.createCreative({
        name: values.creativeName,
        type: values.creativeType || 'IMAGE',
        headline: values.headline,
        body: values.body,
        destinationUrl: values.destinationUrl,
        callToAction: values.callToAction,
        media_urls:   quickMediaUrls,
        thumbnail_url: quickMediaUrls[0] || null,
      });
      const newCreative = data.data;
      const updated = [...creatives, newCreative];
      setCreatives(updated);
      creativeForm.resetFields();
      adForm.setFieldsValue({ creativeId: newCreative.id });
      message.success('Đã tạo creative — đã tự chọn bên dưới');
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi tạo creative');
    } finally {
      setSavingCreative(false);
    }
  };

  const handleSaveAd = async (values) => {
    setSavingAd(true);
    try {
      await campaignAPI.createAd(id, addAdAdSetId, { name: values.name, creativeId: values.creativeId });
      message.success('Đã thêm ad');
      setAddAdModal(false);
      adForm.resetFields();
      creativeForm.resetFields();
      loadCampaign();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi');
    } finally {
      setSavingAd(false);
    }
  };

  const handleDeleteAd = async (adSetId, adId) => {
    try { await campaignAPI.removeAd(id, adSetId, adId); message.success('Đã xóa'); loadCampaign(); }
    catch (err) { message.error(err.response?.data?.error?.message || 'Lỗi'); }
  };

  // ── Table config ────────────────────────────────────────────────────────
  const adsColumns = [
    { title: 'Tên Ad', dataIndex: 'name', render: v => <Text style={{ color: '#E2E8F0' }}>{v}</Text> },
    { title: 'Creative', dataIndex: 'creative_name', render: v => v || '—' },
    { title: 'Loại', dataIndex: 'creative_type', width: 90, render: v => v ? <Tag>{v}</Tag> : '—' },
    { title: 'Status', dataIndex: 'status', width: 90, render: v => <Tag color={statusColors[v]}>{v}</Tag> },
    {
      title: '', width: 50,
      render: (_, r) => (
        <Button size="small" danger icon={<DeleteOutlined />}
          onClick={() => Modal.confirm({ title: 'Xóa ad?', onOk: () => handleDeleteAd(r.ad_set_id, r.id) })} />
      ),
    },
  ];

  const adSetColumns = [
    {
      title: 'Tên', dataIndex: 'name',
      render: (v, r) => (
        <Space>
          <Text style={{ color: '#E2E8F0' }}>{v}</Text>
          {adSetScores[r.id] != null && <ScoreBadge score={adSetScores[r.id]} size={32} />}
        </Space>
      ),
    },
    { title: 'Status', dataIndex: 'status', width: 100, render: v => <Tag color={statusColors[v]}>{v}</Tag> },
    { title: 'Budget', dataIndex: 'budget', width: 110, render: (v, r) => v ? `${Number(v).toLocaleString()} ${r.budget_type || ''}` : '—' },
    {
      title: 'Ads', width: 60,
      render: (_, r) => (
        <Tag color={(r.ads?.length || 0) > 0 ? 'success' : 'warning'}>
          {r.ads?.length || 0} ad
        </Tag>
      ),
    },
    {
      title: '', width: 180,
      render: (_, r) => (
        <Space>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openAddAd(r.id)}>
            Thêm Ad
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditAdSet(r)} />
          <Button size="small" danger icon={<DeleteOutlined />}
            onClick={() => Modal.confirm({ title: 'Xóa ad set?', onOk: () => handleDeleteAdSet(r.id) })} />
        </Space>
      ),
    },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!campaign) return null;

  // Insights stat data
  const ins = insights?.data?.[0] || {};
  const insMetrics = [
    { label: 'Impressions', value: ins.impressions ? Number(ins.impressions).toLocaleString() : '—' },
    { label: 'Clicks', value: ins.clicks ? Number(ins.clicks).toLocaleString() : '—' },
    { label: 'Spend', value: ins.spend ? `$${Number(ins.spend).toFixed(2)}` : '—' },
    { label: 'CTR', value: ins.ctr ? `${(Number(ins.ctr) * 100).toFixed(2)}%` : '—' },
    { label: 'CPC', value: ins.cpc ? `$${Number(ins.cpc).toFixed(2)}` : '—' },
    { label: 'CPM', value: ins.cpm ? `$${Number(ins.cpm).toFixed(2)}` : '—' },
    { label: 'Conversions', value: ins.conversions ? Number(ins.conversions).toLocaleString() : '—' },
    { label: 'ROAS', value: ins.roas ? `${Number(ins.roas).toFixed(2)}x` : '—' },
  ];

  // Chart data from ad sets
  const chartData = (campaign.ad_sets || []).map(as => ({
    name: as.name.length > 12 ? as.name.slice(0, 12) + '…' : as.name,
    budget: Number(as.budget || 0),
    score: adSetScores[as.id] || 0,
  }));

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/campaigns')} />
          <div>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>{campaign.name}</Title>
            <Tag color={statusColors[campaign.status]}>{campaign.status}</Tag>
          </div>
        </Space>
        <Space>
          {campaign.status === 'DRAFT' && (() => {
            const adSets = campaign.ad_sets || [];
            const allHaveAds = adSets.length > 0 && adSets.every(as => (as.ads || []).length > 0);
            const reason = adSets.length === 0
              ? 'Cần thêm ít nhất 1 Ad Set trước khi phân phối'
              : !allHaveAds
                ? 'Mỗi Ad Set cần có ít nhất 1 Ad (với Creative)'
                : '';
            return (
              <Tooltip title={reason || undefined}>
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleDistribute} disabled={!allHaveAds}>
                  Phân phối
                </Button>
              </Tooltip>
            );
          })()}
          {['ACTIVE', 'DISTRIBUTING'].includes(campaign.status) && (
            <Button icon={<PauseCircleOutlined />} onClick={handlePause}>Tạm dừng</Button>
          )}
          {campaign.status === 'PAUSED' && (
            <Button type="primary" ghost icon={<PlayCircleOutlined />} onClick={handleResume}>Tiếp tục</Button>
          )}
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>Lưu trữ</Button>
        </Space>
      </div>

      {/* Setup checklist — chỉ hiện khi DRAFT */}
      {campaign.status === 'DRAFT' && (() => {
        const adSets = campaign.ad_sets || [];
        const hasAdSet = adSets.length > 0;
        const hasAd = adSets.some(as => (as.ads || []).length > 0);
        if (hasAdSet && hasAd) return null;
        return (
          <Alert
            style={{ marginBottom: 16 }}
            type="warning"
            showIcon
            message="Cần hoàn thành trước khi phân phối"
            description={
              <div style={{ marginTop: 4 }}>
                {[
                  { done: true,    text: 'Tạo Campaign' },
                  { done: hasAdSet, text: 'Thêm ít nhất 1 Ad Set (tab "Ad Sets" → Thêm Ad Set)' },
                  { done: hasAd,   text: 'Thêm Ad vào Ad Set + chọn Creative (nút "+ Thêm Ad" trên row ad set)' },
                ].map((step, i) => (
                  <div key={i} style={{ color: step.done ? '#00B894' : '#FDCB6E', fontSize: 13, marginBottom: 2 }}>
                    {step.done ? '✅' : '⏳'} Bước {i + 1}: {step.text}
                  </div>
                ))}
              </div>
            }
          />
        );
      })()}

      <Tabs defaultActiveKey="overview" onChange={handleTabChange} items={[
        // ── Tab 1: Overview ──────────────────────────────────────────────────
        {
          key: 'overview',
          label: 'Tổng quan',
          children: (
            <Card style={CARD_STYLE}>
              <Descriptions column={2} labelStyle={{ color: '#94A3B8' }} contentStyle={{ color: '#E2E8F0' }}>
                <Descriptions.Item label="Mục tiêu">{campaign.objective}</Descriptions.Item>
                <Descriptions.Item label="Nền tảng">
                  {(campaign.platforms || []).map(p => <Tag key={p}>{p}</Tag>)}
                </Descriptions.Item>
                <Descriptions.Item label="Tổng budget">
                  {campaign.total_budget ? `${Number(campaign.total_budget).toLocaleString()} ${campaign.currency}` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Budget/ngày">
                  {campaign.daily_budget ? `${Number(campaign.daily_budget).toLocaleString()} ${campaign.currency}` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Đã chi">
                  {Number(campaign.total_spend || 0).toLocaleString()} {campaign.currency}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                  {dayjs(campaign.created_at).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="Bắt đầu">
                  {campaign.start_date ? dayjs(campaign.start_date).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Kết thúc">
                  {campaign.end_date ? dayjs(campaign.end_date).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          ),
        },

        // ── Tab 2: Insights ──────────────────────────────────────────────────
        {
          key: 'insights',
          label: 'Insights',
          children: campaign.status === 'DRAFT' ? (
            <Card style={{ ...CARD_STYLE, textAlign: 'center', padding: 40 }}>
              <Alert
                type="info" showIcon
                message="Campaign chưa được phân phối"
                description="Insights chỉ khả dụng sau khi campaign được phân phối lên platform. Nhấn 'Phân phối' ở trên để bắt đầu."
              />
            </Card>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <Button size="small" loading={syncingInsights} onClick={handleSyncInsights}>
                  Làm mới Insights
                </Button>
              </div>
              {!insights ? (
                <Card style={{ ...CARD_STYLE, textAlign: 'center', padding: 40 }}>
                  <Spin />
                </Card>
              ) : (
                <>
                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    {insMetrics.map(m => (
                      <Col key={m.label} xs={12} sm={6}>
                        <Card style={CARD_STYLE} bodyStyle={{ padding: '12px 16px' }}>
                          <Statistic title={<span style={{ color: '#94A3B8', fontSize: 12 }}>{m.label}</span>}
                            value={m.value} valueStyle={{ color: '#E2E8F0', fontSize: 18 }} />
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  {chartData.length > 0 && (
                    <Card style={CARD_STYLE} title={<span style={{ color: '#E2E8F0' }}>Budget theo Ad Set</span>}>
                      <MetricsChart data={chartData} metrics={['budget']} type="bar" height={220} />
                    </Card>
                  )}
                </>
              )}
            </div>
          ),
        },

        // ── Tab 3: Ad Sets ───────────────────────────────────────────────────
        {
          key: 'adsets',
          label: `Ad Sets (${campaign.ad_sets?.length || 0})`,
          children: (
            <div>
              <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateAdSet}>Thêm Ad Set</Button>
              </div>
              <div className="dark-table">
                <Table
                  dataSource={campaign.ad_sets || []}
                  columns={adSetColumns}
                  rowKey="id"
                  pagination={false}
                  expandedRowKeys={expandedAdSetIds}
                  onExpand={(expanded, record) =>
                    setExpandedAdSetIds(expanded
                      ? [...expandedAdSetIds.filter(i => i !== record.id), record.id]
                      : expandedAdSetIds.filter(i => i !== record.id))
                  }
                  onRow={(record) => ({
                    onClick: (e) => {
                      if (e.target.closest('button')) return;
                      setExpandedAdSetIds(prev =>
                        prev.includes(record.id) ? prev.filter(i => i !== record.id) : [...prev, record.id]
                      );
                    },
                    style: { cursor: 'pointer' },
                  })}
                  expandable={{
                    expandedRowRender: (adSet) => (
                      <div style={{ padding: '8px 0 8px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ color: '#94A3B8' }}>Ads trong Ad Set này</Text>
                          <Button size="small" icon={<PlusOutlined />} onClick={() => openAddAd(adSet.id)}>
                            Thêm Ad
                          </Button>
                        </div>
                        <Table
                          dataSource={adSet.ads || []}
                          columns={adsColumns}
                          rowKey="id"
                          pagination={false}
                          size="small"
                          style={{ background: 'transparent' }}
                          locale={{ emptyText: <span style={{ color: '#94A3B8' }}>Chưa có ad nào</span> }}
                        />
                      </div>
                    ),
                  }}
                />
              </div>
            </div>
          ),
        },

        // ── Tab 4: AI Optimizer ──────────────────────────────────────────────
        {
          key: 'optimizer',
          label: 'AI Optimizer',
          children: (
            <div>
              {/* Performance Scores */}
              {Object.keys(adSetScores).length > 0 && (
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                  {(campaign.ad_sets || []).map(as => (
                    <Col key={as.id} xs={24} sm={12} md={8}>
                      <Card style={CARD_STYLE} bodyStyle={{ padding: '12px 16px' }}>
                        <Space>
                          <ScoreBadge score={adSetScores[as.id]} size={40} />
                          <div>
                            <div style={{ color: '#E2E8F0', fontWeight: 500, fontSize: 13 }}>{as.name}</div>
                            <div style={{ color: '#94A3B8', fontSize: 11 }}>Performance Score</div>
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}

              {/* Analyze button */}
              <Card style={{ ...CARD_STYLE, marginBottom: 16 }}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <div>
                    <div style={{ color: '#E2E8F0', fontWeight: 500 }}>Phân tích AI</div>
                    <div style={{ color: '#94A3B8', fontSize: 12 }}>Chạy model để phân tích hiệu quả và đưa ra đề xuất</div>
                  </div>
                  <Button type="primary" icon={<ThunderboltOutlined />} loading={analyzing} onClick={handleAnalyze}>
                    Analyze Now
                  </Button>
                </Space>
                {analysisResult && (
                  <Alert
                    style={{ marginTop: 12 }}
                    type="info"
                    message={`Kết quả: ${analysisResult.action || 'Xem bên dưới'}`}
                    description={JSON.stringify(analysisResult, null, 2)}
                    showIcon
                  />
                )}
              </Card>

              {/* Optimization history */}
              <Card style={CARD_STYLE} title={<span style={{ color: '#E2E8F0' }}>Lịch sử tối ưu</span>}>
                <div className="dark-table">
                  <Table
                    dataSource={optHistory}
                    rowKey={(r, i) => r.id || i}
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: <span style={{ color: '#94A3B8' }}>Chưa có lịch sử</span> }}
                    columns={[
                      { title: 'Thời gian', dataIndex: 'created_at', width: 150, render: v => dayjs(v).format('DD/MM HH:mm') },
                      {
                        title: 'Action', dataIndex: 'action', width: 100,
                        render: v => <Tag color={actionColors[v] || 'default'}>{v}</Tag>,
                      },
                      { title: 'Confidence', dataIndex: 'confidence', width: 110, render: v => v != null ? `${(v * 100).toFixed(1)}%` : '—' },
                      { title: 'Applied', dataIndex: 'applied', width: 80, render: v => <Tag color={v ? 'success' : 'default'}>{v ? 'Yes' : 'No'}</Tag> },
                      { title: 'Lý do', dataIndex: 'reason', render: v => <Text style={{ color: '#94A3B8', fontSize: 12 }}>{v || '—'}</Text> },
                    ]}
                  />
                </div>
              </Card>
            </div>
          ),
        },

        // ── Tab 5: Platform Sync ─────────────────────────────────────────────
        {
          key: 'sync',
          label: 'Platform Sync',
          children: (
            <Card style={CARD_STYLE}>
              {(campaign.platform_mappings || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                  Chưa sync lên nền tảng nào. Hãy phân phối campaign để bắt đầu.
                </div>
              ) : (
                campaign.platform_mappings.map(m => (
                  <div key={m.id} style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <Row>
                      <Col span={6}><Text style={{ color: '#94A3B8' }}>Platform</Text><br />{m.platform}</Col>
                      <Col span={6}><Text style={{ color: '#94A3B8' }}>Platform ID</Text><br />
                        <Text style={{ color: '#E2E8F0', fontSize: 12 }}>{m.platform_id}</Text></Col>
                      <Col span={6}><Text style={{ color: '#94A3B8' }}>Sync</Text><br />
                        <Tag color={m.sync_status === 'SYNCED' ? 'success' : m.sync_status === 'ERROR' ? 'error' : 'processing'}>
                          {m.sync_status}
                        </Tag>
                      </Col>
                      <Col span={6}><Text style={{ color: '#94A3B8' }}>Cập nhật</Text><br />{dayjs(m.updated_at).format('DD/MM HH:mm')}</Col>
                    </Row>
                    {m.error_message && <div style={{ color: '#E17055', fontSize: 12, marginTop: 4 }}>{m.error_message}</div>}
                  </div>
                ))
              )}
            </Card>
          ),
        },
      ]} />

      {/* Modal Ad Set create/edit */}
      <Modal
        title={editingAdSet ? 'Sửa Ad Set' : 'Thêm Ad Set'}
        open={adSetModal}
        onCancel={() => { setAdSetModal(false); setEditingAdSet(null); }}
        footer={null}
        width={640}
      >
        <Form form={adSetForm} layout="vertical" onFinish={handleSaveAdSet}>
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
            <Input placeholder="VD: Women 25-40 HN" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="budget" label="Budget">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="budgetType" label="Loại budget" initialValue="DAILY">
                <Select options={[{ value: 'DAILY', label: 'Theo ngày' }, { value: 'LIFETIME', label: 'Trọn đời' }]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="optimizationGoal" label="Optimization Goal">
                <Select allowClear options={[
                  { value: 'CONVERSIONS', label: 'Conversions' },
                  { value: 'LINK_CLICKS', label: 'Link Clicks' },
                  { value: 'IMPRESSIONS', label: 'Impressions' },
                  { value: 'REACH', label: 'Reach' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="bidStrategy" label="Bid Strategy">
                <Select allowClear options={[
                  { value: 'LOWEST_COST_WITHOUT_BID_CAP', label: 'Chi phí thấp nhất' },
                  { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Bid Cap' },
                  { value: 'COST_CAP', label: 'Cost Cap' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bidAmount" label="Bid Amount">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <TargetingBuilder form={adSetForm} />

          <Form.Item style={{ marginTop: 16 }}>
            <Button type="primary" htmlType="submit" loading={savingAdSet} block>
              {editingAdSet ? 'Cập nhật' : 'Tạo Ad Set'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Add Ad */}
      <Modal title="Thêm Ad vào Ad Set" open={addAdModal} onCancel={() => { setAddAdModal(false); creativeForm.resetFields(); setQuickMediaUrls([]); }} footer={null} width={560}>
        {/* Bước 1: Tạo creative nhanh nếu chưa có hoặc muốn thêm mới */}
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: '#94A3B8', fontSize: 13 }}>
            Bước 1 — Tạo creative mới (hoặc bỏ qua nếu đã có)
          </Text>
          <Form form={creativeForm} layout="vertical" onFinish={handleQuickCreateCreative} style={{ marginTop: 8 }}>
            <Row gutter={12}>
              <Col span={16}>
                <Form.Item name="creativeName" label="Tên creative" rules={[{ required: true, message: 'Nhập tên' }]} style={{ marginBottom: 8 }}>
                  <Input placeholder="VD: Banner mùa hè" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="creativeType" label="Loại" initialValue="IMAGE" style={{ marginBottom: 8 }}>
                  <Select options={[
                    { value: 'IMAGE', label: 'Image' },
                    { value: 'VIDEO', label: 'Video' },
                    { value: 'CAROUSEL', label: 'Carousel' },
                    { value: 'COLLECTION', label: 'Collection' },
                    { value: 'TEXT', label: 'Text only' },
                  ]} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="headline" label="Headline" rules={[{ required: true, message: 'Nhập headline' }]} style={{ marginBottom: 8 }}>
              <Input placeholder="VD: Giảm 50% hôm nay!" />
            </Form.Item>
            <Form.Item name="destinationUrl" label="Destination URL" style={{ marginBottom: 8 }}>
              <Input placeholder="https://..." />
            </Form.Item>
            <Form.Item name="body" label="Mô tả (tuỳ chọn)" style={{ marginBottom: 8 }}>
              <Input.TextArea rows={2} placeholder="Nội dung quảng cáo..." />
            </Form.Item>
            <Form.Item name="callToAction" label="Call to Action (tuỳ chọn)" style={{ marginBottom: 8 }}>
              <Select allowClear placeholder="Chọn CTA" size="small" options={[
                { value: 'LEARN_MORE', label: 'Tìm hiểu thêm' },
                { value: 'SHOP_NOW', label: 'Mua ngay' },
                { value: 'SIGN_UP', label: 'Đăng ký' },
                { value: 'CONTACT_US', label: 'Liên hệ' },
                { value: 'DOWNLOAD', label: 'Tải xuống' },
              ]} />
            </Form.Item>
            <Form.Item label="Ảnh / Media" style={{ marginBottom: 8 }}>
              <Upload customRequest={handleQuickUpload} showUploadList={false} accept="image/*,video/*" disabled={quickUploading}>
                <Button size="small" icon={quickUploading ? <LoadingOutlined /> : <UploadOutlined />} disabled={quickUploading}>
                  {quickUploading ? 'Đang upload...' : 'Chọn file'}
                </Button>
              </Upload>
              {quickMediaUrls.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {quickMediaUrls.map((url, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(255,255,255,0.12)' }} />
                      <Button type="text" danger size="small" icon={<DeleteOutlined />}
                        style={{ position: 'absolute', top: -6, right: -6, padding: 0, width: 18, height: 18, minWidth: 0, fontSize: 10 }}
                        onClick={() => setQuickMediaUrls(prev => prev.filter((_, j) => j !== i))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Form.Item>
            <Button htmlType="submit" loading={savingCreative} size="small">
              + Tạo creative này
            </Button>
          </Form>
        </div>

        <Divider style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />

        {/* Bước 2: Chọn creative và lưu Ad */}
        <Text style={{ color: '#94A3B8', fontSize: 13 }}>Bước 2 — Chọn creative và lưu Ad</Text>
        <Form form={adForm} layout="vertical" onFinish={handleSaveAd} style={{ marginTop: 8 }}>
          <Form.Item name="name" label="Tên Ad" rules={[{ required: true }]}>
            <Input placeholder="VD: Banner sale 50%" />
          </Form.Item>
          <Form.Item name="creativeId" label="Creative" rules={[{ required: true, message: 'Chọn creative' }]}>
            <Select
              showSearch
              placeholder={creatives.length === 0 ? 'Tạo creative ở Bước 1 trước...' : 'Chọn creative...'}
              filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
              options={creatives.map(c => ({ value: c.id, label: `${c.name} (${c.type})` }))}
              optionRender={(opt) => {
                const c = creatives.find(cr => cr.id === opt.value);
                const thumb = (c?.media_urls || [])[0];
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {thumb
                      ? <img src={thumb} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                      : <PictureOutlined style={{ fontSize: 24, color: '#6C5CE7', flexShrink: 0 }} />
                    }
                    <span>{opt.label}</span>
                  </div>
                );
              }}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={savingAd} block disabled={creatives.length === 0}>
              Lưu Ad
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
