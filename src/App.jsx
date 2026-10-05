import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import ScanDocument from './pages/ScanDocument';
import ScanResults from './pages/ScanResults';
import PiiReviewPage from './pages/PiiReviewPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentHistoryPage from './pages/DocumentHistoryPage';
import ReportPage from './pages/ReportsPage';
import PIIAnalyticsPage from './pages/PIIAnalyticsPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/scan" element={<ScanDocument />} />
              <Route path="/scan/results" element={<ScanResults />} />
              <Route path="/scan/review/:documentId" element={<PiiReviewPage />} />
              <Route path="/scan/review" element={<PiiReviewPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/documents/:documentId/history" element={<DocumentHistoryPage />} />
              <Route path="/history/:documentId" element={<DocumentHistoryPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/reports" element={<ReportPage />} />
              <Route path="/analytics" element={<PIIAnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
