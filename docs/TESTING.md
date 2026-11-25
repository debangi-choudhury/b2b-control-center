# Testing B2B Control Center

Last full test: 2026-11-24, versions 0.2.1 and 0.2.2, in the `b2btest` workspace.

## Review against VTEX's skills

Reviewed against the VTEX IO track of https://github.com/vtex/skills. Version 0.2.1 already included fixes from an earlier review (quotes through `@vtex/api`'s MasterData client, 3-second timeouts).

| Area | Result |
| --- | --- |
| Requests to VTEX run as the Admin user who opened the page (`adminUserAuthToken`), never the app token, so each source applies that user's permissions | Pass |
| Client types: `JanusClient` for orders, `MasterData` for quotes, `AppGraphQLClient` for B2B Organizations | Pass |
| GraphQL: `@auth` with a License Manager resource and `@cacheControl(scope: PRIVATE)` on every query; no mutations (read-only) | Pass |
| Each panel loads on its own, so one failing source doesn't break the page | Pass |
| App settings: one non-sensitive setting, not public | Pass |
| Admin UI: VTEX Styleguide, `admin/` messages, no logging to the console | Pass |
| Accessibility: the pager's previous and next buttons have no accessible name | Known gap: the buttons come from VTEX Styleguide's `Pagination`, which doesn't take labels |

## Automated checks

```bash
yarn lint                        # 0 errors, 6 warnings
yarn test                        # 87 tests: server, panel resolvers, clients and every screen
yarn test:coverage               # 100% of lines, 96% of branches; fails under 80% (70% for branches)
cd react && npx tsc --noEmit     # no errors
cd node && npx tsc --noEmit      # no errors
cd node/__tests__ && npx tsc --noEmit -p .   # no errors (the tests)
```

## What was tested, and how

All in `b2btest` on 2026-11-24, logged in to Admin. The page only reads, so testing creates no data.

1. Opened `/admin/app/b2b-control-center` and waited for every count to load.
2. Opened each tab and checked its rows, paging and links.
3. Chose an organization in the filter, then set it back to All organizations.
4. Went to the next page of problem orders.
5. Clicked **Refresh** a minute after loading.
6. Followed the link from the onboarding row.
7. Checked the page for task codes, before and after installing 0.2.2.

### Results

| Check | Result |
| --- | --- |
| Counts | Applications in review 1, organization requests 23, problem orders 221, quotes waiting 37, credit holds "Credit check not set up yet" |
| Applications tab | `APP-N7MUG7CX` at Final approval, 11 days, marked too long; links to `/admin/b2b-onboarding/APP-N7MUG7CX` in the same window |
| Organization requests tab | 10 of 23, with paging; links to B2B Organizations' Requests tab |
| Problem orders tab | 10 of 221, split into workflow errors 0, retrying 0, no change 221; each order links to `/admin/orders/<id>` |
| Quotes tab | 10 of 37, with paging; each quote opens in the store in a new tab |
| Credit holds tab | Empty, with a message explaining that credit checking isn't set up |
| Organization filter (66 options) | Problem orders and quotes change (0 and 22 for one organization); applications and organization requests don't, by design |
| Paging | Next page shows 11 to 20 of 221 with different rows |
| Refresh | "Updated" time moves forward and counts reload |
| Onboarding link | Opens the application inside the Admin, with the menu |
| Task codes on the page | None |

### Not tested

- The page's behavior when a source fails (only covered by unit tests).
- Changing the "waiting too long" setting.
- Orders in a workflow error or retrying: the account has none right now.

## Manual test steps

Use https://b2btest--logixalpartnerus.myvtex.com/admin in Chrome, logged in as an Admin user with permission to view buyer organizations.

1. **Open the dashboard**
   1. Go to **Apps → Installed Apps → B2B control center**, or open `/admin/app/b2b-control-center`.
   2. Wait until all five counts replace "…". Check that none shows an error.
2. **Each tab**
   1. Click each count tile. Check that the table below changes and that the tile shows as selected.
   2. On every tab with rows, click a row's link and check that it opens the right screen: the onboarding application, the organization request list, the order, or the quote in the store.
   3. On Credit holds, check that it explains why it's empty.
3. **Paging**
   1. On a tab with more than 10 rows, use the arrows under the table. Check that "11 - 20 of …" appears and the rows change.
4. **Organization filter**
   1. Choose an organization with B2B orders or quotes. Check that problem orders and quotes change.
   2. Check that applications and organization requests stay the same: they come before an organization exists.
   3. Set it back to **All organizations**.
5. **Refresh**
   1. Wait a minute, click **Refresh**, and check that the "Updated" time changes.
6. **Waiting too long**
   1. In **Apps → Installed Apps → B2B control center → Settings**, change the number of hours.
   2. Reload the dashboard and check that the "waiting too long" counts change.

If something fails, note the tab, the organization filter and any message on screen, and check the browser console.
