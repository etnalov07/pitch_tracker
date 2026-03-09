# Video Analysis & Camera Setup Plan

## Status: Approved
## Date: 2026-03-06
## Context: Gino vs Clear Falls game analysis revealed camera angle limitations

---

## Part 1: Velocity Estimation — Current State

### Audio-Based Model (Active)

The pitch-analyzer uses a **multi-feature audio model** to estimate velocity from glove pop characteristics. No radar gun data is available for calibration.

#### Features & Weights

| Feature | Weight | Description |
|---------|--------|-------------|
| Amplitude | 40% | Peak loudness of glove pop — primary velocity indicator |
| Peak Ratio | 20% | Pop loudness relative to ambient noise |
| Sustained Ms | 15% | Duration of elevated sound post-pop |
| FB Score | 15% | Composite audio signature correlated with pitch speed |
| Pop ZCR | 5% | Zero-crossing rate (frequency content) of the pop |
| Decay Ratio | -5% | Slower decay = slightly softer pitch |

#### Method

1. Per pitch type, normalize each feature to z-scores within the type
2. Compute weighted composite score
3. Map composite z-score to velocity: `baseline + clamp(z * scale, -4, +4)`
4. Baselines: Fastball=79, Curveball=65, Changeup=72 mph

#### Confidence

- **Relative ordering** within a pitch type: **High** — the model reliably ranks harder vs softer pitches
- **Absolute velocity**: **Moderate** — assumes baselines are correct; ±2 mph uncertainty
- **Cross-type comparison**: **Low** — baselines are assumptions, not measured

#### Calibration Needed

Even 2-3 radar gun readings per pitch type would allow baseline calibration and dramatically improve absolute accuracy. Priority for next game.

---

## Part 2: Video-Based Ball Tracking — Lessons Learned

### Gino vs Clear Falls (2026-03-05)

- **Camera position**: Behind home plate, through backstop netting
- **Resolution**: 3840x2160 (4K)
- **Frame rate**: 120fps (originals); Google Drive/iCloud re-encoded to 30fps
- **Result**: Ball tracking **not viable** from this angle

#### Why It Failed

1. **Ball moves toward camera (Z-axis)** — minimal pixel displacement per frame
2. **Backstop netting** covers entire frame — creates false positives in motion detection
3. **Ball is tiny** (~5-10px at pitcher distance) and obscured by net texture
4. **Perspective foreshortening** — 55 feet of depth maps to very few pixels of apparent movement

#### What We Learned

- Behind-home-plate angle is ideal for: audio capture, ball/strike detection, game context
- It is NOT suitable for: velocity measurement, spin rate, ball tracking
- Always transfer videos via **USB cable or AirDrop** — cloud services destroy frame rate

---

## Part 3: Camera Setup Plan — Next Game

### Camera 1: Side-Angle (REQUIRED for velocity)

**Purpose**: Frame-by-frame ball tracking for velocity estimation and movement profiling.

**Position**:
- Along the **1st base line** (or 3rd base line), approximately **40-60 feet** from the pitch trajectory
- **Perpendicular** to the line from mound to home plate
- Elevated slightly if possible (bleacher row, elevated platform) to reduce occlusion from fielders

**Why this angle**:
- Ball travels **laterally across the frame** — maximum pixel displacement per frame
- At 120fps: ~50 frames of ball flight with 20-40 px/frame displacement
- At 240fps: ~100 frames, sub-pixel precision possible
- No backstop netting in the way

**Settings (iPhone 16 Pro)**:
- Settings > Camera > Record Slo-mo > **240fps** (preferred) or 120fps
- 4K resolution
- **Lock exposure and focus** before the game: tap and hold on the mound/pitching lane area
- Use a **tripod or clamp mount** on the dugout fence — stability is critical for tracking
- Frame the shot to capture from the pitcher's release point through to home plate
- Leave some margin above and below the pitch trajectory

**Recording protocol**:
- Start recording ~2 seconds before each pitch, stop after the play
- Or record continuously and trim later (large file sizes at 240fps — ~500MB per minute)

**File transfer**:
- **USB cable** directly from iPhone to PC (preserves original codec, fps, resolution)
- AirDrop to a Mac as backup
- **DO NOT** upload to Google Drive or download from iCloud web — both re-encode to 30fps

### Camera 2: Behind Home Plate (KEEP current setup)

**Purpose**: Audio analysis (glove pop, umpire calls), ball/strike detection, game context.

**Position**: Current backstop position (behind home plate, through netting)

**Settings**:
- 120fps, 4K (current settings are fine)
- This is the primary audio source — keep it close to the action

**Why keep it**:
- Best angle for: ball/strike call detection, batter stance, pitch framing
- Excellent audio capture for the glove pop model
- Provides game context (batter, count, result)

### Camera 3: Behind Pitcher (OPTIONAL, future)

**Purpose**: Release point analysis, arm slot, deception metrics.

**Position**: Center field camera well, or elevated behind the mound.

**Settings**: 120fps minimum, 4K.

**Value**: Enables analysis of arm angle consistency, release point drift during the game, and pitch tunneling effectiveness. Lower priority than Cameras 1 and 2.

---

## Part 4: What Each Frame Rate Enables

| FPS | Velocity Accuracy | Spin Rate | Ball Tracking | Movement Profile |
|-----|-------------------|-----------|---------------|------------------|
| 30 | Not viable | No | No | No |
| 120 | ±3-5 mph | Marginal (~3 frames/rotation) | Yes | Basic |
| 240 | ±1-2 mph | Yes (~6 frames/rotation) | Excellent | Detailed break measurement |
| 480+ | <±1 mph | Precise | Excellent | Research-grade |

### Spin Rate Feasibility

At 2200 RPM (typical HS fastball):
- **120fps**: 3.3 frames per rotation — can detect spin axis but not precise RPM
- **240fps**: 6.5 frames per rotation — reliable RPM measurement from seam tracking
- **480fps**: 13 frames per rotation — research-grade, sub-100 RPM precision

**Recommendation**: Use **240fps** from the side angle for the best balance of file size and analysis quality.

---

## Part 5: Radar Gun Calibration Protocol

If a radar gun is available at any point, even for a few pitches:

1. Record the radar reading and the corresponding video file name
2. Minimum: 3 fastballs + 2 curveballs with radar readings
3. This allows recalibrating the audio model baselines from assumptions to measured values
4. Expected improvement: ±2 mph uncertainty → ±1 mph uncertainty

---

## Part 6: File Management

### Naming Convention
```
{Date}_{Opponent}_{CameraPosition}/
  e.g., 20260310_Dickinson_SideAngle/
        20260310_Dickinson_BehindPlate/
```

### Storage
- Keep originals on a local drive (not cloud-only)
- Each game at 240fps/4K ≈ 5-15 GB depending on pitch count
- Archive to external drive after analysis is complete

### Transfer Checklist
1. Connect iPhone via USB cable
2. Copy .MOV files directly from DCIM folder
3. Verify fps with: `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 file.MOV`
4. Should show `240/1` or `120/1`, NOT `30/1`
