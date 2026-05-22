# Chronic Cardio — Brand System

> This is the canonical brand identity document for Chronic Cardio.
> All visual output for train.chroniccardio.com must comply with this system.
> For CSS/HTML component patterns, see `brand-components.md`.

---


# Chronic Cardio Brand System

This skill encodes the complete Chronic Cardio brand identity. Read it before
creating any branded artifact — HTML, React, presentations, social content,
email templates, or any visual deliverable.

For detailed CSS snippets, HTML component patterns, and copy examples, read
`references/components.md` after absorbing the core system below.

---

## 1. Brand Foundation

**Mission:** Make endurance fuel simple, honest, and accessible.

**Positioning:** For endurance athletes tired of overthinking their fuel. Three
ingredients — honey, tapioca syrup, sea salt — combined in a ratio that matters
(0.8:1 fructose to glucose).

**Philosophy:** Pro-simplicity, not anti-science. We reject complexity as
marketing, patents as premiumization theater, proprietary blends that obscure
basic ingredients, and price points that gatekeep endurance sports.

**Core values:** Simplicity, Transparency, Accessibility, Honesty, Steadiness.

**Primary tagline:** Stupid distances. Simple fuel.

**Secondary taglines:**
- The sport of not stopping.
- Three ingredients. That's the whole list.
- Honey. Tapioca. Salt. Go.
- For the chronically committed.

**The brand approval test:** "Does this look like it came from a photocopier or
a design agency?" If design agency — revise.

---

## 2. Visual Identity — The Zine Aesthetic

The visual language draws from zine and punk design: photocopied manifestos,
cut-and-paste layouts, raw DIY energy. This is a deliberate rejection of the
oversaturated minimalist premium look dominating sports nutrition.

### Visual Principles

1. **Imperfection is intentional** — Misalignment, visible texture, rough edges.
   Nothing looks machine-perfect. Rotation (1–3°) is reserved for hover/
   interaction states on interactive pages. Don't apply resting-state rotation
   to any element on a web page — it looks broken, not handmade. Elements sit
   straight and tilt on hover, then return on mouse-out. On static media
   (print, packaging, PDF), resting rotation of 1–3° is fine since there's
   no hover.
2. **Type does the heavy lifting** — Typography, not photography, is the primary
   visual tool. Bold type, mixed weights, deliberate contrast.
3. **High contrast, minimal decoration** — Black and off-white dominate. Signal
   Orange as single accent. No gradients, no soft shadows, no filler.
4. **Texture over polish** — Paper grain, photocopy noise, ink bleed. Every
   surface should feel printed, not rendered.
5. **Content is the design** — Ingredient lists, ratios, and product info aren't
   hidden. They ARE the visual system.

---

## 3. Color System

### Primary Palette
```
--ink:        #1A1A1A    Ink Black      — Primary text, backgrounds, borders
--newsprint:  #F5F5F0    Newsprint      — Background, warm off-white like aged paper
--accent:     #EF6C00    Signal Orange  — Single accent: CTAs, highlights, the "I" in wordmark
```

### Secondary / Functional
```
--mid-gray:     #666666  Mid Gray       — Secondary text, captions, metadata
--light-gray:   #E8E8E3  Light Gray     — Subtle backgrounds, borders
--alert-red:    #CC0000  Alert Red      — Strikethroughs, "don'ts," error states ONLY
--confirm-green:#2D7D46  Confirm Green  — "Do's," success states ONLY
```

### Color Rules
- Ink Black + Newsprint = 85%+ of any composition.
- Signal Orange is the SOLE accent. Never as a background fill on large areas.
- Maximum three colors in any single composition (black + white + orange).
- No gradients. No drop shadows. No color overlays.
- On dark backgrounds: reverse to Newsprint text with Signal Orange accents.

### Why Signal Orange
Sits in unclaimed competitive territory — distinct from Honey Stinger's gold,
Maurten/Cadence monochrome, Neversecond green, GU multi-color. Industrial and
utilitarian — the color of high-vis vests and construction signage. Reads as
"pay attention" rather than "premium."

---

## 4. Typography System

### Font Stack
```
Display/Headings:  Space Mono (Bold, 700)
Captions/Labels:   Courier Prime (Regular 400, Bold 700, Italic 400i)
Body/Subheads:     DM Sans (300–600 weights, italic available)
```

Google Fonts import:
```
https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Space+Mono:wght@400;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap
```

### Type Hierarchy
| Element    | Font          | Weight   | Size      | Case      |
|------------|---------------|----------|-----------|-----------|
| Brand name | Space Mono    | Bold     | Varies    | UPPERCASE |
| H1         | Space Mono    | Bold     | 36–48pt   | UPPERCASE |
| H2         | Space Mono    | Bold     | 24–32pt   | UPPERCASE |
| Subhead    | DM Sans       | Semibold | 16–20pt   | Sentence  |
| Body       | DM Sans       | Regular  | 14–16pt   | Sentence  |
| Caption    | Courier Prime | Regular  | 11–13pt   | UPPERCASE |
| Tagline    | Space Mono    | Bold     | 18–24pt   | Sentence  |

### Typography Rules
- Limit any single composition (social post, ad, packaging face) to two typefaces max.
- Headlines can rotate 1–3° — body copy stays straight.
- Reversed-out text (white on black) encouraged for emphasis blocks.
- Strikethrough text to show what we reject.
- No decorative or script typefaces, ever.
- Letter-spacing on uppercase display: +2–4%.

---

## 5. Texture & Pattern

Texture is fundamental. Every surface should feel like it's been through a
photocopier at least once.

### Texture Types
- **Paper grain** — Subtle warm noise on backgrounds. Opacity 3–8%.
- **Photocopy noise** — Heavier, grittier for accent areas/hero sections. Opacity 5–15%.
- **Ink bleed** — Slightly soft/rough edges on text blocks. Display moments and packaging only.
- **Halftone dot** — Sparingly, for photographic treatments. Dots should be visible and graphic.

### SVG Noise Overlay (use on body or containers)
```css
background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256'
  xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence
  type='fractalNoise' baseFrequency='0.85' numOctaves='4'
  stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25'
  filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
```

Apply as `body::before` with `position: fixed; inset: 0; pointer-events: none;
z-index: 10000;` for a page-wide grain overlay.

### Optional Scanline Effect
```css
body::after {
  content: '';
  position: fixed; inset: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px,
    rgba(0,0,0,0.006) 2px, rgba(0,0,0,0.006) 4px);
  pointer-events: none; z-index: 9999;
}
```

---

## 6. Layout Principles

- **Grid:** 12-column for digital. Print can flex, but content stays structured
  even when elements are rotated or offset.
- **Rotation:** On interactive pages (web, app), all elements sit straight at
  rest and rotate 1–3° on hover, returning on mouse-out. No exceptions — a
  tilted element on a web page looks like broken CSS, not like a design
  choice. On static media (print, packaging, PDF), resting rotation of 1–3°
  is fine since there's no hover. Never rotate body copy. Max two rotated
  elements per page/screen on static media.
- **Offset:** Elements can break the grid slightly — overlapping edges, bleeding
  off frames. Intentional, not sloppy.
- **Black boxes:** Reversed-out text blocks are a core device. Use for emphasis,
  pull quotes, key stats, ingredient callouts.
- **Borders:** Thick black borders (4–6pt / 3–4px) around content blocks.

---

## 7. Infographics & Visual Devices

We do NOT use stock icons or polished vector illustrations. Our visual devices
are stenciled, stamped, and hand-marked.

### Device Inventory
- **Stencil stamps** — Rough-bordered round/rect marks. On interactive pages,
  sit straight and tilt 1–3° on hover. On print/static, can sit with resting
  tilt. ("REAL FOOD", "3 INGREDIENTS", "80 KCAL", "NO BS")
- **The Bar Mark** — The orange "I" from CARDIO extracted as standalone element.
  Vertical bar in Signal Orange. Separator, bullet replacement, visual punctuation.
- **Tally marks** — Hand-scratched tallies for counts/comparisons. Rawer than
  bar charts.
- **Strikethrough** — Words crossed out with rough, slightly angled line. Looks
  hand-drawn. For rejecting industry language. ("~~PROPRIETARY~~", "~~ENGINEERED~~")
- **Corner stamps** — Small labels in corners of layouts, like QC marks on
  manufactured goods. Same rotation rule: hover-tilt on web, resting-tilt on print.

### Icon Rules
- On interactive pages: stamps sit straight, rotate 1–3° on hover
- On static media: stamps can have resting rotation of 1–3°
- Rough or uneven borders
- Monochrome or accent-only
- Marks must be functional, not decorative
- No rounded corners on stamps
- No gradient fills
- No stock icon libraries
- No illustrative icons (running figures, honey jars, mountain silhouettes)

---

## 8. Brand Voice

### Voice Principles
| Principle   | NOT           |
|-------------|---------------|
| Direct      | Aggressive    |
| Wry         | Sarcastic     |
| Confident   | Arrogant      |
| Inclusive    | Performative  |
| Honest      | Preachy       |

### Tonality by Context
| Context          | Tone                | Example |
|------------------|---------------------|---------|
| Product page     | Direct, factual     | "Honey, tapioca syrup, sea salt. 80 calories per sachet." |
| Social media     | Conversational, wry | "Somewhere between mile 40 and 50, you'll be glad this doesn't taste like birthday cake." |
| Customer support | Warm, helpful       | "That's frustrating — let's sort it out." |
| Brand story      | Reflective, confident | "We started with a question: does it have to be this complicated?" |
| Crisis           | Accountable, calm   | "We got this wrong. Here's what happened and what we're doing about it." |

### Messaging Pillars (every piece connects to at least one)
1. **Radical Simplicity** — Three ingredients. No mystery.
2. **Science That Serves** — Anti-bullshit, not anti-science. 0.8:1 ratio is research-backed.
3. **No Markup for Marketing** — Price is consequence of philosophy, not the value prop.
4. **Built for the Long Haul** — Not optimizing your next PR. Making fuel for the next 20 years.

### Product Experience Language
Never use vague sensory language. Name the real thing.

| Instead of        | Say |
|-------------------|-----|
| "Delicious flavor" | "Tastes like honey with a salt finish. Not sweet enough to turn your stomach at mile 50." |
| "Smooth texture"  | "Thick like warm honey. Pours, doesn't drip." |
| "Easy to digest"  | "Your stomach already knows these ingredients." |
| "Great taste"     | "The salt cuts the sweetness. Sachet 12 goes down as easy as sachet one." |

---

## 9. Lexicon

### Words We Use
fuel, simple, real, works, long, steady, everyone, honest, easy, enough

### Words We Avoid
| Avoid                   | Why                           | Use Instead                  |
|-------------------------|-------------------------------|------------------------------|
| optimize / hack         | Tech-bro energy               | "fuel well" / "works"        |
| engineered              | Implies complexity is feature | "made" / "mixed"             |
| elite                   | Gatekeeping                   | "endurance athletes" / "you" |
| proprietary             | We reject this entirely       | "our recipe"                 |
| clean / pure            | Wellness-coded, vague         | "simple" / "straightforward" |
| revolutionary           | Hype word                     | "different" / just describe  |
| crush / dominate        | Aggressive performance        | "finish" / "keep going"      |
| natural                 | Legally meaningless            | Name the actual ingredients  |

### Style Rules
- Contractions: yes.
- Exclamation points: sparingly. One per email max. Never in headlines.
- Oxford comma: yes.
- Capitalization: sentence case for headlines.
- Numbers: spell out one–nine, numerals for 10+.
- Sentence length: vary. Short for emphasis. Longer when explaining. Default shorter.

### Content Guardrails

These are factual and strategic constraints. Violating them produces misleading
content, not just off-brand content.

**Ingredient order:** Always list ingredients in descending order by weight:
honey, tapioca syrup, sea salt. This is an FDA/FSSAI labeling requirement and
must be consistent everywhere — copy, packaging, taglines, stamps. Never
rearrange for aesthetic or phonetic reasons.

**Pricing discipline:** We don't lead with price. The low cost is a consequence
of using simple ingredients, not the value proposition. Don't display price as a
headline stat alongside kcal and ratio. Don't frame messaging around "only
$1.50" or "not $3." The messaging pillar is "No Markup for Marketing" — explain
the philosophy, don't shout the number.

**Ratio specificity:** Never write "0.8:1 ratio" without specifying what the
ratio measures. Always write "0.8:1 fructose:glucose" or "0.8:1
fructose-to-glucose ratio." Athletes and skeptics will ask "ratio of what?" —
answer it before they have to.

**Consumption claims:** Don't imply a sachet-per-hour cadence or tie specific
sachet numbers to specific hours. Consumption rate varies by effort intensity,
body weight, conditions, and athlete preference. It's fine to say "sachet 12
goes down as easy as sachet one" (palatability over volume). It's not fine to
say "by hour six, sachet six" (implies a dosing schedule we don't prescribe).

---

## 10. Photography & Imagery

Use photography sparingly. When used:
- **Mood:** Candid, mid-effort, unglamorous. Hands on knees, salt-crusted faces.
- **Treatment:** High contrast B&W with heavy grain. Halftone for print.
- **Subjects:** Hands, feet, trails, gear flat-lays, aid station chaos, pre-dawn parking lots.
- **Inclusivity:** All body types, all speeds. Back-of-pack = front-of-pack.

**Never:** Studio-lit product shots, stock athlete photography, aspirational
lifestyle imagery, HDR treatments, saturation boosting.

---

## 11. Digital Applications

### Website
Typography-led, high contrast, texture and grain throughout. Background:
Newsprint with paper grain overlay. Nav: Courier Prime Bold, uppercase, minimal.
Product cards: thick black border, slight rotation on hover. Buttons: black fill
with newsprint text; Signal Orange fill for primary CTA.

### Social Media
Pages torn from a zine. High contrast, typography-forward. Instagram grid
alternates black-on-white and white-on-black. Stories: raw, Courier Prime text
overlays with grain.

### Email
Plain text aesthetic. Minimal HTML. Should look like the founder typed it.
Courier Prime headings, system sans-serif body. No hero images. No elaborate
templates.

---

## 12. Packaging

The sachet is the most important brand touchpoint.

**Front hierarchy:**
1. CHRONIC CARDIO — brand name, largest element
2. HONEY · TAPIOCA · SALT — full ingredient list IS the product description
3. 80 kcal — energy content, prominent
4. "Stupid distances. Simple fuel." — tagline, small Courier Prime

**Materials:** Matte/uncoated feel over gloss. Kraft or unbleached stock when
possible. Black ink dominant, Signal Orange as spot color. Easy-tear notch
mandatory.

---

## 13. The Wordmark

`CHRONIC CARD<span style="color: #EF6C00">I</span>O`

The "I" in CARDIO is always Signal Orange. In HTML/React use a span with the
accent color. In plain text contexts, the wordmark is just `CHRONIC CARDIO` in
Space Mono Bold, uppercase, with generous letter-spacing.

---

## 14. Brand Rules — Quick Reference

### DO
- Use hover-rotation on interactive elements (1–3°, return on mouse-out)
- Use resting rotation only on single isolated display elements or in print
- Embrace imperfection — rough borders, texture, misalignment
- Let the type do the work
- Use strikethrough for what we reject
- Add noise/grain to feel printed
- Speak directly, even bluntly
- Show ingredient list prominently (descending by weight)
- Use black and white as primary
- Make product info the design itself
- Use stencil stamps and tally marks
- Use bar marks as visual separators

### DON'T
- Apply resting-state rotation to rows of elements (looks broken, not handmade)
- Use gradients or soft shadows
- Use stock athlete photography
- Use "premium minimalist" aesthetic
- Sound like every other nutrition brand
- Use sciency language to impress
- Hide behind corporate speak
- Make it too clean or polished
- Use more than 3 colors at once
- Use decorative or script fonts
- Reference competitors by name in marketing
- Use stock icons or polished vector illustrations
- Lead with price as primary value proposition

---

## 15. Spacing Scale

Use these values for all padding, margin, and gap. Don't invent arbitrary
spacing — pick from this scale.

```
4px   — Tight: between tally bars, inside corner stamps
8px   — Compact: icon-to-label, badge padding
12px  — Related: between list items, between label and input
16px  — Standard: between paragraphs, card padding (compact), grid gaps
24px  — Grouped: between content blocks, between sections within a card
32px  — Sectional: between major content areas, card padding (standard)
48px  — Regional: between page sections
80px  — Landmark: section-header margin-top, major structural breaks
```

In CSS custom properties:
```css
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-6: 24px;  --space-8: 32px;
--space-12: 48px; --space-20: 80px;
```

---

## 16. Interaction States

Every interactive element needs these states defined. The treatments below keep
the zine aesthetic through interactions instead of falling back to generic
browser defaults.

### Required States

| State          | Treatment |
|----------------|-----------|
| **Default**    | As specified in component patterns |
| **Hover**      | Rotate -1° to -2°, color shift to accent or inverse. Transition 0.2s. |
| **Focus-visible** | 3px solid Signal Orange outline, 2px offset. No box-shadow — outlines only. This is high-contrast and on-brand. |
| **Active/pressed** | Scale 0.98, remove rotation. Feels like pressing ink to paper. |
| **Disabled**   | Opacity 0.35. No color change — just faded, like a photocopy of a photocopy. Cursor: not-allowed. |
| **Loading**    | Pulsing bar mark animation (Signal Orange bar fading in/out at 1.2s interval). No spinners. |
| **Error**      | 3px Alert Red border. Courier Prime error message below field, uppercase, 12px, letter-spacing 1px. |

### Focus-visible CSS
```css
:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
/* Remove default outline for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Loading Animation
```css
@keyframes barPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
.loading-bar {
  width: 6px; height: 24px;
  background: var(--accent);
  animation: barPulse 1.2s ease-in-out infinite;
}
/* Stagger multiple bars with animation-delay */
```

---

## 17. Touch & Accessibility

### Touch Targets
Minimum 44×44px for all interactive elements. Our athletes use phones with
wet, gloved, cold, or fatigued hands — generous targets are a brand value, not
just a compliance checkbox.

- Buttons: minimum height 48px (our standard padding already achieves this)
- Nav links: minimum tap area 44×44px even if text is smaller (use padding)
- Form inputs: minimum height 48px
- Sachet-related interactions (reorder buttons, quantity selectors): minimum 52×52px

### Keyboard Navigation
- All interactive elements reachable via Tab
- Logical tab order (follows visual flow, not DOM hacks)
- Enter/Space activates buttons
- Escape closes modals and dropdowns
- Arrow keys navigate within component groups (tabs, radio groups)

### Color Contrast
Our palette inherently passes WCAG AA:
- Ink (#1A1A1A) on Newsprint (#F5F5F0) → contrast ratio ~15.4:1 ✓
- Newsprint on Ink → same ✓
- Signal Orange (#EF6C00) on Ink → ~4.6:1 ✓ (AA large text)
- Signal Orange on Newsprint → ~3.4:1 ⚠ (use for large text/icons only, not body)

**Rule:** Signal Orange on Newsprint is fine for headlines, stamps, bar marks,
and icons (all large/bold). Never use it for body text or small captions.

---

## 18. QA Checklist

Before shipping any branded artifact, verify:

**Visual system:**
- [ ] Grain/noise overlay is present (body::before or overlay div)
- [ ] Signal Orange is the ONLY accent color used
- [ ] No more than three colors in any composition (ink + newsprint + accent)
- [ ] No gradients, drop shadows, or rounded corners (except stamp-round)
- [ ] All borders are 3px solid
- [ ] No resting-state rotation on any element (web/app only — hover-tilt only)
- [ ] Body copy is NOT rotated

**Typography:**
- [ ] Space Mono for headings, Courier Prime for captions, DM Sans for body
- [ ] No decorative or script fonts anywhere
- [ ] Uppercase display text has letter-spacing 2–4%
- [ ] Google Fonts import is present and loads all three families

**Wordmark:**
- [ ] "I" in CARDIO is Signal Orange (#EF6C00)
- [ ] Space Mono Bold, uppercase, letter-spacing 3px+

**Content accuracy:**
- [ ] Ingredients listed in descending weight order: honey, tapioca syrup, sea salt
- [ ] Ratio always written as "0.8:1 fructose:glucose" (not bare "0.8:1")
- [ ] No pricing displayed as a headline stat or primary value prop
- [ ] No sachet-per-hour dosing claims

**Interaction & accessibility:**
- [ ] All interactive elements have focus-visible state (orange outline)
- [ ] Touch targets minimum 44×44px
- [ ] Signal Orange not used for small body text on newsprint background
- [ ] Loading states use bar-pulse animation, not spinners

**The final test:** Does it look like it came from a photocopier or a design
agency? If design agency — revise.

---

## Component Patterns

For ready-to-use CSS variables, HTML component patterns (black boxes, stamps,
buttons, tables, cards, navigation, hero sections), and complete page templates,
read `references/components.md`. That file contains production-ready code
snippets that implement this design system.
