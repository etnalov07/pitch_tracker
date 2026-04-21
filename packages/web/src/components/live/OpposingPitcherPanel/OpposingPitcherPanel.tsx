import React, { useState } from 'react';
import { CreateOpposingPitcherParams, OpposingPitcher, ThrowingHand } from '../../../types';
import {
    AddButton,
    CancelButton,
    CurrentPitcher,
    FormActions,
    FormRow,
    Input,
    NoPitcherText,
    Panel,
    PanelHeader,
    PanelTitle,
    PitcherList,
    PitcherMeta,
    PitcherName,
    PitcherRow,
    SaveButton,
    Select,
} from './styles';

interface Props {
    gameId: string;
    opposingPitchers: OpposingPitcher[];
    currentOpposingPitcher: OpposingPitcher | null;
    onSelect: (pitcher: OpposingPitcher) => void;
    onCreate: (params: CreateOpposingPitcherParams) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    opponentName?: string;
}

const OpposingPitcherPanel: React.FC<Props> = ({
    gameId,
    opposingPitchers,
    currentOpposingPitcher,
    onSelect,
    onCreate,
    onDelete: _onDelete,
    opponentName,
}) => {
    const [showForm, setShowForm] = useState(false);
    const [pitcherName, setPitcherName] = useState('');
    const [jerseyNumber, setJerseyNumber] = useState('');
    const [throws, setThrows] = useState<ThrowingHand>('R');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!pitcherName.trim()) return;
        setSaving(true);
        try {
            await onCreate({
                game_id: gameId,
                team_name: opponentName ?? 'Opponent',
                pitcher_name: pitcherName.trim(),
                jersey_number: jerseyNumber ? parseInt(jerseyNumber, 10) : null,
                throws,
            });
            setPitcherName('');
            setJerseyNumber('');
            setThrows('R');
            setShowForm(false);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Panel>
            <PanelHeader>
                <PanelTitle>Opp. Pitcher</PanelTitle>
            </PanelHeader>

            {currentOpposingPitcher ? (
                <CurrentPitcher>
                    <PitcherName>
                        {currentOpposingPitcher.jersey_number != null ? `#${currentOpposingPitcher.jersey_number} ` : ''}
                        {currentOpposingPitcher.pitcher_name}
                    </PitcherName>
                    <PitcherMeta>({currentOpposingPitcher.throws}HP)</PitcherMeta>
                </CurrentPitcher>
            ) : (
                <NoPitcherText>No pitcher selected</NoPitcherText>
            )}

            {opposingPitchers.length > 0 && (
                <PitcherList>
                    {opposingPitchers.map((p) => (
                        <PitcherRow key={p.id} isActive={p.id === currentOpposingPitcher?.id} onClick={() => onSelect(p)}>
                            {p.jersey_number != null ? `#${p.jersey_number} ` : ''}
                            {p.pitcher_name}
                            <PitcherMeta style={{ marginLeft: 'auto' }}>({p.throws}HP)</PitcherMeta>
                        </PitcherRow>
                    ))}
                </PitcherList>
            )}

            {showForm ? (
                <>
                    <Input
                        placeholder="Pitcher name"
                        value={pitcherName}
                        onChange={(e) => setPitcherName(e.target.value)}
                        style={{ marginTop: '8px', marginBottom: '6px' }}
                        autoFocus
                    />
                    <FormRow>
                        <Input
                            placeholder="Jersey # (optional)"
                            value={jerseyNumber}
                            onChange={(e) => setJerseyNumber(e.target.value)}
                            type="number"
                        />
                        <Select value={throws} onChange={(e) => setThrows(e.target.value as ThrowingHand)}>
                            <option value="R">Right-handed</option>
                            <option value="L">Left-handed</option>
                        </Select>
                    </FormRow>
                    <FormActions>
                        <CancelButton onClick={() => setShowForm(false)}>Cancel</CancelButton>
                        <SaveButton onClick={handleSave} disabled={saving || !pitcherName.trim()}>
                            {saving ? 'Saving...' : 'Add Pitcher'}
                        </SaveButton>
                    </FormActions>
                </>
            ) : (
                <AddButton onClick={() => setShowForm(true)}>+ Add Pitcher</AddButton>
            )}
        </Panel>
    );
};

export default OpposingPitcherPanel;
