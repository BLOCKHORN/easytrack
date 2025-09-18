// src/components/navbar/NavbarBrand.jsx
import { Link } from 'react-router-dom'

export default function NavbarBrand() {
  return (
    <Link to="/" className="navbar__brand" aria-label="Inicio">
      <span className="brand-wordmark">EASYTRACK</span>
    </Link>
  )
}
