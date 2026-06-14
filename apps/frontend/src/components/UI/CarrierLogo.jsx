import { useEffect, useState } from "react";

const FALLBACK_COMPANIAS = [
  { nombre: 'Amazon Logistics', domain: 'amazon.com' },
  { nombre: 'ASM', domain: 'gls-spain.es' },
  { nombre: 'Boyacá', domain: 'boyaca.es' },
  { nombre: 'Celeritas', domain: 'celeritas.es' },
  { nombre: 'Chronopost', domain: 'chronopost.fr' },
  { nombre: 'Correos', domain: 'correos.es' },
  { nombre: 'Correos Express', domain: 'correosexpress.com' },
  { nombre: 'CTT Express', domain: 'cttexpress.com' },
  { nombre: 'Deliveroo', domain: 'deliveroo.es' },
  { nombre: 'Deliveroo Logistics', domain: 'deliveroologistics.es' },
  { nombre: 'DHL', domain: 'dhl.com' },
  { nombre: 'DPD', domain: 'dpd.com' },
  { nombre: 'EcoScooting', domain: 'ecoscooting.com' },
  { nombre: 'Envialia', domain: 'envialia.com' },
  { nombre: 'FedEx', domain: 'fedex.com' },
  { nombre: 'Genei', domain: 'genei.es' },
  { nombre: 'GLS', domain: 'gls-spain.es' },
  { nombre: 'Halcourier', domain: 'gls-spain.es' },
  { nombre: 'InPost', domain: 'inpost.es' },
  { nombre: 'Mondial Relay', domain: 'mondialrelay.es' },
  { nombre: 'MRW', domain: 'mrw.es' },
  { nombre: 'Nacex', domain: 'nacex.es' },
  { nombre: 'Paack', domain: 'paack.co' },
  { nombre: 'Packlink', domain: 'packlink.es' },
  { nombre: 'Paq24', domain: 'correosexpress.com' },
  { nombre: 'Paq25', domain: 'paq25.com' },
  { nombre: 'Punto Pack', domain: 'puntopack.es' },
  { nombre: 'Redyser', domain: 'redyser.com' },
  { nombre: 'Relais Colis', domain: 'relaiscolis.com' },
  { nombre: 'Sending', domain: 'sending.es' },
  { nombre: 'Servientrega', domain: 'servientrega.com' },
  { nombre: 'Servienvia', domain: 'servienvia.com' },
  { nombre: 'SEUR', domain: 'seur.com' },
  { nombre: 'Shipius', domain: 'shipius.com' },
  { nombre: 'Shipus', domain: 'shipus.com' },
  { nombre: 'Stuart', domain: 'stuart.com' },
  { nombre: 'Tipsa', domain: 'tipsa-entregas.com' },
  { nombre: 'TNT', domain: 'tnt.com' },
  { nombre: 'Tourline Express', domain: 'cttexpress.com' },
  { nombre: 'Uber Direct', domain: 'uber.com' },
  { nombre: 'UPS', domain: 'ups.com' },
  { nombre: 'Vinted Go', domain: 'vinted.com' },
  { nombre: 'Zeleris', domain: 'zeleris.com' }
];

export function getCarrierLogo(name) {
  if (!name) return null;
  const normalizedName = String(name).trim().toLowerCase();
  const found = FALLBACK_COMPANIAS.find(o => String(o.nombre).trim().toLowerCase() === normalizedName);
  if (!found || !found.domain) return null;
  return `/carriers/${found.domain}.png`;
}

export function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

export function ImageFallback({ src, fallbackText, containerClassName, imgClassName, fallbackClassName }) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (error || !src) {
    return (
      <div className={`${containerClassName} ${fallbackClassName} flex items-center justify-center`}>
        {fallbackText}
      </div>
    );
  }

  return (
    <div className={`${containerClassName} flex items-center justify-center`}>
      <img
        key={src}
        src={src}
        alt=""
        className={imgClassName}
        onError={() => setError(true)}
      />
    </div>
  );
}
