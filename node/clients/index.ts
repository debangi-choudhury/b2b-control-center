import { IOClients } from '@vtex/api'

import { B2BOrganizations } from './b2bOrganizations'
import { Oms } from './oms'
import { QuotesMasterData } from './quotes'

export class Clients extends IOClients {
  public get b2bOrganizations() {
    return this.getOrSet('b2bOrganizations', B2BOrganizations)
  }

  public get oms() {
    return this.getOrSet('oms', Oms)
  }

  public get quotes() {
    return this.getOrSet('quotes', QuotesMasterData)
  }
}
