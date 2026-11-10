# Certora UI/UX Research

## References Studied
- https://beldex.io/ — Beldex brand and ecosystem
- https://bns.beldex.io/marketplace/ — BNS marketplace (name service context)
- https://github.com/Beldex-Coin/beldex-wallet-extension — wallet extension visual language
- https://linear.app/ — navigation, typography, tables, empty states, density
- https://stripe.com/ — security/infrastructure product tone, typography, call-to-action hierarchy

## Visual Identity — Certora

**Positioning:** mature security and developer-infrastructure product. Not a generic Web3 dashboard, not a token-trading interface, not a hackathon prototype.

**Color palette (design tokens):**
- Background: deep graphite (`#0b0f14` / `#121821`)
- Surface: charcoal / dark slate (`#171f28`, `#1e2733`)
- Primary accent: restrained Beldex-inspired gold/amber (`#d9a43c`) — used sparingly for primary actions and active states
- Success: muted green (`#4a9e6b`)
- Warning: amber (`#e8a33d`)
- Critical: controlled red (`#c95252`)
- Text: high-contrast off-white (`#e8eef4`)
- Secondary text: muted grey (`#93a3b2`)
- Borders: subtle (`#2a3340`)

**Typography:** Geist (headings + UI), Inter (body / addresses). Monospace for addresses (Geist Mono / JetBrains Mono).

**Icons:** Lucide React, used consistently (one icon style, 16–20px).

**Radii / spacing / elevation:** consistent small radii (6–8px), 4px spacing grid, subtle shadow elevation for surfaces, no exaggerated gradients, no excessive glass effects, no large decorative graphics, no artificial dashboard statistics.

**Status semantics (never color-only):**
- Success: green + icon + "Matches your previously approved recipient" text
- Warning: amber + icon + "Destination changed since approval" text
- Critical: red + icon + clear actionable message
- Neutral/info: slate + icon

## Layout
- Desktop: ~240–260px sidebar, compact top header, page title, persistent network/testnet status, main content with max-width, consistent spacing.
- Mobile: collapsible sidebar navigation, compact header, responsive cards/tables, usable dialogs, readable addresses, no horizontal overflow.

## Navigation
1. Overview
2. Resolve BNS
3. Protected Recipients
4. Activity
5. Settings

No navigation for unimplemented future features.

## Component System
Reusable primitives separated from product features:
- Buttons (primary, secondary, ghost, danger)
- Inputs
- Cards
- Tables
- Dialogs / confirmation dialogs
- Toasts
- Loading spinners / skeletons
- Error states
- Empty states
- Address copy button with feedback
- Testnet indicator badge
- Wallet connection status

## Accessibility
- Keyboard navigation throughout
- Visible focus states
- Sufficient text and status contrast
- ARIA labels on interactive controls
- Form error announcements
- No color-only status communication

## Security Warning Design
Resolver trust limitation disclosed on resolution and details screens:
- "Independent on-chain verification unavailable" — plain-English, non-alarmist
- Presented alongside the full resolved address
- Never implies safety; always framed as recipient-approval evidence only
