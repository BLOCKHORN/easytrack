import { useSubscription } from '../../hooks/useSubscription';

export default function PlanBadge() {
  const { loading, entitlements } = useSubscription();
  if (loading) return <span className="h-6 w-24 bg-zinc-100 animate-pulse rounded-md inline-block" />;

  const paid = !!entitlements?.subscriptionActive;
  const trial = !!entitlements?.trial?.active;

  if (paid) {
    const cad = entitlements?.plan?.cadence || 'monthly';
    const isAnnual = cad === 'annual';
    
    return (
      <span 
        className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-brand-50 text-brand-700 border border-brand-200 shadow-sm"
        title={`Plan Premium ${isAnnual ? 'Anual' : 'Mensual'} Activo`}
      >
        PREMIUM {isAnnual ? 'ANUAL' : 'MENSUAL'}
      </span>
    );
  }

  if (trial && entitlements?.trial?.quota_ok) {
    const restantes = entitlements.trial.remaining || 0;
    return (
      <span 
        className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm"
        title={`Te quedan ${restantes} paquetes de prueba`}
      >
        PRUEBA ({restantes} RESTANTES)
      </span>
    );
  }

  return (
    <span 
      className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-red-50 text-red-600 border border-red-200 shadow-sm"
      title="Sin plan activo o límite superado"
    >
      SIN PLAN ACTIVO
    </span>
  );
}