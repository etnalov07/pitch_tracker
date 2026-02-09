import { PitchType, Player } from '@pitch-tracker/shared';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StrikeZone from '../../components/live/StrikeZone';
import { bullpenService } from '../../services/bullpenService';
import { teamService } from '../../services/teamService';
import {
    Container,
    Header,
    HeaderLeft,
    BackButton,
    Title,
    SaveButton,
    Content,
    Section,
    SectionTitle,
    FormGroup,
    Label,
    Input,
    Textarea,
    NumberInput,
    PitchRow,
    SequenceNumber,
    PitchTypeSelect,
    InstructionInput,
    TargetButton,
    ActionButton,
    RemoveButton,
    AddPitchButton,
    StrikeZoneWrapper,
    StrikeZoneLabel,
    AssignmentGrid,
    AssignmentCheckbox,
    LoadingText,
    ErrorText,
} from './styles';

const ALL_PITCH_TYPES: { value: PitchType; label: string }[] = [
    { value: 'fastball', label: 'Fastball' },
    { value: '4-seam', label: '4-Seam' },
    { value: '2-seam', label: '2-Seam' },
    { value: 'cutter', label: 'Cutter' },
    { value: 'sinker', label: 'Sinker' },
    { value: 'slider', label: 'Slider' },
    { value: 'curveball', label: 'Curve' },
    { value: 'changeup', label: 'Change' },
    { value: 'splitter', label: 'Splitter' },
    { value: 'knuckleball', label: 'Knuckle' },
    { value: 'other', label: 'Other' },
];

interface PlanPitchEntry {
    pitch_type: PitchType;
    target_x?: number;
    target_y?: number;
    instruction?: string;
}

const BullpenPlanEditor: React.FC = () => {
    const navigate = useNavigate();
    const { team_id, plan_id } = useParams<{ team_id: string; plan_id?: string }>();
    const isEditing = !!plan_id;

    // Plan metadata
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [maxPitches, setMaxPitches] = useState('');

    // Pitch sequence
    const [pitches, setPitches] = useState<PlanPitchEntry[]>([]);
    const [editingTargetIndex, setEditingTargetIndex] = useState<number | null>(null);

    // Pitcher assignments
    const [teamPitchers, setTeamPitchers] = useState<Player[]>([]);
    const [assignedPitcherIds, setAssignedPitcherIds] = useState<Set<string>>(new Set());

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!team_id) return;
            try {
                // Load team pitchers for assignment
                const roster = await teamService.getTeamRoster(team_id);
                const pitchers = roster.filter((p: Player) => p.primary_position === 'P' && p.is_active !== false);
                setTeamPitchers(pitchers);

                // If editing, load plan
                if (plan_id) {
                    setLoading(true);
                    const plan = await bullpenService.getPlan(plan_id);
                    setName(plan.name);
                    setDescription(plan.description || '');
                    setMaxPitches(plan.max_pitches ? String(plan.max_pitches) : '');
                    setPitches(
                        plan.pitches.map((p) => ({
                            pitch_type: p.pitch_type,
                            target_x: p.target_x != null ? Number(p.target_x) : undefined,
                            target_y: p.target_y != null ? Number(p.target_y) : undefined,
                            instruction: p.instruction || undefined,
                        }))
                    );
                    const ids = new Set((plan.assignments || []).map((a) => a.pitcher_id));
                    setAssignedPitcherIds(ids);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [team_id, plan_id]);

    const addPitch = () => {
        setPitches((prev) => [...prev, { pitch_type: 'fastball' }]);
    };

    const removePitch = (index: number) => {
        setPitches((prev) => prev.filter((_, i) => i !== index));
        if (editingTargetIndex === index) setEditingTargetIndex(null);
    };

    const movePitch = (index: number, direction: -1 | 1) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= pitches.length) return;
        setPitches((prev) => {
            const copy = [...prev];
            [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
            return copy;
        });
        if (editingTargetIndex === index) setEditingTargetIndex(newIndex);
        else if (editingTargetIndex === newIndex) setEditingTargetIndex(index);
    };

    const updatePitch = (index: number, updates: Partial<PlanPitchEntry>) => {
        setPitches((prev) => prev.map((p, i) => (i === index ? { ...p, ...updates } : p)));
    };

    const handleLocationAsTarget = useCallback(
        (x: number, y: number) => {
            if (editingTargetIndex !== null) {
                updatePitch(editingTargetIndex, { target_x: x, target_y: y });
                setEditingTargetIndex(null);
            }
        },
        [editingTargetIndex]
    );

    const toggleAssignment = (pitcherId: string) => {
        setAssignedPitcherIds((prev) => {
            const next = new Set(prev);
            if (next.has(pitcherId)) {
                next.delete(pitcherId);
            } else {
                next.add(pitcherId);
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (!team_id || !name.trim()) return;
        setSaving(true);
        setError(null);

        try {
            const planData = {
                team_id,
                name: name.trim(),
                description: description.trim() || undefined,
                max_pitches: maxPitches ? parseInt(maxPitches, 10) : undefined,
                pitches: pitches.map((p, i) => ({
                    sequence: i + 1,
                    pitch_type: p.pitch_type,
                    target_x: p.target_x,
                    target_y: p.target_y,
                    instruction: p.instruction,
                })),
            };

            let savedPlanId: string;
            if (isEditing && plan_id) {
                const updated = await bullpenService.updatePlan(plan_id, planData);
                savedPlanId = updated.id;
            } else {
                const created = await bullpenService.createPlan(planData);
                savedPlanId = created.id;
            }

            // Handle assignments
            if (isEditing && plan_id) {
                // Get current assignments from loaded plan
                const plan = await bullpenService.getPlan(savedPlanId);
                const currentIds = new Set((plan.assignments || []).map((a) => a.pitcher_id));

                // Add new assignments
                const toAdd = Array.from(assignedPitcherIds).filter((id) => !currentIds.has(id));
                if (toAdd.length > 0) {
                    await bullpenService.assignPlan(savedPlanId, toAdd);
                }

                // Remove old assignments
                const toRemove = Array.from(currentIds).filter((id) => !assignedPitcherIds.has(id));
                for (const pitcherId of toRemove) {
                    await bullpenService.unassignPlan(savedPlanId, pitcherId);
                }
            } else {
                // New plan — just assign
                const toAdd = Array.from(assignedPitcherIds);
                if (toAdd.length > 0) {
                    await bullpenService.assignPlan(savedPlanId, toAdd);
                }
            }

            navigate(`/teams/${team_id}/bullpen/plans`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save plan');
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Container>
                <LoadingText>Loading...</LoadingText>
            </Container>
        );
    }

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(`/teams/${team_id}/bullpen/plans`)}>Back</BackButton>
                    <Title>{isEditing ? 'Edit Plan' : 'New Bullpen Plan'}</Title>
                </HeaderLeft>
                <SaveButton onClick={handleSave} disabled={!name.trim() || saving}>
                    {saving ? 'Saving...' : 'Save Plan'}
                </SaveButton>
            </Header>

            <Content>
                {error && <ErrorText>{error}</ErrorText>}

                <Section>
                    <SectionTitle>Plan Details</SectionTitle>
                    <FormGroup>
                        <Label>Name *</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Pre-Game 25 Pitch Routine"
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>Description</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What is this plan for?"
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>Max Pitches (optional)</Label>
                        <NumberInput
                            type="number"
                            value={maxPitches}
                            onChange={(e) => setMaxPitches(e.target.value)}
                            placeholder="--"
                            min="1"
                            max="200"
                        />
                    </FormGroup>
                </Section>

                <Section>
                    <SectionTitle>Pitch Sequence ({pitches.length} pitches)</SectionTitle>

                    {pitches.map((pitch, index) => (
                        <React.Fragment key={index}>
                            <PitchRow>
                                <SequenceNumber>{index + 1}</SequenceNumber>
                                <PitchTypeSelect
                                    value={pitch.pitch_type}
                                    onChange={(e) => updatePitch(index, { pitch_type: e.target.value as PitchType })}
                                >
                                    {ALL_PITCH_TYPES.map(({ value, label }) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </PitchTypeSelect>
                                <TargetButton
                                    hasTarget={pitch.target_x != null}
                                    onClick={() => setEditingTargetIndex(editingTargetIndex === index ? null : index)}
                                >
                                    {pitch.target_x != null ? 'Target set' : 'Set target'}
                                </TargetButton>
                                <InstructionInput
                                    value={pitch.instruction || ''}
                                    onChange={(e) => updatePitch(index, { instruction: e.target.value })}
                                    placeholder="Instruction..."
                                />
                                <ActionButton onClick={() => movePitch(index, -1)} disabled={index === 0}>
                                    &#8593;
                                </ActionButton>
                                <ActionButton onClick={() => movePitch(index, 1)} disabled={index === pitches.length - 1}>
                                    &#8595;
                                </ActionButton>
                                <RemoveButton onClick={() => removePitch(index)}>&#10005;</RemoveButton>
                            </PitchRow>
                            {editingTargetIndex === index && (
                                <StrikeZoneWrapper>
                                    <StrikeZoneLabel>Click to set target location for pitch #{index + 1}</StrikeZoneLabel>
                                    <StrikeZone
                                        onLocationSelect={handleLocationAsTarget}
                                        targetLocation={
                                            pitch.target_x != null && pitch.target_y != null
                                                ? { x: pitch.target_x, y: pitch.target_y }
                                                : null
                                        }
                                    />
                                </StrikeZoneWrapper>
                            )}
                        </React.Fragment>
                    ))}

                    <AddPitchButton onClick={addPitch}>+ Add Pitch</AddPitchButton>
                </Section>

                {teamPitchers.length > 0 && (
                    <Section>
                        <SectionTitle>Assign to Pitchers</SectionTitle>
                        <AssignmentGrid>
                            {teamPitchers.map((pitcher) => (
                                <AssignmentCheckbox key={pitcher.id}>
                                    <input
                                        type="checkbox"
                                        checked={assignedPitcherIds.has(pitcher.id)}
                                        onChange={() => toggleAssignment(pitcher.id)}
                                    />
                                    {pitcher.jersey_number ? `#${pitcher.jersey_number} ` : ''}
                                    {pitcher.first_name} {pitcher.last_name}
                                </AssignmentCheckbox>
                            ))}
                        </AssignmentGrid>
                    </Section>
                )}
            </Content>
        </Container>
    );
};

export default BullpenPlanEditor;
