---
name: analyze-video
description: Run pitch videos through the calibrated pitch-analyzer pipeline. Detects glove pop, ball/strike, velocity (calibrated across games), and pitch type from .MOV files.
allowed-tools: Read, Glob, Grep, Bash(cd packages/pitch-analyzer *), Bash(node packages/pitch-analyzer/dist/cli.js *), Bash(node packages/pitch-analyzer/temp/*), Bash(npx ts-node *), Bash(ls *), Bash(mkdir *), Bash(cat *), Bash(cp *), Bash(mv *), Bash(unzip *), Bash(cd C:/SVNViews/pitch_tracker/packages/pitch-analyzer *)
argument-hint: <video-dir-or-zip> [--game <name>] [--date <YYYY-MM-DD>] [--ground-truth <excel-path>] [--no-calibration] [--calibrate-add]
---

# Analyze Video Skill (Calibrated)

Run pitch videos through the `@pitch-tracker/pitch-analyzer` pipeline with **calibrated velocity estimates** that are stable across sessions. Uses a persistent calibration database of 122+ pitches across multiple games.

## Invocation

`/analyze-video <video-dir-or-zip> [options]`

- `<video-dir-or-zip>`: Directory containing `.MOV` pitch video files, OR a `.zip` file to extract (required)
- `--game <name>`: Game identifier for calibration (e.g., "Gino_vs_Dickinson"). Auto-derived from directory name if not specified.
- `--date <YYYY-MM-DD>`: Game date. Defaults to today.
- `--ground-truth <excel-path>`: Path to an Excel file with corrected pitch types (column: Video, Pitch Type). Used to label pitches and improve calibration.
- `--no-calibration`: Skip calibration, use session-only z-score velocities (not recommended)
- `--calibrate-add`: After analysis, add results to the calibration database for future sessions

## Key Paths

```
packages/pitch-analyzer/calibration.json          — Persistent calibration database (122+ entries)
packages/pitch-analyzer/temp/video_pitch_analysis.json — Training data for k-NN classification
packages/pitch-analyzer/temp/session_analysis.json     — Latest session results
packages/pitch-analyzer/dist/cli.js                    — Built CLI entry point
```

## Step-by-Step Procedure

### 1. Handle Input (directory or zip)

If the input is a `.zip` file, extract it first:

```bash
mkdir -p "C:/SVNViews/pitch_tracker/videos/<name>"
unzip -o "<zip-path>" -d "C:/SVNViews/pitch_tracker/videos/<name>"
```

Then find the directory containing `.MOV` files (may be nested):

```bash
ls "<extracted-dir>/"*.MOV 2>/dev/null | head -3
# If empty, check subdirectories:
ls "<extracted-dir>/"*/*.MOV 2>/dev/null | head -3
```

### 2. Validate Inputs

- Confirm the video directory exists and contains `.MOV` files
- If no `.MOV` files found, inform the user and stop

```bash
ls "<video-dir>/" | grep -c "\.MOV$"
```

### 3. Ensure pitch-analyzer Is Built

```bash
test -f packages/pitch-analyzer/dist/cli.js && echo "OK" || (cd packages/pitch-analyzer && npm run build)
```

### 4. Check for Calibration & Training Data

```bash
test -f packages/pitch-analyzer/calibration.json && echo "CALIBRATION EXISTS"
test -f packages/pitch-analyzer/temp/video_pitch_analysis.json && echo "TRAINING DATA EXISTS"
```

- If calibration.json exists (it should — 122+ entries from 2 games): use calibrated mode
- If training data exists: use k-NN classification (Mode A)
- If neither: fall back to audio-only mode (Mode B)

### 5. Extract Ground Truth (if `--ground-truth` provided)

If the user provides an Excel file with corrected pitch types:

```javascript
// Write a temp script to extract: { "video.MOV": { "pitch_type": "..." } }
// Look for columns named "Video" and "Pitch Type" (or similar)
// Save to packages/pitch-analyzer/temp/<game>_gt.json
```

### 6. Run Analysis

**Primary Mode — Calibrated Session Analysis:**

```bash
cd packages/pitch-analyzer && node dist/cli.js analyze-session \
  --video-dir "<video-dir>" \
  --training-data ./temp/video_pitch_analysis.json \
  --temp-dir ./temp
```

If ground truth is available, pass it:

```bash
cd packages/pitch-analyzer && GT=$(cat ./temp/<game>_gt.json) && \
  node dist/cli.js analyze-session \
  --video-dir "<video-dir>" \
  --training-data ./temp/video_pitch_analysis.json \
  --temp-dir ./temp \
  --ground-truth "$GT"
```

**Output**: `./temp/session_analysis.json`

### 7. Generate Calibrated Excel

Always generate an Excel report using the calibration database:

```bash
cd packages/pitch-analyzer && node dist/cli.js generate-khs-excel \
  --input ./temp/session_analysis.json \
  --output "C:/SVNViews/pitch_tracker/videos/<GameName>_Analysis.xlsx" \
  --calibration ./calibration.json
```

### 8. Compare Calibrated vs Session-Only Velocities

Show the user how calibration improves estimates:

```bash
cd packages/pitch-analyzer && node dist/cli.js calibrate-velocity \
  --input ./temp/session_analysis.json \
  --calibration ./calibration.json
```

### 9. Present Results

Present a summary table with calibrated velocities:

| # | Video | Type | Velocity | B/S | Confidence |
|---|-------|------|----------|-----|------------|

Include:
- Total pitch count
- Pitch type breakdown (Fastball / Curveball / Changeup)
- Strike/Ball ratio and strike %
- Average velocity per pitch type (calibrated)
- Pitch type accuracy vs ground truth (if provided)
- Calibration sample sizes per type

### 10. Add to Calibration Database (if `--calibrate-add` or user confirms)

After presenting results, ask the user if they want to add this session to the calibration database (especially if they've provided ground truth labels). If yes:

```bash
cd packages/pitch-analyzer && node dist/cli.js calibrate-add \
  --input ./temp/session_analysis.json \
  --game "<game-name>" \
  --date "<date>" \
  --calibration ./calibration.json
```

If radar gun readings are available:

```bash
  --radar '{"IMG_XXXX.MOV": 82, "IMG_YYYY.MOV": 65}'
```

Then show updated calibration status:

```bash
cd packages/pitch-analyzer && node dist/cli.js calibrate-status \
  --calibration ./calibration.json
```

### 11. If Ground Truth Provided — Retrain Model

If the user provided ground truth with sufficient curveball/changeup labels, retrain the k-NN model for better future pitch type detection:

1. Build a ground_truth_comparison.json from session results + ground truth
2. Run `video-analyze` to retrain:

```bash
cd packages/pitch-analyzer && node dist/cli.js video-analyze \
  --comparison ./temp/ground_truth_comparison.json \
  --video-dir "<video-dir>" \
  --temp-dir ./temp
```

This updates `./temp/video_pitch_analysis.json` (the training data for future sessions).

## Calibration System Reference

```
calibration.json structure:
{
  "version": 1,
  "updated": "...",
  "baselines": { "Fastball": 79, "Curveball": 65, "Changeup": 72 },
  "entries": [
    { "video", "game", "date", "pitch_type", "glove_pop_amplitude", "fb_score", ... }
  ]
}

Current state (as of 2026-03-06):
  - 122 total entries across 2 games
  - Fastball: 76 samples (±2 mph uncertainty)
  - Curveball: 40 samples (±2 mph uncertainty)
  - Changeup: 6 samples (±4 mph uncertainty)
  - No radar calibration yet (baselines are assumed)
```

### Why Calibration Matters

Without calibration, velocity uses **session-only z-scores** — the same pitch reads differently depending on what other pitches are in the batch. A 14-pitch subset read 2.6 mph lower on average than the full 77-pitch game.

With calibration, velocity uses the **full historical database** as the reference population. The same pitch gets a consistent reading regardless of session size. Mean error drops from 2.6 mph to 0.3 mph.

## CLI Command Reference

```bash
# Full calibrated analysis pipeline
analyze-session   --video-dir --training-data --temp-dir [--ground-truth]

# Generate Excel with calibrated velocities
generate-khs-excel --input --output --calibration

# Add reviewed data to calibration database
calibrate-add     --input --game --date --calibration [--radar]

# Show calibration database summary
calibrate-status  --calibration

# Compare calibrated vs session-only velocities
calibrate-velocity --input --calibration
```

## Important Notes

- The pitch-analyzer uses **FFmpeg** (bundled via `ffmpeg-static`) — no system install needed
- Videos must be `.MOV` format (the analyzer filters for this extension)
- Cloud-degraded videos (30fps from Google Drive/iCloud) still work for audio analysis but video features are lower quality
- For best results, transfer videos via **USB cable** to preserve 120fps+ frame rate
- k-NN pitch type detection gets 70% accuracy on fastballs but struggles with off-speed — adding ground truth labels and retraining improves this
- Radar gun readings (even 3 per pitch type) dramatically improve absolute velocity accuracy
- The `temp/` directory stores intermediate `.raw` audio files; it can be cleaned up after analysis
- All commands run from the `packages/pitch-analyzer/` directory
