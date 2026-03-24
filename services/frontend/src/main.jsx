import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme as antTheme } from 'antd';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

const theme = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    // Brand
    colorPrimary:    '#6C5CE7',
    colorSuccess:    '#00B894',
    colorWarning:    '#FDCB6E',
    colorError:      '#E17055',
    colorInfo:       '#74B9FF',

    // Background layers
    colorBgBase:      '#0F0F23',
    colorBgContainer: '#1A1A35',
    colorBgElevated:  '#1E1E3F',
    colorBgLayout:    '#0F0F23',
    colorBgSpotlight: '#252545',

    // Border
    colorBorder:        'rgba(255,255,255,0.12)',
    colorBorderSecondary: 'rgba(255,255,255,0.06)',

    // Text
    colorText:          '#E2E8F0',
    colorTextSecondary: '#94A3B8',
    colorTextTertiary:  '#64748B',
    colorTextPlaceholder: '#64748B',

    // Misc
    borderRadius: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    lineHeight: 1.6,
  },
  components: {
    Layout: {
      siderBg:  '#141432',
      headerBg: 'rgba(15,15,35,0.9)',
      bodyBg:   '#0F0F23',
    },
    Menu: {
      darkItemBg:         'transparent',
      darkItemSelectedBg: 'rgba(108,92,231,0.18)',
      darkItemColor:      '#94A3B8',
      darkItemSelectedColor: '#A29BFE',
      darkItemHoverColor: '#E2E8F0',
      itemBorderRadius: 8,
    },
    Button: {
      borderRadius: 8,
    },
    Input: {
      borderRadius: 8,
    },
    Select: {
      borderRadius: 8,
    },
    Card: {
      borderRadius: 12,
    },
    Modal: {
      borderRadius: 12,
    },
    Table: {
      borderRadius: 8,
      headerBg: 'rgba(255,255,255,0.04)',
    },
    Tabs: {
      inkBarColor: '#6C5CE7',
      itemSelectedColor: '#A29BFE',
      itemColor: '#94A3B8',
      itemHoverColor: '#E2E8F0',
    },
    Tag: {
      borderRadius: 6,
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider theme={theme}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
);
