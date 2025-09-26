// frontend/src/utils/safeConfig.js
export function getCheckoutUrls() {
  const APP = window.__APP_CONFIG__ || {};
  const checkout = APP.checkoutUrls || {};
  return {
    success: checkout.success || '/billing/success',
    cancel:  checkout.cancel  || '/billing/cancel',
  };
}
