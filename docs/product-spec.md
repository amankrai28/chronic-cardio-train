# Chronic Cardio Training Plan Tool — Product Specification

> This document defines the user experience, flow, and screens for the
> training plan generator tool at train.chroniccardio.com.
> This is a free, open-source tool. No paywalls, no paid tiers.

---

## 1. PRODUCT POSITIONING

**One-liner:** Connect your Strava. Get a real training plan. No coaching degree required.

**Why this exists:** Ultrarunners either pay $150-400/month for a coach, follow
a generic PDF plan, or wing it. The gap is a tool that reads your actual training
data and generates a personalized, daily plan grounded in real coaching principles.

**Why Chronic Cardio builds it:** The brand is "open source endurance." We published
every gel recipe. Now we're publishing the training methodology. Same philosophy:
transparent, accessible, no gatekeeping.

**Business model:** Free. Completely free. This tool exists to:
1. Strengthen the open-source thesis (gel recipes → training methodology)
2. Drive traffic to chroniccardio.com (gel sales, brand awareness)
3. Build an email list of engaged ultrarunners
4. Demonstrate the coaching methodology publicly

---

## 2. USER FLOW (3 CLICKS TO VALUE)

```
Landing Page → [Connect Strava] → OAuth → Dashboard (wow moment)
                                            ↓
                                     [Get My Plan] → Smart Defaults Screen
                                                      ↓
                                               Confirm (1-2 taps) → Plan Generated
```

**Total time from landing to plan: <3 minutes.**
**Questions asked: 2 (race goal + optimization target). Everything else inferred.**

---

## 3. SCREEN-BY-SCREEN SPECIFICATION

### Screen 1: Landing Page

**URL:** train.chroniccardio.com

**Content:**
- Hero: "Your Strava data. A real plan. Zero guesswork."
- Subhead: "We read your training history, detect your patterns, and generate
  a daily plan based on how Bitter, Roche, and Koop actually coach."
- Single CTA: [Connect Strava] button (Signal Orange, full-width on mobile)
- Below fold: 3 proof points:
  1. "We analyze your last 2+ years of runs"
  2. "Plans are daily, not weekly"
  3. "Open source methodology — read exactly how it works"
- Link to principles doc (transparency, on-brand)
- Footer: link back to chroniccardio.com

**Technical:** Strava OAuth URL with scopes: `read_all,activity:read_all,profile:read_all`
Callback to: `train.chroniccardio.com/api/auth/callback`

### Screen 2: Loading / Data Pull

**Shown while:** App exchanges OAuth code for token, fetches all activities.
- Animated bar-pulse loader (brand pattern, NOT a spinner)
- Text: "Pulling your runs..." → "Crunching {N} activities..." → "Almost there..."
- Duration: 3-8 seconds depending on activity count.

**Technical:** Fetch all activities via Strava API pagination (`per_page=200`).
Store in Supabase. Compute all metrics.

### Screen 3: Your Running Profile (THE WOW MOMENT)

**This is the most important screen.** This is where the user thinks "holy shit,
it actually understands me." It must feel personal, not generic.

**Layout:** Single scrollable page with cards. Each card is a data insight.

**Cards (in order):**

**Card 1: Identity**
```
AMAN RAI
Ultrarunner · New Haven, CT · Running since 2017
814 runs · 8,115 km lifetime · 872 hours on feet
```
(Profile photo from Strava if available)

**Card 2: Current Fitness**
```
YOUR BASE RIGHT NOW
Weekly average (last 4 weeks): 47 km
Runs per week: 4.2
Average easy pace: 6:05 /km @ 152 bpm avg
→ This puts you in Z3. Your easy runs aren't easy enough.
```
(The Z3 callout is only shown if HR data indicates >50% runs in Z3+)

**Card 3: Your Ceiling**
```
WHAT YOU'VE PROVEN YOU CAN DO
Peak week ever: 108 km (June 2025)
Longest single run: 160.6 km (Dec 2023 — 100 miler)
Peak month: 372 km (June 2025)
Best 10k effort: 53:04 (May 2022)
```

**Card 4: Consistency Pattern**
```
YOUR TRAINING RHYTHM
You run most consistently in: Apr-Jun (spring builder)
You tend to dip in: Aug-Sep (heat or injury?)
2024 was a gap year — almost no running. You rebuilt in 2025.
```

**Card 5: Detected Concerns**
```
THINGS WE NOTICED
⚠ Training gap Aug-Sep 2025 — activity name mentions "calf/tibia"
⚠ 85% of your runs are in Z3-Z4 — should be 80% in Z2 for ultras
✓ You cross-train: 295 weight training sessions logged
✓ You've completed 100 miles before (23h48m, Dec 2023)
```

**Card 6: Race History (auto-detected)**
List of detected races/ultras from activity names and distances:
- Maiden 100 Miler — 160.6km — Dec 2023
- Khardung La Challenge — 75.2km — Sep 2023
- Hell Race Border 100k — 96.4km — Dec 2022
- etc.

**Bottom CTA:**
[Get My Training Plan →] (large orange button)

### Screen 4: Smart Defaults (THE QUESTIONNAIRE)

**Design principle:** This is NOT a form. It's a confirmation screen.
Everything is pre-filled. The user confirms or adjusts.

**Section A: Your Goal (THE ONLY THING WE ASK FROM SCRATCH)**

```
WHAT ARE YOU TRAINING FOR?

Race name: [________________] (optional text field)

Distance:
[50K] [50 Mi] [100K] [100 Mi] [200 Mi+]
                               ↑ pre-selected based on race history

When:
[Month picker — scrollable, defaults to 6 months from now]

Terrain:
[Road/Flat] [Trail/Rolling] [Mountain/Technical]

What's your goal?
[Just finish] [Beat my last time] [Compete for placement]
                  ↑ if selected, shows: "Your previous time at this distance: [23:48]"
                    "Target time: [________]" (optional)
```

**Section B: We Built These Defaults From Your Data (CONFIRM OR TWEAK)**

Each item is a card with the inference, the rationale, and an "Actually..." button.

```
┌─────────────────────────────────────────────────────┐
│ STARTING VOLUME                                      │
│ 70 km/week                                          │
│                                                      │
│ We see you averaging 47 km recently, but your April  │
│ data shows 71 km/week when consistent. We'll start   │
│ at what you can do, not what you've been doing.       │
│                                                      │
│ [That's right]  [Actually... ▾]                      │
│   → expands to slider: 40 ─── 70 ─── 100 km/wk     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ PEAK VOLUME TARGET                                   │
│ 120 km/week                                         │
│                                                      │
│ Your proven max is 108 km/wk. We'll push to 120     │
│ (11% above) — enough to trigger new adaptation      │
│ without reckless overreach.                          │
│                                                      │
│ [That's right]  [Actually... ▾]                      │
│   → expands to slider: 80 ─── 120 ─── 160 km/wk    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ TRAINING DAYS                                        │
│ 5 days/week                                         │
│                                                      │
│ You average 4.2 runs/week. We're adding one to fit  │
│ the plan structure (4 easy + 1 quality + weekends).  │
│                                                      │
│ [That's right]  [Actually... ▾]                      │
│   → options: [4 days] [5 days] [6 days]              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ INJURY MANAGEMENT                                    │
│ Conservative base phase                             │
│                                                      │
│ We detected a 6-week gap (Aug-Sep 2025) with a      │
│ calf/tibia mention. Your plan includes a longer     │
│ base phase and 7% weekly volume cap (vs standard    │
│ 10%) until build phase.                             │
│                                                      │
│ [That's right]  [Not an issue anymore ▾]             │
│   → removes conservative cap                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ THE BIG CHANGE                                       │
│ Your easy runs need to be easier                    │
│                                                      │
│ 85% of your runs are in Z3-Z4. For a 100-miler,    │
│ 80% should be Z2. Your plan enforces HR <140 on     │
│ easy days. This will feel painfully slow at first.   │
│ It's the single most impactful change you can make.  │
│                                                      │
│ [I understand]                                       │
└─────────────────────────────────────────────────────┘
```

**Bottom CTA:**
[Generate My Plan →]

### Screen 5: Plan Output

Full plan view for all users (no paywall):
- Weekly overview (cards, one per week)
- Daily breakdown with distances, paces, HR zones, workout details
- Volume progression chart
- Phase breakdown
- Strength training sessions with exercises, sets, reps
- Nutrition notes per long run
- "The #1 thing to change" callout
- Export as PDF / iCal / Google Calendar
- Shareable link ("My Chronic Cardio Plan")

---

## 4. DATA PROCESSING PIPELINE

### Fields to Extract from Strava Activities:

For each activity:
- `start_date`, `type`, `distance`, `moving_time`, `elapsed_time`
- `total_elevation_gain`
- `average_heartrate`, `max_heartrate`
- `suffer_score`
- `name` (critical for race detection and injury detection)
- `id` (for linking back)

### Computed Metrics:

**Current Fitness:**
- `current_weekly_avg`: average of last 4 complete weeks
- `current_runs_per_week`: average of last 4 complete weeks
- `current_avg_pace`: median pace of last 20 runs (excludes outliers)
- `current_avg_hr`: median HR of last 20 runs with HR data

**Historical Ceiling:**
- `peak_weekly_volume`: highest single-week volume ever
- `peak_monthly_volume`: highest single-month volume ever
- `longest_single_run`: longest distance in one activity
- `fastest_10k_equivalent`: fastest ~10km effort (9.5-10.5km window)

**HR Zone Distribution:**
- Compute for all runs with HR data (last 2 years)
- Zones based on max recorded HR (use highest `max_heartrate` in data)
- Present as percentages: Z1%, Z2%, Z3%, Z4%, Z5%

**Consistency Analysis:**
- `best_months`: months with highest average weekly volume
- `gap_periods`: periods with >14 days between activities
- `gap_context`: scan activity names around gaps for injury/illness keywords

**Race Detection:**
- Activities with distance matching standard race distances (±5%)
- Activities with descriptive names (race keywords)
- Activities with suffer_score > 200 and distance > 40km

**Cross-Training Detection:**
- Count activities by type: WeightTraining, Ride, Hike, Walk, Yoga, Swim
- `strength_frequency`: WeightTraining count / weeks active

---

## 5. ERROR STATES & EDGE CASES

- **No HR data:** Skip HR zone analysis. Note: "We couldn't detect HR data.
  If you use a HR monitor, ensure it's connected to Strava."

- **<50 total activities:** "We need more training history to generate a
  reliable plan. Keep logging runs on Strava and come back when you have
  3+ months of consistent data."

- **No runs in last 30 days:** "It looks like you haven't been running recently.
  Your plan will start with a conservative base-building phase."

- **Race date <8 weeks away:** "That's a tight timeline. We can generate a
  sharpening plan, but meaningful fitness gains require 12+ weeks."

- **First-time ultrarunner (no ultra-distance activities detected):**
  Plan defaults to "just finish" mode with conservative volume.

---

## 6. METRICS / SUCCESS CRITERIA

**Activation:** User connects Strava and reaches dashboard (Screen 3)
**Engagement:** User reaches Smart Defaults screen (Screen 4)
**Conversion:** User generates a plan
**Retention:** User returns after 4 weeks to check plan or regenerate

**Target funnel:**
- Landing → Connect: 40%
- Connect → Dashboard: 95%
- Dashboard → Smart Defaults: 70%
- Smart Defaults → Generate: 85%
