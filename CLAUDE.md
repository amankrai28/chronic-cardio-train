# CLAUDE.md — Chronic Cardio Training Plan Tool

> Read this file completely before every session. It is the single source of
> context for building train.chroniccardio.com.

---

## What This Is

A free, open-source training plan generator for ultramarathon runners.
Users connect their Strava account, we analyze their training history, and
we generate a personalized daily training plan using evidence-based coaching
principles. The tool lives at `train.chroniccardio.com`.

**Parent brand:** Chronic Cardio — an endurance nutrition company.
**Brand philosophy:** "Open source endurance." We published every gel recipe.
Now we're publishing the training methodology. Same principle: transparent,
accessible, no gatekeeping.

**This is not a monetized product.** No paywalls, no paid tiers, no Stripe.
Free for everyone. MIT licensed.

---

## Architecture

```
train.chroniccardio.com (Vercel)
├── Next.js 14+ (App Router) + Tailwind CSS
├── Strava OAuth for auth + data
├── Supabase (Postgres) for persistence
├── Deterministic plan generation (NO LLM for plans)
└── Optional: Claude API for dashboard narrative polish only
```

### Why No LLM for Plan Generation

Strava's API agreement (Section 2.14.4) prohibits using Strava data for
AI/ML model training. While inference (not training) is arguably compliant,
we avoid the gray area entirely. The plan generation engine is fully
deterministic — coded rules, not AI output. Claude API is used ONLY to
polish dashboard insight card narratives from derived metrics (not raw
Strava data), which is clearly permissible.

### Supabase Project

- **Project:** `chronic-cardio-train`
- **Project ID:** `irvtnbpqtphuexhpgmrl`
- **Region:** us-east-1
- **URL:** `https://irvtnbpqtphuexhpgmrl.supabase.co`

### Database Schema

Four tables, all with RLS enabled (service_role access only):

**users** — Strava athlete profiles + OAuth tokens
- `id` (UUID PK), `strava_athlete_id` (BIGINT UNIQUE), `strava_access_token`,
  `strava_refresh_token`, `strava_token_expires_at`, `firstname`, `lastname`,
  `city`, `country`, `profile_photo_url`, `created_at`, `updated_at`

**activities** — Cached Strava activity data
- `id` (BIGINT PK — Strava activity ID), `user_id` (FK → users),
  `type`, `name`, `start_date`, `distance` (meters), `moving_time` (seconds),
  `elapsed_time`, `total_elevation_gain`, `average_heartrate`, `max_heartrate`,
  `suffer_score`, `fetched_at`

**athlete_metrics** — Computed analytics derived from activities
- `user_id` (UUID PK, FK → users), `total_runs`, `total_distance_km`,
  `total_time_hours`, `years_running`, `current_weekly_avg_km`,
  `current_runs_per_week`, `current_avg_pace`, `current_avg_hr`,
  `max_recorded_hr`, `peak_weekly_volume_km`, `peak_monthly_volume_km`,
  `longest_single_run_km`, `longest_recent_run_km`, `fastest_10k_time_seconds`,
  `hr_zone_distribution` (JSONB), `strength_sessions_count`,
  `strength_frequency_per_week`, `detected_gaps` (JSONB),
  `detected_races` (JSONB), `seasonal_pattern` (JSONB),
  `cross_training` (JSONB), `computed_at`

**plans** — Generated training plans
- `id` (UUID PK), `user_id` (FK → users), `race_name`, `race_distance`,
  `race_date`, `terrain`, `goal_type`, `previous_time_seconds`,
  `target_time_seconds`, `start_volume_km`, `peak_volume_km`,
  `training_days_per_week`, `injury_conservative` (BOOLEAN),
  `plan_weeks`, `weekly_plan` (JSONB), `daily_plan` (JSONB),
  `plan_metadata` (JSONB), `created_at`

**Indexes:** `idx_activities_user_date`, `idx_activities_user_type`, `idx_plans_user`

---

## File Structure

```
chronic-cardio-train/
├── CLAUDE.md                          ← You are here
├── docs/
│   ├── training-principles.md         ← Coaching philosophy + periodization rules
│   ├── product-spec.md                ← UX flow + screen specs
│   ├── technical-architecture.md      ← Full tech spec
│   ├── strava-data-intelligence.md    ← Inference algorithms
│   ├── brand-system.md                ← Visual identity
│   └── brand-components.md            ← CSS/HTML component patterns
├── src/
│   ├── app/
│   │   ├── page.tsx                   ← Landing page
│   │   ├── dashboard/
│   │   │   └── page.tsx               ← Screen 3: Running profile (wow moment)
│   │   ├── plan/
│   │   │   ├── setup/page.tsx         ← Screen 4: Smart defaults
│   │   │   ├── [id]/page.tsx          ← Screen 5: Plan view (weekly + daily)
│   │   │   └── [id]/export/route.ts   ← PDF / iCal export
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── strava/route.ts    ← OAuth redirect
│   │   │   │   ├── callback/route.ts  ← OAuth callback
│   │   │   │   └── refresh/route.ts   ← Token refresh
│   │   │   ├── strava/
│   │   │   │   └── sync/route.ts      ← Fetch + cache activities
│   │   │   ├── athlete/
│   │   │   │   ├── profile/route.ts   ← Computed profile for dashboard
│   │   │   │   └── defaults/route.ts  ← Smart defaults for plan setup
│   │   │   └── plan/
│   │   │       ├── generate/route.ts  ← Plan generation (deterministic)
│   │   │       └── [id]/route.ts      ← Get saved plan
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ProfileCard.tsx
│   │   ├── SmartDefault.tsx
│   │   ├── WeekCard.tsx
│   │   ├── DayRow.tsx
│   │   ├── VolumeChart.tsx
│   │   ├── PhaseIndicator.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── LoadingBar.tsx             ← Brand loading animation (bar pulse)
│   ├── lib/
│   │   ├── strava.ts                  ← Strava API client + token refresh
│   │   ├── metrics.ts                 ← All metric computation (Doc 4 algorithms)
│   │   ├── plan-builder.ts            ← Deterministic plan generator (Doc 1 rules)
│   │   ├── templates.ts               ← Dashboard insight card templates
│   │   ├── supabase.ts                ← Supabase client (service_role)
│   │   └── utils.ts                   ← Formatters, time helpers
│   └── styles/
│       └── globals.css                ← Tailwind + brand tokens as CSS vars
├── public/
│   └── fonts/                         ← If self-hosting (otherwise Google Fonts CDN)
├── tailwind.config.ts
├── next.config.ts
├── .env.local                         ← See Environment Variables below
└── package.json
```

---

## Environment Variables

```env
# Strava OAuth
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
NEXT_PUBLIC_STRAVA_REDIRECT_URI=https://train.chroniccardio.com/api/auth/callback

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://irvtnbpqtphuexhpgmrl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=

# Optional: Claude API for dashboard narrative polish
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://train.chroniccardio.com
```

For local development, use `http://localhost:3000` for redirect URI and app URL.

---

## User Flow

```
Landing Page → [Connect Strava] → OAuth → Loading → Dashboard (wow moment)
                                                        ↓
                                                 [Get My Plan] → Smart Defaults
                                                                    ↓
                                                              Confirm → Plan Generated
```

**Total time from landing to plan: <3 minutes.**
**Questions asked: 2 (race goal + optimization target). Everything else inferred.**

---

## Screen Specifications

### Screen 1: Landing Page (`/`)

Hero: "Your Strava data. A real plan. Zero guesswork."
Single CTA: [Connect Strava] button (Signal Orange)
Below fold: 3 proof points + link to open-source methodology
Footer: link back to chroniccardio.com

### Screen 2: Loading (`/dashboard` with loading state)

Bar-pulse loader (brand animation, NOT a spinner).
Text progression: "Pulling your runs..." → "Crunching {N} activities..." → "Almost there..."

### Screen 3: Dashboard — THE WOW MOMENT (`/dashboard`)

This is the most important screen. It must feel personal, not generic.
Single scrollable page with insight cards:

1. **Identity** — Name, location, running since, total stats
2. **Current Fitness** — Weekly avg, runs/week, easy pace + HR, Z3 callout if applicable
3. **Your Ceiling** — Peak week, longest run, peak month, best efforts
4. **Consistency Pattern** — Best/worst months, gap analysis
5. **Detected Concerns** — Injury gaps, HR zone warning, cross-training, race completions
6. **Race History** — Auto-detected from activity names + distances

Bottom CTA: [Get My Training Plan →]

### Screen 4: Smart Defaults (`/plan/setup`)

**This is NOT a form. It's a confirmation screen.**
Everything is pre-filled from computed metrics. User confirms or adjusts.

Section A (asked fresh): Race distance, date, terrain, goal type
Section B (inferred, confirm/tweak): Starting volume, peak volume, training days, injury management, HR zone fix

Each default card shows: the value, the data-backed rationale, and an "Actually..." adjustment option.

### Screen 5: Plan View (`/plan/[id]`)

Full weekly + daily plan. Includes:
- Volume progression chart
- Phase breakdown (base → build → peak → taper)
- Weekly cards with daily detail
- Strength training sessions
- Nutrition notes on long run days
- Export options (PDF, iCal)

---

## Strava API Details

### OAuth
```
Authorization: https://www.strava.com/oauth/authorize
Token: https://www.strava.com/oauth/token
Scopes: read_all,activity:read_all,profile:read_all
```

### Rate Limits
- 100 requests per 15 minutes
- 1,000 requests per day
- Activities endpoint: paginated, max 200/page
- Typical user needs ~4-5 requests (800 activities / 200 per page)

### Token Refresh
Strava tokens expire every 6 hours. ALWAYS check `token_expires_at` before
any API call. If expired, refresh using `refresh_token` → store new tokens
in Supabase.

### Data to Fetch per Activity
`start_date`, `type`, `distance`, `moving_time`, `elapsed_time`,
`total_elevation_gain`, `average_heartrate`, `max_heartrate`,
`suffer_score`, `name`, `id`

---

## Metric Computation Engine (`lib/metrics.ts`)

All algorithms are deterministic. Implement exactly as specified.

### Starting Volume Inference
- Method 1: Last 4 weeks average
- Method 2: Best 4-week block in last 3 months
- If best_recent > recent_avg × 1.4: use midpoint (capable volume)
- Otherwise: use recent average
- Round to nearest 5km

### Peak Volume Inference
- `peak = min(lifetime_peak × 1.15, distance_appropriate_target)`
- Never prescribe >15% above proven max
- Distance targets by goal type:

| Race | Finish | Beat Time | Compete |
|------|--------|-----------|---------|
| 50K | 70 | 85 | 95 |
| 50Mi | 85 | 105 | 115 |
| 100K | 95 | 115 | 130 |
| 100Mi | 100 | 120 | 140 |
| 200Mi+ | 120 | 140 | 160 |

### HR Zone Analysis
- Use actual max HR from data (highest `max_heartrate` recorded)
- Z1: <65%, Z2: 65-75%, Z3: 76-85%, Z4: 86-92%, Z5: >92%
- Flag if Z3-Z5 > 50% of runs: "Your easy runs aren't easy enough"
- Z2 cap = max_hr × 0.75

### Training Gap Detection
- Find gaps >14 days between runs
- Scan nearby activity names for injury keywords:
  `injury, injured, hurt, pain, broken, fracture, tibia, calf, knee,
  ankle, shin, stress, recovery, rehab, busted, sore, physio, PT,
  doctor, rest, off, DNF, dropped`

### Race Detection
- Match distances to standard race distances (±5%):
  5K, 10K, half marathon, marathon, 50K, 50 mile, 100K, 100 mile
- Scan activity names for race keywords:
  `race, marathon, ultra, challenge, event, 100 miler, 100k, 50k,
  50 mile, half marathon, HM, 10K, miler, trail race`
- High suffer_score (>200) + long distance (>40km) = likely race

### Training Days Inference
- Recent frequency: average runs/week over last 8 weeks
- Best frequency: best 8-week block in last year
- Suggested = max(round(best_freq), round(recent_freq) + 1)
- Clamp to 4-6 (never suggest 7)

---

## Plan Builder Engine (`lib/plan-builder.ts`)

Generates a complete daily training plan from computed metrics + race goal.
Fully deterministic — rules from the coaching principles document.

### Periodization (4 phases)

| Phase | % of Total Weeks | Focus |
|-------|-----------------|-------|
| BASE | 25-30% | Z2 discipline, speed stimulus 1×/week, strength 2×/week |
| BUILD | 30-35% | Volume ramp, back-to-backs, tempo work 1×/week |
| PEAK | 25-30% | Race-specific endurance, full rehearsals |
| TAPER | 10-15% (min 2 weeks) | Volume reduction, maintain some intensity |

### Volume Progression
- Max 10% increase per week from starting volume
- Cutback week every 3-4 weeks: reduce 30-40%, maintain frequency
- After cutback, resume at pre-cutback volume + increment
- If injury history: cap at 7% per week during base

### The 80/20 Rule
- 80% of weekly volume at Z1-Z2
- 20% at Z3+
- This is the most commonly violated principle. Flag it prominently.

### Long Run Caps

| Race | Max Single Long Run |
|------|-------------------|
| 50K | 30-35 km |
| 50Mi | 35-42 km |
| 100K | 38-45 km |
| 100Mi | 40-50 km |
| 200Mi+ | 45-55 km |

### Back-to-Back Rules
- Saturday = harder/longer, Sunday = easier/shorter
- Sunday starts easy (first 3km Z1-Z2 regardless)
- Total B2B weekend ≤ 65-75% of weekly volume
- Introduce in late base or early build

### Daily Plan Structure
Each day specifies:
1. Run type (Easy, Long, Quality, B2B, Recovery, Rest)
2. Distance or time
3. Intensity zone
4. Workout details (if quality session)
5. Strength notes (if applicable)
6. Special notes (nutrition practice, night run, gear test)

### Cutback Week Rules
- Every 3-4 weeks
- Reduce volume 30-40%
- Same number of runs, just shorter
- Replace quality with easy + strides
- NON-NEGOTIABLE

### Nutrition Notes (embedded in plan)
- Base: "Start thinking about your race nutrition plan."
- Build: "Practice 200-250 cal/hr on every long run."
- Peak: "Nutrition plan must be LOCKED by now."
- Taper: "You know what works. Trust it."

### Strength Training
- Base: 2×/week (lower body compound + running-specific)
- Build: 1×/week (maintenance)
- Peak: 0-1×/week (bodyweight only)
- Taper: None

---

## Dashboard Insight Templates (`lib/templates.ts`)

Pre-written conditional templates for insight cards. Structure:

```typescript
function generateInsight(metric: string, data: AthleteMetrics): InsightCard {
  // Conditional logic based on computed metrics
  // Returns: { title, value, narrative, severity?, actionable? }
}
```

Key conditionals to implement:
- If Z3+Z4 > 50%: HR zone warning card
- If gap detected in last 12 months with injury keywords: injury management card
- If current_avg < best_recent × 0.6: "rebuilding" narrative
- If no HR data: skip HR analysis, note limitation
- If <50 total activities: insufficient data message
- If no runs in 30 days: conservative base-building note
- If race_date < 8 weeks away: tight timeline warning

The narrative tone should be direct, coaching-like, evidence-grounded.
Match the brand voice: confident but not preachy, permission-giving, wry.

---

## Brand System

### Identity
Zine/punk aesthetic. Photocopied manifesto energy. This is a deliberate
rejection of the polished sports-tech look.

**The approval test:** Does this look like it came from a photocopier or a
design agency? If design agency — revise.

### Colors
```css
:root {
  --ink: #1A1A1A;           /* Primary text, backgrounds, borders */
  --newsprint: #F5F5F0;     /* Background — warm off-white */
  --accent: #EF6C00;        /* Signal Orange — SOLE accent */
  --mid-gray: #666666;      /* Secondary text */
  --light-gray: #E8E8E3;    /* Subtle borders */
  --alert-red: #CC0000;     /* Errors only */
  --confirm-green: #2D7D46; /* Success only */
}
```

Rules: Ink + Newsprint = 85%+ of any composition. Signal Orange is the ONLY
accent. No gradients. No drop shadows. Max 3 colors per composition.

### Typography
```
Display/Headings:  Space Mono Bold 700
Captions/Labels:   Courier Prime (400, 700, 400i)
Body/Subheads:     DM Sans (300-600)
```

Google Fonts import:
```
https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Space+Mono:wght@400;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap
```

### Wordmark
`CHRONIC CARD<span style="color: #EF6C00">I</span>O`
The "I" in CARDIO is always Signal Orange.

### Texture
Paper grain overlay on every page (SVG noise, opacity 0.04):
```css
body::before {
  content: '';
  position: fixed; inset: 0;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 10000;
}
```

### Key Visual Patterns
- **Borders:** 3px solid, always
- **Black boxes:** Reversed-out text blocks for emphasis
- **Loading:** Bar-pulse animation (Signal Orange bars), NEVER spinners
- **Hover:** Elements rotate -1° to -2° on hover, return on mouse-out
- **No resting-state rotation** on web (hover only)
- **Touch targets:** Minimum 44×44px (athletes use phones with wet/cold hands)

### Spacing Scale
```
4px / 8px / 12px / 16px / 24px / 32px / 48px / 80px
```

### Component Patterns

**Primary Button:**
```css
font-family: 'Space Mono', monospace;
font-weight: 700; font-size: 14px;
letter-spacing: 2px; text-transform: uppercase;
background: var(--ink); color: var(--newsprint);
border: 3px solid var(--ink);
padding: 14px 30px;
/* Hover: bg → accent, rotate(-1deg) */
```

**Orange CTA Button:**
Same as primary but `background: var(--accent); border-color: var(--accent);`
Hover: `background: var(--ink); border-color: var(--ink);`

**Table:**
```css
border-collapse: collapse; border: 3px solid var(--ink);
th: bg ink, color newsprint, Courier Prime 12px uppercase, letter-spacing 3px
td: padding 14px 16px, border-bottom 1px solid light-gray
```

**Card:**
```css
border: 3px solid var(--ink); background: var(--newsprint); padding: 30px;
hover: transform rotate(-1deg) scale(1.02);
```

See `docs/brand-components.md` for full CSS patterns.

---

## Build Order

Build in this order. Each step is independently deployable and testable.

### Session 1: Landing Page + Strava OAuth (~2 hours)
- Scaffold Next.js project
- Configure Tailwind with brand tokens
- Build landing page (on-brand)
- Implement Strava OAuth flow (redirect → callback → token storage in Supabase)
- Test: User can connect Strava and get redirected to dashboard

### Session 2: Activity Sync + Metric Computation (~3 hours)
- Build Strava API client with pagination and token refresh
- Implement activity fetching and caching in Supabase
- Build full metric computation engine (all algorithms from this doc)
- Test: After OAuth, activities are cached and metrics computed

### Session 3: Dashboard — The Wow Moment (~3 hours)
- Build all 6 insight card components
- Implement conditional template logic
- Wire to computed metrics from Supabase
- Loading state with bar-pulse animation
- Test: User sees their personalized running profile

### Session 4: Smart Defaults + Plan Setup (~2 hours)
- Build smart default cards with pre-filled values
- Implement "Actually..." adjustment interactions
- Race goal input section
- Wire defaults to metric computation output
- Test: User can review and confirm plan parameters

### Session 5: Plan Generation Engine (~4 hours)
- Implement deterministic plan builder (the hardest piece)
- Periodization phase calculator
- Volume progression with cutback weeks
- Daily plan detail generator
- Back-to-back logic
- Strength training integration
- Nutrition notes per phase
- Save plan to Supabase
- Test: Plan generates correctly for multiple race distance/goal combos

### Session 6: Plan Display + Export (~2 hours)
- Weekly overview with phase indicators
- Daily detail view
- Volume progression chart
- PDF export
- iCal export
- Mobile responsive pass

### Session 7: Polish + Connect (~1 hour)
- Error states (no HR data, insufficient activities, tight timeline)
- Add "Training Plan" link to Shopify nav at chroniccardio.com
- Final brand QA pass

---

## Important Constraints

1. **Strava compliance:** Never send raw Strava activity data to any AI/ML
   service. All computation is server-side deterministic code. Only derived
   metrics (numbers, not activity data) may optionally go to Claude API for
   narrative polish.

2. **Strava data caching:** Per Strava API agreement Section 7.1, cached
   data must not remain longer than 7 days. Implement a `fetched_at` check
   and re-sync if stale.

3. **Data display:** Per Section 2.10, only show a user their own data.
   Never display one user's data to another.

4. **Strava branding:** Must display "Powered by Strava" with their logo
   per brand guidelines. Include links for users to navigate to their
   Strava accounts.

5. **No spinners.** Brand loading pattern is bar-pulse animation only.

6. **Signal Orange is the only accent.** Do not introduce additional colors.

7. **Touch targets minimum 44×44px.** Athletes use phones with wet hands.

---

## Testing

Run the dev server:
```bash
npm run dev
```

Test against: `http://localhost:3000`

For Strava OAuth testing, use the dev callback URL:
`http://localhost:3000/api/auth/callback`

Ensure both callback URLs (localhost + production) are registered in
the Strava API application settings.
