# B2B Control Center

One Admin screen for everything in B2B that is waiting on someone or has gone wrong. VTEX spreads this work across Organizations, Organization Requests, Orders and Quotes; this app brings it together and links each row to the screen where it's handled.

This is a Logixal demo app (B2B-C15). It only reads: it never approves, retries or changes anything.

## Panels

| Panel | Shows | Source |
| --- | --- | --- |
| Onboarding applications | B2B-C11 applications in review, by stage, oldest waiting first | `logixalpartnerus.b2b-onboarding` GraphQL |
| Organization requests | VTEX's native requests still pending | `vtex.b2b-organizations-graphql` `getOrganizationRequests` |
| Problem orders | B2B orders in a workflow error or retry, or open and unchanged for too long | OMS order list, filtered by organization |
| Quotes | Quotes waiting for the seller (`pending`, `revised`) or the buyer (`ready`, not expired) | B2B Quotes' Master Data entity `quotes` |
| Credit holds | Orders held for going over the customer's credit limit. Empty until credit limit checking is set up | — |

The onboarding panel is read by the Admin page itself, with the admin's session, as B2B-C11's review queue does: VTEX IO only lets one app call another app's GraphQL when the target declares a policy, and `b2b-onboarding` declares none. The other panels come from this app's GraphQL queries, one per panel, so a failing source only blanks its own panel.

Every source is called with the Admin user's own token, so each one applies its own permissions. The GraphQL queries also require the License Manager right Buyer Organization View (product 97), the same as VTEX's B2B Organizations screens.

## Settings

**Waiting too long after (hours)**, default 24. An item counts as waiting too long when nothing has happened to it for that long.

## Extension points

Logixal's requirement also names customer synchronization, contract errors and integration exceptions. They need an ERP or other integration as their source, which this demo doesn't have. Each would be one more panel query with the same shape: `{ total, items, truncated }`.
