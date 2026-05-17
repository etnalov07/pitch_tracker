import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { useAppSelector } from '../../state';
import type { AdminUserListItem, AdminOrgListItem, AdminTeamListItem, AdminGameListItem, AdminAuditEntry } from '../../types';
import {
    Container,
    Header,
    HeaderLeft,
    HeaderRight,
    Title,
    BackButton,
    DestructiveToggle,
    MainContent,
    TabBar,
    Tab,
    SearchRow,
    SearchInput,
    Table,
    Th,
    Td,
    ActionButton,
    Pager,
    LoadingText,
    ErrorText,
} from './styles';

type TabKey = 'users' | 'orgs' | 'teams' | 'games' | 'audit';
const PAGE_SIZE = 50;
// Client-side timer: hides destructive buttons after this window expires.
// Server doesn't trust it — the endpoints are always live to super admins.
const DESTRUCTIVE_WINDOW_MS = 15 * 60 * 1000;

const formatDate = (iso?: string | null): string => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
};

const Admin: React.FC = () => {
    const navigate = useNavigate();
    const user = useAppSelector((state) => state.auth.user);
    const [tab, setTab] = useState<TabKey>('users');
    const [destructiveUntil, setDestructiveUntil] = useState<number | null>(null);
    const destructiveActive = destructiveUntil !== null && Date.now() < destructiveUntil;

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!user.is_super_admin) {
            navigate('/');
        }
    }, [user, navigate]);

    const toggleDestructive = useCallback(() => {
        setDestructiveUntil((prev) => (prev && Date.now() < prev ? null : Date.now() + DESTRUCTIVE_WINDOW_MS));
    }, []);

    if (!user || !user.is_super_admin) return null;

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate('/')}>← Dashboard</BackButton>
                    <Title>Super Admin</Title>
                </HeaderLeft>
                <HeaderRight>
                    <DestructiveToggle enabled={destructiveActive}>
                        <input type="checkbox" checked={destructiveActive} onChange={toggleDestructive} />
                        {destructiveActive ? 'Destructive mode: ON (15 min)' : 'Enable destructive mode'}
                    </DestructiveToggle>
                </HeaderRight>
            </Header>
            <MainContent>
                <TabBar>
                    <Tab active={tab === 'users'} onClick={() => setTab('users')}>
                        Users
                    </Tab>
                    <Tab active={tab === 'orgs'} onClick={() => setTab('orgs')}>
                        Organizations
                    </Tab>
                    <Tab active={tab === 'teams'} onClick={() => setTab('teams')}>
                        Teams
                    </Tab>
                    <Tab active={tab === 'games'} onClick={() => setTab('games')}>
                        Games
                    </Tab>
                    <Tab active={tab === 'audit'} onClick={() => setTab('audit')}>
                        Audit Log
                    </Tab>
                </TabBar>
                {tab === 'users' && <UsersTab destructiveActive={destructiveActive} />}
                {tab === 'orgs' && <OrgsTab />}
                {tab === 'teams' && <TeamsTab />}
                {tab === 'games' && <GamesTab />}
                {tab === 'audit' && <AuditTab />}
            </MainContent>
        </Container>
    );
};

const usePagedList = <T,>(fetcher: (page: number) => Promise<{ items: T[]; total: number }>) => {
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<T[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetcher(page)
            .then((data) => {
                if (cancelled) return;
                setItems(data.items);
                setTotal(data.total);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const msg = err instanceof Error ? err.message : 'Failed to load';
                setError(msg);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // fetcher identity is stable per caller; reload by bumping reloadKey
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, reloadKey]);

    return {
        items,
        total,
        page,
        setPage,
        loading,
        error,
        reload: () => setReloadKey((k) => k + 1),
    };
};

interface UsersTabProps {
    destructiveActive: boolean;
}

const UsersTab: React.FC<UsersTabProps> = ({ destructiveActive }) => {
    const [search, setSearch] = useState('');
    const [committedSearch, setCommittedSearch] = useState('');
    const fetcher = useCallback(
        (page: number) => adminService.listUsers({ page, page_size: PAGE_SIZE, search: committedSearch || undefined }),
        [committedSearch]
    );
    const { items, total, page, setPage, loading, error, reload } = usePagedList<AdminUserListItem>(fetcher);

    const handleVerify = async (id: string) => {
        if (!window.confirm('Force-verify this user’s email?')) return;
        await adminService.forceVerifyEmail(id);
        reload();
    };

    const handleResend = async (id: string) => {
        await adminService.resendVerification(id);
        window.alert('Verification email sent.');
    };

    return (
        <>
            <SearchRow>
                <SearchInput
                    placeholder="Search by email, first, last…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            setCommittedSearch(search);
                            setPage(1);
                        }
                    }}
                />
                <ActionButton
                    onClick={() => {
                        setCommittedSearch(search);
                        setPage(1);
                    }}
                >
                    Search
                </ActionButton>
            </SearchRow>
            {error && <ErrorText>{error}</ErrorText>}
            {loading ? (
                <LoadingText>Loading…</LoadingText>
            ) : (
                <Table>
                    <thead>
                        <tr>
                            <Th>Email</Th>
                            <Th>Name</Th>
                            <Th>Verified</Th>
                            <Th>Teams</Th>
                            <Th>Orgs</Th>
                            <Th>Created</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((u) => (
                            <tr key={u.id}>
                                <Td>{u.email}</Td>
                                <Td>
                                    {u.first_name} {u.last_name}
                                </Td>
                                <Td>{u.email_verified ? '✓' : '—'}</Td>
                                <Td>{u.team_count}</Td>
                                <Td>{u.org_count}</Td>
                                <Td>{formatDate(u.created_at)}</Td>
                                <Td>
                                    {destructiveActive && !u.email_verified && (
                                        <ActionButton destructive onClick={() => handleVerify(u.id)}>
                                            Force verify
                                        </ActionButton>
                                    )}
                                    {!u.email_verified && <ActionButton onClick={() => handleResend(u.id)}>Resend</ActionButton>}
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
            <PagerControls page={page} setPage={setPage} total={total} />
        </>
    );
};

const OrgsTab: React.FC = () => {
    const fetcher = useCallback((page: number) => adminService.listOrgs({ page, page_size: PAGE_SIZE }), []);
    const { items, total, page, setPage, loading, error } = usePagedList<AdminOrgListItem>(fetcher);

    return (
        <>
            {error && <ErrorText>{error}</ErrorText>}
            {loading ? (
                <LoadingText>Loading…</LoadingText>
            ) : (
                <Table>
                    <thead>
                        <tr>
                            <Th>Name</Th>
                            <Th>Slug</Th>
                            <Th>Members</Th>
                            <Th>Teams</Th>
                            <Th>Created</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((o) => (
                            <tr key={o.id}>
                                <Td>{o.name}</Td>
                                <Td>{o.slug}</Td>
                                <Td>{o.member_count}</Td>
                                <Td>{o.team_count}</Td>
                                <Td>{formatDate(o.created_at)}</Td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
            <PagerControls page={page} setPage={setPage} total={total} />
        </>
    );
};

const TeamsTab: React.FC = () => {
    const fetcher = useCallback((page: number) => adminService.listTeams({ page, page_size: PAGE_SIZE }), []);
    const { items, total, page, setPage, loading, error } = usePagedList<AdminTeamListItem>(fetcher);

    return (
        <>
            {error && <ErrorText>{error}</ErrorText>}
            {loading ? (
                <LoadingText>Loading…</LoadingText>
            ) : (
                <Table>
                    <thead>
                        <tr>
                            <Th>Name</Th>
                            <Th>Organization</Th>
                            <Th>Owner</Th>
                            <Th>Created</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((t) => (
                            <tr key={t.id}>
                                <Td>{t.name}</Td>
                                <Td>{t.organization_name || '— (orphaned)'}</Td>
                                <Td>{t.owner_email || t.owner_id}</Td>
                                <Td>{formatDate(t.created_at)}</Td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
            <PagerControls page={page} setPage={setPage} total={total} />
        </>
    );
};

const GamesTab: React.FC = () => {
    const fetcher = useCallback((page: number) => adminService.listGames({ page, page_size: PAGE_SIZE }), []);
    const { items, total, page, setPage, loading, error } = usePagedList<AdminGameListItem>(fetcher);

    return (
        <>
            {error && <ErrorText>{error}</ErrorText>}
            {loading ? (
                <LoadingText>Loading…</LoadingText>
            ) : (
                <Table>
                    <thead>
                        <tr>
                            <Th>Date</Th>
                            <Th>Home</Th>
                            <Th>Opponent</Th>
                            <Th>Status</Th>
                            <Th>Score</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((g) => (
                            <tr key={g.id}>
                                <Td>{formatDate(g.game_date)}</Td>
                                <Td>{g.home_team_name || g.home_team_id}</Td>
                                <Td>{g.opponent_name || '—'}</Td>
                                <Td>{g.status}</Td>
                                <Td>
                                    {g.home_score} — {g.away_score}
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
            <PagerControls page={page} setPage={setPage} total={total} />
        </>
    );
};

const AuditTab: React.FC = () => {
    const fetcher = useCallback((page: number) => adminService.listAudit({ page, page_size: PAGE_SIZE }), []);
    const { items, total, page, setPage, loading, error } = usePagedList<AdminAuditEntry>(fetcher);

    return (
        <>
            {error && <ErrorText>{error}</ErrorText>}
            {loading ? (
                <LoadingText>Loading…</LoadingText>
            ) : (
                <Table>
                    <thead>
                        <tr>
                            <Th>When</Th>
                            <Th>Actor</Th>
                            <Th>Role</Th>
                            <Th>Action</Th>
                            <Th>Target</Th>
                            <Th>Payload</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((a) => (
                            <tr key={a.id}>
                                <Td>{formatDate(a.created_at)}</Td>
                                <Td>{a.actor_email || a.actor_user_id}</Td>
                                <Td>{a.actor_role}</Td>
                                <Td>{a.action}</Td>
                                <Td>
                                    {a.target_table || '—'}
                                    {a.target_id ? ` / ${a.target_id.slice(0, 8)}…` : ''}
                                </Td>
                                <Td>
                                    <code style={{ fontSize: 11 }}>{a.payload ? JSON.stringify(a.payload) : ''}</code>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
            <PagerControls page={page} setPage={setPage} total={total} />
        </>
    );
};

interface PagerControlsProps {
    page: number;
    setPage: (n: number) => void;
    total: number;
}

const PagerControls: React.FC<PagerControlsProps> = ({ page, setPage, total }) => {
    const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    return (
        <Pager>
            <ActionButton onClick={() => setPage(Math.max(1, page - 1))}>Prev</ActionButton>
            <span>
                Page {page} of {lastPage} ({total} total)
            </span>
            <ActionButton onClick={() => setPage(Math.min(lastPage, page + 1))}>Next</ActionButton>
        </Pager>
    );
};

export default Admin;
