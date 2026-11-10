# Certora Implementation Plan

## Project
Certora — Beldex Testnet BNS Resolution and Recipient Protection MVP

## Phases & Acceptance Criteria

| Phase | Focus | Exit Criteria |
|-------|-------|---------------|
| 0 | Repository audit | docs/repository-audit.md |
| 1 | Beldex technical research | docs/technical-research.md, docs/architecture.md |
| 2 | UI/UX research & design system | docs/ui-research.md |
| 3 | Application foundation | Responsive shell, routing, layout, design tokens |
| 4 | Beldex wallet integration | Wallet connects; Mainnet blocked (real Testnet connection verified) |
| 5 | BNS resolution engine | Fresh resolution + full destination display (real negative lookups verified; positive resolution pending) |
| 6 | Recipient fingerprinting & pinning | IndexedDB persistence; pin survives reload |
| 7 | Destination-change detection | DESTINATION_CHANGED status; explicit reapproval |
| 8 | Complete product interface | All 6 screens implemented, responsive |
| 9 | Real testnet experiment | Full CONNECT → RESOLVE → PIN → CHANGE → DETECT → REAPPROVE (partial: real connection, 8/8 dry-run validation, 7/7 fresh negative lookups; full cycle outstanding) |
| 10 | Testing & security review | Unit + E2E tests pass; threat model written |
| 11 | Final QA | typecheck, lint, test, build all pass |
| 12 | Documentation polish & publication | Docs audited; repository published on `main` |

## Checklist Legend

- `[x]` — implemented and verified by typecheck, unit tests, mocked E2E, build, or direct code/UI review.
- Unchecked items require an owner-controlled, funded Testnet BNS name or were intentionally not performed.
- **Checked does not mean live-tested.** See `docs/testnet-validation.md`: partial live evidence exists (real extension connection, 8/8 dry-run validation, 7/7 fresh negative lookups), but no positive resolution or change-detection cycle was performed.

## Checklist (Part 7)

### A. Repository and research
- [x] Existing Certora repository inspected (empty/greenfield)
- [x] Existing work preserved (none present)
- [x] Current package manager identified (npm)
- [x] Official Beldex SDK researched (@bdxi/web3js v1.0.2)
- [x] Actual SDK version confirmed (1.0.2)
- [x] Wallet provider implementation researched (detectProvider, BeldexWeb3)
- [x] Testnet network requirements confirmed from SDK types
- [x] Actual BNS resolution response shape inspected ({ name, address, verified: false })
- [x] Wallet RPC requirements researched
- [x] Resolver trust limitations documented (verified: false always)
- [x] UI references researched
- [x] Technical research document created

### B. Architecture
- [x] Implementation plan created
- [x] Application architecture documented
- [x] Beldex adapter separated from core
- [x] Recipient data model defined
- [x] Local storage strategy implemented
- [x] Status and error models defined
- [x] Network restrictions documented

### C. Wallet integration
- [x] Wallet provider detected (SDK detectProvider, mock-tested)
- [x] Connect action implemented
- [x] Wallet approval/rejection handled
- [x] Connected account displayed
- [x] Testnet confirmed in state/UI
- [x] Mainnet rejected (logic and UI)
- [x] Disconnect handled
- [x] Account changes handled
- [x] Network changes handled
- [x] Provider errors handled

### D. BNS resolution
- [x] BNS input validation implemented
- [x] Actual Beldex resolver connected to a live wallet (real extension, Testnet; 2026-11-10)
- [x] Real Testnet negative lookup and failure handling verified (7/7 fresh `bdx_resolveBns` calls; no pin created)
- [ ] Real testnet name resolved to an address (real lookups were negative: `name not registered`)
- [x] Full destination displayed
- [x] Resolution response validated
- [x] Resolution duration recorded
- [x] Verification limitation disclosed
- [x] Invalid names handled
- [x] Resolver failures handled

### E. Recipient protection
- [x] Fingerprint generation implemented
- [x] Exact destination comparison implemented
- [x] Recipient pinning implemented
- [x] Explicit initial approval implemented
- [x] IndexedDB persistence implemented
- [x] Account isolation implemented
- [x] Network isolation implemented
- [x] Fresh resolution on recheck implemented
- [x] Matching destination status implemented
- [x] Changed destination status implemented
- [x] Old and new destination comparison implemented
- [x] Explicit reapproval implemented (updates pin in place)
- [x] Automatic pin replacement prevented
- [x] Removal and data clearing implemented

### F. Application interface
- [x] Overview screen implemented
- [x] Resolver screen implemented
- [x] Protected recipients screen implemented
- [x] Recipient details screen implemented
- [x] Activity screen implemented
- [x] Settings screen implemented
- [x] Wallet connection UI implemented
- [x] Testnet indicator implemented (desktop and mobile)
- [x] Security warning UI implemented
- [x] Confirmation dialogs implemented
- [x] Empty states implemented
- [x] Loading states implemented
- [x] Error states implemented
- [x] Copy actions implemented
- [x] Responsive desktop UI completed
- [x] Responsive mobile UI completed
- [x] Accessibility reviewed (labels, dialog roles, Escape-to-close, keyboard focus styles; no formal WCAG audit)
- [x] No dead buttons or fake actions (notification placeholder removed)

### G. Actual testnet demonstration
- [x] Owner-controlled testnet wallet prepared (temporary Testnet account; public address recorded, balance 0 tBDX)
- [ ] Testnet recipient A available
- [ ] Testnet recipient B available
- [ ] Test BNS name registered or prepared
- [ ] Initial mapping confirmed
- [ ] Certora resolves Recipient A
- [ ] Recipient A pinned
- [ ] Pin survives page reload
- [ ] Actual testnet mapping update completed
- [ ] Update transaction hash recorded
- [ ] Fresh resolution returns Recipient B
- [ ] Certora identifies DESTINATION_CHANGED
- [ ] Old pin remains unchanged
- [ ] User explicitly approves Recipient B
- [ ] Pin updates successfully
- [ ] Subsequent resolution returns MATCHES_PIN
- [x] Real testnet validation documented (partial evidence documented; full cycle outstanding)

### H. Testing and quality
- [x] Unit tests implemented
- [x] Core comparison tests pass (9/9)
- [x] Storage tests pass (7/7)
- [ ] Wallet adapter unit tests (none written; resolver validation tests cover 8 cases)
- [ ] Dedicated integration test suite (workflow covered by mocked E2E instead)
- [x] End-to-end mock-provider tests pass (3/3)
- [x] Real Testnet read-only dry run pass (8/8 validation, 7/7 negative lookups)
- [ ] Full real testnet change-detection validation performed (partial only: live connection, validation matrix, negative BNS lookups)
- [x] TypeScript checks pass
- [x] Lint checks pass (0 warnings)
- [x] Production build passes
- [x] Browser console reviewed (only React Router future-flag warnings)
- [x] No unresolved critical runtime errors
- [x] Mobile responsiveness reviewed (layout implemented; no physical-device testing)
- [x] Security review completed (design-level threat model; not an audit)

### I. Documentation and delivery
- [x] README completed
- [x] Architecture documented
- [x] UI research documented
- [x] Threat model documented
- [x] Technical research documented
- [x] Implementation plan updated
- [x] Testnet runbook completed
- [x] Testnet evidence recorded (partial real evidence in `docs/testnet-validation.md`; full cycle outstanding)
- [x] Known limitations documented
- [x] Installation instructions verified
- [x] Local development instructions verified
- [x] Final completion report produced

## Notes
- Committed and pushed to `https://github.com/Certorabdx/Certora` (`main`); no deployment was performed.
- No real fund movements, BNS registration, mapping update, or transactions occurred.
- No fabricated blockchain data anywhere in the application.
- Mock mode is E2E/development only and is never live Testnet evidence.
- Full real Testnet change-detection validation remains outstanding; see `docs/testnet-runbook.md` and `docs/testnet-validation.md`.
