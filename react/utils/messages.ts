import { defineMessages } from 'react-intl'

// Every message is declared here so the react builder can extract it.
export const messages = defineMessages({
  navTitle: {
    id: 'admin/b2b-control-center.navigation.title',
    defaultMessage: 'B2B control center',
  },
  title: {
    id: 'admin/b2b-control-center.title',
    defaultMessage: 'B2B control center',
  },
  subtitle: {
    id: 'admin/b2b-control-center.subtitle',
    defaultMessage:
      "Everything in B2B that is waiting on someone or has gone wrong. Each row opens the screen where it's handled.",
  },
  refresh: {
    id: 'admin/b2b-control-center.refresh',
    defaultMessage: 'Refresh',
  },
  updatedAt: {
    id: 'admin/b2b-control-center.updated-at',
    defaultMessage: 'Updated {time}',
  },
  organization: {
    id: 'admin/b2b-control-center.organization',
    defaultMessage: 'Organization',
  },
  allOrganizations: {
    id: 'admin/b2b-control-center.organization.all',
    defaultMessage: 'All organizations',
  },
  thresholdNote: {
    id: 'admin/b2b-control-center.threshold-note',
    defaultMessage:
      'Waiting too long means nothing has happened for {hours, plural, one {# hour} other {# hours}}. Change it in the app settings.',
  },
  readOnlyNote: {
    id: 'admin/b2b-control-center.read-only-note',
    defaultMessage:
      'Read only: nothing is approved or changed here. Demo app by Logixal.',
  },

  tileOnboarding: {
    id: 'admin/b2b-control-center.tile.onboarding',
    defaultMessage: 'Applications in review',
  },
  tileRequests: {
    id: 'admin/b2b-control-center.tile.requests',
    defaultMessage: 'Organization requests',
  },
  tileOrders: {
    id: 'admin/b2b-control-center.tile.orders',
    defaultMessage: 'Problem orders',
  },
  tileQuotes: {
    id: 'admin/b2b-control-center.tile.quotes',
    defaultMessage: 'Quotes waiting',
  },
  tileCredit: {
    id: 'admin/b2b-control-center.tile.credit',
    defaultMessage: 'Credit holds',
  },
  tileStale: {
    id: 'admin/b2b-control-center.tile.stale',
    defaultMessage: '{count} waiting too long',
  },
  tileNoneStale: {
    id: 'admin/b2b-control-center.tile.none-stale',
    defaultMessage: 'None waiting too long',
  },
  tileError: {
    id: 'admin/b2b-control-center.tile.error',
    defaultMessage: "Couldn't load",
  },
  tileComingSoon: {
    id: 'admin/b2b-control-center.tile.coming-soon',
    defaultMessage: 'Credit check not set up yet',
  },

  onboardingTitle: {
    id: 'admin/b2b-control-center.onboarding.title',
    defaultMessage: 'Onboarding applications',
  },
  onboardingSubtitle: {
    id: 'admin/b2b-control-center.onboarding.subtitle',
    defaultMessage:
      'Business applications from B2B onboarding that are still in review.',
  },
  requestsTitle: {
    id: 'admin/b2b-control-center.requests.title',
    defaultMessage: 'Organization requests',
  },
  requestsSubtitle: {
    id: 'admin/b2b-control-center.requests.subtitle',
    defaultMessage:
      'Requests in VTEX B2B Organizations that are still pending. Approve or decline them in B2B Organizations.',
  },
  ordersTitle: {
    id: 'admin/b2b-control-center.orders.title',
    defaultMessage: 'Problem orders',
  },
  ordersSubtitle: {
    id: 'admin/b2b-control-center.orders.subtitle',
    defaultMessage:
      'Open B2B orders in a workflow error or retry, or with no change for too long.',
  },
  ordersChecked: {
    id: 'admin/b2b-control-center.orders.checked',
    defaultMessage:
      '{count, plural, one {# organization} other {# organizations}} checked. Workflow errors: {inError}. Retrying: {inRetry}. No change for too long: {stale}.',
  },
  quotesTitle: {
    id: 'admin/b2b-control-center.quotes.title',
    defaultMessage: 'Quotes',
  },
  quotesSubtitle: {
    id: 'admin/b2b-control-center.quotes.subtitle',
    defaultMessage:
      'Quotes waiting for the seller to answer, or for the buyer to place the order before they expire.',
  },
  quotesSplit: {
    id: 'admin/b2b-control-center.quotes.split',
    defaultMessage:
      'Waiting for the seller: {seller}. Waiting for the buyer: {buyer}.',
  },
  quotesStoreNote: {
    id: 'admin/b2b-control-center.quotes.store-note',
    defaultMessage:
      'VTEX B2B has no Admin screen for quotes. Sales users answer them in the store.',
  },
  creditTitle: {
    id: 'admin/b2b-control-center.credit.title',
    defaultMessage: 'Credit holds',
  },
  creditSubtitle: {
    id: 'admin/b2b-control-center.credit.subtitle',
    defaultMessage:
      'Orders held because the customer is over their credit limit.',
  },
  creditUnavailable: {
    id: 'admin/b2b-control-center.credit.unavailable',
    defaultMessage:
      "Credit limit checking isn't set up yet. Once orders are checked against each customer's credit limit, orders held for going over it will be listed here.",
  },
  allOrganizationsNote: {
    id: 'admin/b2b-control-center.all-organizations-note',
    defaultMessage:
      'Not filtered by organization: these come before the organization exists.',
  },

  empty: {
    id: 'admin/b2b-control-center.empty',
    defaultMessage: 'Nothing waiting.',
  },
  loadError: {
    id: 'admin/b2b-control-center.load-error',
    defaultMessage: "Couldn't load this panel. {message}",
  },
  showing: {
    id: 'admin/b2b-control-center.showing',
    defaultMessage: 'Showing the {shown} oldest of {total}.',
  },
  truncated: {
    id: 'admin/b2b-control-center.truncated',
    defaultMessage: 'Stopped reading early, so the counts may be low.',
  },
  byStage: {
    id: 'admin/b2b-control-center.by-stage',
    defaultMessage: '{label}: {count}',
  },

  colReference: {
    id: 'admin/b2b-control-center.col.reference',
    defaultMessage: 'Reference',
  },
  colCompany: {
    id: 'admin/b2b-control-center.col.company',
    defaultMessage: 'Company',
  },
  colStage: {
    id: 'admin/b2b-control-center.col.stage',
    defaultMessage: 'Stage',
  },
  colWaiting: {
    id: 'admin/b2b-control-center.col.waiting',
    defaultMessage: 'Waiting',
  },
  colRequested: {
    id: 'admin/b2b-control-center.col.requested',
    defaultMessage: 'Requested',
  },
  colOrder: {
    id: 'admin/b2b-control-center.col.order',
    defaultMessage: 'Order',
  },
  colOrganization: {
    id: 'admin/b2b-control-center.col.organization',
    defaultMessage: 'Organization',
  },
  colStatus: {
    id: 'admin/b2b-control-center.col.status',
    defaultMessage: 'Status',
  },
  colProblem: {
    id: 'admin/b2b-control-center.col.problem',
    defaultMessage: 'Problem',
  },
  colTotal: {
    id: 'admin/b2b-control-center.col.total',
    defaultMessage: 'Total',
  },
  colQuote: {
    id: 'admin/b2b-control-center.col.quote',
    defaultMessage: 'Quote',
  },
  colWaitingOn: {
    id: 'admin/b2b-control-center.col.waiting-on',
    defaultMessage: 'Waiting for',
  },
  colExpires: {
    id: 'admin/b2b-control-center.col.expires',
    defaultMessage: 'Expires',
  },
  colSubtotal: {
    id: 'admin/b2b-control-center.col.subtotal',
    defaultMessage: 'Subtotal',
  },

  problemWorkflowError: {
    id: 'admin/b2b-control-center.problem.workflow-error',
    defaultMessage: 'Workflow error',
  },
  problemWorkflowRetry: {
    id: 'admin/b2b-control-center.problem.workflow-retry',
    defaultMessage: 'Retrying',
  },
  problemStale: {
    id: 'admin/b2b-control-center.problem.stale',
    defaultMessage: 'No change',
  },
  waitingOnSeller: {
    id: 'admin/b2b-control-center.waiting-on.seller',
    defaultMessage: 'Seller',
  },
  waitingOnBuyer: {
    id: 'admin/b2b-control-center.waiting-on.buyer',
    defaultMessage: 'Buyer',
  },
  tooLong: {
    id: 'admin/b2b-control-center.too-long',
    defaultMessage: 'Too long',
  },
  ageDays: {
    id: 'admin/b2b-control-center.age.days',
    defaultMessage: '{count, plural, one {# day} other {# days}}',
  },
  ageHours: {
    id: 'admin/b2b-control-center.age.hours',
    defaultMessage: '{count, plural, one {# hour} other {# hours}}',
  },
  ageLessThanHour: {
    id: 'admin/b2b-control-center.age.less-than-hour',
    defaultMessage: 'Under an hour',
  },
  open: { id: 'admin/b2b-control-center.open', defaultMessage: 'Open' },
  openRequests: {
    id: 'admin/b2b-control-center.open-requests',
    defaultMessage: 'Open B2B Organizations',
  },
  openInStore: {
    id: 'admin/b2b-control-center.open-in-store',
    defaultMessage: 'Open in store',
  },
})
