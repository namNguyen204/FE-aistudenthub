import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import DashboardLayout from './layouts/DashboardLayout';
import {
  DashboardHome, 
  UserProfile,
  AdminDashboardHome,
  AdminUserList,
  AdminChatModeration,
  AdminSystemConfig,
  AdminReportList,
  AdminSubscriptionPlans,
  PaymentPackage,
  PaymentSuccess,
  PaymentCancel,
  PaymentHistory,
  SharedWithMe
} from './pages/dashboard/DashboardPages';
import UploadDocument from './pages/dashboard/documents/UploadDocument';
import Welcome from './pages/Welcome';

const CommunityDocuments = React.lazy(() => import('./pages/dashboard/DashboardPages').then(module => ({ default: module.CommunityDocuments })));
const AdminDocumentList = React.lazy(() => import('./pages/dashboard/DashboardPages').then(module => ({ default: module.AdminDocumentList })));
const ModeratorDocumentList = React.lazy(() => import('./pages/dashboard/DashboardPages').then(module => ({ default: module.ModeratorDocumentList })));
const ModeratorDashboardHome = React.lazy(() => import('./pages/admin/ModeratorDashboardHome'));

const DocumentSearch = React.lazy(() => import('./pages/dashboard/documents/DocumentSearch'));
const DocumentDetail = React.lazy(() => import('./pages/dashboard/documents/DocumentDetail'));
const AIChatbot = React.lazy(() => import('./pages/dashboard/chat/AIChatbot'));

const ProtectedRoute = ({ children, requireAdmin = false, allowedRoles = null }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--neutral-500)' }}>Đang tải...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  const role = user?.role?.replace('ROLE_', '') || 'USER';
  
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (role === 'MODERATOR') return <Navigate to="/moderator" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAdmin && role !== 'ADMIN' && role !== 'MODERATOR') {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (!requireAdmin && (role === 'ADMIN' || role === 'MODERATOR')) {
    return <Navigate to={role === 'MODERATOR' ? '/moderator' : '/admin'} replace />;
  }
  
  return children;
};

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();
  const role = user?.role?.replace('ROLE_', '') || 'USER';

  return (
    <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center', color: 'var(--neutral-500)' }}>Đang tải...</div>}>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route 
          path="/dashboard" 
          element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}
        >
          <Route index element={<DashboardHome />} />
          <Route path="my" element={<DocumentSearch />} />
          <Route path="community" element={<CommunityDocuments />} />
          <Route path="shared-with-me" element={<SharedWithMe />} />
          <Route path="folders" element={<Navigate to="/dashboard/my" replace />} />
          <Route path="chat" element={<AIChatbot />} />
          <Route path="upload" element={<UploadDocument />} />
          <Route path="documents/:id" element={<DocumentDetail />} />
          <Route path="profile" element={<UserProfile />} />
          
          <Route path="payment" element={<PaymentPackage />} />
          <Route path="payment/success" element={<PaymentSuccess />} />
          <Route path="payment/cancel" element={<PaymentCancel />} />
          <Route path="payment/history" element={<PaymentHistory />} />
        </Route>

        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={<ProtectedRoute requireAdmin={true} allowedRoles={['ADMIN']}><DashboardLayout /></ProtectedRoute>}
        >
          <Route index element={<AdminDashboardHome />} />
          <Route path="users" element={<AdminUserList />} />
          <Route path="documents" element={<AdminDocumentList />} />
          <Route path="chats" element={<AdminChatModeration />} />
          <Route path="reports" element={<AdminReportList />} />
          <Route path="subscription-plans" element={<AdminSubscriptionPlans />} />
          <Route path="settings" element={<AdminSystemConfig />} />
        </Route>

        {/* Moderator Routes */}
        <Route 
          path="/moderator" 
          element={<ProtectedRoute requireAdmin={true} allowedRoles={['MODERATOR', 'ADMIN']}><DashboardLayout /></ProtectedRoute>}
        >
          <Route index element={<ModeratorDashboardHome />} />
          <Route path="documents" element={<ModeratorDocumentList />} />
          <Route path="reports" element={<AdminReportList />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
