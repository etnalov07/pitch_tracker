-- Migration: Invalidate cached performance summaries after the Dial 1
-- command-grade softening.
--
-- scoreAccuracy() gained two new partial-credit conditions on the
-- column-anchored branch (see docs/plans/2026-05-12-command-grade-softening.md):
--   - 2 cols off in-zone but row matches the target row → 0.25 (was 0)
--   - Wrong-col-side / perpendicular waste with matching row-side → 0.25 (was 0)
--
-- Every cached performance_summaries row was computed under the previous
-- 5-level algorithm. Its target_accuracy_percentage, pitch_type_breakdown
-- per-type accuracy, metrics, highlights, concerns, and AI narrative are
-- all derived from it and therefore stale.
--
-- Deleting the rows forces lazy recomputation via
-- PerformanceSummaryService.generateSummary on next fetch. Applies to both
-- source_type='game' and source_type='bullpen'. Same pattern as
-- 036_invalidate_zone_accuracy_summaries.sql.

DELETE FROM public.performance_summaries;
