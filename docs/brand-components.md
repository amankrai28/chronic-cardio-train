# Chronic Cardio — Component Patterns Reference

> Production-ready CSS and HTML patterns implementing the brand system.
> Use these for all UI components in train.chroniccardio.com.
> All patterns use the CSS custom properties defined in brand-system.md.

---

# Chronic Cardio — Component Patterns Reference

Production-ready CSS and HTML patterns implementing the brand system. Copy and
adapt these. All patterns use the CSS custom properties defined in Section 1.

## Table of Contents
1. CSS Foundation (variables, reset, noise overlay)
2. Buttons & CTAs
3. Black Boxes (reversed-out emphasis blocks)
4. Tables
5. Cards & Product Cards
6. Navigation & Header
7. Hero Sections
8. Section Headers
9. Stamps, Bar Marks & Visual Devices
10. Grids & Layout
11. Social Post Templates
12. Sachet / Packaging Mockup
13. Do/Don't Comparison Blocks
14. Voice Cards
15. React / JSX Notes

---

## 1. CSS Foundation

Every branded artifact starts with these variables and the font import.

```css
@import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Space+Mono:wght@400;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

:root {
  --ink: #1A1A1A;
  --newsprint: #F5F5F0;
  --accent: #EF6C00;
  --mid-gray: #666666;
  --light-gray: #E8E8E3;
  --alert-red: #CC0000;
  --confirm-green: #2D7D46;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--newsprint);
  color: var(--ink);
  font-family: 'DM Sans', sans-serif;
  line-height: 1.6;
  overflow-x: hidden;
}

/* Paper grain overlay — apply to body::before */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 10000;
}

/* Optional scanline effect — body::after */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(0deg,
    transparent, transparent 2px,
    rgba(0,0,0,0.006) 2px, rgba(0,0,0,0.006) 4px);
  pointer-events: none;
  z-index: 9999;
}
```

### For React/JSX Artifacts

When building React components, inline the CSS variables and skip the body
pseudo-elements (they don't work in artifact sandboxes). Instead, apply grain as
an overlay div:

```jsx
<div style={{
  position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10000,
  background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`
}} />
```

---

## 2. Buttons & CTAs

### Primary Button (dark fill)
```css
.btn-primary {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 2px;
  text-transform: uppercase;
  background: var(--ink);
  color: var(--newsprint);
  border: 3px solid var(--ink);
  padding: 14px 30px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-block;
}
.btn-primary:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--newsprint);
  transform: rotate(-1deg);
}
```

### Secondary Button (outline)
```css
.btn-secondary {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 2px;
  text-transform: uppercase;
  background: transparent;
  color: var(--ink);
  border: 3px solid var(--ink);
  padding: 14px 30px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-block;
}
.btn-secondary:hover {
  background: var(--ink);
  color: var(--newsprint);
}
```

### Orange CTA Button
```css
.btn-orange {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 2px;
  text-transform: uppercase;
  background: var(--accent);
  color: var(--newsprint);
  border: 3px solid var(--accent);
  padding: 14px 30px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-orange:hover {
  background: var(--ink);
  border-color: var(--ink);
}
```

### Nav CTA (compact)
```css
.nav-cta {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  background: var(--ink);
  color: var(--newsprint);
  border: none;
  padding: 10px 22px;
  cursor: pointer;
  transition: all 0.2s;
}
.nav-cta:hover { background: var(--accent); }
```

---

## 3. Black Boxes

Reversed-out emphasis blocks. Core visual device.

```css
.black-box {
  background: var(--ink);
  color: var(--newsprint);
  padding: 30px;
  margin: 24px 0;
  /* Optional photocopy noise on dark backgrounds */
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200'
    xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence
    type='fractalNoise' baseFrequency='0.6' numOctaves='3'
    stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25'
    filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E");
}
.black-box p {
  font-family: 'Courier Prime', monospace;
  font-size: 17px;
  line-height: 1.7;
  color: rgba(245,245,240,0.9);
  margin-bottom: 12px;
}
.black-box strong { color: var(--accent); }
```

```html
<div class="black-box">
  <p><strong>Why three ingredients?</strong></p>
  <p>Because that's all you need. Everything else is marketing.</p>
</div>
```

---

## 4. Tables

```css
.guide-table {
  width: 100%;
  border-collapse: collapse;
  border: 3px solid var(--ink);
  margin: 20px 0;
}
.guide-table th {
  background: var(--ink);
  color: var(--newsprint);
  font-family: 'Courier Prime', monospace;
  font-size: 12px;
  letter-spacing: 3px;
  text-transform: uppercase;
  padding: 12px 16px;
  text-align: left;
}
.guide-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--light-gray);
  font-size: 15px;
  vertical-align: top;
  line-height: 1.5;
}
.guide-table tr:last-child td { border-bottom: none; }
.td-label {
  font-family: 'Courier Prime', monospace;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 1px;
  white-space: nowrap;
}
```

---

## 5. Cards & Product Cards

```css
.product-card {
  border: 3px solid var(--ink);
  background: var(--newsprint);
  padding: 30px;
  transition: transform 0.3s;
}
.product-card:hover {
  transform: rotate(-1deg) scale(1.02);
}
```

### Layout card (zine-page style)
```css
.layout-card {
  border: 3px solid var(--ink);
  aspect-ratio: 3/4;
  overflow: hidden;
  transition: transform 0.3s;
}
.layout-card:hover { transform: rotate(-1deg) scale(1.02); }
.lc-inner {
  padding: 28px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.lc-brand {
  font-family: 'Courier Prime', monospace;
  font-size: 10px;
  letter-spacing: 3px;
  text-transform: uppercase;
  opacity: 0.5;
}
.lc-headline {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: clamp(16px, 2vw, 24px);
  line-height: 1.2;
  transform: rotate(-1deg);
}
```

---

## 6. Navigation & Header

```css
.site-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 1000;
  padding: 18px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--newsprint);
  border-bottom: 3px solid var(--ink);
}
.logo {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 3px;
  text-transform: uppercase;
}
.logo .accent-i { color: var(--accent); }
.nav-links { display: flex; gap: 30px; }
.nav-links a {
  font-family: 'Courier Prime', monospace;
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--mid-gray);
  transition: color 0.2s;
}
.nav-links a:hover { color: var(--ink); }
```

### Logo HTML
```html
<div class="logo">CHRONIC CARD<span class="accent-i">I</span>O</div>
```

---

## 7. Hero Sections

```css
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 120px 40px 80px;
  position: relative;
  overflow: hidden;
  /* Dot grid background */
  background-image: radial-gradient(circle, rgba(26,26,26,0.03) 1px, transparent 1px);
  background-size: 8px 8px;
}

/* Ghost text watermark */
.hero::before {
  content: 'FUEL FUEL FUEL FUEL FUEL';
  position: absolute;
  top: 50%; left: -5%;
  transform: translateY(-50%) rotate(-3deg);
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: clamp(60px, 10vw, 120px);
  letter-spacing: 40px;
  color: var(--ink);
  opacity: 0.02;
  white-space: nowrap;
  pointer-events: none;
}

.hero-label {
  font-family: 'Courier Prime', monospace;
  font-size: 14px;
  letter-spacing: 5px;
  text-transform: uppercase;
  background: var(--ink);
  color: var(--newsprint);
  display: inline-block;
  padding: 8px 18px;
  margin-bottom: 36px;
  transition: transform 0.2s;
}
.hero-label:hover {
  transform: rotate(-1.5deg);
}

.hero-headline {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: clamp(48px, 8vw, 88px);
  line-height: 1.0;
  letter-spacing: -2px;
  margin-bottom: 28px;
}

.hero-subhead {
  font-family: 'DM Sans', sans-serif;
  font-size: 20px;
  line-height: 1.7;
  color: var(--mid-gray);
  max-width: 560px;
  margin-bottom: 40px;
}
```

### Slide-in animation
```css
@keyframes slideIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.hero-label { animation: slideIn 0.6s ease-out; }
.hero-headline { animation: slideIn 0.6s ease-out 0.15s both; }
.hero-subhead { animation: slideIn 0.6s ease-out 0.3s both; }
```

---

## 8. Section Headers

```css
.section-header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-top: 80px;
  margin-bottom: 12px;
}
.section-num {
  font-family: 'Space Mono', monospace;
  font-size: 15px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 2px;
}
.section-name {
  font-family: 'Space Mono', monospace;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
}
.section-line {
  width: 100%;
  height: 3px;
  background: var(--ink);
  margin-bottom: 36px;
}
```

```html
<div class="section-header">
  <span class="section-num">01</span>
  <span class="section-name">The Product</span>
</div>
<div class="section-line"></div>
```

---

## 9. Stamps, Bar Marks & Visual Devices

### Stencil Stamps
```css
.stamp {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  transition: transform 0.2s;
}
.stamp:hover {
  transform: rotate(-2deg);
}
.stamp-round {
  border: 3px solid var(--ink);
  border-radius: 50%;
  width: 80px; height: 80px;
  font-size: 10px;
}
.stamp-rect {
  border: 3px solid var(--ink);
  padding: 8px 16px;
  font-size: 11px;
}
/* Rough variant: border-width: 3px 4px 3px 3px */
/* On interactive pages: stamps sit straight, rotate on hover.
   On static/print: resting rotation is fine (use inline transform). */
```

### Bar Mark (the orange "I" extracted)
```css
.bar-mark {
  width: 4px; height: 20px;
  background: var(--accent);
  display: inline-block;
}
.bar-mark-lg {
  width: 6px; height: 32px;
  background: var(--accent);
  display: inline-block;
}
```

Usage — between stats, as bullet replacements:
```html
<div style="display:flex; align-items:center; gap:14px; font-family:'Space Mono',monospace; font-weight:700;">
  <div class="bar-mark-lg"></div> 80 KCAL
  <div class="bar-mark-lg"></div> 0.8:1 F:G
  <div class="bar-mark-lg"></div> 3 INGREDIENTS
</div>
```

### Strikethrough Device
```css
.strike-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.strike-icon::after {
  content: '';
  position: absolute;
  width: 120%; height: 3px;
  background: var(--alert-red);
  transform: rotate(-12deg);
}
```

### Corner Stamps
```css
.corner-stamp {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  padding: 4px 10px;
  display: inline-block;
  transition: transform 0.2s;
}
.corner-stamp:hover {
  transform: rotate(-2deg);
}
/* Variants: background var(--ink) + color var(--newsprint) for dark fill,
   background var(--accent) + color var(--newsprint) for accent fill,
   border 2px solid var(--ink) for outline */
```

---

## 10. Grids & Layout

### Two-column comparison (us vs. them)
```css
.info-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  background: var(--ink);
  border: 3px solid var(--ink);
  margin: 20px 0;
}
.info-side {
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
```

### Generic bordered grid
```css
.bordered-grid {
  display: grid;
  gap: 2px;
  background: var(--ink);
  border: 3px solid var(--ink);
}
.bordered-grid > * {
  background: var(--newsprint);
  padding: 24px;
}
```

### Content emphasis block (left orange border)
```css
.content-emphasis {
  font-family: 'Space Mono', monospace;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.5;
  margin: 20px 0;
  padding: 20px 24px;
  border-left: 4px solid var(--accent);
  background: rgba(239,108,0,0.05);
}
```

---

## 11. Social Post Templates

### Instagram grid cell
```css
.social-post {
  aspect-ratio: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.sp-text {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  line-height: 1.35;
}
.sp-small {
  font-family: 'Courier Prime', monospace;
  font-size: 9px;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.5;
  margin-top: auto;
}
```

Alternate black-on-white and white-on-black for Instagram grid rhythm.

---

## 12. Sachet / Packaging Mockup

```css
.sachet {
  border: 3px solid var(--ink);
  padding: 30px 24px;
  min-height: 380px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}
.sachet-tear {
  position: absolute;
  top: 0; right: 24px;
  width: 0; height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
}
.s-name {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: clamp(24px, 3vw, 36px);
  letter-spacing: 2px;
  line-height: 1;
}
.s-ing {
  font-family: 'Courier Prime', monospace;
  font-size: 16px;
  letter-spacing: 5px;
  text-transform: uppercase;
  opacity: 0.7;
}
.s-kcal {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 24px;
}
```

---

## 13. Do/Don't Comparison Blocks

```css
.rules-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  background: var(--ink);
  border: 3px solid var(--ink);
  margin: 20px 0;
}
.rules-col { padding: 30px; }
.rules-do { background: #edf7ed; }
.rules-dont { background: #fdf0f0; }
.rules-title {
  font-family: 'Space Mono', monospace;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 20px;
}
.rules-do .rules-title { color: var(--confirm-green); }
.rules-dont .rules-title { color: var(--alert-red); }
.rules-list { list-style: none; }
.rules-list li {
  font-family: 'Courier Prime', monospace;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 12px;
  padding-left: 24px;
  position: relative;
}
.rules-do .rules-list li::before { content: '✓'; position: absolute; left: 0; font-weight: 700; color: var(--confirm-green); }
.rules-dont .rules-list li::before { content: '✗'; position: absolute; left: 0; font-weight: 700; color: var(--alert-red); }
```

---

## 14. Voice Cards

```css
.voice-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
  background: var(--ink);
  border: 3px solid var(--ink);
}
.voice-card {
  background: var(--newsprint);
  padding: 24px 16px;
  text-align: center;
}
.voice-principle {
  font-family: 'Space Mono', monospace;
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 6px;
}
.voice-anti {
  font-family: 'Courier Prime', monospace;
  font-size: 13px;
  color: var(--mid-gray);
  text-decoration: line-through;
  text-decoration-color: var(--alert-red);
}
```

---

## 15. React / JSX Notes

When building React artifacts for Chronic Cardio:

1. Use Tailwind utility classes where possible, but override with inline styles
   for brand-specific values (the exact hex codes, font families, letter-spacing).
2. Import fonts via a `<link>` tag or `@import` in a `<style>` block at the top.
3. The grain overlay must be a `<div>` with fixed positioning and `pointerEvents: 'none'`,
   not a pseudo-element (pseudo-elements don't work in React artifacts).
4. For the wordmark, use: `CHRONIC CARD<span className="text-[#EF6C00]">I</span>O`
   or inline style `style={{color: '#EF6C00'}}`.
5. Hover effects using Tailwind: `hover:rotate-[-1deg]`, `hover:bg-[#EF6C00]`.
6. All borders should be `border-[3px] border-[#1A1A1A]`.
7. For dark sections, use `bg-[#1A1A1A] text-[#F5F5F0]`.

### Minimal React Component Shell
```jsx
import { useState } from "react";

const COLORS = {
  ink: '#1A1A1A',
  newsprint: '#F5F5F0',
  accent: '#EF6C00',
  midGray: '#666666',
  lightGray: '#E8E8E3',
};

export default function ChronicCardioComponent() {
  return (
    <div style={{
      background: COLORS.newsprint,
      color: COLORS.ink,
      fontFamily: "'DM Sans', sans-serif",
      minHeight: '100vh'
    }}>
      {/* Grain overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10000,
        background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`
      }} />

      {/* Content goes here */}
    </div>
  );
}
```

---

## Responsive Breakpoints

At `max-width: 768px`:
- Voice grids → 2 columns
- Rules grids → 1 column (stack)
- Color swatches → 1 column
- Icon grids → 2 columns
- Comparison grids → 1 column (stack)
- Reduce heading sizes using `clamp()` as shown in hero patterns

---

## 16. Spacing Tokens

Add to your `:root` block alongside color variables:
```css
:root {
  /* ... color vars ... */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;
  --space-4: 16px;  --space-6: 24px;  --space-8: 32px;
  --space-12: 48px; --space-20: 80px;
}
```

---

## 17. Interaction State Patterns

### Focus-visible (apply globally)
```css
:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
:focus:not(:focus-visible) {
  outline: none;
}
```

### Disabled state
```css
.btn-primary:disabled,
.btn-secondary:disabled,
.btn-orange:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none;
}
```

### Loading bar animation
```css
@keyframes barPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
.loading-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
}
.loading-bar {
  width: 6px;
  height: 24px;
  background: var(--accent);
  animation: barPulse 1.2s ease-in-out infinite;
}
.loading-bar:nth-child(2) { animation-delay: 0.2s; }
.loading-bar:nth-child(3) { animation-delay: 0.4s; }
```

```html
<div class="loading-indicator">
  <div class="loading-bar"></div>
  <div class="loading-bar"></div>
  <div class="loading-bar"></div>
</div>
```

### Error state on inputs
```css
.input-error {
  border: 3px solid var(--alert-red);
}
.error-message {
  font-family: 'Courier Prime', monospace;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--alert-red);
  margin-top: var(--space-2);
}
```

### Active/pressed
```css
.btn-primary:active {
  transform: scale(0.98);
}
```

