/**
 * Ball Tracker v2 — Improved detection
 *
 * Key improvements:
 * 1. Use 3-frame differencing to isolate fast-moving small objects
 * 2. Filter for white/bright objects in the ORIGINAL frame (baseball is white)
 * 3. Find longest consistent trajectory segment using direction/speed consistency
 * 4. Detect actual release point and catch point for true flight time
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ffmpegPath = require("ffmpeg-static");
const VIDEO_DIR = "C:/SVNViews/pitch_tracker/videos/Gino vs Clear Falls";
const TEMP_DIR = "C:/SVNViews/pitch_tracker/packages/pitch-analyzer/temp/ball_track";

const W = 960;
const H = 540;
const BPP = 3;
const FRAME_SIZE = W * H * BPP;
const FPS = 120;

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function extractFrames(videoPath, startTime, duration) {
    const outFile = path.join(TEMP_DIR, "frames.raw");
    try {
        execFileSync(ffmpegPath, [
            "-ss", String(startTime), "-t", String(duration),
            "-i", videoPath,
            "-vf", `scale=${W}:${H}`,
            "-r", String(FPS),
            "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-v", "error", "-y", outFile,
        ], { maxBuffer: 10 * 1024 * 1024, timeout: 30000 });
        const data = fs.readFileSync(outFile);
        const frames = [];
        for (let off = 0; off + FRAME_SIZE <= data.length; off += FRAME_SIZE) {
            frames.push(data.subarray(off, off + FRAME_SIZE));
        }
        return frames;
    } catch (e) {
        console.error("FFmpeg error:", e.message.substring(0, 150));
        return [];
    }
}

function toGray(frame) {
    const g = new Float32Array(W * H);
    for (let i = 0; i < g.length; i++) {
        const j = i * 3;
        g[i] = frame[j] * 0.299 + frame[j + 1] * 0.587 + frame[j + 2] * 0.114;
    }
    return g;
}

// 3-frame difference: highlights fast-moving objects, suppresses static/slow
function triFrameDiff(g0, g1, g2) {
    const diff = new Float32Array(W * H);
    for (let i = 0; i < diff.length; i++) {
        const d1 = Math.abs(g1[i] - g0[i]);
        const d2 = Math.abs(g2[i] - g1[i]);
        diff[i] = Math.min(d1, d2); // Only bright where motion in BOTH transitions
    }
    return diff;
}

// Check if a region in the original RGB frame is bright/white (baseball)
function regionWhiteness(frame, cx, cy, radius) {
    let totalBright = 0, totalSat = 0, count = 0;
    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            const x = Math.round(cx) + dx;
            const y = Math.round(cy) + dy;
            if (x < 0 || x >= W || y < 0 || y >= H) continue;
            const j = (y * W + x) * 3;
            const R = frame[j], G = frame[j + 1], B = frame[j + 2];
            const brightness = (R + G + B) / 3;
            const maxC = Math.max(R, G, B);
            const minC = Math.min(R, G, B);
            const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;
            totalBright += brightness;
            totalSat += saturation;
            count++;
        }
    }
    return {
        brightness: count > 0 ? totalBright / count : 0,
        saturation: count > 0 ? totalSat / count : 1,
    };
}

function findBallCandidates(diff, frame, threshold) {
    const visited = new Uint8Array(W * H);
    const candidates = [];

    for (let y = 5; y < H - 5; y++) {
        for (let x = 5; x < W - 5; x++) {
            const idx = y * W + x;
            if (diff[idx] < threshold || visited[idx]) continue;

            const queue = [{ x, y }];
            visited[idx] = 1;
            let sumX = 0, sumY = 0, count = 0;

            while (queue.length > 0) {
                const p = queue.shift();
                sumX += p.x;
                sumY += p.y;
                count++;

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = p.x + dx, ny = p.y + dy;
                        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
                        const ni = ny * W + nx;
                        if (visited[ni] || diff[ni] < threshold * 0.5) continue;
                        visited[ni] = 1;
                        queue.push({ x: nx, y: ny });
                    }
                }

                if (count > 300) break; // bail on large blobs
            }

            // Baseball at this resolution: ~3-25 pixels in area
            if (count >= 2 && count <= 80) {
                const cx = sumX / count;
                const cy = sumY / count;
                const { brightness, saturation } = regionWhiteness(frame, cx, cy, 4);

                // Baseball is bright and low-saturation (white)
                if (brightness > 120 && saturation < 0.4) {
                    candidates.push({ x: cx, y: cy, size: count, brightness, saturation });
                }
            }
        }
    }

    return candidates;
}

// Find the best consistent trajectory from candidate detections
function findBestTrajectory(frameDetections) {
    let bestPath = [];

    // Try starting from each detection in early frames
    const maxStartFrame = Math.min(20, frameDetections.length - 5);

    for (let si = 0; si < maxStartFrame; si++) {
        const startDets = frameDetections[si];
        if (!startDets || startDets.length === 0) continue;

        for (const startDet of startDets) {
            const path = [{ frame: si, ...startDet }];
            let lastVx = 0, lastVy = 0;

            for (let fi = si + 1; fi < frameDetections.length; fi++) {
                const dets = frameDetections[fi];
                if (!dets || dets.length === 0) continue;

                const last = path[path.length - 1];
                const dt = fi - last.frame;
                if (dt > 3) break; // lost track for too long

                // Predict next position
                let predX = last.x + lastVx * dt;
                let predY = last.y + lastVy * dt;

                let bestCand = null;
                let bestDist = Infinity;

                for (const d of dets) {
                    const dx = d.x - predX;
                    const dy = d.y - predY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // At 120fps, ball moves ~5-40 px/frame depending on angle
                    const maxDist = path.length < 3 ? 60 : 40;
                    if (dist < maxDist && dist < bestDist) {
                        bestDist = dist;
                        bestCand = { frame: fi, ...d };
                    }
                }

                if (bestCand) {
                    const newDt = bestCand.frame - last.frame;
                    lastVx = (bestCand.x - last.x) / newDt;
                    lastVy = (bestCand.y - last.y) / newDt;
                    path.push(bestCand);
                }
            }

            // Score: longer paths that cover more distance are better
            if (path.length >= 5) {
                const totalDx = path[path.length - 1].x - path[0].x;
                const totalDy = path[path.length - 1].y - path[0].y;
                const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

                // Compute directional consistency
                let consistent = 0;
                for (let i = 2; i < path.length; i++) {
                    const dx1 = path[i - 1].x - path[i - 2].x;
                    const dy1 = path[i - 1].y - path[i - 2].y;
                    const dx2 = path[i].x - path[i - 1].x;
                    const dy2 = path[i].y - path[i - 1].y;
                    const dot = dx1 * dx2 + dy1 * dy2;
                    if (dot > 0) consistent++;
                }
                const consistency = consistent / (path.length - 2);

                const score = path.length * consistency * Math.sqrt(totalDist);

                if (score > bestPath.length * (bestPath._consistency || 0) * Math.sqrt(bestPath._totalDist || 1)) {
                    bestPath = path;
                    bestPath._consistency = consistency;
                    bestPath._totalDist = totalDist;
                }
            }
        }
    }

    return bestPath;
}

// Extract the consistent flight segment from a noisy track
function extractFlightSegment(track) {
    if (track.length < 5) return track;

    // Compute per-step velocity
    const steps = [];
    for (let i = 1; i < track.length; i++) {
        const dt = track[i].frame - track[i - 1].frame;
        const dx = (track[i].x - track[i - 1].x) / dt;
        const dy = (track[i].y - track[i - 1].y) / dt;
        const speed = Math.sqrt(dx * dx + dy * dy);
        steps.push({ idx: i, dx, dy, speed });
    }

    // Find the longest run of consistent speed (within 50% of median)
    const speeds = steps.map((s) => s.speed).sort((a, b) => a - b);
    const medianSpeed = speeds[Math.floor(speeds.length / 2)];

    if (medianSpeed < 3) return track; // barely moving

    let bestStart = 0, bestLen = 0;
    let curStart = 0;

    for (let i = 0; i < steps.length; i++) {
        if (steps[i].speed > medianSpeed * 0.4 && steps[i].speed < medianSpeed * 2.0) {
            const runLen = i - curStart + 1;
            if (runLen > bestLen) {
                bestStart = curStart;
                bestLen = runLen;
            }
        } else {
            curStart = i + 1;
        }
    }

    if (bestLen >= 4) {
        return track.slice(bestStart, bestStart + bestLen + 1);
    }
    return track;
}

async function main() {
    const comparison = JSON.parse(fs.readFileSync("./temp/ground_truth_comparison.json", "utf8"));

    // Test on fastballs first
    const testVideos = ["IMG_7153.MOV", "IMG_7191.MOV", "IMG_7238.MOV", "IMG_7157.MOV", "IMG_7147.MOV"];

    for (const videoName of testVideos) {
        const pitch = comparison.find((p) => p.video === videoName);
        if (!pitch) continue;

        console.log(`\n=== ${videoName} (${pitch.actual_pitch_type}) ===`);

        const videoPath = path.join(VIDEO_DIR, videoName);
        const startTime = Math.max(0, pitch.glove_pop_time_s - 0.55);
        const duration = 0.6;

        const frames = extractFrames(videoPath, startTime, duration);
        console.log(`  ${frames.length} frames extracted`);
        if (frames.length < 20) continue;

        const grays = frames.map(toGray);

        // Build per-frame detections using 3-frame differencing
        const frameDetections = [];
        for (let i = 1; i < grays.length - 1; i++) {
            const diff = triFrameDiff(grays[i - 1], grays[i], grays[i + 1]);

            // Adaptive threshold
            let sum = 0;
            for (let j = 0; j < diff.length; j++) sum += diff[j];
            const avg = sum / diff.length;
            const threshold = Math.max(8, avg * 5);

            const candidates = findBallCandidates(diff, frames[i], threshold);
            frameDetections.push(candidates.length > 0 ? candidates : null);
        }

        const framesWithDetections = frameDetections.filter((d) => d && d.length > 0).length;
        console.log(`  Detections in ${framesWithDetections}/${frameDetections.length} frames`);

        // Find best trajectory
        const track = findBestTrajectory(frameDetections);
        console.log(`  Raw track: ${track.length} points`);

        if (track.length < 5) {
            console.log("  Insufficient track points");
            continue;
        }

        // Extract flight segment
        const flight = extractFlightSegment(track);
        const flightFrames = flight[flight.length - 1].frame - flight[0].frame;
        const flightTimeS = flightFrames / FPS;

        console.log(`  Flight segment: ${flight.length} points, ${flightFrames} frames (${(flightTimeS * 1000).toFixed(0)} ms)`);

        // Print flight track
        flight.forEach((t, i) => {
            const d = i > 0 ? Math.sqrt((t.x - flight[i - 1].x) ** 2 + (t.y - flight[i - 1].y) ** 2).toFixed(1) : "-";
            console.log(`    F${t.frame}: (${t.x.toFixed(0)}, ${t.y.toFixed(0)}) sz=${t.size} br=${t.brightness.toFixed(0)} d=${d}`);
        });

        // Velocity estimate
        // Assume ~55 ft actual flight distance (release to glove)
        if (flightTimeS > 0.15 && flightTimeS < 0.65) {
            const FLIGHT_DIST_FT = 55;
            const ftPerSec = FLIGHT_DIST_FT / flightTimeS;
            const mph = ftPerSec * 0.6818;
            console.log(`  >>> Estimated velocity: ${mph.toFixed(1)} mph (flight: ${(flightTimeS * 1000).toFixed(0)} ms)`);
        } else {
            console.log(`  Flight time ${(flightTimeS * 1000).toFixed(0)}ms outside expected range`);
        }
    }

    try { fs.unlinkSync(path.join(TEMP_DIR, "frames.raw")); } catch {}
}

main().catch(console.error);
