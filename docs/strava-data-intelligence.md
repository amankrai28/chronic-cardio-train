# Chronic Cardio — Strava Data Intelligence Guide

> This document defines exactly how to extract coaching-relevant insights
> from raw Strava activity data. It's the bridge between the Strava API
> response and the smart defaults that make the product feel magical.
> All algorithms are deterministic and implemented in `lib/metrics.ts`.

---

## 1. WHAT STRAVA GIVES US vs. WHAT WE NEED

| What we need for coaching | Where it comes from | Strava field(s) |
|--------------------------|--------------------|-----------------| 
| Current fitness level | Last 4 weeks of activities | `distance`, `moving_time`, `start_date` |
| Proven volume ceiling | All-time weekly max | `distance`, `start_date` (bucketed) |
| Easy pace + HR | Median of recent non-race runs | `moving_time`, `distance`, `average_heartrate` |
| HR zone distribution | All runs with HR data | `average_heartrate`, `max_heartrate` |
| Injury history | Gaps + activity names | `start_date` gaps, `name` keyword scan |
| Race history | Long activities + names | `distance`, `name`, `suffer_score` |
| Cross-training habits | Non-run activity types | `type` field |
| Training consistency | Run frequency over time | `start_date`, `type` |
| Long run capability | Recent longest effort | `distance` (last 6 months) |
| Elevation experience | Cumulative and per-run gain | `total_elevation_gain` |

### What Strava CANNOT tell us (must ask user):
- Goal race (name, distance, date, terrain)
- Goal type (finish vs. time vs. compete)
- Why they had training gaps (injury vs. life vs. motivation)
- Available training days going forward
- Current non-Strava-logged activity (e.g., gym work not logged)

---

## 2. INFERENCE ALGORITHMS

### 2.1 Starting Volume Inference

```python
def infer_starting_volume(activities):
    """
    Don't just average the last 4 weeks — that's misleading for
    inconsistent runners. Instead, find their CAPABLE volume.
    """
    runs = [a for a in activities if a.type == 'Run']

    # Method 1: Last 4 weeks average
    recent_avg = average_weekly_volume(runs, weeks=4)

    # Method 2: Best 4-week block in last 3 months
    # This captures what they CAN do, not what they happened to do
    best_recent_block = best_4_week_average(runs, lookback_months=3)

    # Method 3: Median weekly volume over last 3 months (excludes outliers)
    median_recent = median_weekly_volume(runs, months=3)

    # Decision logic:
    if best_recent_block > recent_avg * 1.4:
        # They've shown they can do significantly more recently
        # Use a value between current and best, biased toward best
        suggested = (recent_avg + best_recent_block) / 2
        rationale = (
            f"You've been averaging {recent_avg:.0f} km/week, but your best "
            f"recent 4-week block was {best_recent_block:.0f} km/week. "
            f"We'll start at {suggested:.0f} — what you can do when consistent."
        )
    else:
        suggested = recent_avg
        rationale = (
            f"Your recent average is {recent_avg:.0f} km/week. "
            f"That's your starting point."
        )

    return {
        'suggested_km': round(suggested / 5) * 5,  # Round to nearest 5
        'recent_avg': recent_avg,
        'best_recent_block': best_recent_block,
        'rationale': rationale
    }
```

### 2.2 Peak Volume Inference

```python
def infer_peak_volume(activities, race_distance, goal_type):
    """
    Peak volume = min(proven_ceiling * 1.15, distance_appropriate_max)
    Never prescribe more than 15% above what they've actually done.
    """
    lifetime_peak = max_weekly_volume_ever(activities)

    # Distance-appropriate peaks (from principles doc)
    PEAKS = {
        '50K':   {'finish': 70, 'beat_time': 85, 'compete': 95},
        '50Mi':  {'finish': 85, 'beat_time': 105, 'compete': 115},
        '100K':  {'finish': 95, 'beat_time': 115, 'compete': 130},
        '100Mi': {'finish': 100, 'beat_time': 120, 'compete': 140},
        '200Mi': {'finish': 120, 'beat_time': 140, 'compete': 160},
    }

    target = PEAKS[race_distance][goal_type]
    safe_max = lifetime_peak * 1.15

    if safe_max >= target:
        suggested = target
        rationale = (
            f"Your proven peak is {lifetime_peak:.0f} km/week. "
            f"We're targeting {suggested:.0f} km — within your proven range."
        )
    else:
        suggested = round(safe_max / 5) * 5
        rationale = (
            f"Your proven peak is {lifetime_peak:.0f} km/week. "
            f"We're capping at {suggested:.0f} (15% above your max) "
            f"for safety. Ideally you'd want {target:.0f} for this goal, "
            f"but exceeding your proven ceiling by more than 15% increases injury risk."
        )

    return {
        'suggested_km': suggested,
        'lifetime_peak': lifetime_peak,
        'distance_target': target,
        'rationale': rationale
    }
```

### 2.3 HR Zone Analysis

```python
def analyze_hr_zones(activities):
    """
    Compute HR zone distribution and flag if easy runs aren't easy.
    Uses the athlete's actual max HR from data, not 220-age formula.
    """
    hr_runs = [a for a in activities if a.average_heartrate and a.average_heartrate > 60]

    if len(hr_runs) < 20:
        return {'has_data': False, 'message': 'Insufficient HR data for zone analysis.'}

    # Use actual max HR from data (highest max_heartrate recorded)
    max_hr = max(a.max_heartrate for a in hr_runs if a.max_heartrate)

    # Compute zones for each run based on average HR
    zones = {'Z1': 0, 'Z2': 0, 'Z3': 0, 'Z4': 0, 'Z5': 0}
    for run in hr_runs:
        pct = run.average_heartrate / max_hr * 100
        if pct < 65:
            zones['Z1'] += 1
        elif pct < 76:
            zones['Z2'] += 1
        elif pct < 86:
            zones['Z3'] += 1
        elif pct < 93:
            zones['Z4'] += 1
        else:
            zones['Z5'] += 1

    total = sum(zones.values())
    pct_easy = (zones['Z1'] + zones['Z2']) / total * 100
    pct_hard = (zones['Z3'] + zones['Z4'] + zones['Z5']) / total * 100

    # Flag if training is too hard
    warning = None
    if pct_hard > 50:
        warning = {
            'severity': 'high',
            'message': (
                f"{pct_hard:.0f}% of your runs are in Z3-Z5. "
                f"For ultra training, 80% should be Z1-Z2. "
                f"This is the single most impactful change you can make."
            ),
            'target_hr': round(max_hr * 0.75),  # Top of Z2
            'instruction': f"Easy runs: keep HR below {round(max_hr * 0.75)} bpm."
        }

    return {
        'has_data': True,
        'max_hr': max_hr,
        'zone_distribution': zones,
        'zone_percentages': {k: round(v/total*100) for k, v in zones.items()},
        'pct_easy': round(pct_easy),
        'pct_hard': round(pct_hard),
        'warning': warning,
        'z2_hr_cap': round(max_hr * 0.75)
    }
```

### 2.4 Injury/Gap Detection

```python
def detect_training_gaps(activities):
    """
    Find gaps >14 days. Scan nearby activity names for injury keywords.
    """
    runs = sorted(
        [a for a in activities if a.type == 'Run'],
        key=lambda x: x.start_date
    )

    INJURY_KEYWORDS = [
        'injury', 'injured', 'hurt', 'pain', 'broken', 'fracture',
        'tibia', 'calf', 'knee', 'ankle', 'shin', 'stress',
        'recovery', 'rehab', 'busted', 'sore', 'physio', 'PT',
        'doctor', 'rest', 'off', 'DNF', 'dropped'
    ]

    gaps = []
    for i in range(1, len(runs)):
        days_between = (runs[i].start_date - runs[i-1].start_date).days
        if days_between > 14:
            # Scan nearby activities for context
            nearby = [a for a in activities
                     if abs((a.start_date - runs[i-1].start_date).days) < 30]
            context_words = []
            for a in nearby:
                if a.name:
                    for kw in INJURY_KEYWORDS:
                        if kw.lower() in a.name.lower():
                            context_words.append(kw)

            gaps.append({
                'start': runs[i-1].start_date.isoformat(),
                'end': runs[i].start_date.isoformat(),
                'days': days_between,
                'context': list(set(context_words)) if context_words else None,
                'is_likely_injury': len(context_words) > 0
            })

    return gaps
```

### 2.5 Race Detection

```python
def detect_races(activities):
    """
    Identify race efforts from activity data.
    Uses distance thresholds, activity names, and suffer scores.
    """
    RACE_KEYWORDS = [
        'race', 'marathon', 'ultra', 'challenge', 'event',
        '100 miler', '100k', '50k', '50 mile', 'half marathon',
        'HM', '10K', 'TCS', 'Ladakh', 'hell race', 'border',
        'miler', 'trail race'
    ]

    # Standard distances (with ±5% tolerance)
    STANDARD_DISTANCES = [
        (5, '5K'), (10, '10K'), (21.1, 'Half Marathon'),
        (42.2, 'Marathon'), (50, '50K'), (80.5, '50 Mile'),
        (100, '100K'), (160.9, '100 Mile')
    ]

    runs = [a for a in activities if a.type == 'Run']
    races = []

    for run in runs:
        is_race = False
        race_type = None

        # Check name for race keywords
        if run.name:
            for kw in RACE_KEYWORDS:
                if kw.lower() in run.name.lower():
                    is_race = True
                    break

        # Check if distance matches standard race distance
        dist_km = run.distance / 1000
        for std_dist, std_name in STANDARD_DISTANCES:
            if abs(dist_km - std_dist) / std_dist < 0.05:
                is_race = True
                race_type = std_name
                break

        # Check suffer score (high suffer + long distance = likely race)
        if run.suffer_score and run.suffer_score > 200 and dist_km > 40:
            is_race = True

        if is_race:
            pace = (run.moving_time / 60) / dist_km if dist_km > 0 else 0
            races.append({
                'date': run.start_date[:10],
                'name': run.name,
                'distance_km': round(dist_km, 1),
                'time_seconds': run.moving_time,
                'time_formatted': format_time(run.moving_time),
                'pace_min_km': round(pace, 2),
                'race_type': race_type,
                'elevation_gain': run.total_elevation_gain,
                'average_hr': run.average_heartrate
            })

    # Sort by distance descending (most impressive first)
    return sorted(races, key=lambda x: x['distance_km'], reverse=True)
```

### 2.6 Training Days Inference

```python
def infer_training_days(activities):
    """
    How many days per week does this athlete actually run?
    And how many COULD they run based on their best periods?
    """
    runs = [a for a in activities if a.type == 'Run']

    # Recent average (last 8 weeks)
    recent_freq = average_runs_per_week(runs, weeks=8)

    # Best consistent period (best 8-week block in last year)
    best_freq = best_runs_per_week(runs, block_weeks=8, lookback_months=12)

    # Recommended based on goal type
    suggested = max(round(best_freq), round(recent_freq) + 1)
    suggested = min(suggested, 6)  # Never suggest 7 days
    suggested = max(suggested, 4)  # Never suggest fewer than 4

    return {
        'recent_frequency': round(recent_freq, 1),
        'best_frequency': round(best_freq, 1),
        'suggested': suggested,
        'rationale': (
            f"You average {recent_freq:.1f} runs/week recently. "
            f"Your most consistent period was {best_freq:.1f}/week. "
            f"We suggest {suggested} days to fit the plan structure."
        )
    }
```

---

## 3. SMART DEFAULT CARD GENERATION

Each smart default card has:
- **Metric name** (e.g., "Starting Volume")
- **Suggested value** (e.g., "70 km/week")
- **Rationale** (1-2 sentences explaining WHY, referencing their data)
- **Adjustable** (slider or options for the user to modify)

### Cards to generate:

1. **Starting Volume** → from `infer_starting_volume()`
2. **Peak Volume** → from `infer_peak_volume()`
3. **Training Days** → from `infer_training_days()`
4. **Injury Management** → from `detect_training_gaps()` (only shown if gaps found)
5. **HR Zone Fix** → from `analyze_hr_zones()` (only shown if warning triggered)
6. **Longest Recent Run** → direct from data (shown for context, not adjustable)
7. **Race Experience** → from `detect_races()` (shown for context)

### Card visibility rules:
- Cards 1-3: ALWAYS shown (core plan inputs)
- Card 4: Only if training gaps detected in last 12 months
- Card 5: Only if HR distribution is >50% in Z3-Z5
- Cards 6-7: Always shown but as read-only context (no adjustment needed)

---

## 4. EXAMPLE: AMAN RAI'S PROFILE

Running this pipeline on Aman's Strava data:

```json
{
  "identity": {
    "name": "Aman Rai",
    "city": "New Haven, CT",
    "running_since": "2017",
    "strava_summit": true
  },
  "current_fitness": {
    "weekly_avg_km": 47,
    "runs_per_week": 4.2,
    "avg_easy_pace": 6.05,
    "avg_easy_hr": 152
  },
  "ceiling": {
    "peak_weekly_km": 108,
    "peak_monthly_km": 372,
    "longest_run_km": 160.6,
    "fastest_10k_seconds": 3184
  },
  "hr_zones": {
    "max_hr": 193,
    "z1_pct": 1,
    "z2_pct": 11,
    "z3_pct": 46,
    "z4_pct": 39,
    "z5_pct": 3,
    "warning": "85% in Z3-Z5. Target: HR <145 on easy days.",
    "z2_cap": 145
  },
  "gaps": [
    {
      "start": "2025-08-05",
      "end": "2025-09-05",
      "days": 31,
      "context": ["calf", "tibia", "busted"],
      "is_likely_injury": true
    }
  ],
  "races": [
    {"name": "Maiden 100 miler", "distance_km": 160.6, "date": "2023-12-16"},
    {"name": "100km Run", "distance_km": 100.0, "date": "2025-07-20"},
    {"name": "Khardung La challenge", "distance_km": 75.2, "date": "2023-09-07"},
    {"name": "The hell race Border 100k", "distance_km": 96.4, "date": "2022-12-03"},
    {"name": "Ladakh marathon", "distance_km": 42.4, "date": "2022-09-11"}
  ],
  "cross_training": {
    "weight_training_count": 295,
    "weight_training_freq_per_week": 1.8,
    "other_types": ["Hike (13)", "Walk (12)", "Ride (3)"]
  },
  "smart_defaults": {
    "starting_volume": {
      "suggested": 70,
      "rationale": "Averaging 47 km recently, but April 2026 showed 71 km/week when consistent."
    },
    "peak_volume": {
      "suggested": 120,
      "rationale": "Proven peak: 108 km/week. Target: 120 km (11% above). Safe for 'beat time' goal."
    },
    "training_days": {
      "suggested": 5,
      "rationale": "Averaging 4.2 runs/week. Adding one for plan structure."
    },
    "injury_conservative": {
      "active": true,
      "rationale": "Calf/tibia gap detected Aug-Sep 2025. Base phase extended, volume cap at 7%/week."
    },
    "hr_zone_fix": {
      "active": true,
      "rationale": "85% of runs in Z3-Z4. Easy runs must be HR <145."
    }
  }
}
```

This is the complete data package that gets passed to the deterministic
plan builder (`lib/plan-builder.ts`), combined with the training principles.
