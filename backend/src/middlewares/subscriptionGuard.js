// backend/src/middlewares/subscriptionGuard.js
module.exports = function subscriptionGuard(req, res, next) {
  // Aquí tu lógica real: ¿req.user?.subscription?.active?
  const sub = req.user?.subscription;

  if (sub?.status === 'active') return next();

  // Motivo (mapea a los de Stripe si quieres)
  const reason = sub?.status || 'inactive';

  // Rellena tenant_slug y portal_url si lo tienes a mano
  const tenant_slug = req.user?.tenant?.slug || null;
  const portal_url  = tenant_slug ? `/${tenant_slug}/portal` : '/portal';

  return res
    .status(402)
    .json({
      reason,
      tenant_id: req.user?.tenant?.id || null,
      tenant_slug,
      portal_url,
      // opcional: mensaje para logs
      message: 'Subscription required',
    });
};
