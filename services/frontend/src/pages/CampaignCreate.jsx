import { useState } from 'react';
import { Steps, Form, Input, Select, InputNumber, DatePicker, Button, Card, Row, Col, message, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { campaignAPI } from '../api/campaign.api';

const { TextArea } = Input;
const { Title, Text } = Typography;

const objectives = [
  { value: 'AWARENESS', label: '🎯 Nhận diện thương hiệu', desc: 'Tăng độ nhận diện' },
  { value: 'TRAFFIC', label: '🔗 Traffic', desc: 'Tăng truy cập website' },
  { value: 'ENGAGEMENT', label: '💬 Tương tác', desc: 'Tăng like, comment, share' },
  { value: 'LEADS', label: '📋 Thu thập Lead', desc: 'Thu thập thông tin khách hàng' },
  { value: 'CONVERSIONS', label: '🛒 Chuyển đổi', desc: 'Tăng đơn hàng, đăng ký' },
  { value: 'SALES', label: '💰 Doanh thu', desc: 'Tối ưu doanh thu' },
];

export default function CampaignCreate() {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const steps = [
    { title: 'Thông tin', description: 'Cơ bản' },
    { title: 'Ngân sách', description: 'Budget & thời gian' },
    { title: 'Targeting', description: 'Đối tượng' },
    { title: 'Xác nhận', description: 'Review & tạo' },
  ];

  const next = async () => {
    try {
      const fieldsMap = [
        ['name', 'objective'],
        ['totalBudget', 'currency'],
        [],
        [],
      ];
      if (fieldsMap[current].length > 0) {
        await form.validateFields(fieldsMap[current]);
      }
      setCurrent(current + 1);
    } catch { /* validation error */ }
  };

  const prev = () => setCurrent(current - 1);

  const onFinish = async () => {
    setLoading(true);
    try {
      const values = form.getFieldsValue(true);
      const payload = {
        name: values.name,
        description: values.description,
        objective: values.objective,
        totalBudget: values.totalBudget,
        dailyBudget: values.dailyBudget,
        currency: values.currency || 'USD',
        startDate: values.dateRange?.[0]?.toISOString(),
        endDate: values.dateRange?.[1]?.toISOString(),
        targeting: {
          ageMin: values.ageMin,
          ageMax: values.ageMax,
          gender: values.gender,
          countries: values.countries,
          interests: values.interests,
        },
      };

      const { data } = await campaignAPI.create(payload);
      message.success('Tạo campaign thành công!');
      navigate(`/campaigns/${data.data.id}`);
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi tạo campaign');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (current) {
      case 0:
        return (
          <>
            <Form.Item name="name" label="Tên Campaign" rules={[{ required: true, message: 'Nhập tên' }]}>
              <Input placeholder="VD: Summer Sale 2025" />
            </Form.Item>
            <Form.Item name="objective" label="Mục tiêu" rules={[{ required: true, message: 'Chọn mục tiêu' }]}>
              <Select placeholder="Chọn mục tiêu campaign">
                {objectives.map(obj => (
                  <Select.Option key={obj.value} value={obj.value}>
                    {obj.label} — <Text type="secondary">{obj.desc}</Text>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="description" label="Mô tả">
              <TextArea rows={3} placeholder="Mô tả campaign (tuỳ chọn)" />
            </Form.Item>
          </>
        );
      case 1:
        return (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="totalBudget" label="Tổng ngân sách" rules={[{ required: true, message: 'Nhập budget' }]}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="1000" addonAfter="USD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dailyBudget" label="Ngân sách ngày">
                <InputNumber min={1} style={{ width: '100%' }} placeholder="50" addonAfter="USD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="currency" label="Tiền tệ" initialValue="USD">
                <Select options={[{ value: 'USD' }, { value: 'VND' }, { value: 'EUR' }]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dateRange" label="Thời gian">
                <DatePicker.RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        );
      case 2:
        return (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ageMin" label="Tuổi tối thiểu">
                <InputNumber min={13} max={65} style={{ width: '100%' }} placeholder="18" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ageMax" label="Tuổi tối đa">
                <InputNumber min={13} max={65} style={{ width: '100%' }} placeholder="45" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="Giới tính">
                <Select placeholder="Tất cả" allowClear options={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'male', label: 'Nam' },
                  { value: 'female', label: 'Nữ' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="countries" label="Quốc gia">
                <Select mode="tags" placeholder="VN, US, ..." />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="interests" label="Sở thích">
                <Select mode="tags" placeholder="Thêm sở thích target..." />
              </Form.Item>
            </Col>
          </Row>
        );
      case 3: {
        const values = form.getFieldsValue(true);
        return (
          <div>
            <Title level={4} style={{ color: '#E2E8F0' }}>Xác nhận Campaign</Title>
            <Row gutter={[16, 12]}>
              {[
                ['Tên', values.name],
                ['Mục tiêu', objectives.find(o => o.value === values.objective)?.label],
                ['Budget', values.totalBudget ? `$${values.totalBudget} ${values.currency || 'USD'}` : '—'],
                ['Budget/ngày', values.dailyBudget ? `$${values.dailyBudget}` : '—'],
                ['Tuổi', values.ageMin || values.ageMax ? `${values.ageMin || '?'} – ${values.ageMax || '?'}` : 'Tất cả'],
              ].map(([label, val]) => (
                <Col span={12} key={label}>
                  <Text style={{ color: '#94A3B8' }}>{label}</Text>
                  <div style={{ color: '#E2E8F0', fontWeight: 500 }}>{val || '—'}</div>
                </Col>
              ))}
            </Row>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Tạo Campaign</h2>
      </div>

      <Card style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, maxWidth: 800 }}>
        <Steps current={current} items={steps} style={{ marginBottom: 32 }} />

        <Form form={form} layout="vertical" onFinish={onFinish}>
          {renderStep()}

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            {current > 0 ? (
              <Button onClick={prev}>Quay lại</Button>
            ) : <div />}

            {current < steps.length - 1 ? (
              <Button type="primary" onClick={next}>Tiếp theo</Button>
            ) : (
              <Button type="primary" htmlType="submit" loading={loading}>
                Tạo Campaign
              </Button>
            )}
          </div>
        </Form>
      </Card>
    </div>
  );
}
