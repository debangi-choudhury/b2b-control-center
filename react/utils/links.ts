/**
 * Where each row is handled. Admin pages outside this app open in the whole
 * window (target _top), because IO Admin pages can run inside a frame.
 */

/** The Admin shell's path, not the frame's /admin/app/..., so the menu stays */
export const onboardingLink = (id: string) =>
  `/admin/b2b-onboarding/${encodeURIComponent(id)}`

export const orderLink = (orderId: string) =>
  `/admin/orders/${encodeURIComponent(orderId)}`

/**
 * B2B Organizations 3.x Admin: the Organization Requests tab, where requests
 * are approved or declined (as linked from the Admin menu)
 */
export const organizationRequestsLink = () =>
  '/admin/b2b-organizations/organizations#/requests'

/**
 * Quotes have no Admin screen in VTEX B2B; sales users handle them in the
 * store, on the B2B Quotes page.
 */
export const quoteLink = (id: string) => `/b2b-quotes/${encodeURIComponent(id)}`
