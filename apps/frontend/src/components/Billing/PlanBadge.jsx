import useSubscription from '../../hooks/useSubscription';

export default function PlanBadge() {
  const { loading, entitlements } = useSubscription();
  
  if (loading) return <span className="h-6 w-20 bg-zinc-100 animate-pulse rounded-md inline-block" />;

  const planId = entitlements?.plan_id || 'free';
  const remaining = entitlements?.trial?.remaining || 0;
  const isVip = entitlements?.features?.unlimitedPackages && planId === 'free'; // Para cuentas blindadas (admin)

  if (planId === 'pro') {
    return (
      <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-zinc-950 text-white shadow-sm" title="Plan PRO Activo">
        PRO
      </span>
    );
  }

  if (isVip) {
    return (
      <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-amber-50 text-amber-700 border border-amber-200 shadow-sm" title="Cuenta VIP Ilimitada">
        LIFETIME
      </span>
    );
  }

  return (
    <span 
      className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200 shadow-sm" 
      title={`Te quedan ${remaining} paquetes este mes`}
    >
      FREEMIUM ({remaining})
    </span>
  );
}