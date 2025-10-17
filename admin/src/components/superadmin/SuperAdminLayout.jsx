import { Outlet } from 'react-router-dom';
import SuperAdminNavbar from './SuperAdminNavbar.jsx';

export default function SuperAdminLayout() {
  return (
    <div className="layout">
      <SuperAdminNavbar />
      {/* container fluido, seguro para notch y sin desbordes */}
      <main
        className="container"
        role="main"
        aria-live="polite"
        style={{
          maxWidth: 'min(1200px, 100%)',
          paddingLeft: 'clamp(12px, 4vw, 20px)',
          paddingRight: 'clamp(12px, 4vw, 20px)',
          paddingTop: '12px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
          overflowX: 'hidden',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
