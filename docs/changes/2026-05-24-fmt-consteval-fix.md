# iOS build fix — fmt Pod consteval failure on Xcode 26 · 2026-05-24

**Type:** `fix`
**Commits:** `f41ef43` (attempt 1, ineffective), `e07107e` (attempt 2, real fix)
**Versions:** `mobile@2.17.0 → 2.18.0 → 2.18.1`

## Context

Mobile iOS production build broke on the `macos-26` runner ([run 26352045740](https://github.com/etnalov07/pitch_tracker/actions/runs/26352045740/job/77571916829)). React Native 0.81.5 vendors `fmt` 11.0.2 as a CocoaPod. Under Xcode 26.4.1's clang (stricter C++20 consteval propagation), every `FMT_STRING("...")` call inside `Pods/fmt/include/fmt/format-inl.h` now fails with:

```
call to consteval function
'fmt::basic_format_string<...>::basic_format_string<FMT_COMPILE_STRING, 0>'
is not a constant expression
```

The fmt Pod won't compile, the archive fails, TestFlight submit is skipped. fmt fixed this upstream in 11.1; RN hasn't bumped yet. We can't downgrade the runner — we moved to `macos-26` deliberately for the iOS 26 SDK (commit `d1105bf`).

## Plan (Decisions)

### Attempt 1 (ineffective) — define `FMT_USE_CONSTEVAL=0` on fmt target

Assumed `FMT_USE_CONSTEVAL` was guarded by `#ifndef`, making a `-D` override authoritative. Plugin added the define to `GCC_PREPROCESSOR_DEFINITIONS` on the fmt target via Podfile `post_install`. Build re-ran ([run 26352978188](https://github.com/etnalov07/pitch_tracker/actions/runs/26352978188/job/77574381887)) and **failed identically** — same consteval errors at the same lines.

Root cause: in fmt 11.0.2's `include/fmt/base.h`, `FMT_USE_CONSTEVAL` is **not** wrapped in `#ifndef`. It's hard-defined by a chain of `#if/#elif/#else` blocks based on compiler/standard-library detection — the `-D` define just produces a silenced "macro redefined" warning. (Silenced because fmt's podspec sets `GCC_WARN_INHIBIT_ALL_WARNINGS=YES`, so we got zero signal.)

### Attempt 2 (real fix) — set `CLANG_CXX_LANGUAGE_STANDARD=c++17` on fmt target

fmt's detection chain in `base.h` includes:

```c
#elif FMT_CPLUSPLUS < 201709L
#  define FMT_USE_CONSTEVAL 0
```

C++17 reports `__cplusplus == 201703L`, which is `< 201709L`, so compiling the fmt Pod itself at c++17 lands in that branch and `FMT_CONSTEVAL` becomes empty. Consumers (Folly, React-Core, etc.) still see fmt's headers at c++20 — fmt's per-TU instantiations of `basic_format_string` are template / inline and link-deduplicate cleanly; no ABI break in practice.

Other decisions carried over from attempt 1:

- **Don't touch the Xcode version.** iOS 26 SDK is non-negotiable.
- **Don't bump fmt to 11.1 via podspec override.** Recompiles every fmt consumer. Bigger blast radius than narrowing the language standard for one Pod.
- **Deliver as an Expo config plugin** (`withFmtConstevalFix`) — managed Expo, no checked-in `ios/Podfile`.
- **Insert the patch AFTER `react_native_post_install`** (not before, as attempt 1 did) so RN's hook can't overwrite our build settings. Implementation: balance `do`/`end` from the `post_install` opener line to find the matching close, insert just before it.
- **Temporary.** Delete the plugin once RN ships an fmt 11.1+ bump (likely Expo SDK 55 / RN 0.82+).

## What shipped

### packages/mobile (v2.18.0 — attempt 1)

- NEW `plugins/withFmtConstevalFix.js` — Expo config plugin using `withDangerousMod` to inject a `post_install` snippet that appended `FMT_USE_CONSTEVAL=0` to `GCC_PREPROCESSOR_DEFINITIONS` on the fmt target. **Ineffective** — see Attempt 1 above.
- MODIFIED `app.json` — registered `./plugins/withFmtConstevalFix` in `expo.plugins`.
- MODIFIED `package.json` — version bump 2.17.0 → 2.18.0.

### packages/mobile (v2.18.1 — attempt 2)

- MODIFIED `plugins/withFmtConstevalFix.js`:
    - Replaced the preprocessor define with `config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'` for every build configuration on the `fmt` target.
    - Rewrote the Podfile injector. Old behavior inserted the patch right after `post_install do |installer|` (so it ran before `react_native_post_install`, where RN could overwrite our changes). New behavior walks lines from the `post_install` opener, tracks `do`/`end` balance (handles nested blocks), and splices the patch just before the matching closing `end` — so our settings are written last.
    - Marker comments unchanged; idempotent across repeated prebuilds.
- MODIFIED `package.json` — version bump 2.18.0 → 2.18.1.

## Verification

- **Local plugin smoke test** (added then removed): drove `withDangerousMod` against two synthetic Podfiles — one simple, one with nested `do/end` blocks inside `post_install`. In both, the patch landed BEFORE the closing `end`, AFTER `react_native_post_install(...)`. Marker count was exactly 1 after two consecutive runs (idempotency).
- **TypeScript + Jest** clean on `packages/mobile`.
- **Re-run the workflow:** push any change touching `packages/mobile/**`. The `Build iOS app locally` step should now compile `Pods.build/Release-iphoneos/fmt.build/Objects-normal/arm64/format.o` cleanly.

## Out of scope (deferred)

- **Upgrading React Native / Expo SDK** to a version that ships fmt ≥ 11.1 with the proper Xcode 26 fix. Will happen as part of the next Expo SDK bump; this fix can be deleted then.
- **Android build failure** in the same workflow runs. Job 26352045740 also has a failing Android job, but its log shows `Error: build command failed.` from EAS without fmt-style detail. Not addressed here.
- **`macos-26` Node 20 deprecation warnings** — non-blocking, leaving alone.
