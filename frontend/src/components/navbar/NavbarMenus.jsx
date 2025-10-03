// src/components/navbar/NavbarMenus.jsx
import { Link } from 'react-router-dom'

export default function NavbarMenus({ handleHashClick }) {
  return (
    <div className="navbar__right">
      <ul className="navbar__menus">
        <li className="nav-item">
        </li>

        {/* 🔒 Menú de precios ocultado temporalmente */}
        {/*
        <li className="nav-item">
          <Link
            to="/#pricing"
            className="nav-link nav-link--solo"
            onClick={(e) => handleHashClick(e, '#pricing')}
          >
            <span>Precios</span>
          </Link>
        </li>
        */}
      </ul>
    </div>
  )
}
