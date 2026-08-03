# P1B3 — Calculator & Game Tools Audit & Improvement Report

Scope: Percentage Calculator, Tip Calculator, Polyhedral Dice Roller, and Rock Paper
Scissors vs. Computer (the `GenericUtilityWorkspace` calculator/game paths plus the
`src/lib/toolTransforms.ts` shared transform library). The four tools are the only
functional Calculator/Game tools in the catalog; no other tool or system was modified.

## 1. Audit summary

All four tools are fully client-side (zero cost, no backend dependency), preserve
SEO/prerendering, and use no external services. The audit confirmed several real
defects that were resolved:

| # | Tool | Severity | Issue (before fix) |
|---|------|----------|--------------------|
| 1 | Percent Calculator | High | Metadata advertised "percent gains, margin discounts, fraction densities, and ratios", but the UI only solved "X% of $500" with a hardcoded `$500` base and a slider clamped 1–100 (0% unreachable) plus increase/decrease claims. Advertised scope did not match the tool. |
| 2 | Percent Calculator | Medium | No validation path — `parseInt(...) \|\| 0` silently coerced malformed input to 0; no reset; the result was not announced to assistive tech. |
| 3 | Tip Calculator | High | Bill input reused the shared `sliderVal` (shared state), `parseInt` truncated decimals (12.50 → 12), and values were silently clamped. The people input was driven by the checkbox-state hack (only 2/3/4/5 allowed), silently clamped, and fractional input had no UI error state. |
| 4 | Tip Calculator | Medium | No dedicated error display or `aria-live`; clicking a preset with a blank bill silently produced stale/default math. |
| 5 | Dice Roller | Medium | Metadata claimed "simulated physics rolls" (false). No reset, no `aria-live`, color-only red-on-black result, no entertainment framing. `rollDie` did not use rejection sampling. |
| 6 | RPS | High | Metadata claimed "RPS Arena vs. AI Bot" / "smart AI opponent" (false — the computer picks at random). No reset, no `aria-live`, no score display, no computer-opponent copy. |
| 7 | Shared randomness | Medium | `rollDie`/RPS mapped a discrete uint32 via plain `floor(r * n)`, which carries a small modulo-style bias for side counts that do not divide 2³² (6, 10, 12, 20, 3). |
| 8 | Shared numeric | Low | Each calculator reinvented `parseInt`/clamp logic; there was no shared parsing, bounding, or display-formatting standard. |

## 2. Files changed

### Modified (in scope)
- `src/lib/toolTransforms.ts` — shared numeric + randomness standards (see §3).
- `src/components/GenericUtilityWorkspace.tsx` — percent/tip/dice/RPS UI + handlers.
- `src/toolsData.ts` — truthful SEO/UI copy for `percent-calc`, `dice-roller`,
  `rock-paper-scissors` (route IDs unchanged; `tip-calc` copy already truthful).
- `tests/functional-tools.test.tsx` — extended deterministic helper coverage (+9).
- `tests/e2e/catalog.spec.ts` — updated tip flow + 7 new Playwright tests.
- `docs/TOOL_INVENTORY.md`, `docs/PROJECT_AUDIT.md`, `docs/IMPLEMENTATION_ROADMAP.md`,
  `docs/TESTING.md` — milestone status updates.

### New files
- `tests/games-workspace.test.tsx` — 19 UI-level workspace tests for the four tools.
- `docs/P1B3_CALCULATOR_GAMES_REPORT.md` — this report.

## 3. Fixes implemented

### Shared numeric standards (`parseFiniteNumber`, `formatResult`)
- `parseFiniteNumber(value, label, { min, max, integer })` trims input and **rejects
  blank/whitespace** (blank is never treated as 0), rejects `NaN` and non-finite values,
  enforces optional min/max/integer constraints, and throws an explicit, caller-friendly
  message. No silent clamping — every rejected value surfaces a precise error.
- `formatResult(value)` strips trailing zeros from the 6-decimal rounding used by
  `percentageOf` (50 → "50", 10.5 → "10.5"), matching the required examples
  (25% of 200 = 50, 0% of 100 = 0, 12.5% of 80 = 10).

### Randomness standards (rejection sampling)
- New `secureIntInRange(maxExclusive, random)` draws a uniform uint32 and uses
  **rejection sampling** over the full 2³² range (`value % max` after rejecting the top
  partial bucket), eliminating the modulo-style bias for 3/6/10/12/20-ways outcomes.
- `rollDie` and `playRockPaperScissors` now route through `secureIntInRange`, defaulting
  to crypto-backed `secureRandom` with an isolated, clearly-labeled entertainment-only
  `Math.random` fallback when Web Crypto is unavailable. `random` remains injectable so
  every test is deterministic.
- Copy is truthful: dice/RPS are framed as tabletop entertainment ("not for gambling"),
  and no cryptographic/gambling fairness claim is made.

### Percentage Calculator (only "What is X% of Y?")
- Two text inputs (Percentage %, Base value) plus Calculate; the form submits via Enter.
- Validation: both fields required; blank, non-numeric, and non-finite inputs are
  rejected with a `role="alert"` message; zero and decimal percentages are supported;
  stale results are cleared on any invalid submission.
- Result is a single, truthfully-scoped line (`25% of 200 = 50`) announced via
  `aria-live="polite"`. The increase/decrease bonus lines and the hardcoded `$500` slider
  were removed to match the advertised scope.
- Reset clears inputs, result, and errors.

### Tip Calculator
- Dedicated inputs for Bill Amount ($), Tip Percentage (%) (default 15), and Number of
  People (default 2), plus the 10/15/20/25% presets (preset sets the field and computes).
- Validation: bill finite and ≥ 0 (≤ 1e9), tip finite and ≥ 0 (≤ 1e6), people a positive
  whole integer (≤ 1e6). Blank, negative, fractional, and zero-people inputs each surface
  a precise `role="alert"` message. The forms use `noValidate` so React's messages
  (rather than silent browser blocking) drive validation.
- Output shows Tip Subtotal, Combined Total, and Individual Share, all 2-decimal currency
  (raw values kept internally, display-only rounding), announced via `aria-live`.
- Reset clears all inputs, results, and errors. Shared-state reuse of `sliderVal` and the
  checkbox hack were removed.

### Dice Roller
- Exactly the supported die set d4/d6/d8/d10/d12/d20 is exposed (arbitrary side counts
  are rejected by `rollDie` at the helper level); results are integers in [1, sides].
- Reset button, `aria-live` result region, `role="alert"` errors, and truthful
  entertainment caption. No fake animation/timers; repeated rolls simply update the
  result.

### Rock Paper Scissors vs. Computer
- Rock/Paper/Scissors only; the computer uses the shared random source via
  `playRockPaperScissors` (the full 3×3 win/lose/draw matrix is covered by tests).
- Computer-opponent copy replaces the false "AI Bot" claim; score is now displayed;
  Reset clears the result and score; the outcome is announced via `aria-live` and uses
  `whitespace-pre-line` so multi-line results render correctly.

### Metadata / SEO truthfulness
- `percent-calc` description now states only what the tool does ("Find what X% of any
  number equals…").
- `dice-roller` description drops "simulated physics rolls".
- `rock-paper-scissors` renamed to "Rock Paper Scissors vs. Computer" (route ID
  unchanged) with "random computer opponent" copy.

## 4. Tests added

- `tests/functional-tools.test.tsx` — **+9 deterministic tests** (now 78 in the file):
  - `parseFiniteNumber`: blank/whitespace required; non-numeric and non-finite rejection;
    decimal + integer constraint; min/max bounds with explicit messages.
  - `formatResult`: trailing-zero stripping (50, 0, 10.5, 99.99, 33.333333).
  - `secureIntInRange`: bounded uniform integers; injected deterministic mapping; invalid
    upper bound rejection.
  - `rollDie`/RPS determinism re-based on the rejection-sampling mapping (uint32
    injection) and the full 3×3 RPS matrix retained.
  - `secureRandom`: still returns valid [0,1) values when `window.crypto` is unavailable.
- `tests/games-workspace.test.tsx` — **19 new UI tests** rendering the real
  `GenericUtilityWorkspace`: percent valid/zero/decimal, blank rejection + stale-result
  clearing, repeated + Enter submission, reset, aria-live; tip split math, zero/decimal
  bills, blank/negative/fractional/zero-people rejection, reset, aria-live; dice range,
  exact supported die set, reset + entertainment copy, aria-live; RPS round result,
  gesture set + computer-opponent copy, reset (result + score), aria-live.
- `tests/e2e/catalog.spec.ts` — **+7 Playwright tests** (now 21): percent
  validate/compute/reset, percent Enter-key submit, tip custom-percentage split, tip
  fractional-person rejection, dice roll + reset, RPS round, and a mobile-viewport smoke
  over all four routes. The existing tip flow now fills the bill before clicking a
  preset. None depend on uncontrolled randomness (RPS asserts a valid outcome shape).

## 5. Verification results (current branch, clean rebuild)

| Command | Result |
|---------|--------|
| `npm.cmd run clean` | ok |
| `npm.cmd run typecheck` | pass, exit 0 |
| `npm.cmd run lint` | pass, exit 0 |
| `npm.cmd run test` | **275 passed** (17 files) |
| `npm.cmd run build:client` | pass; sitemap 13 URLs (12 indexable); prerender ok |
| `npm.cmd run build:server` | pass; `server-dist/server.cjs` |
| `npm.cmd run build` | pass (combined build) |
| `npm.cmd run test:e2e` | **21 passed** |
| `npm.cmd run check` | exit 0 (ordered typecheck, lint, Vitest, production build) |
| `npm.cmd audit --json` | 0 critical, 0 high, 0 low; 1 **moderate** (dev-only `postcss`, pre-existing) |

Bundle impact is negligible: the main entry is unchanged in size (642.18 kB /
178.23 kB gzip) and the added calculator/game controls live inside the lazy-loaded
`GenericUtilityWorkspace` chunk (116.45 kB / 32.38 kB gzip). The pre-existing >500 kB
main-chunk warning remains tracked under P2 and is unrelated to this task.

## 6. Remaining limitations

- **Percent Calculator**: results are limited to the single "X% of Y" operation the tool
  advertises; percentage points, increase/decrease, and ratio math are intentionally out
  of scope until the tool is expanded and its copy updated together.
- **Tip Calculator**: money uses 2-decimal display rounding (standard for currency);
  raw internal values are used only for the math. No currency conversion or FX (explicit
  out of scope).
- **Dice/RPS**: randomness is uniformly fair for entertainment but is not a substitute
  for casino-grade RNG and is never described as such. Web-Crypto-absent environments
  fall back to `Math.random`, which is still fine for casual play.
- One pre-existing moderate audit finding remains (dev-only `postcss <=8.5.22`); it is a
  build-toolchain advisory (GHSA-6g55-p6wh-862q), not an application runtime issue, and
  was not introduced here.

## 7. Confirmed untouched

Per task constraints, this task did **not** modify: image tools, text tools,
SEO/prerendering, public-visibility selectors, API/security, `social-downloader`,
unrelated Beta/Disabled tools, route IDs, or status totals. The enforced catalog totals
(12 functional, 30 beta, 51 coming soon, 20 disabled = 113 routes), the public catalog
policy, the 13-URL sitemap (12 indexable), and the zero-cost production mode are
unchanged and verified by the existing `registry`, `seo`, and `availability` test files,
all of which still pass.

## 8. Recommended follow-ups (out of scope for P1B3)

- Continue the same production-quality pattern on the remaining partial tools, tracked
  as the next P1-B milestone; do not begin until P1-B3 is committed and verified.
- Optionally add a small dice roll history (only if requested; none exists today).
- Consider `Intl.NumberFormat` for locale-aware currency display if localization is
  added to the calculator tools.
