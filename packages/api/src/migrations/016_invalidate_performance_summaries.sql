-- Migration: Invalidate cached performance summaries after target-accuracy threshold change
--
-- The target-accuracy threshold moved from 0.15 to 0.22 (centralized in
-- @pitch-tracker/shared). Cached summaries in performance_summaries were
-- computed against the old threshold — their target_accuracy_percentage,
-- metrics, highlights, concerns, and AI narrative are all derived from it
-- and are therefore stale.
--
-- Deleting the rows forces lazy recomputation via
-- PerformanceSummaryService.generateSummary on the next fetch, which rebuilds
-- every derived field at the current threshold.

DELETE FROM public.performance_summaries;
