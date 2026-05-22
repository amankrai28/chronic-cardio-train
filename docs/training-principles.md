# Chronic Cardio Training Plan Generator — Coaching Principles

> This document codifies the coaching philosophy, decision logic, and
> non-negotiables. The plan generation engine (`lib/plan-builder.ts`)
> implements these rules as deterministic code. No AI is used for plan
> generation — these principles are executed programmatically.

---

## 1. COACHING PHILOSOPHY

The Chronic Cardio training philosophy synthesizes three respected ultra coaches,
taking the strongest evidence-backed element from each:

**From Zach Bitter — The Aerobic Engine:**
- Ultra performance is built on fat oxidation efficiency at low intensity.
- The majority of training volume should be at or below MAF heart rate.
- High volume at low intensity > moderate volume at moderate intensity.
- Bitter's insight: "If you can't run easy, you can't run far."

**From David Roche — The Human Element:**
- "There's no magic workout or perfect plan." Consistency through enjoyment
  beats optimal-on-paper plans that people abandon.
- The "some of something" principle: 8km when the plan says 20km is better
  than skipping entirely. Plans must accommodate real life.
- Joy is a training input, not a luxury. Burnout is the #1 plan killer.
- Roche ran 60-75 miles/week for Leadville 100 record — not insane volume.
  Quality + consistency + strength > volume alone.

**From Jason Koop — The Structure:**
- Training has phases (base → build → peak → taper). Aimless training
  produces aimless results.
- Koop's reverse periodization (speed early, endurance late) is a useful
  framework for experienced athletes, but NOT dogma. For non-elite runners,
  a gentler version works: emphasis shifts gradually rather than hard-cutting.
- The minimum effective dose: do what's needed, not more.

### The Synthesis (Chronic Cardio Position):

1. **Aerobic base is king.** 80% of runs at Z2/conversational effort.
2. **Consistency over heroism.** Sustainable plans that people follow.
3. **Structured periodization, loosely applied.** Phases exist, but quality
   work shifts emphasis gradually, not in rigid blocks.
4. **Volume is individual.** Prescribed off the athlete's proven ceiling,
   never a template number.
5. **Recovery is training.** Cutback weeks are non-negotiable.
6. **Specificity increases as race approaches.** Final 6-8 weeks emphasize
   actual race demands: terrain, night running, nutrition, gear.
7. **Strength training is not optional.** It prevents injury at high volume.

---

## 2. HEART RATE ZONE DEFINITIONS

All plans use 5-zone HR model. Zones are individualized when max HR is known
from Strava data (highest recorded HR). Otherwise, use 180-age as MAF estimate.

| Zone | Name | % Max HR | Purpose | Target % of Weekly Volume |
|------|------|----------|---------|--------------------------|
| Z1 | Recovery | <65% | Active recovery | 5-10% |
| Z2 | Aerobic/Easy | 65-75% | Base building, fat oxidation | 70-75% |
| Z3 | Moderate/Tempo | 76-85% | Lactate threshold development | 10-15% |
| Z4 | Threshold/Hard | 86-92% | VO2max, speed development | 5-8% |
| Z5 | Max | >92% | Short intervals, race finishing | 0-2% |

**The 80/20 rule:** 80% of weekly volume at Z1-Z2, 20% at Z3+.
This is the most commonly violated principle. Most amateur runners train
at 60/40 or worse. The plan MUST explicitly flag this if the athlete's
Strava data shows Z3-Z4 dominance.

---

## 3. PERIODIZATION STRUCTURE

All plans follow a 4-phase macro structure. Phase durations scale by total
plan length.

### Phase 1: BASE (25-30% of total plan weeks)
**Goal:** Establish aerobic foundation, fix HR distribution, introduce speed stimulus.
- Volume: Maintain or slightly increase from current base.
- Quality: 1x/week speed work (strides, short intervals, hills).
  Per Koop: speed stimulus early when it's farthest from race demands.
- Long run: Building, but capped at current proven distance.
- Strength: 2x/week (compound movements, single-leg work, eccentric focus).
- Key focus: DISCIPLINE on easy-day pacing. This is where most athletes fail.

### Phase 2: BUILD (30-35% of total plan weeks)
**Goal:** Ramp volume, introduce back-to-backs, shift quality to tempo.
- Volume: Progressive increase toward peak, with cutback weeks.
- Quality: Shift from speed to tempo/threshold work. 1x/week.
- Long run: Increasing. Back-to-back weekends become standard.
- Strength: 1x/week (maintenance, running-specific).
- Key focus: Nutrition rehearsal begins on all long runs.

### Phase 3: PEAK (25-30% of total plan weeks)
**Goal:** Sustain high volume, race-specific training.
- Volume: At or near lifetime max for 3-4 sustained weeks.
- Quality: All endurance-specific. No speed/tempo. Progression long runs.
- Long run: Maximal. Full race gear/nutrition rehearsal.
- Strength: 0-1x/week (taper off).
- Key focus: Night running practice, aid station simulation, full dress rehearsal.

### Phase 4: TAPER (10-15% of total plan weeks, minimum 2 weeks)
**Goal:** Arrive fresh, sharp, confident.
- Volume: Progressive reduction (week 1: ~50% peak, week 2: ~35%, week 3: ~25%).
- Quality: Maintain some intensity (strides, short tempo) to stay sharp.
- Strength: None.
- Key focus: Logistics, gear, mental prep. DO NOT add training.

### Cutback Week Rules:
- Every 3-4 weeks, reduce volume by 30-40%.
- Cutback weeks maintain frequency (same number of runs) but shorter.
- Quality sessions are replaced with easy + strides.
- These are NON-NEGOTIABLE. Skipping cutback weeks is how injuries happen.

---

## 4. VOLUME PRESCRIPTION LOGIC

Volume is always derived from the athlete's actual data, never a template.

### Starting Volume
```
starting_weekly_km = max(
  athlete.current_4_week_average,
  athlete.best_recent_4_week_block
)
```
If best_recent > current_avg × 1.4, use the midpoint — this represents
what the athlete CAN do when consistent, not what they happened to do.

### Peak Volume
```
peak_weekly_km = min(
  athlete.lifetime_peak_weekly_volume * 1.15,  // 15% above proven max
  distance_appropriate_peak                     // see table below
)
```

**Distance-appropriate peak weekly volumes:**

| Race Distance | "Finish" Peak | "Beat Time" Peak | "Compete" Peak |
|---------------|---------------|------------------|----------------|
| 50K | 60-70 km/wk | 80-90 km/wk | 90-95 km/wk |
| 50 Mile | 70-80 km/wk | 90-110 km/wk | 110-115 km/wk |
| 100K | 80-90 km/wk | 100-120 km/wk | 120-130 km/wk |
| 100 Mile | 90-100 km/wk | 110-140 km/wk | 130-140 km/wk |
| 200 Mile+ | 100-120 km/wk | 120-160 km/wk | 140-160 km/wk |

### Volume Progression Rate
- Maximum 10% increase per week from starting volume.
- After a cutback week, resume at the volume BEFORE the cutback, then add.
- If athlete has injury history, cap increases at 7% per week during base.

---

## 5. LONG RUN & BACK-TO-BACK RULES

### Single Long Run Caps

| Race Distance | Max Single Long Run | Rationale |
|---------------|-------------------|-----------|
| 50K | 30-35 km | |
| 50 Mile | 35-42 km | Marathon distance |
| 100K | 38-45 km | |
| 100 Mile | 40-50 km | Beyond this, injury risk > benefit |
| 200 Mile+ | 45-55 km | |

### Back-to-Back Structure
Back-to-backs are the most ultra-specific training tool. They simulate race
fatigue without single-run injury risk.

**Progression:**
- Base phase: Long run + easy recovery run next day (e.g., 24km + 10km)
- Build phase: Long run + moderate run next day (e.g., 35km + 20km)
- Peak phase: Long run + sustained run next day (e.g., 45km + 28km)

**Rules:**
- Saturday = harder/longer. Sunday = easier/shorter.
- Sunday B2B run starts easy regardless of planned effort. First 3km = Z1-Z2.
- Total B2B weekend volume should not exceed 65-75% of weekly volume.
- B2B weekends introduced in late base or early build phase.

---

## 6. DAILY PLAN STRUCTURE

Each day in the plan must specify:

1. **Run type:** Easy, Long, Quality, B2B, Recovery, Rest
2. **Distance or time:** km or minutes (use time for easy/recovery runs)
3. **Intensity:** Zone target (Z2, Z3, etc.) or pace range
4. **Workout details:** If quality session, full breakdown (reps, recovery, pace)
5. **Strength:** If applicable, type (full body, running-specific, core-only)
6. **Notes:** Any context (nutrition practice, night run, gear test)

### Typical Week Templates

**Base Phase (5 run days):**
| Day | Session |
|-----|---------|
| Mon | Rest |
| Tue | Easy Z2 (45-60min) |
| Wed | Quality: speed intervals or hills |
| Thu | Easy Z2 (45-60min) |
| Fri | Rest or easy 30min shakeout |
| Sat | Long Run (Z2, building) |
| Sun | Easy recovery or B2B |

**Build Phase (5-6 run days):**
| Day | Session |
|-----|---------|
| Mon | Rest |
| Tue | Easy Z2 (50-70min) |
| Wed | Quality: tempo or progression run |
| Thu | Easy Z2 (50-70min) + strides |
| Fri | Rest or easy 30min |
| Sat | Long Run (with race-specific elements) |
| Sun | B2B medium-long run |

**Peak Phase (5-6 run days):**
| Day | Session |
|-----|---------|
| Mon | Rest |
| Tue | Easy Z2 (50-70min) |
| Wed | Easy Z2 + strides (NO hard quality) |
| Thu | Easy Z2 (50-70min) |
| Fri | Rest |
| Sat | Long Run (race-specific: gear, nutrition, night section) |
| Sun | B2B long run (race-specific) |

### Run Day Count by Goal:
- "Just finish" athletes: 4-5 days/week running
- "Beat my time" athletes: 5-6 days/week running
- "Compete" athletes: 6 days/week running

---

## 7. STRENGTH TRAINING GUIDELINES

Strength training prevents injury at high running volume and builds
durability for the back half of ultras.

### Base Phase (2x/week):
- Session A: Lower body compound (squats, deadlifts, lunges)
- Session B: Running-specific (single-leg work, step-ups, eccentric calf raises)
- Core work integrated into both sessions (planks, pallof press, dead bugs)
- Duration: 30-45 minutes per session

### Build Phase (1x/week):
- Combined session: single-leg focus + core
- Reduce load, maintain movement patterns
- Duration: 25-35 minutes

### Peak Phase (0-1x/week):
- Bodyweight only if any. Core maintenance.
- Drop entirely 3-4 weeks before race.

### Taper Phase:
- No strength training.

---

## 8. NUTRITION GUIDANCE INTEGRATION

The plan generator includes nutrition notes at phase transitions
and on long run days.

### Key Principles:
- Practice race nutrition on EVERY long run from build phase onward.
- Target intake: 200-300 cal/hr for runs >90min (adjust by body weight and intensity).
- Fructose:glucose ratio matters (reference Chronic Cardio science page).
- Test everything in training. Nothing new on race day.
- Hydration: 400-800ml/hr depending on conditions. Include sodium.

### Phase-Specific Notes:
- **Base:** "Start thinking about your race nutrition plan."
- **Build:** "Practice 200-250 cal/hr on every long run. Same food you'll race with."
- **Peak:** "Nutrition plan must be LOCKED by now. If it's not working, fix it this week."
- **Taper:** "You know what works. Trust it. Don't experiment."

---

## 9. INJURY DETECTION & SAFEGUARDS

The plan generator uses Strava data to detect and respond to injury signals.

### Detection Signals:
- **Training gap >2 weeks:** Possible injury or illness. Flag in profile.
  Look at activity names for clues (users often name runs "tibia still hurting").
- **Sudden volume drop >50%:** Possible injury. Conservative base phase.
- **Pace degradation >15% over 4 weeks without elevation change:** Possible overtraining.
- **HR elevation >8% at same pace over 4 weeks:** Possible overtraining or illness.

### Safeguards:
- If injury gap detected in last 6 months: extend base phase by 2 weeks,
  cap weekly volume increases at 7%.
- If injury gap in same body region appears twice in data: add specific
  prehab notes (e.g., eccentric calf raises for calf/tibia issues).
- Always include this non-negotiable: "If pain returns → instant cutback week.
  No exceptions. Missing one week of training is nothing. Missing the race is everything."

---

## 10. PLAN BUILDER IMPLEMENTATION NOTES

The plan is generated by `lib/plan-builder.ts`, a deterministic algorithm
that applies these principles as code. There is no AI in the plan
generation pipeline.

### Input
The plan builder receives:
- Computed athlete metrics (from `lib/metrics.ts`)
- Race goal (distance, date, terrain, goal type)
- Confirmed smart defaults (starting volume, peak volume, training days,
  injury conservative flag)

### Output (JSON structure)

**Weekly plan:**
```json
{
  "plan_summary": {
    "total_weeks": 28,
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

**Daily plan:**
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
          "notes": "If HR drifts above 140, walk until it drops. This is training discipline, not fitness."
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
          "notes": "Koop principle: speed stimulus early in the cycle."
        }
      ]
    }
  ]
}
```

### Algorithm Outline
```
1. Calculate total_weeks from today to race_date
2. Assign phase durations (% of total_weeks per phase rules)
3. Build volume curve:
   - Start at starting_volume
   - Progress at 10%/week (or 7% if injury_conservative)
   - Insert cutback every 3-4 weeks (-35%)
   - Hit peak_volume by start of peak phase
   - Taper: 50% → 35% → 25% reduction
4. For each week, assign daily sessions from phase templates
5. Scale daily distances to hit weekly volume target
6. Insert quality sessions per phase rules
7. Insert B2B weekends from late base onward
8. Insert strength per phase rules
9. Insert nutrition notes per phase rules
10. Flag key_change from athlete metrics
```
