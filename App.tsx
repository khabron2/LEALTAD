import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { NotificationsPage } from './pages/Notifications';
import { InfractionsPage } from './pages/Infractions';
import { InspectionsPage } from './pages/Inspections';
import { DashboardPage } from './pages/Dashboard';

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<NotificationsPage />} />
          <Route path="/actas" element={<InfractionsPage />} />
          <Route path="/inspecciones" element={<InspectionsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}