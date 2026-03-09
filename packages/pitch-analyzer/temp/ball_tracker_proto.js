/**
 * Ball Tracker Prototype — Frame-by-frame velocity estimation
 *
 * Uses 120fps 4K source, downscales to 960x540 for processing.
 * Extracts frames to disk to avoid pipe buffer limits.
 */

const { execFileSync, execSync } = require("child_process");
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
        execFileSync(
            ffmpegPath,
            [
                "-ss", String(startTime),
                "-t", String(duration),
                "-i", videoPath,
                "-vf", `scale=${W}:${H}`,
                "-r", String(FPS),
                "-f", "rawvideo",
                "-pix_fmt", "rgb24",
                "-v", "error",
                "-y",
                outFile,
            ],
            { maxBuffer: 10 * 1024 * 1024, timeout: 30000 }
        );
        const data = fs.readFileSync(outFile);
        const frames = [];
        for (let off = 0; off + FRAME_SIZE <= data.length; off += FRAME_SIZE) {
            frames.push(data.subarray(off, off + FRAME_SIZE));
        }
        return frames;
    } catch (e) {
        console.error("FFmpeg error:", e.message.substring(0, 200));
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

function frameDiff(g1, g2) {
    const diff = new Float32Array(W * H);
    for (let i = 0; i < diff.length; i++) {
        diff[i] = Math.abs(g2[i] - g1[i]);
    }
    return diff;
}

// Also check original frame brightness at blob location (baseball is white)
function getBrightness(frame, cx, cy, radius) {
    let sum = 0, count = 0;
    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            const x = Math.round(cx) + dx;
            const y = Math.round(cy) + dy;
            if (x < 0 || x >= W || y < 0 || y >= H) continue;
            const j = (y * W + x) * 3;
            sum += (frame[j] + frame[j + 1] + frame[j + 2]) / 3;
            count++;
        }
    }
    return count > 0 ? sum / count : 0;
}

function findBlobs(diff, threshold) {
    const visited = new Uint8Array(W * H);
    const blobs = [];

    for (let y = 10; y < H - 10; y++) {
        for (let x = 10; x < W - 10; x++) {
            const idx = y * W + x;
            if (diff[idx] < threshold || visited[idx]) continue;

            const queue = [{ x, y }];
            visited[idx] = 1;
            let sumX = 0, sumY = 0, count = 0, sumBright = 0;
            let minX = x, maxX = x, minY = y, maxY = y;

            while (queue.length > 0) {
                const p = queue.shift();
                sumX += p.x;
                sumY += p.y;
                sumBright += diff[p.y * W + p.x];
                count++;
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = p.x + dx, ny = p.y + dy;
                        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
                        const ni = ny * W + nx;
                        if (visited[ni] || diff[ni] < threshold * 0.6) continue;
                        visited[ni] = 1;
                        queue.push({ x: nx, y: ny });
                    }
                }
            }

            const blobW = maxX - minX + 1;
            const blobH = maxY - minY + 1;
            const aspectRatio = Math.max(blobW, blobH) / (Math.min(blobW, blobH) + 1);

            // Baseball at 960px wide: roughly 4-20 pixels
            if (count >= 2 && count <= 500 && aspectRatio < 5) {
                blobs.push({
                    x: sumX / count,
                    y: sumY / count,
                    size: count,
                    brightness: sumBright / count,
                    width: blobW,
                    height: blobH,
                });
            }
        }
    }

    return blobs;
}

function trackBall(frames, popTimeS, startTimeS) {
    const grays = frames.map(toGray);
    const popFrame = Math.round((popTimeS - startTimeS) * FPS);

    // Search window: 0.45s before pop to pop (pitch flight is ~0.4s)
    const searchStart = Math.max(1, popFrame - Math.round(0.45 * FPS));
    const searchEnd = Math.min(grays.length - 1, popFrame + 3);

    // Adaptive threshold
    let sampleMotion = 0;
    const sampleCount = Math.min(10, searchEnd - searchStart);
    for (let i = searchStart; i < searchStart + sampleCount; i++) {
        const diff = frameDiff(grays[i - 1], grays[i]);
        let sum = 0;
        for (let j = 0; j < diff.length; j++) sum += diff[j];
        sampleMotion += sum / diff.length;
    }
    const avgMotion = sampleMotion / sampleCount;
    const threshold = Math.max(12, avgMotion * 4);

    // Find all blobs in all frames first
    const allBlobs = [];
    for (let i = searchStart; i <= searchEnd; i++) {
        const diff = frameDiff(grays[i - 1], grays[i]);
        const blobs = findBlobs(diff, threshold);
        // Also get brightness from original frame
        blobs.forEach((b) => {
            b.origBrightness = getBrightness(frames[i], b.x, b.y, 5);
        });
        allBlobs.push({ frame: i, blobs });
    }

    // Try to find the best consistent track
    // Strategy: try starting from different blobs near the pitcher area (upper portion of frame)
    // and follow the most consistent trajectory toward the catcher (lower/center)

    let bestTrack = [];

    // Try starting from frames near the beginning of the search window
    for (let startIdx = 0; startIdx < Math.min(15, allBlobs.length); startIdx++) {
        const startFrame = allBlobs[startIdx];

        for (const startBlob of startFrame.blobs) {
            // Prefer blobs in upper half (pitcher area) that are bright (white ball)
            if (startBlob.y > H * 0.7) continue;
            if (startBlob.origBrightness < 100) continue;

            const track = [{
                frame: startFrame.frame,
                x: startBlob.x,
                y: startBlob.y,
                size: startBlob.size,
                brightness: startBlob.origBrightness,
            }];

            // Follow forward
            for (let fi = startIdx + 1; fi < allBlobs.length; fi++) {
                const last = track[track.length - 1];
                const candidates = allBlobs[fi].blobs;

                let bestCand = null;
                let bestScore = -Infinity;

                // Predict next position if we have 2+ points
                let predX = last.x, predY = last.y;
                if (track.length >= 2) {
                    const prev = track[track.length - 2];
                    const dt = last.frame - prev.frame;
                    const nextDt = allBlobs[fi].frame - last.frame;
                    predX = last.x + ((last.x - prev.x) / dt) * nextDt;
                    predY = last.y + ((last.y - prev.y) / dt) * nextDt;
                }

                for (const c of candidates) {
                    const dx = c.x - predX;
                    const dy = c.y - predY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 80) continue; // too far from prediction

                    let score = 100 - dist;
                    if (c.origBrightness > 150) score += 20; // bright = likely ball
                    if (c.size >= 3 && c.size <= 100) score += 15;

                    if (score > bestScore) {
                        bestScore = score;
                        bestCand = c;
                    }
                }

                if (bestCand && bestScore > 20) {
                    track.push({
                        frame: allBlobs[fi].frame,
                        x: bestCand.x,
                        y: bestCand.y,
                        size: bestCand.size,
                        brightness: bestCand.origBrightness,
                    });
                } else {
                    break; // lost track
                }
            }

            if (track.length > bestTrack.length) {
                bestTrack = track;
            }
        }
    }

    return bestTrack;
}

function estimateVelocity(tracks) {
    if (tracks.length < 3) return null;

    const displacements = [];
    for (let i = 1; i < tracks.length; i++) {
        const dx = tracks[i].x - tracks[i - 1].x;
        const dy = tracks[i].y - tracks[i - 1].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const frameDelta = tracks[i].frame - tracks[i - 1].frame;
        displacements.push(dist / frameDelta);
    }

    displacements.sort((a, b) => a - b);
    const median = displacements[Math.floor(displacements.length / 2)];
    const avg = displacements.reduce((a, b) => a + b, 0) / displacements.length;

    const totalDx = tracks[tracks.length - 1].x - tracks[0].x;
    const totalDy = tracks[tracks.length - 1].y - tracks[0].y;
    const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
    const totalFrames = tracks[tracks.length - 1].frame - tracks[0].frame;
    const totalTimeS = totalFrames / FPS;

    return {
        trackPoints: tracks.length,
        totalPixels: totalDist,
        totalFrames,
        totalTimeS,
        medianPixPerFrame: median,
        avgPixPerFrame: avg,
    };
}

async function main() {
    const comparison = JSON.parse(fs.readFileSync("./temp/ground_truth_comparison.json", "utf8"));

    // Test on 5 fastballs (clearest trajectory, known ~79mph baseline)
    const testVideos = ["IMG_7153.MOV", "IMG_7191.MOV", "IMG_7238.MOV", "IMG_7157.MOV", "IMG_7147.MOV"];

    const results = [];

    for (const videoName of testVideos) {
        const pitch = comparison.find((p) => p.video === videoName);
        if (!pitch) continue;

        console.log(`\n=== ${videoName} (${pitch.actual_pitch_type}) ===`);
        console.log(`  Glove pop: ${pitch.glove_pop_time_s}s`);

        const videoPath = path.join(VIDEO_DIR, videoName);
        const startTime = Math.max(0, pitch.glove_pop_time_s - 0.6);
        const duration = 0.7;

        const frames = extractFrames(videoPath, startTime, duration);
        console.log(`  Extracted ${frames.length} frames (expected ~${Math.round(duration * FPS)})`);

        if (frames.length < 20) {
            console.log("  Too few frames");
            continue;
        }

        const tracks = trackBall(frames, pitch.glove_pop_time_s, startTime);
        console.log(`  Track points: ${tracks.length}`);

        if (tracks.length >= 3) {
            const vel = estimateVelocity(tracks);
            console.log(`  Total: ${vel.totalPixels.toFixed(1)} px / ${vel.totalFrames} frames (${(vel.totalTimeS * 1000).toFixed(0)} ms)`);
            console.log(`  Avg px/frame: ${vel.avgPixPerFrame.toFixed(2)}, Median: ${vel.medianPixPerFrame.toFixed(2)}`);

            results.push({ video: videoName, type: pitch.actual_pitch_type, ...vel });

            // Print track details
            tracks.forEach((t, i) => {
                const d = i > 0 ? Math.sqrt((t.x - tracks[i-1].x)**2 + (t.y - tracks[i-1].y)**2).toFixed(1) : "-";
                console.log(`    F${t.frame}: (${t.x.toFixed(0)}, ${t.y.toFixed(0)}) sz=${t.size} br=${t.brightness.toFixed(0)} d=${d}`);
            });
        }
    }

    // If we have results, try to calibrate
    if (results.length > 0) {
        console.log("\n=== CALIBRATION ANALYSIS ===");
        console.log("At 120fps, pitch flight time of 0.40s (80mph) = 48 frames");
        console.log("Mound to plate = 60.5 ft = 54.5 ft actual flight (~6ft release point)");
        results.forEach((r) => {
            // If totalTimeS looks like a real pitch flight time (0.3-0.6s)
            if (r.totalTimeS > 0.2 && r.totalTimeS < 0.7) {
                // velocity = distance / time, distance ≈ 55 ft
                const estMph = (55 / r.totalTimeS) * 0.6818; // ft/s to mph
                console.log(`  ${r.video}: flight=${(r.totalTimeS * 1000).toFixed(0)}ms → ~${estMph.toFixed(1)} mph`);
            }
        });
    }

    // Cleanup
    try { fs.unlinkSync(path.join(TEMP_DIR, "frames.raw")); } catch {}
}

main().catch(console.error);
