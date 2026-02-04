import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTeamTheme } from '../../contexts';
import api from '../../services/api';
import {
    useAppDispatch,
    useAppSelector,
    fetchTeamById,
    fetchTeamRoster,
    addPlayerToTeam,
    updatePlayer,
    deletePlayer,
} from '../../state';
import { Player, PlayerPosition, HandednessType, ThrowingHand, PitchType } from '../../types';

const initialFormData = {
    first_name: '',
    last_name: '',
    jersey_number: '',
    primary_position: 'UTIL' as PlayerPosition,
    bats: 'R' as HandednessType,
    throws: 'R' as ThrowingHand,
};

export function useTeamDetail() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { team_id } = useParams<{ team_id: string }>();
    const { setActiveTeam, clearTheme } = useTeamTheme();

    const { selectedTeam: team, roster: players = [], loading } = useAppSelector((state) => state.teams);
    const [showAddPlayer, setShowAddPlayer] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState(initialFormData);
    const [selectedPitchTypes, setSelectedPitchTypes] = useState<PitchType[]>([]);

    useEffect(() => {
        if (team_id) {
            dispatch(fetchTeamById(team_id));
            dispatch(fetchTeamRoster(team_id));
        }
    }, [dispatch, team_id]);

    useEffect(() => {
        if (team) {
            setActiveTeam(team);
        }
        return () => {
            clearTheme();
        };
    }, [team, setActiveTeam, clearTheme]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const resetForm = () => {
        setFormData(initialFormData);
        setSelectedPitchTypes([]);
        setShowAddPlayer(false);
        setEditingPlayer(null);
        setError('');
    };

    const handlePitchTypeToggle = (pitchType: PitchType) => {
        setSelectedPitchTypes((prev): PitchType[] =>
            prev.includes(pitchType) ? prev.filter((pt) => pt !== pitchType) : [...prev, pitchType]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.first_name.trim() || !formData.last_name.trim()) {
            setError('First and last name are required');
            return;
        }

        try {
            setSubmitting(true);
            const playerData = {
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                jersey_number: formData.jersey_number ? parseInt(formData.jersey_number, 10) : undefined,
                primary_position: formData.primary_position,
                bats: formData.bats,
                throws: formData.throws,
            };

            let playerId: string;

            if (editingPlayer) {
                await dispatch(updatePlayer({ player_id: editingPlayer.id, playerData })).unwrap();
                playerId = editingPlayer.id;
            } else {
                const result = await dispatch(addPlayerToTeam({ team_id: team_id!, playerData })).unwrap();
                playerId = result.id;
            }

            if (formData.primary_position === 'P' && selectedPitchTypes.length > 0) {
                await api.put(`/players/${playerId}/pitch-types`, { pitch_types: selectedPitchTypes });
            }

            resetForm();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save player');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = async (player: Player) => {
        setEditingPlayer(player);
        setFormData({
            first_name: player.first_name,
            last_name: player.last_name,
            jersey_number: player.jersey_number?.toString() || '',
            primary_position: player.primary_position,
            bats: player.bats,
            throws: player.throws,
        });

        if (player.primary_position === 'P') {
            try {
                const response = await api.get<{ pitch_types: string[] }>(`/players/${player.id}/pitch-types`);
                setSelectedPitchTypes((response.data.pitch_types || []) as PitchType[]);
            } catch {
                setSelectedPitchTypes([]);
            }
        } else {
            setSelectedPitchTypes([]);
        }

        setShowAddPlayer(true);
    };

    const handleDelete = async (player_id: string, playerName: string) => {
        if (!window.confirm(`Are you sure you want to remove "${playerName}" from the roster?`)) {
            return;
        }

        try {
            await dispatch(deletePlayer(player_id)).unwrap();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to remove player');
        }
    };

    return {
        navigate, team_id,
        team, players, loading,
        showAddPlayer, setShowAddPlayer,
        editingPlayer,
        submitting, error,
        formData, selectedPitchTypes,
        handleChange, resetForm, handlePitchTypeToggle,
        handleSubmit, handleEdit, handleDelete,
    };
}

export type TeamDetailState = ReturnType<typeof useTeamDetail>;
