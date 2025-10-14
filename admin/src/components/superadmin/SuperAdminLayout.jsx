import { Outlet } from 'react-router-dom';
import SuperAdminNavbar from './SuperAdminNavbar.jsx';

export default function SuperAdminLayout() {
  return (
    <div className="layout">
      <SuperAdminNavbar />
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
