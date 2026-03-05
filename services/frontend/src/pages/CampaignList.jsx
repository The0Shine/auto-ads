import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Input, Select, message, Modal } from 'antd';
import { PlusOutlined, SearchOutlined, DeleteOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { campaignAPI } from '../api/campaign.api';
import dayjs from 'dayjs';

const statusColors = {
  DRAFT: 'default',
  DISTRIBUTING: 'processing',
  ACTIVE: 'success',
  PAUSED: 'warning',
  ARCHIVED: '#636E72',
  COMPLETED: 'purple',
  PARTIALLY_ACTIVE: 'cyan',
};

const objectiveLabels = {
  AWARENESS: '🎯 Nhận diện',
  TRAFFIC: '🔗 Traffic',
  ENGAGEMENT: '💬 Tương tác',
  LEADS: '📋 Lead',
  CONVERSIONS: '🛒 Chuyển đổi',
  SALES: '💰 Doanh thu',
};

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [statusFilter, setStatusFilter] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadCampaigns();
  }, [pagination.current, statusFilter]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const { data } = await campaignAPI.list({
        page: pagination.current,
        limit: pagination.pageSize,
        status: statusFilter || undefined,
      });
      setCampaigns(data.data || []);
      setPagination(p => ({ ...p, total: data.meta?.total || 0 }));
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  };

  const handleDistribute = async (id, e) => {
    e.stopPropagation();
    try {
      await campaignAPI.distribute(id);
      message.success('Đang phân phối campaign...');
      loadCampaigns();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi phân phối');
    }
  };

  const handlePause = async (id, e) => {
    e.stopPropagation();
    try {
      await campaignAPI.pause(id);
      message.success('Đã tạm dừng');
      loadCampaigns();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi');
    }
  };

  const handleResume = async (id, e) => {
    e.stopPropagation();
    try {
      await campaignAPI.resume(id);
      message.success('Đã tiếp tục');
      loadCampaigns();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi');
    }
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    Modal.confirm({
      title: 'Xác nhận lưu trữ campaign?',
      content: 'Campaign sẽ chuyển sang trạng thái ARCHIVED.',
      okText: 'Lưu trữ',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await campaignAPI.remove(id);
          message.success('Đã lưu trữ');
          loadCampaigns();
        } catch (err) {
          message.error(err.response?.data?.error?.message || 'Lỗi');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Tên Campaign',
      dataIndex: 'name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500, color: '#E2E8F0' }}>{text}</div>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>{objectiveLabels[record.objective] || record.objective}</span>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: (status) => <Tag color={statusColors[status]}>{status}</Tag>,
    },
    {
      title: 'Budget',
      dataIndex: 'total_budget',
      width: 120,
      render: (v, r) => v ? `$${Number(v).toLocaleString()} ${r.currency || ''}` : '—',
    },
    {
      title: 'Chi tiêu',
      dataIndex: 'total_spend',
      width: 100,
      render: (v) => v ? `$${Number(v).toLocaleString()}` : '$0',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      width: 120,
      render: (v) => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: '',
      width: 160,
      render: (_, record) => (
        <Space onClick={(e) => e.stopPropagation()}>
          {record.status === 'DRAFT' && (
            <Button size="small" type="primary" ghost icon={<PlayCircleOutlined />}
              onClick={(e) => handleDistribute(record.id, e)}>
              Phân phối
            </Button>
          )}
          {['ACTIVE', 'DISTRIBUTING'].includes(record.status) && (
            <Button size="small" icon={<PauseCircleOutlined />}
              onClick={(e) => handlePause(record.id, e)}>
              Dừng
            </Button>
          )}
          {record.status === 'PAUSED' && (
            <Button size="small" type="primary" ghost icon={<PlayCircleOutlined />}
              onClick={(e) => handleResume(record.id, e)}>
              Tiếp tục
            </Button>
          )}
          <Button size="small" danger icon={<DeleteOutlined />}
            onClick={(e) => handleDelete(record.id, e)} />
        </Space>
      ),
    },
  ];

  const filteredCampaigns = campaigns.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h2>Campaigns</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/campaigns/create')}>
          Tạo Campaign
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm kiếm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 300, background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
        />
        <Select
          placeholder="Trạng thái"
          allowClear
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 160 }}
          options={[
            { value: 'DRAFT', label: 'Draft' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'PAUSED', label: 'Paused' },
            { value: 'DISTRIBUTING', label: 'Distributing' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]}
        />
      </div>

      <div className="dark-table">
        <Table
          dataSource={filteredCampaigns}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            onChange: (page) => setPagination(p => ({ ...p, current: page })),
            showSizeChanger: false,
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/campaigns/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </div>
    </div>
  );
}
