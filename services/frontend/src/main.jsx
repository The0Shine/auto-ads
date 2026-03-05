import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

const theme = {
  token: {
    colorPrimary: '#6C5CE7',
    colorSuccess: '#00B894',
    colorWarning: '#FDCB6E',
    colorError: '#E17055',
    colorInfo: '#74B9FF',
    borderRadius: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
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
