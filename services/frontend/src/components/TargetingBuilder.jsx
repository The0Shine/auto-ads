import { useState, useCallback, useRef } from 'react';
import { Form, Select, InputNumber, Row, Col, Typography, Divider } from 'antd';
import { campaignAPI } from '../api/campaign.api';

const { Text } = Typography;

const PUBLISHER_PLATFORMS = [
  { value: 'facebook',          label: 'Facebook' },
  { value: 'instagram',         label: 'Instagram' },
  { value: 'audience_network',  label: 'Audience Network' },
  { value: 'messenger',         label: 'Messenger' },
];

const FB_POSITIONS = [
  { value: 'feed',          label: 'Feed' },
  { value: 'story',         label: 'Stories' },
  { value: 'reels',         label: 'Reels' },
  { value: 'right_hand_column', label: 'Right Column' },
  { value: 'marketplace',   label: 'Marketplace' },
  { value: 'video_feeds',   label: 'Video Feeds' },
];

const IG_POSITIONS = [
  { value: 'stream',  label: 'Feed' },
  { value: 'story',   label: 'Stories' },
  { value: 'reels',   label: 'Reels' },
  { value: 'explore', label: 'Explore' },
];

/**
 * Reusable targeting form fields.
 * Wrap inside an Ant Design <Form> — fields use Form.Item name props.
 *
 * Field names:
 *   ageMin, ageMax, genders, countries, cities, interests,
 *   publisherPlatforms, facebookPositions, instagramPositions
 */
export default function TargetingBuilder({ form, required = false }) {
  const [interestOptions, setInterestOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [countryOptions,  setCountryOptions]  = useState([]);
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const interestTimer = useRef(null);
  const locationTimer = useRef(null);
  const countryTimer  = useRef(null);

  // ── Debounced interest search ────────────────────────────────────────────
  const searchInterests = useCallback((q) => {
    clearTimeout(interestTimer.current);
    if (!q || q.length < 2) return;
    setLoadingInterests(true);
    interestTimer.current = setTimeout(async () => {
      try {
        const { data } = await campaignAPI.searchInterests(q, 15);
        const items = data.data || [];
        setInterestOptions(items.map(i => ({
          value: JSON.stringify({ id: i.id, name: i.name }),
          label: `${i.name}${i.audience_size_lower_bound ? ` (${Number(i.audience_size_lower_bound).toLocaleString()}+)` : ''}`,
        })));
      } catch { /* empty */ } finally {
        setLoadingInterests(false);
      }
    }, 300);
  }, []);

  // ── Debounced location search ────────────────────────────────────────────
  const searchLocations = useCallback((q) => {
    clearTimeout(locationTimer.current);
    if (!q || q.length < 2) return;
    setLoadingLocations(true);
    locationTimer.current = setTimeout(async () => {
      try {
        const { data } = await campaignAPI.searchLocations(q, 'city', 15);
        const items = data.data || [];
        setLocationOptions(items.map(l => ({
          value: JSON.stringify({ key: l.key, name: l.name, type: l.type, country_code: l.country_code }),
          label: `${l.name}${l.region ? `, ${l.region}` : ''} (${l.country_code || l.type})`,
        })));
      } catch { /* empty */ } finally {
        setLoadingLocations(false);
      }
    }, 300);
  }, []);

  // ── Debounced country search ─────────────────────────────────────────────
  const searchCountries = useCallback((q) => {
    clearTimeout(countryTimer.current);
    if (!q || q.length < 1) return;
    setLoadingCountries(true);
    countryTimer.current = setTimeout(async () => {
      try {
        const { data } = await campaignAPI.searchCountries(q, 15);
        const items = data.data || [];
        setCountryOptions(items.map(c => ({
          value: c.key,
          label: `${c.name} (${c.key})`,
        })));
      } catch { /* empty */ } finally {
        setLoadingCountries(false);
      }
    }, 300);
  }, []);

  return (
    <>
      <Divider orientation="left" style={{ color: '#94A3B8', borderColor: 'rgba(255,255,255,0.08)' }}>
        Nhân khẩu học
      </Divider>

      <Row gutter={16}>
        <Col span={6}>
          <Form.Item name="ageMin" label="Tuổi từ" initialValue={18}>
            <InputNumber min={13} max={65} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="ageMax"
            label="Tuổi đến"
            initialValue={65}
            dependencies={['ageMin']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const ageMin = getFieldValue('ageMin');
                  if (value != null && ageMin != null && value < ageMin) {
                    return Promise.reject(new Error('Tuổi đến phải >= Tuổi từ'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <InputNumber min={13} max={65} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="genders" label="Giới tính">
            <Select mode="multiple" allowClear placeholder="Tất cả" options={[
              { value: 1, label: 'Nam' },
              { value: 2, label: 'Nữ' },
            ]} />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left" style={{ color: '#94A3B8', borderColor: 'rgba(255,255,255,0.08)' }}>
        Vị trí địa lý
      </Divider>

      <Form.Item
        name="countries"
        label="Quốc gia"
        rules={required ? [{ required: true, type: 'array', min: 1, message: 'Chọn ít nhất 1 quốc gia' }] : []}
        extra="Gõ tên quốc gia để tìm kiếm (VD: Vietnam, Japan...)"
      >
        <Select
          mode="multiple"
          showSearch
          filterOption={false}
          onSearch={searchCountries}
          loading={loadingCountries}
          options={countryOptions}
          placeholder="Gõ để tìm quốc gia..."
          notFoundContent={loadingCountries ? 'Đang tìm...' : 'Gõ tên quốc gia'}
        />
      </Form.Item>

      <Form.Item name="cities" label="Thành phố (tìm kiếm)">
        <Select
          mode="multiple"
          showSearch
          filterOption={false}
          onSearch={searchLocations}
          loading={loadingLocations}
          options={locationOptions}
          placeholder="Gõ để tìm thành phố..."
          notFoundContent={loadingLocations ? 'Đang tìm...' : 'Gõ ít nhất 2 ký tự'}
        />
      </Form.Item>

      <Divider orientation="left" style={{ color: '#94A3B8', borderColor: 'rgba(255,255,255,0.08)' }}>
        Sở thích & Hành vi
      </Divider>

      <Form.Item name="interests" label="Sở thích (tìm kiếm)">
        <Select
          mode="multiple"
          showSearch
          filterOption={false}
          onSearch={searchInterests}
          loading={loadingInterests}
          options={interestOptions}
          placeholder="Gõ để tìm sở thích: fashion, shopping..."
          notFoundContent={loadingInterests ? 'Đang tìm...' : 'Gõ ít nhất 2 ký tự'}
        />
      </Form.Item>

      <Divider orientation="left" style={{ color: '#94A3B8', borderColor: 'rgba(255,255,255,0.08)' }}>
        Vị trí hiển thị
      </Divider>

      <Form.Item name="publisherPlatforms" label="Nền tảng">
        <Select mode="multiple" allowClear placeholder="Mặc định: tất cả" options={PUBLISHER_PLATFORMS} />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="facebookPositions" label="Facebook Positions">
            <Select mode="multiple" allowClear placeholder="Mặc định: tất cả" options={FB_POSITIONS} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="instagramPositions" label="Instagram Positions">
            <Select mode="multiple" allowClear placeholder="Mặc định: tất cả" options={IG_POSITIONS} />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
