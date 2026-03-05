import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Descriptions, Tag, Button, Space, Table, message, Modal, Form, Input, InputNumber, Select, Typography, Row, Col, Spin,
} from 'antd';
import {
  PlayCircleOutlined, PauseCircleOutlined, DeleteOutlined, PlusOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import { campaignAPI } from '../api/campaign.api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const statusColors = {
  DRAFT: 'default', DISTRIBUTING: 'processing', ACTIVE: 'success',
  PAUSED: 'warning', ARCHIVED: '#636E72', COMPLETED: 'purple',
};

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adSetModal, setAdSetModal] = useState(false);
  const [adSetForm] = Form.useForm();
  const [savingAdSet, setSavingAdSet] = useState(false);

  useEffect(() => { loadCampaign(); }, [id]);

  const loadCampaign = async () => {
    setLoading(true);
    try {
      const { data } = await campaignAPI.get(id);
      setCampaign(data.data);
    } catch {
      message.error('Không tìm thấy campaign');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleDistribute = async () => {
    try {
      await campaignAPI.distribute(id);
      message.success('Đang phân phối...');
      loadCampaign();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi');
    }
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
      onOk: async () => {
        await campaignAPI.remove(id);
        message.success('Đã lưu trữ');
        navigate('/campaigns');
      },
    });
  };

  const handleCreateAdSet = async (values) => {
    setSavingAdSet(true);
    try {
      await campaignAPI.createAdSet(id, {
        name: values.name,
        budget: values.budget,
        budgetType: values.budgetType,
        bidStrategy: values.bidStrategy,
        targeting: {
          ageMin: values.ageMin,
          ageMax: values.ageMax,
          countries: values.countries,
        },
      });
      message.success('Đã tạo Ad Set');
      setAdSetModal(false);
      adSetForm.resetFields();
      loadCampaign();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi');
    } finally {
      setSavingAdSet(false);
    }
  };

  const handleDeleteAdSet = async (adSetId) => {
    try {
      await campaignAPI.removeAdSet(id, adSetId);
      message.success('Đã xóa');
      loadCampaign();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!campaign) return null;

  const adSetColumns = [
    { title: 'Tên', dataIndex: 'name', render: (v) => <Text style={{ color: '#E2E8F0' }}>{v}</Text> },
    { title: 'Status', dataIndex: 'status', width: 100, render: (v) => <Tag color={statusColors[v]}>{v}</Tag> },
    { title: 'Budget', dataIndex: 'budget', width: 100, render: (v) => v ? `$${v}` : '—' },
    { title: 'Bid Strategy', dataIndex: 'bid_strategy', width: 140, render: (v) => v || '—' },
    {
      title: '', width: 60,
      render: (_, r) => (
        <Button size="small" danger icon={<DeleteOutlined />}
          onClick={() => Modal.confirm({ title: 'Xóa ad set?', onOk: () => handleDeleteAdSet(r.id) })} />
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/campaigns')} />
          <div>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>{campaign.name}</Title>
            <Tag color={statusColors[campaign.status]}>{campaign.status}</Tag>
          </div>
        </Space>
        <Space>
          {campaign.status === 'DRAFT' && (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleDistribute}>
              Phân phối
            </Button>
          )}
          {['ACTIVE', 'DISTRIBUTING'].includes(campaign.status) && (
            <Button icon={<PauseCircleOutlined />} onClick={handlePause}>Tạm dừng</Button>
          )}
          {campaign.status === 'PAUSED' && (
            <Button type="primary" ghost icon={<PlayCircleOutlined />} onClick={handleResume}>Tiếp tục</Button>
          )}
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>Lưu trữ</Button>
        </Space>
      </div>

      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: 'overview',
            label: 'Tổng quan',
            children: (
              <Card style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                <Descriptions column={2} labelStyle={{ color: '#94A3B8' }} contentStyle={{ color: '#E2E8F0' }}>
                  <Descriptions.Item label="Mục tiêu">{campaign.objective}</Descriptions.Item>
                  <Descriptions.Item label="Nền tảng">
                    {(campaign.platforms || []).map(p => <Tag key={p}>{p}</Tag>)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tổng budget">
                    {campaign.total_budget ? `$${Number(campaign.total_budget).toLocaleString()} ${campaign.currency}` : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Budget/ngày">
                    {campaign.daily_budget ? `$${campaign.daily_budget}` : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Đã chi">
                    ${Number(campaign.total_spend || 0).toLocaleString()}
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
          {
            key: 'adsets',
            label: `Ad Sets (${campaign.ad_sets?.length || 0})`,
            children: (
              <div>
                <div style={{ marginBottom: 16, textAlign: 'right' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdSetModal(true)}>
                    Thêm Ad Set
                  </Button>
                </div>
                <div className="dark-table">
                  <Table dataSource={campaign.ad_sets || []} columns={adSetColumns} rowKey="id" pagination={false} />
                </div>
              </div>
            ),
          },
          {
            key: 'sync',
            label: 'Platform Sync',
            children: (
              <Card style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                {(campaign.platform_mappings || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                    Chưa sync lên nền tảng nào. Hãy phân phối campaign để bắt đầu.
                  </div>
                ) : (
                  campaign.platform_mappings.map(m => (
                    <div key={m.id} style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <Row>
                        <Col span={6}><Text style={{ color: '#94A3B8' }}>Platform</Text><br />{m.platform}</Col>
                        <Col span={6}><Text style={{ color: '#94A3B8' }}>Platform ID</Text><br />{m.platform_id}</Col>
                        <Col span={6}><Text style={{ color: '#94A3B8' }}>Sync</Text><br /><Tag>{m.sync_status}</Tag></Col>
                        <Col span={6}><Text style={{ color: '#94A3B8' }}>Cập nhật</Text><br />{dayjs(m.updated_at).format('DD/MM HH:mm')}</Col>
                      </Row>
                    </div>
                  ))
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* Modal tạo Ad Set */}
      <Modal title="Thêm Ad Set" open={adSetModal} onCancel={() => setAdSetModal(false)} footer={null}>
        <Form form={adSetForm} layout="vertical" onFinish={handleCreateAdSet}>
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
            <Input placeholder="VD: US Adults 25-45" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="budget" label="Budget">
                <InputNumber min={1} style={{ width: '100%' }} addonAfter="USD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="budgetType" label="Loại" initialValue="DAILY">
                <Select options={[{ value: 'DAILY', label: 'Theo ngày' }, { value: 'LIFETIME', label: 'Trọn đời' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="bidStrategy" label="Chiến lược bid">
            <Select allowClear placeholder="Chọn" options={[
              { value: 'LOWEST_COST', label: 'Chi phí thấp nhất' },
              { value: 'COST_CAP', label: 'Giới hạn chi phí' },
              { value: 'BID_CAP', label: 'Giới hạn bid' },
            ]} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="ageMin" label="Tuổi min"><InputNumber min={13} max={65} style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ageMax" label="Tuổi max"><InputNumber min={13} max={65} style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={savingAdSet} block>Tạo Ad Set</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
