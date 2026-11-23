# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Quotes are read through `@vtex/api`'s MasterData client instead of direct REST calls, still with the Admin user's token (review against https://github.com/vtex/skills, `vtex-io-masterdata`). The outbound rule now names that client's host, `api.vtex.com`.
- Calls to VTEX time out after 3 seconds instead of 8, with up to two retries; all of them only read (`vtex-io-client-integration`, `vtex-io-application-performance`).

## [0.2.0] - 2026-11-18

### Changed

- The page is about one screen high: the count tiles are now tabs, and only the selected panel shows.
- Every panel lists 10 rows per page, with a choice of 10, 25 or 50 rows, and covers its whole list (up to 500 items) instead of the 50 oldest.
- Problem orders and quotes show their counts as tags: workflow errors, retrying and no change; waiting for the seller and the buyer.
- The read-only note moved to the bottom of the page.

## [0.1.1] - 2026-11-18

### Fixed

- Quote and credit hold amounts always show two decimals; some older quotes store fractional amounts that showed as "0.042".
- A quote with an empty name shows its ID instead of a blank cell.

### Changed

- The credit holds panel describes the missing credit limit check in plain words instead of naming an internal task code.

## [0.1.0] - 2026-11-18

### Added

- B2B control center: one read-only Admin page, under Apps → Installed Apps, for everything in B2B that is waiting on someone or has gone wrong.
- Panels for B2B onboarding applications in review, pending organization requests, B2B orders in a workflow error or open with no change for too long, quotes waiting for the seller or the buyer, and credit holds (empty until B2B-041).
- Count tiles, an organization filter, a Refresh button, and a link from every row to the screen where it's handled.
- App setting "Waiting too long after (hours)", default 24.
