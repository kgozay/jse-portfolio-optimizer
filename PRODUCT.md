# Product

## Register

product

## Users

Finance and data science students learning Modern Portfolio Theory. They understand basic investing concepts and are comfortable with numbers, but may be new to quant methods like Efficient Frontier or Monte Carlo simulation. They use this tool exploratorily — running different ticker combinations, adjusting parameters, watching how the optimised portfolio changes. They're on a laptop, in study/research mode, focused on understanding outputs rather than executing trades.

## Product Purpose

A three-stage pipeline that takes JSE ticker inputs, fetches 3 years of price history, and returns the maximum Sharpe Ratio portfolio via Efficient Frontier modelling. Success looks like: a user understanding which JSE stocks to hold and at what weights, and why — backed by the risk/return data the tool surfaces.

## Brand Personality

Precise, legible, tool-native. The interface should feel like a well-made instrument — not a dashboard product, not a terminal emulator. Clinical clarity with enough visual character to feel intentional and crafted.

## Anti-references

- **Generic SaaS dashboards**: cream/white backgrounds, card grids, chart libraries out of the box, pastel accents — this tool should feel nothing like every other fintech product.
- **Crypto trading UIs**: neon-heavy, aggressive motion, red/green everywhere, information overload. The tool should be calm and focused, not stimulating.

## Design Principles

1. **The pipeline is the UI** — the three stages (Input → Compute → Output) are the primary navigation. Visual hierarchy must enforce this sequence, not flatten it.
2. **Numbers are the product** — every financial figure must be instantly readable, correctly formatted, and semantically colour-coded. Legibility is never sacrificed for style.
3. **Motion earns its place** — animations signal state changes (loading, completion, new results), not decoration. A user mid-task shouldn't have to wait for choreography.
4. **Earned familiarity** — the tool should disappear into the task. Affordances must be immediately recognisable; invented interaction patterns are a cost, not a feature.
5. **Calm confidence** — the aesthetic signals precision and reliability. The UI should feel like it was made by someone who understands both finance and craft.

## Accessibility & Inclusion

Best-effort accessibility. Fix obvious contrast failures and keyboard traps. No formal WCAG target level, but body text must be readable without strain. Reduced motion must be respected (already in CSS).
