---
name: Violet OS
colors:
  surface: '#fdf8ff'
  surface-dim: '#dcd6f4'
  surface-bright: '#fdf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f1ff'
  surface-container: '#f1ebff'
  surface-container-high: '#ebe5ff'
  surface-container-highest: '#e5dffd'
  on-surface: '#1c192e'
  on-surface-variant: '#474553'
  inverse-surface: '#312e44'
  inverse-on-surface: '#f4eeff'
  outline: '#787584'
  outline-variant: '#c9c4d5'
  surface-tint: '#5c4bc3'
  primary: '#5949c0'
  on-primary: '#ffffff'
  primary-container: '#7263db'
  on-primary-container: '#fffbff'
  inverse-primary: '#c7bfff'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#006b2d'
  on-tertiary: '#ffffff'
  tertiary-container: '#00873b'
  on-tertiary-container: '#f7fff3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5deff'
  primary-fixed-dim: '#c7bfff'
  on-primary-fixed: '#180065'
  on-primary-fixed-variant: '#4330aa'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#fdf8ff'
  on-background: '#1c192e'
  surface-variant: '#e5dffd'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  telemetry-metric:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system drives an enterprise event operating system crafted for orchestrators of large-scale, high-stakes experiences. The visual direction balances operational poise with futuristic serenity: a canvas that feels open, weightless, and calm even under intense logistical velocity.

The style fuses **Modern Tech Minimalism** with **Atmospheric Layering**:
- **Atmospheric Palette**: A soft, luminous lavender base replaces clinical whites and harsh dark modes, reducing cognitive fatigue during extended operational monitoring.
- **Precision Instrumentation**: High visual storytelling via browser mockups, mobile scanner viewports, real-time ticket telemetry, and structured status beacons.
- **70/30 Visual-to-Copy Cadence**: Data density is conveyed through glanceable graphical telemetry, live counters, and diagrammatic flows rather than heavy blocks of prose.
- **Quiet Intelligence**: UI surfaces float with soft optical tints and low-contrast borders, conveying institutional durability and fluid modern engineering.

## Colors

The color system establishes high visual clarity through a curated hierarchy of tinted tones, bright operational beacons, and grounding deep-navy anchor shades.

- **Base & Canvases**: `#F7F5FF` provides a warm, ultra-light lavender ambient foundation. Elevated functional containers shift into `#EEEBFF` (Lavender Surface) and `#FFFFFF` (Card Primary).
- **Core Brand Primary (`#8B7CF6`)**: Modern vibrant violet used for interactive focal points, selected states, and progressive gauges. Supported by `#C4B5FD` (Soft Violet) for focus rings, hover tracks, and quiet badges.
- **Operational Secondary Accent (`#6366F1`)**: Indigo accent deployed for mission-critical actions, ingress/egress triggers, and data-routing indicators.
- **Telemetry Tertiary (`#22C55E`)**: Emerald green dedicated to live status, successful access scans, and online hardware diagnostics.
- **Neutral & Typography Scales**:
  - `Base Text / Dominant`: `#27243A` (Deep carbon-violet) delivers stark, accessible legibility without the jarring hardness of pure `#000000`.
  - `Muted Text / Telemetry Labels`: `#77738A` for secondary metrics, axis labels, and timestamps.
  - `Operations Dark`: `#17152B` deployed selectively for device scanner shells, browser chrome frames, and persistent global status rails.

## Typography

The typography utilizes **Plus Jakarta Sans** uniformly across display, body, and labels. Its wide aperture, geometric clarity, and humanist curves maintain extreme legibility on physical handheld check-in terminals and high-density multi-display operations centers.

- **Telemetry Figures**: Key performance indicators (scan throughput, gate latency, sync rates) rely on `telemetry-metric` with tabular numerical figures to eliminate jitter during real-time data streaming.
- **Operational Labeling**: `label-sm` utilizes subtle tracking expansion (+0.04em) and medium-bold weights for badges, scan timestamps, and sub-system hardware addresses.
- **Copy Economy**: Body text is constrained strictly to operational context, avoiding multi-paragraph sprawl in favor of rapid scanning.

## Layout & Spacing

The layout model pairs a structured 12-column grid with generous external margins to ensure visual air and prevent cognitive overload.

- **Desktop (1200px+)**: 12-column fluid grid, `2rem` outer margin, `1.5rem` gutter. Visual dashboards alternate between large telemetry stages (8 cols) and live-feed audit streams (4 cols).
- **Tablet (768px - 1199px)**: 8-column layout, `1.5rem` margin, `1rem` gutter. Device previews and scanner frames stack into unified 2-up modules.
- **Mobile (320px - 767px)**: 4-column layout, `1rem` margin, `0.75rem` gutter. Tactical telemetry converts to horizontally swipeable indicator rails; scanner viewports span full width.
- **70/30 Composition Rule**: Within any interface viewport, 70% of spatial mass is reserved for dynamic mockups, telemetry clusters, and visual tracking charts; copy and documentation occupy the remaining 30%.

## Elevation & Depth

Depth is established via **Tonal Layering** and **Atmospheric Violet Ambient Shadows**, rejecting heavy, opaque drop shadows in favor of a weightless, luminous feel.

- **Level 0 (Base Canvas)**: Flat `#F7F5FF`.
- **Level 1 (Surface Containers & Toolbars)**: `#EEEBFF` with a hairline outline of `rgba(139, 124, 246, 0.12)`.
- **Level 2 (Active Cards & Operational Nodes)**: Pure `#FFFFFF` surface accompanied by a diffused ambient shadow: `0 8px 24px -4px rgba(99, 102, 241, 0.06), 0 2px 6px -1px rgba(23, 21, 43, 0.04)`.
- **Level 3 (Floating Scanners, Modals & QR Overlays)**: `#FFFFFF` or `#17152B` (Operations Dark) elevated with `0 20px 40px -8px rgba(39, 36, 58, 0.12), 0 0 0 1px rgba(139, 124, 246, 0.18)`.
- **Framed Visuals**: Web mockups and scanner frames feature an outer glow: `box-shadow: 0 0 0 1px rgba(196, 181, 253, 0.3), 0 24px 48px -12px rgba(139, 124, 246, 0.14)`.

## Shapes

The interface embraces a calibrated `roundedness: 2` (0.5rem base radius). This produces soft, human geometry that contrasts with the analytical nature of system-level event operations.

- **Controls & Form Elements**: `0.5rem` (8px) for buttons, text inputs, and dropdown triggers.
- **Cards, Frames & Mockups**: `1rem` (16px) for QR ticket surfaces, telemetry cards, and browser containment frames.
- **Hardware Simulation Frames**: `1.5rem` (24px) to `2rem` (32px) for handheld scanner chassis containers.
- **Status Pills & Counters**: Fully pill-shaped (`9999px`) to immediately distinguish continuous status data from interactive square-corner components.

## Components

### Buttons & Interactive Triggers
- **Primary Action**: Solid `#8B7CF6` fill, `#FFFFFF` text, subtle hover lift via `background: #7C6AE6`. Pressed: scale 0.98.
- **Operational Secondary**: Tinted `#EEEBFF` background with `#6366F1` text and an ultra-subtle border `rgba(99, 102, 241, 0.2)`.
- **Dark Mode Tactical (Scanner Sync)**: `#17152B` base, `#FFFFFF` text, paired with `#22C55E` dynamic activity light.

### QR Ticket & Pass Cards
- Surface: `#FFFFFF` with notched or perforated dividing borders rendered using `border-style: dashed; border-color: #C4B5FD`.
- Telemetry Header: Event access tier label in `label-sm` with a dedicated live scan counter indicator.
- Contrast Anchor: Embedded high-contrast dark block `#17152B` hosting the high-resolution QR graphic.

### Status Indicators & Operational Badges
- **Live / Active**: Pill badge with `background: rgba(34, 197, 94, 0.12)`, text `#15803D`, featuring an animated 6px pulsating dot.
- **Standby / Queued**: Pill badge with `background: #EEEBFF`, text `#6366F1`.
- **System Metrics**: Tabular figures nested in soft-violet surface capsules with `label-sm` metadata.

### Form Inputs & Filters
- Inactive: `#FFFFFF` background, `1px solid rgba(139, 124, 246, 0.24)`, placeholder `#77738A`.
- Focus: `1px solid #8B7CF6`, augmented with an outer focus halo: `0 0 0 3px rgba(196, 181, 253, 0.4)`.

### Mockup & Device Containment Frames
- **Browser Shell**: Clean `#FFFFFF` or `#EEEBFF` header bar, three simplified window controls (`rgba(39, 36, 58, 0.2)`), containing crisp operational graphs.
- **Mobile Scanner Frame**: Slim `#17152B` bezel framing high-speed barcode target crosshairs with `#22C55E` pass confirmation overlays.