-- Migration 002: Roles, Organizations, Invites, Join Requests
-- Adds: organizations, organization_members, team_members, invites, join_requests
-- Alters: teams (add organization_id), players (add user_id)

-- Provide gen_random_uuid() if not already available (PG < 13 without pgcrypto)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'gen_random_uuid') THEN
        CREATE FUNCTION public.gen_random_uuid() RETURNS uuid AS '
            SELECT md5(random()::text || clock_timestamp()::text)::uuid;
        ' LANGUAGE SQL VOLATILE;
    END IF;
END
$$;

-- ============================================================
-- Organizations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    logo_path VARCHAR(500),
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_created_by ON public.organizations(created_by);

-- ============================================================
-- Organization Members
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'coach' CHECK (role IN ('owner', 'admin', 'coach')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);

-- ============================================================
-- Team Members (user <-> team with role)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'player' CHECK (role IN ('owner', 'coach', 'assistant', 'player')),
    player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_members_player ON public.team_members(player_id);

-- ============================================================
-- Add organization_id to teams
-- ============================================================

ALTER TABLE public.teams
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teams_organization ON public.teams(organization_id);

-- ============================================================
-- Add user_id to players (link player record to user account)
-- ============================================================

ALTER TABLE public.players
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_players_user ON public.players(user_id);

-- ============================================================
-- Invites (coach invites player/coach to team)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(128) NOT NULL UNIQUE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    invited_by UUID NOT NULL REFERENCES public.users(id),
    invited_email VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'player' CHECK (role IN ('owner', 'coach', 'assistant', 'player')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMP NOT NULL,
    accepted_by UUID REFERENCES public.users(id),
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invites_token ON public.invites(token);
CREATE INDEX idx_invites_team ON public.invites(team_id);
CREATE INDEX idx_invites_status ON public.invites(status);

-- ============================================================
-- Join Requests (player-initiated)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    reviewed_by UUID REFERENCES public.users(id),
    linked_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_join_requests_team ON public.join_requests(team_id);
CREATE INDEX idx_join_requests_user ON public.join_requests(user_id);
CREATE INDEX idx_join_requests_status ON public.join_requests(status);

-- ============================================================
-- Backfill: Migrate existing team owners to team_members
-- ============================================================

INSERT INTO public.team_members (id, team_id, user_id, role)
SELECT gen_random_uuid(), id, owner_id, 'owner'
FROM public.teams
WHERE owner_id IS NOT NULL
ON CONFLICT (team_id, user_id) DO NOTHING;
