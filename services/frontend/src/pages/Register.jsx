import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await register(values.email, values.password, values.fullName);
      message.success('Đăng ký thành công!');
      navigate('/');
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>AutoAds</h1>
        <p className="subtitle">Tạo tài khoản mới</p>

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item name="fullName" rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input prefix={<UserOutlined />} placeholder="Họ và tên" />
          </Form.Item>

          <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}>
            <Input prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, min: 8, message: 'Mật khẩu ít nhất 8 ký tự' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject('Mật khẩu không khớp');
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Đăng ký
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <span style={{ color: '#94A3B8' }}>Đã có tài khoản? </span>
          <Link to="/login" style={{ color: '#A29BFE' }}>Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
