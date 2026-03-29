-- Performance summaries: post-session pitcher performance analysis
-- Generated on-demand after bullpen sessions or games conclude.

CREATE TABLE performance_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('game', 'bullpen')),
    source_id UUID NOT NULL,
    pitcher_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    -- AI narrative
    narrative TEXT,
    narrative_generated_at TIMESTAMPTZ,

    -- Overall stats snapshot
    total_pitches INTEGER NOT NULL DEFAULT 0,
    strikes INTEGER NOT NULL DEFAULT 0,
    balls INTEGER NOT NULL DEFAULT 0,
    strike_percentage NUMERIC(5,2) DEFAULT 0,
    target_accuracy_percentage NUMERIC(5,2),

    -- Game-specific (NULL for bullpen)
    batters_faced INTEGER,
    innings_pitched NUMERIC(4,1),
    runs_allowed INTEGER,
    hits_allowed INTEGER,

    -- Bullpen-specific (NULL for game)
    intensity VARCHAR(10),
    plan_name VARCHAR(255),

    -- Structured data (JSONB)
    metrics JSONB NOT NULL DEFAULT '[]',
    pitch_type_breakdown JSONB NOT NULL DEFAULT '[]',
    highlights JSONB NOT NULL DEFAULT '[]',
    concerns JSONB NOT NULL DEFAULT '[]',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One summary per source
CREATE UNIQUE INDEX idx_performance_summaries_source
    ON performance_summaries(source_type, source_id);

-- Lookup by pitcher
CREATE INDEX idx_performance_summaries_pitcher
    ON performance_summaries(pitcher_id, created_at DESC);

-- Lookup by team
CREATE INDEX idx_performance_summaries_team
    ON performance_summaries(team_id, created_at DESC);

GRANT ALL ON performance_summaries TO bvolante_pitch_tracker;
