import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    useAppDispatch,
    useAppSelector,
    searchTeams,
    createJoinRequest,
    fetchMyJoinRequests,
    clearSearchResults,
} from '../../state';
import {
    Container,
    Header,
    Title,
    BackButton,
    SearchSection,
    SearchRow,
    SearchInput,
    SearchButton,
    ResultsList,
    TeamResult,
    TeamResultInfo,
    TeamResultName,
    TeamResultCity,
    JoinButton,
    Section,
    SectionTitle,
    RequestList,
    RequestItem,
    RequestInfo,
    RequestTeam,
    RequestStatus,
    EmptyText,
    ErrorText,
    SuccessText,
} from './styles';

const JoinTeam: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { searchResults, myJoinRequests, error } = useAppSelector((state) => state.invites);

    const [query, setQuery] = useState('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        dispatch(fetchMyJoinRequests());
        return () => { dispatch(clearSearchResults()); };
    }, [dispatch]);

    const handleSearch = () => {
        if (query.trim().length >= 2) {
            dispatch(searchTeams(query.trim()));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handleJoinRequest = async (teamId: string, teamName: string) => {
        const result = await dispatch(createJoinRequest({ team_id: teamId }));
        if (createJoinRequest.fulfilled.match(result)) {
            setSuccessMessage(`Join request sent to ${teamName}!`);
            dispatch(fetchMyJoinRequests());
            setTimeout(() => setSuccessMessage(null), 3000);
        }
    };

    const hasPendingRequest = (teamId: string) => {
        return myJoinRequests.some((r) => r.team_id === teamId && r.status === 'pending');
    };

    return (
        <Container>
            <Header>
                <Title>Find a Team</Title>
                <BackButton onClick={() => navigate('/')}>Back to Dashboard</BackButton>
            </Header>

            {error && <ErrorText>{error}</ErrorText>}
            {successMessage && <SuccessText>{successMessage}</SuccessText>}

            <SearchSection>
                <SearchRow>
                    <SearchInput
                        type="text"
                        placeholder="Search teams by name..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <SearchButton onClick={handleSearch} disabled={query.trim().length < 2}>
                        Search
                    </SearchButton>
                </SearchRow>
            </SearchSection>

            {searchResults.length > 0 && (
                <Section>
                    <SectionTitle>Search Results</SectionTitle>
                    <ResultsList>
                        {searchResults.map((team) => (
                            <TeamResult key={team.id}>
                                <TeamResultInfo>
                                    <TeamResultName>{team.name}</TeamResultName>
                                    {team.city && <TeamResultCity>{team.city}</TeamResultCity>}
                                </TeamResultInfo>
                                <JoinButton
                                    onClick={() => handleJoinRequest(team.id, team.name)}
                                    disabled={hasPendingRequest(team.id)}
                                >
                                    {hasPendingRequest(team.id) ? 'Requested' : 'Request to Join'}
                                </JoinButton>
                            </TeamResult>
                        ))}
                    </ResultsList>
                </Section>
            )}

            <Section>
                <SectionTitle>My Join Requests</SectionTitle>
                {myJoinRequests.length > 0 ? (
                    <RequestList>
                        {myJoinRequests.map((request) => (
                            <RequestItem key={request.id}>
                                <RequestInfo>
                                    <RequestTeam>{request.team_name || 'Team'}</RequestTeam>
                                </RequestInfo>
                                <RequestStatus status={request.status}>
                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </RequestStatus>
                            </RequestItem>
                        ))}
                    </RequestList>
                ) : (
                    <EmptyText>No join requests yet. Search for a team above to get started.</EmptyText>
                )}
            </Section>
        </Container>
    );
};

export default JoinTeam;
