-- Migration: Invalidate cached performance summaries after the A1
-- adjacency split.
--
-- scoreAccuracy() column-anchored branch gained a new partial-credit
-- condition (see docs/changes/2026-05-12-command-grade-a1.md):
--   - Adjacent column (colDiff === 1) with matching row → 0.5 (was 0.25)
--
-- Every cached performance_summaries row was computed under the previous
-- 5-level algorithm. Its target_accuracy_percentage, pitch_type_breakdown
-- per-type accuracy, metrics, highlights, concerns, and AI narrative are
-- all derived from it and therefore stale.
--
-- Deleting the rows forces lazy recomputation via
-- PerformanceSummaryService.generateSummary on next fetch. Applies to both
-- source_type='game' and source_type='bullpen'. Same pattern as
-- 036_invalidate_zone_accuracy_summaries.sql and
-- 037_invalidate_command_grade_summaries.sql.

DELETE FROM public.performance_summaries;
