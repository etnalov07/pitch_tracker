-- Migration 005: Bullpen Mode
-- Adds tables for bullpen sessions, pitches, plans, and plan pitches

-- Table: bullpen_sessions
CREATE TABLE IF NOT EXISTS bullpen_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    pitcher_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    intensity varchar(10) NOT NULL DEFAULT 'medium',
    notes text,
    plan_id uuid,
    status varchar(20) NOT NULL DEFAULT 'in_progress',
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT bullpen_sessions_intensity_check CHECK (
        intensity IN ('low', 'medium', 'high')
    ),
    CONSTRAINT bullpen_sessions_status_check CHECK (
        status IN ('in_progress', 'completed', 'cancelled')
    )
);

-- Table: bullpen_pitches
CREATE TABLE IF NOT EXISTS bullpen_pitches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES bullpen_sessions(id) ON DELETE CASCADE,
    pitch_number integer NOT NULL,
    pitch_type varchar(20) NOT NULL,
    target_x numeric(6,4),
    target_y numeric(6,4),
    actual_x numeric(6,4),
    actual_y numeric(6,4),
    velocity numeric(5,1),
    result varchar(20) NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT bullpen_pitches_result_check CHECK (
        result IN ('ball', 'called_strike', 'swinging_strike', 'foul')
    )
);

-- Table: bullpen_plans (create now to avoid future migration)
CREATE TABLE IF NOT EXISTS bullpen_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    description text,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Table: bullpen_plan_pitches
CREATE TABLE IF NOT EXISTS bullpen_plan_pitches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid NOT NULL REFERENCES bullpen_plans(id) ON DELETE CASCADE,
    sequence integer NOT NULL,
    pitch_type varchar(20) NOT NULL,
    target_x numeric(6,4),
    target_y numeric(6,4),
    instruction text
);

-- Add foreign key from sessions to plans
ALTER TABLE bullpen_sessions
    ADD CONSTRAINT bullpen_sessions_plan_fkey
    FOREIGN KEY (plan_id) REFERENCES bullpen_plans(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bullpen_sessions_team ON bullpen_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_bullpen_sessions_pitcher ON bullpen_sessions(pitcher_id);
CREATE INDEX IF NOT EXISTS idx_bullpen_sessions_date ON bullpen_sessions(date DESC);
CREATE INDEX IF NOT EXISTS idx_bullpen_pitches_session ON bullpen_pitches(session_id);
CREATE INDEX IF NOT EXISTS idx_bullpen_plans_team ON bullpen_plans(team_id);
CREATE INDEX IF NOT EXISTS idx_bullpen_plan_pitches_plan ON bullpen_plan_pitches(plan_id);

-- Permissions
GRANT ALL ON TABLE bullpen_sessions TO bvolante_pitch_tracker;
GRANT ALL ON TABLE bullpen_pitches TO bvolante_pitch_tracker;
GRANT ALL ON TABLE bullpen_plans TO bvolante_pitch_tracker;
GRANT ALL ON TABLE bullpen_plan_pitches TO bvolante_pitch_tracker;

-- Triggers for updated_at
CREATE TRIGGER update_bullpen_sessions_updated_at
    BEFORE UPDATE ON bullpen_sessions
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_bullpen_plans_updated_at
    BEFORE UPDATE ON bullpen_plans
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
