# Cat Tracker Rebuild Spec

Product model, feature set, and locked decisions for rebuilding the app from scratch.
Feature parity with the old Next.js app is the baseline; the extensions below are in scope; everything under "Out of Scope" is explicitly out.

## Product Summary

Cat Tracker is a feeding, calorie, and weight tracking app for a two-person household with **three cats**. It records meals (including treats), manages a food library, compares intake against each cat's daily calorie target, tracks body weight against a goal, and reviews feeding history over time. The end goal is bringing the cats' weight down.

Design for a handful of cats (~3), not N: cat selection is a single row of buttons/chips, comparison views fit all cats on one screen, no pagination or search over cats.

## Locked Decisions

- **Backend**: Python, FastAPI, SQLite, SQLAlchemy + Alembic. Owns the canonical model, validation, and all calorie/report/portion math.
- **Frontend**: Vite + React SPA with shadcn/ui components and **shadcn chart components** (Recharts under the hood). Latest stable everything — as of July 2026 that's React 19, Vite 8, Tailwind 4, Recharts 3, shadcn CLI 4; verify and pin at scaffold time, and let the shadcn charts release dictate the Recharts major. Requests ready-to-display data; no calorie math client-side.
- **Deployment**: single container — FastAPI serves the API and the built SPA. Keeps the existing Traefik labels, port mapping, named SQLite volume, and `/api/health` healthcheck contract from `docker-compose.yml`.
- **Repo**: this repo. Old Next.js code is deleted when the new skeleton lands. Layout: `backend/` + `frontend/`.
- **Data**: fresh, empty database. No migration from the old volume.
- **Time**: store true UTC everywhere. A single household timezone in backend settings drives "today", day bucketing, and report boundaries. The frontend never sends a timezone.
- **Units**: metric only — kg for cats, grams/pieces for food, kcal for energy. No lbs support.
- **Mobile**: installable PWA (manifest + icons), online-only, no offline queue. **Target device: iPhone 13 mini (375 pt-wide viewport)** — every Dashboard interaction must be easy and fast at that size, one-handed. The Dashboard is mobile-first; History and Settings are desktop-first (they must render sanely on the phone, but are designed for and mostly used from desktop).
- **Theming**: dark/light follows the system preference (`prefers-color-scheme`) automatically on iOS and desktop. No manual theme toggle.

## Core Model

### Cat

- Name
- Current weight in kg (latest weight entry; see Weight Entry)
- Goal weight in kg — **optional per cat** (a trim cat has no goal)
- Daily target calories (hand-set or accepted from the calculator)
- Default wet food and default dry food (references into the food library)

### Food

- Name
- Type: `WET`, `DRY`, or `TREAT`
- Calorie basis, **per food**: `PER_100G` (kcal per 100 g, logged by grams) or `PER_PIECE` (kcal per piece, logged by count)
- Calorie value in that basis
- Multiple foods per type exist in the library; each cat picks a default wet and dry food. Treats are picked from a dropdown at logging time.

### Meal

- Cat
- Food (specific reference, not just a type) — defaults to the cat's default food for wet/dry, chosen from dropdown for treats
- Quantity: grams (`PER_100G` foods) or pieces (`PER_PIECE` foods)
- **Calorie snapshot taken at log time** — history is immutable; later edits to a food's calorie value or a cat's defaults never rewrite past meals
- Timestamp (UTC)

### Weight Entry

- Cat
- Weight in kg
- Date
- The cat's "current weight" is the most recent entry.

### Settings (singleton)

- Household timezone
- Portion suggestions enabled on/off
- Expected meals per day (global — deliberately **not** per cat)

## Features

### Meal Logging

- Select a cat, select food (default pre-filled for wet/dry; dropdown for treats), enter quantity, save at current time.
- Edit an existing meal: cat, food, quantity, date, and time.
- Delete a meal.
- **Fast re-log**: per-cat one-tap chips for that cat's recent/usual (food, quantity) combos, derived from meal history — logging a routine meal is two taps. No separate preset model unless derived suggestions prove insufficient.

### Daily Calorie Tracking

- Per cat: target kcal, consumed today, remaining today, over-target indicator.
- Treats count toward consumed calories.
- Convert remaining kcal into equivalent grams of the cat's default wet or dry food.

### Portion Suggestions

- Toggle on/off; uses global meals-per-day.
- Per cat: suggested wet and dry grams per meal from daily target, meals per day, and the default food's kcal/100g.

### Target Calorie Calculator

- Suggest a daily target from veterinary formulas: RER = 70 × (kg)^0.75, applied to **goal weight** with a weight-loss factor (≈0.8 × RER) when a goal is set, or maintenance factor on current weight when not.
- Always a suggestion — the stored target is editable and can ignore the calculator entirely.

### Weight Tracking

- Log dated weigh-ins per cat.
- Weight trend chart on the History page with the goal weight as a target line (when the cat has one).
- Progress toward goal shown alongside the trend.

### Meal History

- Recent meals list/table: timestamp, cat, food name, quantity, calculated kcal.
- Filter by cat.

### Historical Analysis

- Date range picker; per-cat view.
- Average kcal/day; trend vs the previous period.
- Daily calorie chart with target line.
- Meal timing pattern (heatmap).
- Portion size history.
- Weight trend (see Weight Tracking).

### Multi-Cat Comparison

- Average kcal/day per cat vs target; target adherence percentage.

### Settings

- Manage cats (including goal weight and default foods).
- Manage the food library (all three types, either calorie basis).
- Portion suggestion settings and household timezone.

## Pages

### Dashboard — primary day-to-day screen (mobile-first, iPhone 13 mini)

- Fast meal entry + fast re-log chips — the top priority; logging a routine meal standing at the food bowl must take seconds
- Today's calorie status per cat (all 3 cats visible without scrolling past the entry form)
- Recent meals
- Short weekly summary

### History — analysis screen (desktop-first)

- Date range picker, cat selector/tabs
- Calorie trend chart, meal timing pattern, portion history
- Weight trend with goal line
- Multi-cat comparison

### Settings — configuration screen (desktop-first)

- Cats, foods, portion settings, timezone

## API Areas

- `cats` (incl. weight entries: `cats/{id}/weights`)
- `foods`
- `meals` (incl. recent-combo suggestions for fast re-log)
- `settings`
- `reports/today`
- `reports/range`
- `reports/cat-comparison`
- `target-suggestion` (calculator)
- `health` (docker healthcheck)

## Parity Chrome (keep)

- Dark mode via system preference auto-detect (no toggle — see Theming decision)
- Seed data for development
- Single clean CI workflow: backend (ruff, mypy, pytest) + frontend (tsc, vitest, build) + docker image build. Replaces the old node.js/CodeQL/Codacy/docker workflows.

## Out of Scope

- Authentication, users, households, roles, invitations (the `.github/todo.md` auth design is dead)
- Per-cat meals-per-day
- lbs / imperial units
- Offline support / sync
- Migration of old data
- Notifications, reminders, photos

## Rebuild Principle

Preserve workflows, not implementation. Backend owns the math; frontend displays it. Every model choice above (calorie snapshots, per-food basis, UTC + household timezone) exists to keep history immutable and time handling unambiguous — the two structural defects of the old app.
