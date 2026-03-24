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

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#64748B' }} />}
              placeholder="Nguyễn Văn A"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#64748B' }} />}
              placeholder="you@example.com"
              size="large"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#64748B' }} />}
              placeholder="Tối thiểu 8 ký tự"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject('Mật khẩu không khớp');
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#64748B' }} />}
              placeholder="Nhập lại mật khẩu"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16, marginTop: 8 }}>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Tạo tài khoản
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', fontSize: 14 }}>
          <span style={{ color: '#94A3B8' }}>Đã có tài khoản? </span>
          <Link to="/login" style={{ color: '#A29BFE', fontWeight: 500 }}>Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
