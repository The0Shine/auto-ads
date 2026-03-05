import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  RocketOutlined,
  PictureOutlined,
  ApiOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Sider, Header, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/campaigns', icon: <RocketOutlined />, label: 'Campaigns' },
  { key: '/creatives', icon: <PictureOutlined />, label: 'Creatives' },
  { key: '/platforms', icon: <ApiOutlined />, label: 'Platforms' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
];

export default function DashboardLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const selectedKey = '/' + (location.pathname.split('/')[1] || '');

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: user?.full_name || user?.email || 'User' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
  ];

  const handleUserMenu = ({ key }) => {
    if (key === 'logout') logout();
  };

  return (
    <Layout className="dashboard-layout" style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 10 }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <RocketOutlined style={{ fontSize: 24, color: '#6C5CE7' }} />
          {!collapsed && (
            <Typography.Text strong style={{ color: '#fff', fontSize: 18, marginLeft: 12 }}>
              AutoAds
            </Typography.Text>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
        <Header>
          <Space>
            {collapsed
              ? <MenuUnfoldOutlined onClick={() => setCollapsed(false)} style={{ fontSize: 18, color: '#94A3B8', cursor: 'pointer' }} />
              : <MenuFoldOutlined onClick={() => setCollapsed(true)} style={{ fontSize: 18, color: '#94A3B8', cursor: 'pointer' }} />
            }
          </Space>

          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: '#6C5CE7' }} icon={<UserOutlined />} />
              {!collapsed && (
                <Typography.Text style={{ color: '#E2E8F0' }}>
                  {user?.full_name || user?.email || ''}
                </Typography.Text>
              )}
            </Space>
          </Dropdown>
        </Header>

        <Content>
          <div className="fade-in">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
