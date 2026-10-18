---
name: Calculated Mint
colors:
  surface: '#f7fafe'
  surface-dim: '#d7dade'
  surface-bright: '#f7fafe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f8'
  surface-container: '#ebeef2'
  surface-container-high: '#e5e8ec'
  surface-container-highest: '#e0e3e7'
  on-surface: '#181c1f'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3134'
  inverse-on-surface: '#eef1f5'
  outline: '#75777e'
  outline-variant: '#c5c6ce'
  surface-tint: '#525e7d'
  primary: '#000a24'
  on-primary: '#ffffff'
  primary-container: '#14213d'
  on-primary-container: '#7c89aa'
  inverse-primary: '#b9c6ea'
  secondary: '#006c52'
  on-secondary: '#ffffff'
  secondary-container: '#63fccc'
  on-secondary-container: '#007258'
  tertiary: '#160700'
  on-tertiary: '#ffffff'
  tertiary-container: '#371a00'
  on-tertiary-container: '#c97417'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b9c6ea'
  on-primary-fixed: '#0d1b36'
  on-primary-fixed-variant: '#3a4664'
  secondary-fixed: '#63fccc'
  secondary-fixed-dim: '#3edeb1'
  on-secondary-fixed: '#002117'
  on-secondary-fixed-variant: '#00513d'
  tertiary-fixed: '#ffdcc2'
  tertiary-fixed-dim: '#ffb77a'
  on-tertiary-fixed: '#2e1500'
  on-tertiary-fixed-variant: '#6d3a00'
  background: '#f7fafe'
  on-background: '#181c1f'
  surface-variant: '#e0e3e7'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  numeric-metric-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.03em
  numeric-metric-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system is engineered for financial clarity, operational efficiency, and algorithmic confidence within high-volume e-commerce and retail analytics. The aesthetic pairs a corporate modern foundation with high-contrast, tactile data precision. It translates complex financial modeling, dynamic margin projections, and profit calculations into frictionless visual hierarchies.

### Aesthetic Principles
- **Clarity Over Ornament:** High data density balanced by disciplined white space. Decorative embellishments are rejected in favor of structured data layouts, crisp lines, and high-readability metrics.
- **Actionable Visual Hierarchy:** The system uses stark navigational anchoring in deep navy, high-visibility mint green for positive delta/primary interaction points, and focused warm orange for alerts, threshold breaches, and sensitivity factors.
- **Tactile Utility:** Form controls, sliders, stepper inputs, and calculation cards leverage clean planar separation with subtle borders, conveying the reliability of an institutional financial tool combined with modern consumer-grade software usability.

## Colors

The palette establishes an immediate hierarchy between structural orientation, interaction, and data status.

### Core Roles
- **Primary (`#14213D` - Deep Navy):** Anchors navigation, sidebars, master action headers, tabular headers, and critical numeric values. It establishes authoritative weight and high contrast against light surfaces.
- **Secondary (`#2DD4A7` - Mint Green):** Directs the user's eye to primary conversion drivers, executable CTAs, positive margins, net profit metrics, and successful balance thresholds.
- **Tertiary (`#FF9F43` - Warm Amber/Orange):** Reserved strictly for warnings, elasticity alerts, margin compression notices, volatile assumptions, and high-priority secondary interactions.
- **Neutral Canvas (`#FFFFFF` & `#F3F6FA`):** Pure white serves as the overarching viewport canvas, while the cool soft gray-blue (`#F3F6FA`) is the standard background for cards, calculation workbench panes, dynamic formula surfaces, and input groups.

### Semantic & Border Tokens
- **Border Subtle:** `#E2E8F0` for neutral cell boundaries, inactive input containers, and structural card outlines.
- **Border Emphasized:** `#CBD5E1` for active card separations and hovered controls.
- **Text Primary:** `#14213D` on light surfaces; `#FFFFFF` on navy surfaces.
- **Text Secondary:** `#64748B` for meta labels, formula operators, unit indicators, and timestamps.
- **Text Muted:** `#94A3B8` for disabled states and non-actionable helper text.
- **Negative / Hazard:** `#EF4444` for negative margins, net operational losses, and critical calculation validation errors.

## Typography

Typography relies on **Plus Jakarta Sans** across all hierarchies for its geometric structure, wide apertures, and tabular balance. It pairs naturally with IBM Plex Arabic in multilingual implementations due to compatible x-heights and neutral line geometry.

### Functional Roles
- **Headlines & KPI Sums:** Bold weights (`700` and `800`) provide immediate visual anchoring. Headlines should always use negative tracking to maintain crispness at large display sizes.
- **Data & Numeric Displays:** All financial numbers, fee variables, and calculated margins must enforce tabular figures (`font-variant-numeric: tabular-nums`) to prevent horizontal shifting when values recalculate in real time.
- **Labels & Micro-copy:** Uppercase transformations are used selectively for `label-sm` (e.g., table column headers, status tags, unit tags) with a letter spacing of `+0.04em` to ensure clarity at small scales.
- **Body:** Regular (`400`) weight handles instructional text, formula explanations, and tooltip descriptions.

## Layout & Spacing

The system uses a 12-column responsive fluid grid designed around a desktop calculation workbench layout:
- **Desktop (1200px+):** 12 columns with `1.5rem` gutters and `2rem` outer margins. Standard view presents a split layout: 7 columns dedicated to variable input matrices/sliders, and 5 columns dedicated to sticky live-output profit summaries.
- **Tablet (768px - 1199px):** 8 columns with `1rem` gutters and `1.5rem` margins. The layout stacks dynamically: the inputs remain full-width while key metrics anchor into a persistent top or bottom docking panel.
- **Mobile (< 768px):** 4 columns with `1rem` gutters and `1rem` margin. Complex calculation steps are structured into sequential segments or tabbed input decks.

### Spacing Principles
- Consistent base-4 and base-8 metric rhythm (`0.25rem` through `2rem`).
- Form elements, toggles, and calculation cards use `space-md` (`1rem`) internally to maintain dense but scannable touch targets.
- Section-level separations in analytical panels use `space-xl` (`2rem`) to establish rhythm without visual dividers.

## Elevation & Depth

Visual hierarchy uses a flat-plane, low-contrast border architecture paired with minimal, cool-tinted ambient shadows. Avoid heavy dropshadows or complex skeuomorphic extrusions.

### Tonal Stratification
- **Canvas (Elevation 0):** Pure White (`#FFFFFF`). Houses top-level site layouts, headers, and document wrappers.
- **Workbench & Panels (Elevation 1):** Soft Light Gray/Blue (`#F3F6FA`) with a 1px solid border in `#E2E8F0`. Used for all calculation engines, card collections, and configurable workspace zones.
- **Interactive Units & Inputs (Elevation 2):** Pure White (`#FFFFFF`) inputs and interactive modules set inside Elevation 1 panels, producing a natural recessed-to-raised contrast. Border: 1px solid `#CBD5E1`.
- **Flyouts & Dropdown Selectors (Elevation 3):** Solid `#FFFFFF` elevated with a refined, soft ambient shadow: `box-shadow: 0 4px 16px -2px rgba(20, 33, 61, 0.08), 0 2px 6px -1px rgba(20, 33, 61, 0.04)`.
- **Modals & Critical Alerts (Elevation 4):** Anchored with `box-shadow: 0 12px 32px -4px rgba(20, 33, 61, 0.16)`. Accompanied by a semi-opaque backdrop: `rgba(20, 33, 61, 0.4)`.

## Shapes

The design system uses a **Soft** corner language (`roundedness: 1`) to project technical precision and analytical discipline.

### Geometry Rules
- **Base Components (Inputs, Buttons, Badges, Table Rows):** `0.25rem` (4px). Keeps input boundaries clean and minimizes optical distortion along data-heavy grids.
- **Cards & Calculators (`rounded-lg`):** `0.5rem` (8px). Delivers a distinct boundary for calculation modules without appearing overly playful or consumerized.
- **Modals & Floating Drawers (`rounded-xl`):** `0.75rem` (12px). Softens larger viewport interruptions.
- **Fully Rounded Elements:** Reserved strictly for circular icon buttons, status indicators, and slider thumbs (`rounded-full`).

## Components

### Buttons
- **Primary CTA (Mint Green):** Background `#2DD4A7`, Text `#14213D` (high-contrast navy for optimal legibility), Weight `700`. Hover: `#22C55E` or darkened mint `#26BA93`. Focus: ring `2px solid #14213D`, offset `2px`.
- **Secondary (Navy Structural):** Background `#14213D`, Text `#FFFFFF`, Weight `600`. Hover: `#1E2F56`.
- **Tertiary / Ghost:** Background transparent, Text `#14213D`, Border `1px solid #CBD5E1`. Hover: Background `#F3F6FA`.
- **Alert / Accent CTA:** Background `#FF9F43`, Text `#14213D`, Weight `700`. Used for threshold-overriding and volatility recalculations.

### Input Fields & Steppers
- **Default State:** Background `#FFFFFF`, Border `1px solid #CBD5E1`, Text `#14213D`, Typography `body-md` (tabular nums).
- **Active / Focused:** Border `1.5px solid #14213D`, subtle inner glow or zero-spread outline.
- **Prefix / Suffix Elements:** Currency symbols (`$`, `€`, `AED`) and percentage signs (`%`) reside within tinted container endcaps (`#F3F6FA`), typography `label-md` `#64748B`.
- **Numeric Steppers:** Increment/decrement triggers integrated into the right flank with clean vertical dividers (`#E2E8F0`).

### Cards & Calculation Panels
- **Container Structure:** Background `#F3F6FA`, Border `1px solid #E2E8F0`, Radius `0.5rem`, Padding `1.5rem`.
- **Profit Outcome Card (Highlight Panel):** Background `#14213D`, Text `#FFFFFF`, Secondary Text `#94A3B8`. Key profit figures printed in `#2DD4A7` (`numeric-metric-lg`).
- **Alert Cards:** Soft Amber background tint (`#FFF7ED`), Border `1px solid #FFD8A8`, Text `#14213D`.

### Sliders (Dynamic Margin & Elasticity Adjusters)
- **Track:** Height `6px`, Radius `9999px`, Background `#E2E8F0`.
- **Filled Track:** Background `#2DD4A7` for positive value spreads; `#FF9F43` if approaching tight/negative margin thresholds.
- **Thumb:** Diameter `20px`, pure white fill, border `2px solid #14213D`, active scale effect.

### Chips & Badges
- **Status Chips:** Height `24px`, padding `0 8px`, typography `label-sm`, radius `4px`.
  - **Profitable / Optimal:** Background `#DCFCE7`, Text `#15803D`.
  - **Warning / Sensitivity:** Background `#FFEDD5`, Text `#C2410C`.
  - **Neutral / Meta:** Background `#E2E8F0`, Text `#334155`.

### Checkboxes & Radio Buttons
- **Unchecked:** Border `1.5px solid #CBD5E1`, Background `#FFFFFF`, radius `4px` (checkbox) or `50%` (radio).
- **Checked:** Background `#14213D`, Border `#14213D`, indicator icon pure white `#FFFFFF`.

### Data Tables & Breakdowns
- **Header Row:** Background `#14213D`, Text `#FFFFFF`, typography `label-md`, all caps, padding `12px 16px`.
- **Row Styling:** Alternating subtle zebra striping optional (`#FFFFFF` to `#F8FAFC`). Bottom border `1px solid #E2E8F0`. Numeric columns strictly right-aligned with `tabular-nums`.