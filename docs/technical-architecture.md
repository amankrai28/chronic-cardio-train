# Chronic Cardio Training Plan Tool — Technical Architecture

> This document is the engineering blueprint. It defines the stack, API structure,
> data model, and implementation plan.
> Key changes from original: no monetization (Stripe removed), no AI plan
> generation (deterministic engine), actual Supabase project details included.

---

## 1. ARCHITECTURE OVERVIEW

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND                           │
│        train.chroniccardio.com                       │
│        Next.js (App Router) + Tailwind               │
│        Hosted on Vercel                              │
│                                                      │
│   Landing → OAuth → Dashboard → Defaults → Plan      │
└──────────────┬──────────────────────┬────────────────┘
               │                      │
               ▼                      ▼
┌──────────────────────┐  ┌────────────────────────────┐
│    STRAVA API         │  │    SUPABASE                 │
│                       │  │    chronic-cardio-train      │
│  OAuth token exchange │  │    irvtnbpqtphuexhpgmrl     │
│  Activity fetching    │  │                             │
│  Athlete profile      │  │  - User profiles            │
│                       │  │  - Cached Strava data       │
└──────────────────────┘  │  - Computed metrics          │
                           │  - Generated plans           │
                           └──────────────┬───────────────┘
                                          │
                                          ▼
                           ┌──────────────────────────────┐
                           │   DETERMINISTIC PLAN ENGINE    │
                           │                                │
                           │   lib/plan-builder.ts          │
                           │   Rules from principles doc    │
                           │   Input: computed metrics      │
                           │   Output: structured JSON plan │
                           └──────────────────────────────┘

                           ┌──────────────────────────────┐
                           │   OPTIONAL: CLAUDE API         │
                           │                                │
                           │   Dashboard narrative polish    │
                           │   Input: derived metrics ONLY   │
                           │   NOT raw Strava data          │
                           └──────────────────────────────┘
```

---

## 2. TECH STACK

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14+ (App Router) | SSR for landing, client for dashboard. Vercel-native. |
| Styling | Tailwind CSS + CC brand tokens | Brand system already defined in CSS vars. |
| Hosting | Vercel | Free tier sufficient for MVP. Edge functions for API. |
| Database | Supabase (Postgres) | Free tier. Project: `chronic-cardio-train`. |
| Auth | Strava OAuth 2.0 (custom) | No auth library needed — just token exchange. |
| Plan Engine | Deterministic TypeScript | `lib/plan-builder.ts`. Rules-based, no AI. |
| Analytics | Vercel Analytics or Plausible | Privacy-friendly, lightweight. |

---

## 3. DATABASE SCHEMA (SUPABASE)

**Project:** `chronic-cardio-train`
**Project ID:** `irvtnbpqtphuexhpgmrl`
**Region:** us-east-1
**URL:** `https://irvtnbpqtphuexhpgmrl.supabase.co`

Schema is already deployed. RLS enabled on all tables (service_role access only).

```sql
-- Users: linked to Strava athlete ID
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strava_athlete_id BIGINT UNIQUE NOT NULL,
  strava_access_token TEXT NOT NULL,
  strava_refresh_token TEXT NOT NULL,
  strava_token_expires_at TIMESTAMPTZ NOT NULL,
  firstname TEXT,
  lastname TEXT,
  city TEXT,
  country TEXT,
  profile_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cached activity data (raw from Strava)
CREATE TABLE activities (
  id BIGINT PRIMARY KEY,  -- Strava activity ID
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  distance FLOAT NOT NULL,  -- meters
  moving_time INT NOT NULL,  -- seconds
  elapsed_time INT,
  total_elevation_gain FLOAT,
  average_heartrate FLOAT,
  max_heartrate FLOAT,
  suffer_score FLOAT,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

-- Computed athlete metrics (derived from activities)
CREATE TABLE athlete_metrics (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_runs INT,
  total_distance_km FLOAT,
  total_time_hours FLOAT,
  years_running FLOAT,
  current_weekly_avg_km FLOAT,
  current_runs_per_week FLOAT,
  current_avg_pace FLOAT,  -- min/km
  current_avg_hr FLOAT,
  max_recorded_hr FLOAT,
  peak_weekly_volume_km FLOAT,
  peak_monthly_volume_km FLOAT,
  longest_single_run_km FLOAT,
  longest_recent_run_km FLOAT,  -- last 6 months
  fastest_10k_time_seconds INT,
  hr_zone_distribution JSONB,
  strength_sessions_count INT,
  strength_frequency_per_week FLOAT,
  detected_gaps JSONB,
  detected_races JSONB,
  seasonal_pattern JSONB,
  cross_training JSONB,
  computed_at TIMESTAMPTZ DEFAULT now()
);

-- Generated training plans
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  race_name TEXT,
  race_distance TEXT NOT NULL,
  race_date DATE NOT NULL,
  terrain TEXT,
  goal_type TEXT NOT NULL,
  previous_time_seconds INT,
  target_time_seconds INT,
  start_volume_km FLOAT NOT NULL,
  peak_volume_km FLOAT NOT NULL,
  training_days_per_week INT NOT NULL,
  injury_conservative BOOLEAN DEFAULT false,
  plan_weeks INT NOT NULL,
  weekly_plan JSONB NOT NULL,
  daily_plan JSONB,
  plan_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_activities_user_date ON activities(user_id, start_date DESC);
CREATE INDEX idx_activities_user_type ON activities(user_id, type);
CREATE INDEX idx_plans_user ON plans(user_id);
```

---

## 4. API ROUTES

All implemented as Next.js API routes (app/api/...).

### Auth Flow

```
GET /api/auth/strava
→ Redirects to Strava OAuth URL with scopes

GET /api/auth/callback?code=XXX&scope=XXX
→ Exchanges code for tokens
→ Creates/updates user in Supabase
→ Sets session cookie (httpOnly, secure)
→ Redirects to /dashboard

POST /api/auth/refresh
→ Refreshes expired Strava token using refresh_token
→ Updates tokens in Supabase
```

### Data Pipeline

```
POST /api/strava/sync
→ Fetches all activities from Strava (paginated)
→ Upserts into activities table
→ Triggers metric computation
→ Returns: { activities_synced: N, metrics_computed: true }

GET /api/athlete/profile
→ Returns user profile + computed metrics + detected insights
→ This powers Screen 3 (dashboard)

GET /api/athlete/defaults
→ Returns smart defaults for plan generation
→ Computed from metrics: start_volume, peak_volume, training_days,
   injury_conservative flag, hr_zone_warning, detected_races
→ This powers Screen 4 (smart defaults)
```

### Plan Generation

```
POST /api/plan/generate
Body: {
  race_distance: "100Mi",
  race_date: "2026-12-12",
  race_name: "My 100 Miler",
  terrain: "trail",
  goal_type: "beat_time",
  previous_time_seconds: 85680,
  start_volume_km: 70,
  peak_volume_km: 120,
  training_days_per_week: 5,
  injury_conservative: true
}

→ Calls deterministic plan-builder.ts with athlete metrics + request params
→ Stores weekly_plan AND daily_plan in plans table
→ Returns full plan

GET /api/plan/:id
→ Returns saved plan

GET /api/plan/:id/export/ical
→ Generates .ics file from daily plan

GET /api/plan/:id/export/pdf
→ Generates branded PDF from plan data
```

---

## 5. PLAN GENERATION ENGINE

Plan generation is fully deterministic. No AI involved.

### Implementation: `lib/plan-builder.ts`

Takes as input:
- Athlete metrics (from `athlete_metrics` table)
- Plan parameters (race distance, date, terrain, goal type, volumes, days)

Returns:
- `weekly_plan`: High-level weekly structure (JSON)
- `daily_plan`: Full daily breakdown (JSON)
- `plan_metadata`: Principles applied, key changes flagged

### Expected JSON Output Structure (Weekly Plan):

```json
{
  "plan_summary": {
    "total_weeks": 28,
    "total_volume_km": 2230,
    "peak_week_km": 120,
    "phases": [
      {"name": "BASE", "weeks": "1-8", "focus": "Z2 discipline + speed stimulus"},
      {"name": "BUILD", "weeks": "9-17", "focus": "Volume ramp + back-to-backs"},
      {"name": "PEAK", "weeks": "18-24", "focus": "Race-specific endurance"},
      {"name": "TAPER", "weeks": "25-28", "focus": "Freshness + sharpening"}
    ],
    "key_change": "85% of your runs are in Z3-Z4. Shifting to 80% Z2 is the single biggest improvement."
  },
  "weeks": [
    {
      "week": 1,
      "phase": "BASE",
      "date_start": "2026-06-01",
      "total_volume_km": 70,
      "long_run_km": 22,
      "b2b_km": null,
      "quality_summary": "6x800m @ 5:15-5:25/km",
      "strength_sessions": 2,
      "notes": "Week 1 baseline. Every easy run HR <140.",
      "is_cutback": false
    }
  ]
}
```

### Expected JSON Output Structure (Daily Plan):

```json
{
  "weeks": [
    {
      "week": 1,
      "phase": "BASE",
      "date_start": "2026-06-01",
      "days": [
        {
          "day": "Monday",
          "date": "2026-06-01",
          "type": "rest",
          "description": "Full rest day",
          "distance_km": 0,
          "time_minutes": 0,
          "intensity": null,
          "workout_details": null,
          "strength": null,
          "notes": null
        },
        {
          "day": "Tuesday",
          "date": "2026-06-02",
          "type": "easy",
          "description": "Easy Z2 run",
          "distance_km": 10,
          "time_minutes": 62,
          "intensity": "Z2 (HR <140)",
          "workout_details": null,
          "strength": "Session A: 3x10 squats, 3x8 single-leg RDL, 3x12 eccentric calf raises, 3x30s plank",
          "notes": "If HR drifts above 140, walk until it drops."
        },
        {
          "day": "Wednesday",
          "date": "2026-06-03",
          "type": "quality",
          "description": "Speed intervals",
          "distance_km": 10,
          "time_minutes": 58,
          "intensity": "Z2 warm-up/cool-down, Z4 intervals",
          "workout_details": "2km warm-up Z2 → 6x800m @ 5:15-5:25/km with 400m jog recovery → 2km cool-down Z2",
          "strength": null,
          "notes": "Speed stimulus early in the cycle."
        }
      ]
    }
  ]
}
```

---

## 6. STRAVA API DETAILS

### OAuth Flow
```
Authorization URL: https://www.strava.com/oauth/authorize
Token URL: https://www.strava.com/oauth/token
Scopes needed: read_all,activity:read_all,profile:read_all
```

### Rate Limits
- 100 requests per 15 minutes
- 1,000 requests per day
- Activities endpoint: GET /api/v3/athlete/activities (paginated, max 200/page)
- We need ~4-5 requests for a typical user (800 activities / 200 per page)

### Token Refresh
```javascript
// Strava tokens expire every 6 hours
// Check token_expires_at before each API call
// If expired, use refresh_token to get new access_token
const refreshResponse = await fetch("https://www.strava.com/oauth/token", {
  method: "POST",
  body: new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: user.strava_refresh_token
  })
});
```

### Strava Compliance Notes
- **Section 2.14.4:** No raw Strava data may be sent to AI/ML services.
  Plan generation is deterministic. Only derived metrics (computed numbers)
  may optionally go to Claude API for narrative polish.
- **Section 2.10:** Only display a user's own data to that user.
- **Section 7.1:** Cached data must not remain longer than 7 days.
  Check `fetched_at` and re-sync if stale.
- **Branding:** Must display "Powered by Strava" with their logo.

---

## 7. METRIC COMPUTATION (SERVER-SIDE)

After syncing activities, compute all metrics in a single pass.
Implemented in `lib/metrics.ts`.

```javascript
function computeMetrics(activities) {
  const runs = activities.filter(a => a.type === 'Run');
  const now = new Date();

  // Current fitness (last 4 complete weeks)
  const fourWeeksAgo = new Date(now - 28 * 24 * 60 * 60 * 1000);
  const recentRuns = runs.filter(r => new Date(r.start_date) > fourWeeksAgo);

  // Weekly volumes (ISO week bucketing)
  const weeklyVolumes = bucketByISOWeek(runs);

  // Peak detection
  const peakWeek = Math.max(...Object.values(weeklyVolumes).map(w => w.distance));

  // HR zone distribution
  const hrRuns = runs.filter(r => r.average_heartrate > 60);
  const maxHR = Math.max(...runs.filter(r => r.max_heartrate).map(r => r.max_heartrate));
  const zones = computeHRZones(hrRuns, maxHR);

  // Gap detection
  const gaps = detectTrainingGaps(runs);
  const gapsWithContext = gaps.map(g => ({
    ...g,
    context: scanNearbyActivityNames(runs, g.start, g.end)
  }));

  // Race detection
  const races = detectRaces(runs);

  // Strength training
  const strengthActivities = activities.filter(a => a.type === 'WeightTraining');

  return {
    total_runs: runs.length,
    total_distance_km: runs.reduce((s, r) => s + r.distance, 0) / 1000,
    // ... all other fields per schema
  };
}
```

---

## 8. FILE STRUCTURE

```
chronic-cardio-train/
├── CLAUDE.md
├── docs/
│   ├── training-principles.md
│   ├── product-spec.md
│   ├── technical-architecture.md
│   ├── strava-data-intelligence.md
│   ├── brand-system.md
│   └── brand-components.md
├── app/
│   ├── page.tsx                    # Landing page
│   ├── dashboard/
│   │   └── page.tsx                # Screen 3: Running profile
│   ├── plan/
│   │   ├── setup/page.tsx          # Screen 4: Smart defaults
│   │   ├── [id]/page.tsx           # Screen 5: Plan view
│   │   └── [id]/export/route.ts    # PDF / iCal export
│   ├── api/
│   │   ├── auth/
│   │   │   ├── strava/route.ts     # OAuth redirect
│   │   │   ├── callback/route.ts   # OAuth callback
│   │   │   └── refresh/route.ts    # Token refresh
│   │   ├── strava/
│   │   │   └── sync/route.ts       # Fetch + cache activities
│   │   ├── athlete/
│   │   │   ├── profile/route.ts    # Computed profile
│   │   │   └── defaults/route.ts   # Smart defaults
│   │   └── plan/
│   │       ├── generate/route.ts   # Deterministic plan generation
│   │       └── [id]/route.ts       # Get plan
│   └── layout.tsx
├── components/
│   ├── ProfileCard.tsx
│   ├── SmartDefault.tsx
│   ├── WeekCard.tsx
│   ├── DayRow.tsx
│   ├── VolumeChart.tsx
│   ├── PhaseIndicator.tsx
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── LoadingBar.tsx
├── lib/
│   ├── strava.ts                   # Strava API client
│   ├── metrics.ts                  # Metric computation
│   ├── plan-builder.ts             # Deterministic plan generator
│   ├── templates.ts                # Dashboard insight templates
│   ├── supabase.ts                 # Supabase client
│   └── utils.ts                    # Formatters, time helpers
├── styles/
│   └── globals.css
├── .env.local
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 9. MVP BUILD ORDER

Build in this order. Each step is independently deployable and testable.

1. **Landing page + Strava OAuth** (~2 hours)
   Ship: Users can connect Strava and see it works.

2. **Activity sync + metric computation** (~3 hours)
   Ship: Data pipeline works. Activities cached in Supabase.

3. **Dashboard / profile screen** (~3 hours)
   Ship: Users see their running profile. This is the wow moment.

4. **Smart defaults screen** (~2 hours)
   Ship: Pre-filled questionnaire with inference logic.

5. **Deterministic plan generation** (~4 hours)
   Ship: Plan builder generates weekly + daily plan from rules.

6. **Plan display + export (PDF / iCal)** (~2 hours)
   Ship: Users can view and export their plan.

7. **Link from Shopify nav** (~30 minutes)
   Ship: chroniccardio.com nav includes "Training Plan" link.

**Total estimated time: ~16 hours of focused building.**
