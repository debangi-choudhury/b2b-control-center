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
    // Read-only calls, so retrying is safe. Every source has a short timeout
    // (the vtex-io-client-integration skill suggests 1 to 3 seconds), so a
    // slow one fails its own panel instead of holding the page.
    default: {
      retries: 2,
      timeout: 3000,
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
