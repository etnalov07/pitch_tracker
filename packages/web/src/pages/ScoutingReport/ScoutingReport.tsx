import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import scoutingReportService from '../../services/scoutingReportService';
import {
    HandednessType,
    ScoutingReportBatter,
    ScoutingReportBatterInput,
    ScoutingReportInput,
    ScoutingReportWithBatters,
    ScoutingZoneCell,
    TeamTendencyFrequency,
} from '../../types';
import {
    AddBatterRow,
    BackButton,
    BatterNameBtn,
    BatterTable,
    Container,
    Content,
    DangerButton,
    ErrorText,
    FormGroup,
    FormRow,
    GhostButton,
    Header,
    HeaderLeft,
    HeaderRight,
    Input,
    Label,
    LoadingText,
    Modal,
    ModalOverlay,
    PrimaryButton,
    Section,
    SectionTitle,
    Select,
    SmallInput,
    Subtitle,
    TagChip,
    Td,
    Textarea,
    Th,
    Title,
    ZoneCell,
    ZoneGrid,
    ZoneLegend,
} from './styles';

const FREQUENCIES: Array<{ value: '' | TeamTendencyFrequency; label: string }> = [
    { value: '', label: '—' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
];

const ZONE_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const cycleZoneState = (state: ScoutingZoneCell | undefined): ScoutingZoneCell => {
    if (state === 'hot') return 'cold';
    if (state === 'cold') return 'neutral';
    return 'hot';
};

const ScoutingReport: React.FC = () => {
    const navigate = useNavigate();
    const { team_id: teamId, report_id: reportId } = useParams<{ team_id: string; report_id: string }>();

    const [report, setReport] = useState<ScoutingReportWithBatters | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [savingTeam, setSavingTeam] = useState(false);
    const [teamDraft, setTeamDraft] = useState<ScoutingReportInput>({ opponent_name: '' });
    const [editingBatter, setEditingBatter] = useState<ScoutingReportBatter | null>(null);
    const [showAddBatter, setShowAddBatter] = useState(false);
    const [newBatter, setNewBatter] = useState<ScoutingReportBatterInput>({
        player_name: '',
        bats: 'R',
    });

    const load = useCallback(async () => {
        if (!reportId) return;
        setLoading(true);
        try {
            const data = await scoutingReportService.getById(reportId);
            setReport(data);
            setTeamDraft({
                opponent_name: data.opponent_name,
                game_date: data.game_date ?? null,
                notes: data.notes ?? '',
                steal_frequency: data.steal_frequency ?? null,
                bunt_frequency: data.bunt_frequency ?? null,
                hit_and_run_frequency: data.hit_and_run_frequency ?? null,
            });
            setError('');
        } catch {
            setError('Failed to load scouting report.');
        } finally {
            setLoading(false);
        }
    }, [reportId]);

    useEffect(() => {
        load();
    }, [load]);

    const saveTeamFields = async () => {
        if (!reportId) return;
        setSavingTeam(true);
        try {
            await scoutingReportService.update(reportId, teamDraft);
            await load();
            setError('');
        } catch {
            setError('Failed to save.');
        } finally {
            setSavingTeam(false);
        }
    };

    const addBatter = async () => {
        if (!reportId || !newBatter.player_name.trim()) return;
        try {
            await scoutingReportService.addBatter(reportId, newBatter);
            setNewBatter({ player_name: '', bats: 'R' });
            setShowAddBatter(false);
            await load();
        } catch {
            setError('Failed to add batter.');
        }
    };

    const deleteBatter = async (batterId: string) => {
        if (!window.confirm('Delete this batter?')) return;
        try {
            await scoutingReportService.deleteBatter(batterId);
            await load();
        } catch {
            setError('Failed to delete batter.');
        }
    };

    const deleteReport = async () => {
        if (!reportId || !window.confirm('Delete this scouting report? This cannot be undone.')) return;
        try {
            await scoutingReportService.delete(reportId);
            navigate(`/teams/${teamId}/scouting`);
        } catch {
            setError('Failed to delete report.');
        }
    };

    if (loading) {
        return (
            <Container>
                <LoadingText>Loading scouting report…</LoadingText>
            </Container>
        );
    }
    if (!report) {
        return (
            <Container>
                <LoadingText>{error || 'Report not found'}</LoadingText>
            </Container>
        );
    }

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(`/teams/${teamId}/scouting`)}>Back</BackButton>
                    <div>
                        <Title>{report.opponent_name}</Title>
                        <Subtitle>
                            {report.game_date ? `Game: ${new Date(report.game_date).toLocaleDateString()}` : 'No game linked'}
                            {report.created_by_name ? ` · Created by ${report.created_by_name}` : ''}
                        </Subtitle>
                    </div>
                </HeaderLeft>
                <HeaderRight>
                    <DangerButton onClick={deleteReport}>Delete report</DangerButton>
                </HeaderRight>
            </Header>

            <Content>
                {error && <ErrorText>{error}</ErrorText>}

                <Section>
                    <SectionTitle>Report details</SectionTitle>
                    <FormRow>
                        <FormGroup>
                            <Label>Opponent name</Label>
                            <Input
                                value={teamDraft.opponent_name}
                                onChange={(e) => setTeamDraft({ ...teamDraft, opponent_name: e.target.value })}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>Game date</Label>
                            <Input
                                type="date"
                                value={teamDraft.game_date ?? ''}
                                onChange={(e) => setTeamDraft({ ...teamDraft, game_date: e.target.value || null })}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>&nbsp;</Label>
                            <PrimaryButton onClick={saveTeamFields} disabled={savingTeam}>
                                {savingTeam ? 'Saving…' : 'Save details'}
                            </PrimaryButton>
                        </FormGroup>
                    </FormRow>
                    <FormGroup>
                        <Label>Team-level notes</Label>
                        <Textarea
                            value={teamDraft.notes ?? ''}
                            onChange={(e) => setTeamDraft({ ...teamDraft, notes: e.target.value })}
                            placeholder="Overall scouting observations, league context, etc."
                        />
                    </FormGroup>
                </Section>

                <Section>
                    <SectionTitle>Team tendencies</SectionTitle>
                    <FormRow>
                        <FormGroup>
                            <Label>Steal attempts</Label>
                            <Select
                                value={teamDraft.steal_frequency ?? ''}
                                onChange={(e) =>
                                    setTeamDraft({
                                        ...teamDraft,
                                        steal_frequency: (e.target.value || null) as TeamTendencyFrequency | null,
                                    })
                                }
                            >
                                {FREQUENCIES.map((f) => (
                                    <option key={f.value} value={f.value}>
                                        {f.label}
                                    </option>
                                ))}
                            </Select>
                        </FormGroup>
                        <FormGroup>
                            <Label>Bunt frequency</Label>
                            <Select
                                value={teamDraft.bunt_frequency ?? ''}
                                onChange={(e) =>
                                    setTeamDraft({
                                        ...teamDraft,
                                        bunt_frequency: (e.target.value || null) as TeamTendencyFrequency | null,
                                    })
                                }
                            >
                                {FREQUENCIES.map((f) => (
                                    <option key={f.value} value={f.value}>
                                        {f.label}
                                    </option>
                                ))}
                            </Select>
                        </FormGroup>
                        <FormGroup>
                            <Label>Hit & run</Label>
                            <Select
                                value={teamDraft.hit_and_run_frequency ?? ''}
                                onChange={(e) =>
                                    setTeamDraft({
                                        ...teamDraft,
                                        hit_and_run_frequency: (e.target.value || null) as TeamTendencyFrequency | null,
                                    })
                                }
                            >
                                {FREQUENCIES.map((f) => (
                                    <option key={f.value} value={f.value}>
                                        {f.label}
                                    </option>
                                ))}
                            </Select>
                        </FormGroup>
                    </FormRow>
                </Section>

                <Section>
                    <SectionTitle>Opponent batters ({report.batters.length})</SectionTitle>
                    {report.batters.length === 0 ? (
                        <div style={{ color: '#666', marginBottom: 12 }}>No batters yet. Add them manually below.</div>
                    ) : (
                        <BatterTable>
                            <thead>
                                <tr>
                                    <Th>#</Th>
                                    <Th>Name</Th>
                                    <Th>Bats</Th>
                                    <Th>Order</Th>
                                    <Th>Notes</Th>
                                    <Th>Vulnerabilities</Th>
                                    <Th></Th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.batters.map((b) => (
                                    <tr key={b.id}>
                                        <Td>{b.jersey_number ?? '—'}</Td>
                                        <Td>
                                            <BatterNameBtn onClick={() => setEditingBatter(b)}>{b.player_name}</BatterNameBtn>
                                        </Td>
                                        <Td>{b.bats}</Td>
                                        <Td>{b.batting_order ?? '—'}</Td>
                                        <Td style={{ maxWidth: 260, whiteSpace: 'pre-wrap' }}>{b.notes || '—'}</Td>
                                        <Td>
                                            {b.pitch_vulnerabilities && b.pitch_vulnerabilities.length > 0
                                                ? b.pitch_vulnerabilities.map((v) => <TagChip key={v}>{v}</TagChip>)
                                                : '—'}
                                        </Td>
                                        <Td>
                                            <GhostButton onClick={() => deleteBatter(b.id)}>×</GhostButton>
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </BatterTable>
                    )}

                    {showAddBatter ? (
                        <div style={{ marginTop: 16 }}>
                            <AddBatterRow>
                                <SmallInput
                                    placeholder="Name"
                                    value={newBatter.player_name}
                                    onChange={(e) => setNewBatter({ ...newBatter, player_name: e.target.value })}
                                />
                                <SmallInput
                                    placeholder="#"
                                    type="number"
                                    value={newBatter.jersey_number ?? ''}
                                    onChange={(e) =>
                                        setNewBatter({
                                            ...newBatter,
                                            jersey_number: e.target.value ? Number(e.target.value) : null,
                                        })
                                    }
                                    style={{ maxWidth: 80 }}
                                />
                                <Select
                                    value={newBatter.bats ?? 'R'}
                                    onChange={(e) => setNewBatter({ ...newBatter, bats: e.target.value as HandednessType })}
                                >
                                    <option value="R">R</option>
                                    <option value="L">L</option>
                                    <option value="S">S</option>
                                </Select>
                                <SmallInput
                                    placeholder="Order"
                                    type="number"
                                    value={newBatter.batting_order ?? ''}
                                    onChange={(e) =>
                                        setNewBatter({
                                            ...newBatter,
                                            batting_order: e.target.value ? Number(e.target.value) : null,
                                        })
                                    }
                                    style={{ maxWidth: 80 }}
                                />
                                <PrimaryButton onClick={addBatter} disabled={!newBatter.player_name.trim()}>
                                    Add
                                </PrimaryButton>
                                <GhostButton onClick={() => setShowAddBatter(false)}>Cancel</GhostButton>
                            </AddBatterRow>
                        </div>
                    ) : (
                        <AddBatterRow>
                            <PrimaryButton onClick={() => setShowAddBatter(true)}>+ Add batter</PrimaryButton>
                        </AddBatterRow>
                    )}
                </Section>
            </Content>

            {editingBatter && (
                <BatterEditModal
                    batter={editingBatter}
                    onClose={() => setEditingBatter(null)}
                    onSaved={async () => {
                        setEditingBatter(null);
                        await load();
                    }}
                />
            )}
        </Container>
    );
};

const COMMON_VULNS = [
    'fastball_high',
    'fastball_low',
    'fastball_inside',
    'fastball_outside',
    'breaking_low',
    'breaking_outside',
    'changeup',
    'first_pitch',
];

interface BatterEditModalProps {
    batter: ScoutingReportBatter;
    onClose: () => void;
    onSaved: () => void | Promise<void>;
}

const BatterEditModal: React.FC<BatterEditModalProps> = ({ batter, onClose, onSaved }) => {
    const [draft, setDraft] = useState<ScoutingReportBatterInput>({
        player_name: batter.player_name,
        jersey_number: batter.jersey_number ?? null,
        batting_order: batter.batting_order ?? null,
        bats: batter.bats,
        notes: batter.notes ?? '',
        zone_weakness: batter.zone_weakness ?? {},
        pitch_vulnerabilities: batter.pitch_vulnerabilities ?? [],
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const toggleVuln = (v: string) => {
        const list = draft.pitch_vulnerabilities ?? [];
        setDraft({
            ...draft,
            pitch_vulnerabilities: list.includes(v) ? list.filter((x) => x !== v) : [...list, v],
        });
    };

    const cycleZone = (id: string) => {
        const zone = draft.zone_weakness ?? {};
        const next = { ...zone, [id]: cycleZoneState(zone[id]) };
        setDraft({ ...draft, zone_weakness: next });
    };

    const save = async () => {
        setSaving(true);
        try {
            await scoutingReportService.updateBatter(batter.id, draft);
            await onSaved();
        } catch {
            setErr('Save failed.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalOverlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <SectionTitle>Edit batter</SectionTitle>
                <FormRow>
                    <FormGroup>
                        <Label>Name</Label>
                        <Input value={draft.player_name} onChange={(e) => setDraft({ ...draft, player_name: e.target.value })} />
                    </FormGroup>
                    <FormGroup>
                        <Label>Jersey #</Label>
                        <Input
                            type="number"
                            value={draft.jersey_number ?? ''}
                            onChange={(e) =>
                                setDraft({
                                    ...draft,
                                    jersey_number: e.target.value ? Number(e.target.value) : null,
                                })
                            }
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>Bats</Label>
                        <Select
                            value={draft.bats ?? 'R'}
                            onChange={(e) => setDraft({ ...draft, bats: e.target.value as HandednessType })}
                        >
                            <option value="R">R</option>
                            <option value="L">L</option>
                            <option value="S">S</option>
                        </Select>
                    </FormGroup>
                </FormRow>

                <FormGroup style={{ marginBottom: 16 }}>
                    <Label>Scouting notes</Label>
                    <Textarea
                        value={draft.notes ?? ''}
                        onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                        placeholder="Chases sliders away, can't catch up to high fastballs…"
                    />
                </FormGroup>

                <FormGroup style={{ marginBottom: 16 }}>
                    <Label>Zone weakness (click to cycle: hot → cold → neutral)</Label>
                    <ZoneGrid>
                        {ZONE_IDS.map((id) => {
                            const state = (draft.zone_weakness?.[id] ?? 'neutral') as ScoutingZoneCell;
                            return (
                                <ZoneCell key={id} state={state} onClick={() => cycleZone(id)} type="button">
                                    {state === 'hot' ? '🔥' : state === 'cold' ? '❄' : id}
                                </ZoneCell>
                            );
                        })}
                    </ZoneGrid>
                    <ZoneLegend>
                        <span>🔥 Hot zone (batter crushes)</span>
                        <span>❄ Cold zone (attack here)</span>
                    </ZoneLegend>
                </FormGroup>

                <FormGroup style={{ marginBottom: 16 }}>
                    <Label>Pitch vulnerabilities</Label>
                    <div>
                        {COMMON_VULNS.map((v) => {
                            const active = draft.pitch_vulnerabilities?.includes(v);
                            return (
                                <GhostButton
                                    key={v}
                                    type="button"
                                    onClick={() => toggleVuln(v)}
                                    style={{
                                        marginRight: 6,
                                        marginBottom: 6,
                                        background: active ? '#dbeafe' : undefined,
                                        borderColor: active ? '#3b82f6' : undefined,
                                    }}
                                >
                                    {v.replace(/_/g, ' ')}
                                </GhostButton>
                            );
                        })}
                    </div>
                </FormGroup>

                {err && <ErrorText>{err}</ErrorText>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                    <GhostButton onClick={onClose}>Cancel</GhostButton>
                    <PrimaryButton onClick={save} disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                    </PrimaryButton>
                </div>
            </Modal>
        </ModalOverlay>
    );
};

export default ScoutingReport;
