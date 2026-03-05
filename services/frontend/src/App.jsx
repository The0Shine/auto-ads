import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/Layout/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CampaignList from './pages/CampaignList';
import CampaignCreate from './pages/CampaignCreate';
import CampaignDetail from './pages/CampaignDetail';
import CreativeLibrary from './pages/CreativeLibrary';

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

      {/* Protected routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/campaigns" element={<CampaignList />} />
              <Route path="/campaigns/create" element={<CampaignCreate />} />
              <Route path="/campaigns/:id" element={<CampaignDetail />} />
              <Route path="/creatives" element={<CreativeLibrary />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DashboardLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}
