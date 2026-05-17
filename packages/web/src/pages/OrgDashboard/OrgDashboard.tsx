import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyOrganization, OrgTeam, organizationService } from '../../services/organizationService';
import { teamService } from '../../services/teamService';
import { logout, useAppDispatch, useAppSelector } from '../../state';
import type { OrganizationMember, OrgRole } from '../../types';
import {
    Container,
    Header,
    HeaderLeft,
    HeaderRight,
    OrgName,
    SubLine,
    OrgSwitcher,
    LogoutButton,
    MainContent,
    TabContainer,
    TabButton,
    Section,
    SectionTitle,
    TeamGrid,
    TeamCard,
    TeamCardName,
    TeamCardMeta,
    MemberRow,
    MemberInfo,
    MemberName,
    MemberEmail,
    MemberRight,
    RoleBadge,
    InlineForm,
    TextInput,
    RoleSelect,
    PrimaryButton,
    RemoveButton,
    ErrorText,
    HelperText,
    EmptyState,
    EmptyTitle,
    EmptyText,
} from './styles';

type Tab = 'teams' | 'members' | 'settings';

// Pull the server's error string off an axios failure, falling back gracefully.
const errMsg = (err: unknown, fallback: string): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp = (err as any)?.response?.data?.error;
    if (typeof resp === 'string' && resp) return resp;
    return err instanceof Error ? err.message : fallback;
};

const OrgDashboard: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);

    const [orgs, setOrgs] = useState<MyOrganization[] | null>(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [tab, setTab] = useState<Tab>('teams');
    const [teams, setTeams] = useState<OrgTeam[]>([]);
    const [members, setMembers] = useState<OrganizationMember[]>([]);

    const [newTeamName, setNewTeamName] = useState('');
    const [memberEmail, setMemberEmail] = useState('');
    const [memberRole, setMemberRole] = useState<OrgRole>('admin');
    const [renameValue, setRenameValue] = useState('');
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        organizationService
            .listMine()
            .then((rows) => {
                if (!cancelled) setOrgs(rows);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setLoadError(errMsg(err, 'Failed to load your organizations'));
                setOrgs([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const activeOrg = orgs && orgs.length > 0 ? orgs[Math.min(activeIdx, orgs.length - 1)] : null;
    const activeOrgId = activeOrg?.id;
    const canManage = activeOrg?.user_role === 'owner' || activeOrg?.user_role === 'admin';

    const loadOrgData = useCallback((orgId: string) => {
        Promise.all([organizationService.getTeams(orgId), organizationService.getMembers(orgId)])
            .then(([t, m]) => {
                setTeams(t);
                setMembers(m);
            })
            .catch((err: unknown) => {
                setActionError(errMsg(err, 'Failed to load organization data'));
            });
    }, []);

    useEffect(() => {
        if (activeOrgId) loadOrgData(activeOrgId);
    }, [activeOrgId, loadOrgData]);

    useEffect(() => {
        setRenameValue(activeOrg?.name ?? '');
    }, [activeOrg?.name]);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    const handleCreateTeam = async () => {
        const name = newTeamName.trim();
        if (!activeOrgId || !name) return;
        setBusy(true);
        setActionError(null);
        try {
            await teamService.createTeam({ name, organization_id: activeOrgId });
            setNewTeamName('');
            loadOrgData(activeOrgId);
        } catch (err) {
            setActionError(errMsg(err, 'Could not create the team.'));
        } finally {
            setBusy(false);
        }
    };

    const handleAddMember = async () => {
        const email = memberEmail.trim();
        if (!activeOrgId || !email) return;
        setBusy(true);
        setActionError(null);
        try {
            await organizationService.addMember(activeOrgId, email, memberRole);
            setMemberEmail('');
            loadOrgData(activeOrgId);
        } catch (err) {
            setActionError(errMsg(err, 'Could not add that member.'));
        } finally {
            setBusy(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!activeOrgId) return;
        setBusy(true);
        setActionError(null);
        try {
            await organizationService.removeMember(activeOrgId, memberId);
            loadOrgData(activeOrgId);
        } catch (err) {
            setActionError(errMsg(err, 'Could not remove that member.'));
        } finally {
            setBusy(false);
        }
    };

    const handleRename = async () => {
        const name = renameValue.trim();
        if (!activeOrgId || !name) return;
        setBusy(true);
        setActionError(null);
        try {
            const updated = await organizationService.rename(activeOrgId, name);
            setOrgs((prev) => (prev ? prev.map((o) => (o.id === activeOrgId ? { ...o, name: updated.name } : o)) : prev));
        } catch (err) {
            setActionError(errMsg(err, 'Could not rename the organization.'));
        } finally {
            setBusy(false);
        }
    };

    if (orgs === null) {
        return (
            <Container>
                <Header>
                    <HeaderLeft>
                        <OrgName>Loading…</OrgName>
                    </HeaderLeft>
                </Header>
            </Container>
        );
    }

    // Org admin signed up but hasn't created their org yet — send them to onboarding.
    if (orgs.length === 0) {
        return (
            <Container>
                <Header>
                    <HeaderLeft>
                        <OrgName>Hi {user?.first_name || 'there'}</OrgName>
                    </HeaderLeft>
                    <HeaderRight>
                        <LogoutButton onClick={handleLogout}>Sign Out</LogoutButton>
                    </HeaderRight>
                </Header>
                <MainContent>
                    <EmptyState>
                        <EmptyTitle>No organization yet</EmptyTitle>
                        <EmptyText>{loadError || 'Create your organization to start adding teams and inviting coaches.'}</EmptyText>
                        <PrimaryButton onClick={() => navigate('/onboarding/org')}>Create Organization</PrimaryButton>
                    </EmptyState>
                </MainContent>
            </Container>
        );
    }

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <OrgName>{activeOrg?.name}</OrgName>
                    <SubLine>
                        {teams.length} {teams.length === 1 ? 'team' : 'teams'} · {members.length}{' '}
                        {members.length === 1 ? 'member' : 'members'}
                    </SubLine>
                </HeaderLeft>
                <HeaderRight>
                    {orgs.length > 1 && (
                        <OrgSwitcher value={activeIdx} onChange={(e) => setActiveIdx(parseInt(e.target.value, 10))}>
                            {orgs.map((o, i) => (
                                <option key={o.id} value={i}>
                                    {o.name}
                                </option>
                            ))}
                        </OrgSwitcher>
                    )}
                    <LogoutButton onClick={handleLogout}>Sign Out</LogoutButton>
                </HeaderRight>
            </Header>

            <MainContent>
                <TabContainer>
                    <TabButton active={tab === 'teams'} onClick={() => setTab('teams')}>
                        Teams ({teams.length})
                    </TabButton>
                    <TabButton active={tab === 'members'} onClick={() => setTab('members')}>
                        Members ({members.length})
                    </TabButton>
                    <TabButton active={tab === 'settings'} onClick={() => setTab('settings')}>
                        Settings
                    </TabButton>
                </TabContainer>

                {tab === 'teams' && (
                    <Section>
                        <SectionTitle>Teams</SectionTitle>
                        {teams.length > 0 ? (
                            <TeamGrid>
                                {teams.map((team) => (
                                    <TeamCard key={team.id} onClick={() => navigate(`/teams/${team.id}`)}>
                                        <TeamCardName>{team.name}</TeamCardName>
                                        <TeamCardMeta>
                                            {team.player_count ?? 0} {team.player_count === 1 ? 'player' : 'players'}
                                        </TeamCardMeta>
                                    </TeamCard>
                                ))}
                            </TeamGrid>
                        ) : (
                            <HelperText>No teams in this organization yet.</HelperText>
                        )}
                        {canManage && (
                            <InlineForm>
                                <TextInput
                                    type="text"
                                    placeholder="New team name"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateTeam();
                                    }}
                                />
                                <PrimaryButton onClick={handleCreateTeam} disabled={busy || !newTeamName.trim()}>
                                    Create Team
                                </PrimaryButton>
                            </InlineForm>
                        )}
                        {actionError && <ErrorText>{actionError}</ErrorText>}
                    </Section>
                )}

                {tab === 'members' && (
                    <Section>
                        <SectionTitle>Members</SectionTitle>
                        {members.map((member) => {
                            const name = [member.user_first_name, member.user_last_name].filter(Boolean).join(' ');
                            return (
                                <MemberRow key={member.id}>
                                    <MemberInfo>
                                        <MemberName>{name || member.user_email || 'Unknown member'}</MemberName>
                                        {member.user_email && <MemberEmail>{member.user_email}</MemberEmail>}
                                    </MemberInfo>
                                    <MemberRight>
                                        <RoleBadge>{member.role}</RoleBadge>
                                        {canManage && member.user_id !== user?.id && (
                                            <RemoveButton onClick={() => handleRemoveMember(member.id)} disabled={busy}>
                                                Remove
                                            </RemoveButton>
                                        )}
                                    </MemberRight>
                                </MemberRow>
                            );
                        })}
                        {canManage && (
                            <>
                                <InlineForm>
                                    <TextInput
                                        type="email"
                                        placeholder="Coach or admin email"
                                        value={memberEmail}
                                        onChange={(e) => setMemberEmail(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddMember();
                                        }}
                                    />
                                    <RoleSelect value={memberRole} onChange={(e) => setMemberRole(e.target.value as OrgRole)}>
                                        <option value="admin">Admin</option>
                                        <option value="coach">Coach</option>
                                    </RoleSelect>
                                    <PrimaryButton onClick={handleAddMember} disabled={busy || !memberEmail.trim()}>
                                        Add Member
                                    </PrimaryButton>
                                </InlineForm>
                                <HelperText>The person must already have a PitchChart account.</HelperText>
                            </>
                        )}
                        {actionError && <ErrorText>{actionError}</ErrorText>}
                    </Section>
                )}

                {tab === 'settings' && (
                    <Section>
                        <SectionTitle>Organization Settings</SectionTitle>
                        <InlineForm>
                            <TextInput
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                disabled={!canManage}
                            />
                            <PrimaryButton
                                onClick={handleRename}
                                disabled={busy || !canManage || !renameValue.trim() || renameValue.trim() === activeOrg?.name}
                            >
                                Save Name
                            </PrimaryButton>
                        </InlineForm>
                        <HelperText>Renaming the organization does not change its existing link.</HelperText>
                        {actionError && <ErrorText>{actionError}</ErrorText>}
                    </Section>
                )}
            </MainContent>
        </Container>
    );
};

export default OrgDashboard;
