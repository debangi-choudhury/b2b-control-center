import type {
  ClientsConfig,
  ParamsContext,
  RecorderState,
  ServiceContext,
} from '@vtex/api'
import { Service } from '@vtex/api'

import { Clients } from './clients'
import {
  controlCenterOrganizations,
  controlCenterSettings,
  creditHoldsPanel,
  organizationRequestsPanel,
  problemOrdersPanel,
  quotesPanel,
} from './resolvers/panels'

const clients: ClientsConfig<Clients> = {
  implementation: Clients,
  options: {
    // Read-only calls, so one retry is safe. Every source has a timeout, so
    // a slow one fails its own panel instead of holding the page.
    default: {
      retries: 1,
      timeout: 8000,
    },
  },
}

declare global {
  type Context = ServiceContext<Clients>
}

export default new Service<Clients, RecorderState, ParamsContext>({
  clients,
  graphql: {
    resolvers: {
      Query: {
        controlCenterOrganizations,
        controlCenterSettings,
        organizationRequestsPanel,
        problemOrdersPanel,
        quotesPanel,
        creditHoldsPanel,
      },
    },
  },
})
