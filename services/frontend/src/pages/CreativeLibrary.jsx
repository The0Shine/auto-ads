import { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Modal, Form, Input, Select, Tag, message, Empty, Typography, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { campaignAPI } from '../api/campaign.api';

const { Meta } = Card;
const { Text } = Typography;

const typeIcons = {
  IMAGE: <PictureOutlined />,
  VIDEO: <VideoCameraOutlined />,
  CAROUSEL: <PictureOutlined />,
  COLLECTION: <PictureOutlined />,
};

const typeColors = {
  IMAGE: 'blue', VIDEO: 'magenta', CAROUSEL: 'cyan', COLLECTION: 'green',
};

export default function CreativeLibrary() {
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await campaignAPI.listCreatives();
      setCreatives(data.data || []);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    form.resetFields();
    setModal(true);
  };

  const openEdit = (creative) => {
    setEditId(creative.id);
    form.setFieldsValue({
      name: creative.name,
      type: creative.type,
      headline: creative.headline,
      body: creative.body,
      callToAction: creative.call_to_action,
      destinationUrl: creative.destination_url,
    });
    setModal(true);
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      if (editId) {
        await campaignAPI.updateCreative(editId, values);
        message.success('Cập nhật thành công');
      } else {
        await campaignAPI.createCreative(values);
        message.success('Tạo thành công');
      }
      setModal(false);
      form.resetFields();
      load();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Xóa creative?',
      content: 'Không thể hoàn tác.',
      okText: 'Xóa',
      okType: 'danger',
      onOk: async () => {
        await campaignAPI.removeCreative(id);
        message.success('Đã xóa');
        load();
      },
    });
  };

  return (
    <div>
      <div className="page-header">
        <h2>Creatives</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Tạo Creative
        </Button>
      </div>

      {creatives.length === 0 && !loading ? (
        <Card style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
          <Empty
            description={<Text style={{ color: '#94A3B8' }}>Chưa có creative nào</Text>}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {creatives.map(c => (
            <Col xs={24} sm={12} lg={8} xl={6} key={c.id}>
              <Card
                loading={loading}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                }}
                bodyStyle={{ padding: 16 }}
                actions={[
                  <EditOutlined key="edit" onClick={() => openEdit(c)} />,
                  <DeleteOutlined key="delete" onClick={() => handleDelete(c.id)} style={{ color: '#E17055' }} />,
                ]}
              >
                <div style={{
                  height: 120,
                  background: 'rgba(108,92,231,0.08)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  fontSize: 40,
                  color: '#6C5CE7',
                }}>
                  {typeIcons[c.type] || <PictureOutlined />}
                </div>
                <div style={{ fontWeight: 500, color: '#E2E8F0', marginBottom: 4 }}>{c.name}</div>
                <Space>
                  <Tag color={typeColors[c.type]}>{c.type}</Tag>
                  {c.headline && <Text ellipsis style={{ color: '#94A3B8', fontSize: 12, maxWidth: 120 }}>{c.headline}</Text>}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal title={editId ? 'Sửa Creative' : 'Tạo Creative'} open={modal} onCancel={() => setModal(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
            <Input placeholder="VD: Banner Sale 50%" />
          </Form.Item>
          <Form.Item name="type" label="Loại" rules={[{ required: true }]}>
            <Select options={[
              { value: 'IMAGE', label: '🖼️ Hình ảnh' },
              { value: 'VIDEO', label: '🎥 Video' },
              { value: 'CAROUSEL', label: '🎠 Carousel' },
              { value: 'COLLECTION', label: '📦 Collection' },
            ]} />
          </Form.Item>
          <Form.Item name="headline" label="Tiêu đề">
            <Input placeholder="Headline quảng cáo" />
          </Form.Item>
          <Form.Item name="body" label="Nội dung">
            <Input.TextArea rows={3} placeholder="Nội dung quảng cáo" />
          </Form.Item>
          <Form.Item name="callToAction" label="Call to Action">
            <Select allowClear placeholder="Chọn" options={[
              { value: 'LEARN_MORE', label: 'Tìm hiểu thêm' },
              { value: 'SHOP_NOW', label: 'Mua ngay' },
              { value: 'SIGN_UP', label: 'Đăng ký' },
              { value: 'CONTACT_US', label: 'Liên hệ' },
              { value: 'DOWNLOAD', label: 'Tải xuống' },
            ]} />
          </Form.Item>
          <Form.Item name="destinationUrl" label="URL đích">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} block>
              {editId ? 'Cập nhật' : 'Tạo'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
