import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LogoUploader, ColorPicker, TeamLogo } from '../../components/team';
import { useTeamTheme } from '../../contexts';
import { useAppDispatch, useAppSelector, fetchTeamById, uploadTeamLogo, updateTeamColors, deleteTeamLogo } from '../../state';
import {
    Container,
    Header,
    HeaderLeft,
    BackButton,
    Title,
    Content,
    Section,
    SectionTitle,
    SaveButton,
    SuccessMessage,
    ErrorMessage,
    LoadingText,
} from './styles';

const TeamSettings: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { team_id } = useParams<{ team_id: string }>();
    const { setActiveTeam, clearTheme } = useTeamTheme();

    const { selectedTeam: team, loading } = useAppSelector((state) => state.teams);

    const [colors, setColors] = useState({
        primary_color: '#486581',
        secondary_color: '#1f2937',
        accent_color: '#22c55e',
    });
    const [isUploading, setIsUploading] = useState(false);
    const [isSavingColors, setIsSavingColors] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (team_id) {
            dispatch(fetchTeamById(team_id));
        }
    }, [dispatch, team_id]);

    useEffect(() => {
        if (team) {
            setColors({
                primary_color: team.primary_color || '#486581',
                secondary_color: team.secondary_color || '#1f2937',
                accent_color: team.accent_color || '#22c55e',
            });
            setActiveTeam(team);
        }
        return () => {
            clearTheme();
        };
    }, [team, setActiveTeam, clearTheme]);

    const showSuccess = (message: string) => {
        setSuccessMessage(message);
        setErrorMessage(null);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const showError = (message: string) => {
        setErrorMessage(message);
        setSuccessMessage(null);
    };

    const handleLogoUpload = async (file: File) => {
        if (!team_id) return;
        setIsUploading(true);
        try {
            await dispatch(uploadTeamLogo({ teamId: team_id, file })).unwrap();
            showSuccess('Logo uploaded successfully');
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Failed to upload logo');
        } finally {
            setIsUploading(false);
        }
    };

    const handleLogoDelete = async () => {
        if (!team_id) return;
        setIsUploading(true);
        try {
            await dispatch(deleteTeamLogo(team_id)).unwrap();
            showSuccess('Logo removed successfully');
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Failed to remove logo');
        } finally {
            setIsUploading(false);
        }
    };

    const handleColorsSave = async () => {
        if (!team_id) return;
        setIsSavingColors(true);
        try {
            await dispatch(updateTeamColors({ teamId: team_id, colors })).unwrap();
            showSuccess('Colors saved successfully');
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Failed to save colors');
        } finally {
            setIsSavingColors(false);
        }
    };

    if (loading) {
        return (
            <Container>
                <LoadingText>Loading team settings...</LoadingText>
            </Container>
        );
    }

    if (!team) {
        return (
            <Container>
                <LoadingText>Team not found</LoadingText>
            </Container>
        );
    }

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(`/teams/${team_id}`)}>Back to Team</BackButton>
                    <TeamLogo team={team} size="md" />
                    <Title>{team.name} - Settings</Title>
                </HeaderLeft>
            </Header>

            <Content>
                {successMessage && <SuccessMessage>{successMessage}</SuccessMessage>}
                {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}

                <Section>
                    <SectionTitle>Team Logo</SectionTitle>
                    <LogoUploader team={team} onUpload={handleLogoUpload} onDelete={handleLogoDelete} isUploading={isUploading} />
                </Section>

                <Section>
                    <SectionTitle>Team Colors</SectionTitle>
                    <ColorPicker colors={colors} onChange={setColors} />
                    <SaveButton onClick={handleColorsSave} disabled={isSavingColors}>
                        {isSavingColors ? 'Saving...' : 'Save Colors'}
                    </SaveButton>
                </Section>
            </Content>
        </Container>
    );
};

export default TeamSettings;
