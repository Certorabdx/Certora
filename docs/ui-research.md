# Certora UI/UX Research

## References Studied
- https://beldex.io/ — Beldex brand and ecosystem
- https://bns.beldex.io/marketplace/ — BNS marketplace (name service context)
- https://github.com/Beldex-Coin/beldex-wallet-extension — wallet extension visual language
- https://linear.app/ — navigation, typography, tables, empty states, density
- https://stripe.com/ — security/infrastructure product tone, typography, call-to-action hierarchy

## Visual Identity — Certora

**Positioning:** mature security and developer-infrastructure product. Not a generic Web3 dashboard, not a token-trading interface, not a hackathon prototype.

**Color palette (implemented tokens):**
- Canvas / ink: `#08090B` / `#0A0C0F`
- Surface / raised: `#101318` / `#151A21`
- Borders: `#22262E` (default) / `#2E343E` (strong)
- Primary text: warm off-white `#F3F0E8`
- Secondary / muted text: `#A9A69D` / `#77746C`
- Accent: amber `#E7B36A` (soft `#F1C98F`, deep `#B9873F`), used sparingly for primary actions and active states
- Success: `#7FC8A0`
- Warning: `#E7A75E`
- Critical: `#E27C6D`

**Typography:** Instrument Serif for display headlines, Geist for UI text, Geist Mono for addresses and fingerprints.

**Icons:** Lucide React, one style, 16–20px.

**Radii / spacing / elevation:** 7–22px radii, 4px spacing grid, restrained inset card shadows and popover elevation. No decorative gradients, glass effects, fake statistics, or ornamental charts.

**Status semantics (never color-only):**
- Success: green + icon + "Matches your approved recipient"
- Warning: amber + icon + "Destination changed since approval"
- Critical: red + icon + clear actionable message
- Neutral/info: slate + icon

## Layout
- Desktop: 248px fixed sidebar, compact top header, page title, persistent network/testnet status, centered content column with consistent spacing.
- Mobile: slide-in drawer navigation, compact header, responsive cards and dialogs, readable addresses, no horizontal overflow.

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
- Cards and list rows
- Dialogs / confirmation dialogs
- Toasts
- Loading spinners
- Error states
- Empty states
- Address display and copy actions with feedback
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
