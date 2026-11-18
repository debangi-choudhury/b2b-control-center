/** Shapes of b2b-control-center's GraphQL panels, as the page queries them. */

export interface OrganizationOption {
  id: string
  name: string
  status: string | null
}

export interface OrganizationRequestsPanelData {
  total: number
  stale: number
  truncated: boolean
  items: Array<{
    id: string
    name: string
    tradeName: string | null
    created: string
    isStale: boolean
  }>
}

export type OrderProblem = 'WORKFLOW_ERROR' | 'WORKFLOW_RETRY' | 'STALE'

export interface ProblemOrdersPanelData {
  total: number
  inError: number
  inRetry: number
  stale: number
  organizationsChecked: number
  truncated: boolean
  items: Array<{
    orderId: string
    organizationId: string
    organizationName: string | null
    status: string
    statusDescription: string | null
    problem: OrderProblem
    creationDate: string
    lastChange: string
    totalValue: number
    currencyCode: string | null
  }>
}

export interface QuotesPanelData {
  total: number
  waitingOnSeller: number
  waitingOnBuyer: number
  stale: number
  truncated: boolean
  items: Array<{
    id: string
    referenceName: string | null
    status: string
    waitingOn: 'SELLER' | 'BUYER'
    organizationId: string | null
    organizationName: string | null
    lastUpdate: string
    expirationDate: string | null
    subtotal: number | null
    isStale: boolean
  }>
}

export interface CreditHoldsPanelData {
  available: boolean
  total: number
  truncated: boolean
  items: Array<{
    orderId: string
    organizationId: string
    organizationName: string | null
    amount: number
    heldSince: string
    reason: string | null
    isStale: boolean
  }>
}

export interface PanelsQueryData {
  controlCenterSettings: { staleAfterHours: number } | null
  controlCenterOrganizations: OrganizationOption[] | null
  organizationRequestsPanel: OrganizationRequestsPanelData | null
  problemOrdersPanel: ProblemOrdersPanelData | null
  quotesPanel: QuotesPanelData | null
  creditHoldsPanel: CreditHoldsPanelData | null
}
