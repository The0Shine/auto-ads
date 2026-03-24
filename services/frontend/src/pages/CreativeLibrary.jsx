import { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Button, Modal, Form, Input, Select, Tag, message, Empty, Typography, Space, Upload, Progress, Image } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, VideoCameraOutlined, UploadOutlined, LinkOutlined } from '@ant-design/icons';
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
  const [creatives, setCreatives]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(false);
  const [form]                        = Form.useForm();
  const [saving, setSaving]           = useState(false);
  const [editId, setEditId]           = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState([]);   // list of MinIO URLs
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl]   = useState('');

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
    setUploadedUrls([]);
    form.resetFields();
    setModal(true);
  };

  const openEdit = (creative) => {
    setEditId(creative.id);
    const urls = creative.media_urls || [];
    setUploadedUrls(urls);
    form.setFieldsValue({
      name:           creative.name,
      type:           creative.type,
      headline:       creative.headline,
      body:           creative.body,
      callToAction:   creative.call_to_action,
      destinationUrl: creative.destination_url,
    });
    setModal(true);
  };

  // ── Upload handler (Ant Design Upload custom) ────────────────────────────
  const handleUpload = async ({ file }) => {
    setUploading(true);
    try {
      const { data } = await campaignAPI.uploadCreativeFile(file);
      const url = data.data.url;
      setUploadedUrls(prev => [...prev, url]);
      message.success(`Đã upload: ${file.name}`);
    } catch (err) {
      message.error(err.response?.data?.error || 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  const removeUploadedUrl = (url) => {
    setUploadedUrls(prev => prev.filter(u => u !== url));
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        mediaUrls: uploadedUrls,
      };
      if (editId) {
        await campaignAPI.updateCreative(editId, payload);
        message.success('Cập nhật thành công');
      } else {
        await campaignAPI.createCreative(payload);
        message.success('Tạo thành công');
      }
      setModal(false);
      form.resetFields();
      setUploadedUrls([]);
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
      content: 'File ảnh/video trên MinIO cũng sẽ bị xóa. Không thể hoàn tác.',
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
          {creatives.map(c => {
            const firstUrl = (c.media_urls || [])[0];
            return (
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
                  {/* Preview ảnh nếu có, fallback icon */}
                  <div style={{
                    height: 120,
                    background: 'rgba(108,92,231,0.08)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                    overflow: 'hidden',
                    cursor: firstUrl ? 'pointer' : 'default',
                  }}
                    onClick={() => { if (firstUrl) { setPreviewUrl(firstUrl); setPreviewOpen(true); } }}
                  >
                    {firstUrl
                      ? <img src={firstUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 40, color: '#6C5CE7' }}>{typeIcons[c.type] || <PictureOutlined />}</span>
                    }
                  </div>
                  <div style={{ fontWeight: 500, color: '#E2E8F0', marginBottom: 4 }}>{c.name}</div>
                  <Space>
                    <Tag color={typeColors[c.type]}>{c.type}</Tag>
                    {c.headline && <Text ellipsis style={{ color: '#94A3B8', fontSize: 12, maxWidth: 120 }}>{c.headline}</Text>}
                  </Space>
                  {(c.media_urls || []).length > 0 && (
                    <div style={{ marginTop: 4, color: '#6C5CE7', fontSize: 11 }}>
                      {c.media_urls.length} file{c.media_urls.length > 1 ? 's' : ''} trên MinIO
                    </div>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Image preview */}
      <Image
        style={{ display: 'none' }}
        preview={{ visible: previewOpen, src: previewUrl, onVisibleChange: setPreviewOpen }}
      />

      {/* Create / Edit Modal */}
      <Modal
        title={editId ? 'Sửa Creative' : 'Tạo Creative'}
        open={modal}
        onCancel={() => { setModal(false); setUploadedUrls([]); }}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
            <Input placeholder="VD: Banner Sale 50%" />
          </Form.Item>
          <Form.Item name="type" label="Loại" rules={[{ required: true }]}>
            <Select options={[
              { value: 'IMAGE',      label: '🖼️ Hình ảnh' },
              { value: 'VIDEO',      label: '🎥 Video' },
              { value: 'CAROUSEL',   label: '🎠 Carousel' },
              { value: 'COLLECTION', label: '📦 Collection' },
            ]} />
          </Form.Item>

          {/* ── File Upload ── */}
          <Form.Item label="Ảnh / Video (upload lên MinIO)">
            <Upload
              customRequest={handleUpload}
              showUploadList={false}
              accept="image/*,video/mp4,video/quicktime"
              multiple
            >
              <Button icon={<UploadOutlined />} loading={uploading}>
                {uploading ? 'Đang upload...' : 'Chọn file'}
              </Button>
            </Upload>

            {/* Preview uploaded files */}
            {uploadedUrls.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {uploadedUrls.map((url, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 6, background: 'rgba(108,92,231,0.08)',
                    borderRadius: 6, padding: '4px 8px',
                  }}>
                    {/\.(jpg|jpeg|png|gif|webp)$/i.test(url)
                      ? <img src={url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }} />
                      : <VideoCameraOutlined style={{ fontSize: 24, color: '#6C5CE7' }} />
                    }
                    <Text ellipsis style={{ flex: 1, color: '#94A3B8', fontSize: 11 }}>{url}</Text>
                    <Button type="text" danger size="small" onClick={() => removeUploadedUrl(url)}>✕</Button>
                  </div>
                ))}
              </div>
            )}
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
              { value: 'SHOP_NOW',   label: 'Mua ngay' },
              { value: 'SIGN_UP',    label: 'Đăng ký' },
              { value: 'CONTACT_US', label: 'Liên hệ' },
              { value: 'DOWNLOAD',   label: 'Tải xuống' },
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
