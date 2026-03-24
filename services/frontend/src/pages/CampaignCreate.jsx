import { useState, useRef } from 'react';
import {
  Steps, Form, Input, Select, InputNumber, DatePicker, Button, Card,
  Row, Col, message, Typography, Divider, Upload, Progress, Tag, Space,
  Descriptions, Alert,
} from 'antd';
import {
  UploadOutlined, DeleteOutlined, CheckCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { campaignAPI } from '../api/campaign.api';
import TargetingBuilder from '../components/TargetingBuilder';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

// ─── Constants ────────────────────────────────────────────────────────────────

const OBJECTIVES = [
  { value: 'AWARENESS',   label: 'Nhận diện thương hiệu',  desc: 'Tăng độ nhận biết' },
  { value: 'TRAFFIC',     label: 'Traffic',                 desc: 'Tăng truy cập website' },
  { value: 'ENGAGEMENT',  label: 'Tương tác',               desc: 'Like, comment, share' },
  { value: 'LEADS',       label: 'Thu thập Lead',           desc: 'Thông tin khách hàng' },
  { value: 'CONVERSIONS', label: 'Chuyển đổi',              desc: 'Đơn hàng, đăng ký' },
  { value: 'SALES',       label: 'Doanh thu',               desc: 'Tối ưu doanh thu' },
];

const BID_STRATEGIES = [
  { value: 'LOWEST_COST', label: 'Lowest Cost (tự động)' },
  { value: 'COST_CAP',    label: 'Cost Cap' },
  { value: 'BID_CAP',     label: 'Bid Cap' },
];

const OPT_GOALS = [
  { value: 'REACH',              label: 'Reach' },
  { value: 'IMPRESSIONS',        label: 'Impressions' },
  { value: 'LINK_CLICKS',        label: 'Link Clicks' },
  { value: 'CONVERSIONS',        label: 'Conversions' },
  { value: 'LEAD_GENERATION',    label: 'Lead Generation' },
];

const CREATIVE_TYPES = [
  { value: 'IMAGE',    label: 'Image' },
  { value: 'VIDEO',    label: 'Video' },
  { value: 'CAROUSEL', label: 'Carousel' },
  { value: 'TEXT',     label: 'Text only' },
];

const CTAS = [
  { value: 'LEARN_MORE',   label: 'Tìm hiểu thêm' },
  { value: 'SHOP_NOW',     label: 'Mua ngay' },
  { value: 'SIGN_UP',      label: 'Đăng ký' },
  { value: 'CONTACT_US',   label: 'Liên hệ' },
  { value: 'DOWNLOAD',     label: 'Tải xuống' },
  { value: 'BOOK_TRAVEL',  label: 'Đặt ngay' },
  { value: 'GET_OFFER',    label: 'Nhận ưu đãi' },
];

const STEPS = [
  { title: 'Campaign',   description: 'Thông tin & ngân sách' },
  { title: 'Ad Set',     description: 'Đối tượng & targeting' },
  { title: 'Creative',   description: 'Nội dung quảng cáo' },
  { title: 'Xác nhận',   description: 'Review & tạo' },
];

const CARD = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUrl(v) {
  try { new URL(v); return true; } catch { return false; }
}

function parseJsonArr(arr) {
  return (arr || []).map(v => { try { return JSON.parse(v); } catch { return v; } });
}

function fmtBudget(val, currency) {
  if (!val) return '—';
  return `${Number(val).toLocaleString()} ${currency || 'USD'}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CampaignCreate() {
  const [form]            = Form.useForm();
  const [step, setStep]   = useState(0);
  const [uploading, setUploading]   = useState(false);
  const [mediaUrls, setMediaUrls]   = useState([]);   // uploaded file URLs
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress]     = useState(null); // { label, pct }
  const navigate = useNavigate();

  // ── Step validation ────────────────────────────────────────────────────────

  const STEP_FIELDS = [
    ['campaign_name', 'objective', 'currency', 'totalBudget', 'dailyBudget', 'dateRange'],
    ['adset_name', 'adset_budget', 'adset_budget_type', 'ageMin', 'ageMax', 'countries'],
    ['creative_name', 'creative_type', 'headline', 'destinationUrl', 'ad_name'],
    [],
  ];

  const next = async () => {
    // Pre-validation for step 2 (creative)
    if (step === 2) {
      const type = form.getFieldValue('creative_type');
      if (['IMAGE', 'VIDEO', 'CAROUSEL'].includes(type) && mediaUrls.length === 0) {
        message.error('Vui lòng upload ít nhất 1 file media cho loại creative này');
        return;
      }
      if (uploading) {
        message.warning('Đang upload file, vui lòng chờ...');
        return;
      }
    }
    try {
      await form.validateFields(STEP_FIELDS[step]);
      setStep(s => s + 1);
    } catch {
      // Ant Design tự scroll đến field lỗi
    }
  };

  const prev = () => setStep(s => s - 1);

  // ── File upload ─────────────────────────────────────────────────────────────

  const handleUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    try {
      const { data } = await campaignAPI.uploadCreativeFile(file);
      const url = data.data?.url || data.url;
      setMediaUrls(prev => [...prev, url]);
      onSuccess();
      message.success(`Đã upload: ${file.name}`);
    } catch (err) {
      onError(err);
      message.error('Upload thất bại: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (url) => setMediaUrls(prev => prev.filter(u => u !== url));

  // ── Submit sequence ─────────────────────────────────────────────────────────

  const onSubmit = async () => {
    setSubmitting(true);
    setProgress({ label: 'Đang tạo Campaign...', pct: 10 });
    try {
      const v = form.getFieldsValue(true);

      // 1. Create Campaign
      const { data: d1 } = await campaignAPI.create({
        name:        v.campaign_name,
        description: v.description || null,
        objective:   v.objective,
        totalBudget: v.totalBudget,
        dailyBudget: v.dailyBudget || null,
        currency:    v.currency,
        startDate:   v.dateRange?.[0]?.toISOString() || null,
        endDate:     v.dateRange?.[1]?.toISOString() || null,
        targeting:   {},
      });
      const campaignId = d1.data.id;
      setProgress({ label: 'Đang tạo Ad Set...', pct: 35 });

      // 2. Create Ad Set
      const { data: d2 } = await campaignAPI.createAdSet(campaignId, {
        name:             v.adset_name,
        budget:           v.adset_budget,
        budgetType:       v.adset_budget_type,
        bidStrategy:      v.bidStrategy || null,
        optimizationGoal: v.optimizationGoal || null,
        targeting: {
          age_min:             v.ageMin,
          age_max:             v.ageMax,
          genders:             v.genders || [],
          countries:           v.countries || [],
          cities:              parseJsonArr(v.cities),
          interests:           parseJsonArr(v.interests),
          publisher_platforms: v.publisherPlatforms || [],
          facebook_positions:  v.facebookPositions  || [],
          instagram_positions: v.instagramPositions || [],
        },
      });
      const adSetId = d2.data.id;
      setProgress({ label: 'Đang tạo Creative...', pct: 60 });

      // 3. Create Creative
      const { data: d3 } = await campaignAPI.createCreative({
        name:           v.creative_name,
        type:           v.creative_type,
        headline:       v.headline || null,
        body:           v.creative_body || null,
        call_to_action: v.callToAction || null,
        destination_url: v.destinationUrl,
        media_urls:     mediaUrls,
        thumbnail_url:  mediaUrls[0] || null,
      });
      const creativeId = d3.data.id;
      setProgress({ label: 'Đang tạo Ad...', pct: 85 });

      // 4. Create Ad
      await campaignAPI.createAd(campaignId, adSetId, {
        name:       v.ad_name,
        creativeId: creativeId,
      });

      setProgress({ label: 'Hoàn thành!', pct: 100 });
      message.success('Tạo campaign thành công!');
      setTimeout(() => navigate(`/campaigns/${campaignId}`), 600);

    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Có lỗi xảy ra, vui lòng thử lại');
      setProgress(null);
      setSubmitting(false);
    }
  };

  // ── Step renderers ─────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <div>
      <Alert
        type="info" showIcon style={{ marginBottom: 20 }}
        message="Bước 1/4 — Campaign"
        description="Thiết lập mục tiêu và ngân sách tổng thể. Objective và tiền tệ không thể thay đổi sau khi tạo."
      />

      <Form.Item
        name="campaign_name" label="Tên Campaign"
        rules={[
          { required: true, message: 'Vui lòng nhập tên campaign' },
          { min: 2, message: 'Tối thiểu 2 ký tự' },
          { max: 100, message: 'Tối đa 100 ký tự' },
        ]}
        extra="Tên hiển thị trong báo cáo. Tối đa 100 ký tự."
      >
        <Input placeholder="VD: Summer Sale 2025" />
      </Form.Item>

      <Form.Item
        name="objective" label="Mục tiêu (Objective)"
        rules={[{ required: true, message: 'Vui lòng chọn mục tiêu' }]}
        extra="Không thể thay đổi sau khi tạo."
      >
        <Select placeholder="Chọn mục tiêu campaign">
          {OBJECTIVES.map(o => (
            <Select.Option key={o.value} value={o.value}>
              <span style={{ fontWeight: 500 }}>{o.label}</span>
              <Text type="secondary" style={{ fontSize: 12 }}> — {o.desc}</Text>
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="description" label="Mô tả (tuỳ chọn)">
        <TextArea rows={2} placeholder="Ghi chú nội bộ về campaign này..." maxLength={500} showCount />
      </Form.Item>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.08)' }}>Ngân sách</Divider>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="currency" label="Tiền tệ" initialValue="USD"
            extra="Không thể thay đổi sau khi tạo."
            rules={[{ required: true }]}
          >
            <Select options={[
              { value: 'USD', label: 'USD — Đô la Mỹ' },
              { value: 'VND', label: 'VND — Việt Nam Đồng' },
              { value: 'EUR', label: 'EUR — Euro' },
            ]} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="totalBudget" label="Tổng ngân sách"
            rules={[
              { required: true, message: 'Vui lòng nhập tổng ngân sách' },
              { type: 'number', min: 1, message: 'Tối thiểu 1' },
            ]}
            extra="Giới hạn chi tiêu cả đời campaign. Tối thiểu $1."
          >
            <InputNumber
              min={1} style={{ width: '100%' }}
              placeholder="500"
              addonAfter={<Form.Item name="currency" noStyle><span /></Form.Item>}
              formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              parser={v => v.replace(/,/g, '')}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="dailyBudget" label="Ngân sách ngày (tuỳ chọn)"
            rules={[
              { type: 'number', min: 1, message: 'Tối thiểu 1 nếu điền' },
              ({ getFieldValue }) => ({
                validator(_, val) {
                  const total = getFieldValue('totalBudget');
                  if (!val || !total || val <= total) return Promise.resolve();
                  return Promise.reject('Ngân sách ngày không được lớn hơn tổng ngân sách');
                },
              }),
            ]}
            extra="Nếu điền: tối thiểu $1 và phải ≤ tổng ngân sách."
          >
            <InputNumber
              min={1} style={{ width: '100%' }}
              placeholder="50"
              formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              parser={v => v.replace(/,/g, '')}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="dateRange" label="Thời gian chạy (tuỳ chọn)"
            rules={[
              ({ }) => ({
                validator(_, val) {
                  if (!val || !val[0]) return Promise.resolve();
                  if (val[0].isBefore(dayjs().startOf('day'))) {
                    return Promise.reject('Ngày bắt đầu không được trong quá khứ');
                  }
                  if (val[1] && !val[1].isAfter(val[0])) {
                    return Promise.reject('Ngày kết thúc phải sau ngày bắt đầu');
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              disabledDate={d => d && d < dayjs().startOf('day')}
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );

  const renderStep1 = () => (
    <div>
      <Alert
        type="info" showIcon style={{ marginBottom: 20 }}
        message="Bước 2/4 — Ad Set"
        description="Ad Set xác định ai sẽ thấy quảng cáo (targeting) và chi bao nhiêu mỗi ngày."
      />

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="adset_name" label="Tên Ad Set"
            rules={[
              { required: true, message: 'Vui lòng nhập tên ad set' },
              { min: 2, message: 'Tối thiểu 2 ký tự' },
              { max: 100, message: 'Tối đa 100 ký tự' },
            ]}
            extra="VD: Nữ 25-45 Hà Nội"
          >
            <Input placeholder="VD: Nữ 25–45 Hà Nội" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="adset_budget" label="Ngân sách Ad Set"
            rules={[
              { required: true, message: 'Vui lòng nhập ngân sách' },
              { type: 'number', min: 1, message: 'Tối thiểu 1' },
            ]}
            extra="Tối thiểu $1/ngày."
          >
            <InputNumber
              min={1} style={{ width: '100%' }}
              placeholder="50"
              formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              parser={v => v.replace(/,/g, '')}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="adset_budget_type" label="Loại ngân sách"
            initialValue="DAILY"
            rules={[{ required: true }]}
          >
            <Select options={[
              { value: 'DAILY',    label: 'Hàng ngày' },
              { value: 'LIFETIME', label: 'Toàn thời gian' },
            ]} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="bidStrategy" label="Bid Strategy (tuỳ chọn)"
            extra="Để trống = Facebook tự tối ưu (Lowest Cost)."
          >
            <Select allowClear placeholder="Tự động" options={BID_STRATEGIES} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="optimizationGoal" label="Optimization Goal (tuỳ chọn)">
            <Select allowClear placeholder="Theo objective" options={OPT_GOALS} />
          </Form.Item>
        </Col>
      </Row>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.08)' }}>Targeting</Divider>

      <Alert
        type="warning" showIcon style={{ marginBottom: 16 }}
        message="Quốc gia là bắt buộc — cần ít nhất 1 quốc gia để Facebook giao quảng cáo"
      />

      <TargetingBuilder form={form} required />
    </div>
  );

  const renderStep2 = () => {
    const creativeType = form.getFieldValue('creative_type');
    const needsMedia = ['IMAGE', 'VIDEO', 'CAROUSEL'].includes(creativeType);

    return (
      <div>
        <Alert
          type="info" showIcon style={{ marginBottom: 20 }}
          message="Bước 3/4 — Nội dung quảng cáo"
          description="Creative là nội dung hiển thị đến người dùng. Ad là đơn vị liên kết creative với ad set."
        />

        <Divider orientation="left" style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}>
          Creative (nội dung)
        </Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="creative_name" label="Tên Creative"
              rules={[
                { required: true, message: 'Vui lòng nhập tên creative' },
                { min: 2, max: 100, message: '2–100 ký tự' },
              ]}
              extra="Tên nội bộ, lưu trong thư viện Creative."
            >
              <Input placeholder="VD: Banner Sale Tháng 6" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="creative_type" label="Loại Creative"
              rules={[{ required: true, message: 'Vui lòng chọn loại' }]}
              extra="IMAGE/VIDEO/CAROUSEL yêu cầu upload file."
            >
              <Select placeholder="Chọn loại" options={CREATIVE_TYPES} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="headline" label="Headline (tiêu đề)"
          rules={[
            { required: true, message: 'Vui lòng nhập headline' },
            { max: 125, message: 'Tối đa 125 ký tự' },
          ]}
          extra="Hiển thị làm tiêu đề quảng cáo. Tối đa 125 ký tự."
        >
          <Input
            placeholder="VD: Giảm 50% — Chỉ hôm nay!"
            showCount maxLength={125}
          />
        </Form.Item>

        <Form.Item name="creative_body" label="Mô tả (tuỳ chọn)"
          rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}
        >
          <TextArea rows={3} placeholder="Nội dung bổ sung cho quảng cáo..." maxLength={500} showCount />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="destinationUrl" label="Destination URL"
              rules={[
                { required: true, message: 'Vui lòng nhập URL đích' },
                {
                  validator(_, v) {
                    if (!v) return Promise.reject('Vui lòng nhập URL');
                    if (!isValidUrl(v)) return Promise.reject('URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://)');
                    return Promise.resolve();
                  },
                },
              ]}
              extra="URL người dùng sẽ được chuyển đến khi click. Phải bắt đầu bằng https://"
            >
              <Input placeholder="https://your-site.com/landing" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="callToAction" label="Call to Action (tuỳ chọn)">
              <Select allowClear placeholder="Chọn nút CTA" options={CTAS} />
            </Form.Item>
          </Col>
        </Row>

        {/* Media upload */}
        <Form.Item
          label={
            <span>
              Media Files{' '}
              {needsMedia && <Tag color="orange">Bắt buộc với loại {creativeType}</Tag>}
              {!needsMedia && creativeType && <Tag>Tuỳ chọn</Tag>}
            </span>
          }
          extra="Chấp nhận: JPG, PNG, GIF, WEBP, MP4, MOV. Tối đa 20MB/file."
        >
          <Upload
            customRequest={handleUpload}
            showUploadList={false}
            accept="image/*,video/*"
            disabled={uploading}
          >
            <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} disabled={uploading}>
              {uploading ? 'Đang upload...' : 'Chọn file'}
            </Button>
          </Upload>

          {mediaUrls.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {mediaUrls.map((url, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', marginBottom: 6,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                }}>
                  {/\.(jpg|jpeg|png|gif|webp)$/i.test(url) && (
                    <img src={url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                  )}
                  <Text style={{ color: '#94A3B8', fontSize: 12, flex: 1 }} ellipsis>
                    {url.split('/').pop()}
                  </Text>
                  <Button
                    type="text" danger size="small" icon={<DeleteOutlined />}
                    onClick={() => removeMedia(url)}
                  />
                </div>
              ))}
            </div>
          )}
        </Form.Item>

        <Divider orientation="left" style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}>
          Ad (liên kết creative với ad set)
        </Divider>

        <Form.Item
          name="ad_name" label="Tên Ad"
          rules={[
            { required: true, message: 'Vui lòng nhập tên ad' },
            { min: 2, max: 100, message: '2–100 ký tự' },
          ]}
          extra="Tên hiển thị trong báo cáo ad set."
        >
          <Input placeholder="VD: Banner Sale Ad 1" />
        </Form.Item>
      </div>
    );
  };

  const renderStep3 = () => {
    const v = form.getFieldsValue(true);
    const obj = OBJECTIVES.find(o => o.value === v.objective);
    const cta = CTAS.find(c => c.value === v.callToAction);
    const genderLabel = !v.genders?.length ? 'Tất cả' : v.genders.map(g => g === 1 ? 'Nam' : 'Nữ').join(', ');

    const Section = ({ title, children }) => (
      <Card style={{ ...CARD, marginBottom: 12 }} size="small"
        title={<span style={{ color: '#A29BFE', fontSize: 13 }}>{title}</span>}
      >
        {children}
      </Card>
    );

    const Row2 = ({ label, value }) => (
      <div style={{ display: 'flex', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{ color: '#94A3B8', width: 180, flexShrink: 0, fontSize: 13 }}>{label}</span>
        <span style={{ color: '#E2E8F0', fontSize: 13 }}>{value || '—'}</span>
      </div>
    );

    return (
      <div>
        <Alert
          type="success" showIcon style={{ marginBottom: 20 }}
          message="Bước 4/4 — Xác nhận"
          description="Kiểm tra lại toàn bộ thông tin. Nhấn 'Tạo Campaign' để thực hiện tạo Campaign → Ad Set → Creative → Ad theo thứ tự."
        />

        <Section title="Campaign">
          <Row2 label="Tên" value={v.campaign_name} />
          <Row2 label="Mục tiêu" value={obj ? `${obj.label} — ${obj.desc}` : v.objective} />
          <Row2 label="Tổng ngân sách" value={fmtBudget(v.totalBudget, v.currency)} />
          <Row2 label="Ngân sách ngày" value={v.dailyBudget ? fmtBudget(v.dailyBudget, v.currency) : 'Không giới hạn ngày'} />
          <Row2 label="Thời gian" value={v.dateRange?.[0] ? `${v.dateRange[0].format('DD/MM/YYYY')} → ${v.dateRange[1]?.format('DD/MM/YYYY') || 'Không giới hạn'}` : 'Không giới hạn'} />
          <Row2 label="Mô tả" value={v.description} />
        </Section>

        <Section title="Ad Set">
          <Row2 label="Tên" value={v.adset_name} />
          <Row2 label="Ngân sách" value={`${fmtBudget(v.adset_budget, v.currency)} / ${v.adset_budget_type === 'DAILY' ? 'ngày' : 'toàn bộ'}`} />
          <Row2 label="Bid Strategy" value={BID_STRATEGIES.find(b => b.value === v.bidStrategy)?.label || 'Tự động (Lowest Cost)'} />
          <Row2 label="Optimization Goal" value={OPT_GOALS.find(g => g.value === v.optimizationGoal)?.label || 'Theo objective'} />
        </Section>

        <Section title="Targeting">
          <Row2 label="Độ tuổi" value={`${v.ageMin || 18} – ${v.ageMax || 65}`} />
          <Row2 label="Giới tính" value={genderLabel} />
          <Row2 label="Quốc gia" value={(v.countries || []).join(', ')} />
          <Row2 label="Thành phố" value={(v.cities || []).length ? `${v.cities.length} thành phố đã chọn` : 'Tất cả'} />
          <Row2 label="Sở thích" value={(v.interests || []).length ? `${v.interests.length} sở thích đã chọn` : 'Tất cả'} />
          <Row2 label="Nền tảng" value={(v.publisherPlatforms || []).join(', ') || 'Tất cả'} />
        </Section>

        <Section title="Creative + Ad">
          <Row2 label="Tên Creative" value={v.creative_name} />
          <Row2 label="Loại" value={CREATIVE_TYPES.find(t => t.value === v.creative_type)?.label} />
          <Row2 label="Headline" value={v.headline} />
          <Row2 label="Body" value={v.creative_body ? (v.creative_body.length > 120 ? v.creative_body.slice(0, 120) + '…' : v.creative_body) : null} />
          <Row2 label="CTA" value={cta?.label} />
          <Row2 label="Destination URL" value={
            v.destinationUrl
              ? <a href={v.destinationUrl} target="_blank" rel="noreferrer" style={{ color: '#74B9FF' }}>{v.destinationUrl}</a>
              : null
          } />
          <Row2 label="Media" value={mediaUrls.length ? `${mediaUrls.length} file đã upload` : 'Không có'} />
          <Row2 label="Tên Ad" value={v.ad_name} />
        </Section>

        {/* Submit */}
        {progress && (
          <Progress
            percent={progress.pct}
            status={progress.pct === 100 ? 'success' : 'active'}
            format={() => progress.label}
            style={{ marginBottom: 16 }}
          />
        )}

        <Button
          type="primary" size="large" block
          loading={submitting}
          disabled={submitting}
          onClick={onSubmit}
          style={{ height: 48, fontSize: 16, fontWeight: 600 }}
          icon={!submitting ? <CheckCircleOutlined /> : null}
        >
          {submitting ? progress?.label || 'Đang tạo...' : 'Tạo Campaign'}
        </Button>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="page-header">
        <Title level={2} style={{ color: '#fff', margin: 0 }}>Tạo Campaign mới</Title>
      </div>

      <Card style={{ ...CARD, maxWidth: 860, margin: '0 auto' }}>
        <Steps
          current={step}
          items={STEPS}
          style={{ marginBottom: 32 }}
          size="small"
        />

        <Form form={form} layout="vertical" requiredMark="optional">
          {/* All steps always mounted to preserve form state */}
          <div style={{ display: step === 0 ? 'block' : 'none' }}>{renderStep0()}</div>
          <div style={{ display: step === 1 ? 'block' : 'none' }}>{renderStep1()}</div>
          <div style={{ display: step === 2 ? 'block' : 'none' }}>{renderStep2()}</div>
          <div style={{ display: step === 3 ? 'block' : 'none' }}>{renderStep3()}</div>
        </Form>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          {step > 0 ? (
            <Button onClick={prev} disabled={submitting} size="large">← Quay lại</Button>
          ) : (
            <div />
          )}
          {step < 3 && (
            <Button type="primary" onClick={next} size="large">
              Tiếp theo →
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
