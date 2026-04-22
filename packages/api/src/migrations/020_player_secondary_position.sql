-- Add secondary position to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS secondary_position varchar(50);

GRANT ALL ON TABLE public.players TO bvolante_pitch_tracker;
