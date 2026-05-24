# iOS build fix — fmt Pod consteval failure on Xcode 26 · 2026-05-24

**Type:** `fix`
**Commit:** _pending_
**Versions:** `mobile@2.17.0 → 2.18.0`

## Context

Mobile iOS production build broke on the `macos-26` runner ([run 26352045740](https://github.com/etnalov07/pitch_tracker/actions/runs/26352045740/job/77571916829)). React Native 0.81.5 vendors `fmt` 11.0.2 as a CocoaPod. Under Xcode 26.4.1's clang (stricter C++20 consteval propagation), every `FMT_STRING("...")` call inside `Pods/fmt/include/fmt/format-inl.h` now fails with:

```
call to consteval function
'fmt::basic_format_string<...>::basic_format_string<FMT_COMPILE_STRING, 0>'
is not a constant expression
```

The fmt Pod won't compile, the archive fails, TestFlight submit is skipped. fmt fixed this upstream in 11.1; RN hasn't bumped yet. We can't downgrade the runner — we moved to `macos-26` deliberately for the iOS 26 SDK (commit `d1105bf`).

## Plan (Decisions)

- **Don't touch the Xcode version.** iOS 26 SDK is non-negotiable.
- **Don't bump fmt to 11.1.** That would override the RN podspec and recompile every fmt consumer (Folly, glog, React-Core, ...). Bigger blast radius than warranted.
- **Don't drop fmt's C++ standard to c++17.** Would diverge fmt from the rest of the RN Pod graph and risk ODR issues; the macro toggle is narrower.
- **Define `FMT_USE_CONSTEVAL=0` on just the `fmt` Pod target.** This forces fmt's `FMT_STRING(...)` to use the `constexpr` path instead of the `consteval` path, which compiles cleanly under Xcode 26. Behaviorally equivalent at the call sites used by RN.
- **Deliver as an Expo config plugin** (`withFmtConstevalFix`) — this is a managed Expo project, so `ios/` is generated at prebuild and we can't check in a Podfile edit. The plugin uses `withDangerousMod` to append a `post_install` snippet that walks `installer.pods_project.targets` and patches `GCC_PREPROCESSOR_DEFINITIONS` only when `target.name == 'fmt'`. Idempotent: a `# === withFmtConstevalFix BEGIN ===` marker prevents double-insertion if prebuild runs again.
- **Temporary patch.** Delete the plugin once RN ships an `fmt` bump (likely 0.82+).

## What shipped

### packages/mobile (v2.18.0)

- NEW `plugins/withFmtConstevalFix.js` — Expo config plugin. Uses `withDangerousMod` for `ios`, finds the existing `post_install do |installer|` block in the generated Podfile, and inserts a Ruby snippet that scans `installer.pods_project.targets`, matches `fmt`, and appends `FMT_USE_CONSTEVAL=0` to `GCC_PREPROCESSOR_DEFINITIONS` for every build configuration. Falls back to creating a new `post_install` block if none exists. Idempotent via marker comments.
- MODIFIED `app.json` — added `"./plugins/withFmtConstevalFix"` to `expo.plugins` (after `expo-router`, before `react-native-audio-api`).
- MODIFIED `package.json` — version bump 2.17.0 → 2.18.0.

## Verification

- **Re-run the workflow:** `gh workflow run "Build & Submit Mobile App"` (or push any change touching `packages/mobile/**`). The `Build iOS app locally` step should now complete past the `CompileC ... fmt.build/Objects-normal/arm64/format.o` step that previously failed at `format-inl.h:60`, `:1387`, `:1391`, `:1394`.
- **Local sanity check:** `cd packages/mobile && npx expo prebuild --platform ios --clean`, then inspect `ios/Podfile` for the `# === withFmtConstevalFix BEGIN ===` marker followed by the fmt target patch inside `post_install`. (Skipped here because there is no local `ios/` checkout — first prebuild happens on the EAS local runner.)
- **No code path change at runtime** — the patch only flips a compile-time macro inside the fmt Pod; all `fmt::format_to(...)` callers in RN compile to the same machine code.

## Out of scope (deferred)

- **Upgrading React Native / Expo SDK** to a version that ships fmt ≥ 11.1 with the proper Xcode 26 fix. Will happen as part of the next Expo SDK bump; this fix can be deleted then.
- **Android build failure** in the same workflow run. Job 26352045740 also has a failing Android job, but its log shows `Error: build command failed.` from EAS without the fmt-style detail — it's likely a different EAS transient issue (cache 400, deprecated Node 20 warnings). Not addressed here; re-run after this lands and triage separately if it stays red.
- **`macos-26` Node 20 deprecation warnings** — non-blocking, leaving alone.
