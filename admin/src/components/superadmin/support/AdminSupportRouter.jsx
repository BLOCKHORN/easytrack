// src/pages/superadmin/support/AdminSupportRouter.jsx
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminTicketsTable from './AdminTicketsTable.jsx';
import AdminTicketDetail from './AdminTicketDetail.jsx';
import "../../../styles/support.scss";

export default function AdminSupportRouter() {
  useEffect(() => {
    // Al abrir la sección de soporte, marcamos como visto
    localStorage.setItem('sa_support_last_seen', String(Date.now()));
  }, []);

  return (
    <div className="admin-support">
      <Routes>
        <Route index element={<AdminTicketsTable />} />
        <Route path=":id" element={<AdminTicketDetail />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}
