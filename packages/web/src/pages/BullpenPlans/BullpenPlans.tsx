import { BullpenPlan } from '@pitch-tracker/shared';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bullpenService } from '../../services/bullpenService';
import {
    Container,
    Header,
    HeaderLeft,
    HeaderRight,
    BackButton,
    Title,
    CreateButton,
    Content,
    Table,
    Th,
    Row,
    Td,
    Description,
    EditButton,
    DeleteButton,
    EmptyState,
    LoadingText,
    ErrorText,
} from './styles';

const BullpenPlans: React.FC = () => {
    const navigate = useNavigate();
    const { team_id } = useParams<{ team_id: string }>();

    const [plans, setPlans] = useState<(BullpenPlan & { pitch_count?: number; assignment_count?: number })[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadPlans = async () => {
            if (!team_id) return;
            try {
                setLoading(true);
                const data = await bullpenService.getTeamPlans(team_id);
                setPlans(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load plans');
            } finally {
                setLoading(false);
            }
        };
        loadPlans();
    }, [team_id]);

    const handleDelete = async (e: React.MouseEvent, planId: string) => {
        e.stopPropagation();
        if (!window.confirm('Delete this plan? Sessions using it will keep their data but lose the plan reference.')) return;
        try {
            await bullpenService.deletePlan(planId);
            setPlans((prev) => prev.filter((p) => p.id !== planId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete plan');
        }
    };

    if (loading) {
        return (
            <Container>
                <LoadingText>Loading plans...</LoadingText>
            </Container>
        );
    }

    if (error) {
        return (
            <Container>
                <ErrorText>{error}</ErrorText>
            </Container>
        );
    }

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(`/teams/${team_id}/bullpen`)}>Back</BackButton>
                    <Title>Bullpen Plans</Title>
                </HeaderLeft>
                <HeaderRight>
                    <CreateButton onClick={() => navigate(`/teams/${team_id}/bullpen/plans/new`)}>+ Create Plan</CreateButton>
                </HeaderRight>
            </Header>

            <Content>
                {plans.length === 0 ? (
                    <EmptyState>No plans yet. Create one to prescribe bullpen routines for your pitchers.</EmptyState>
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Name</Th>
                                <Th>Description</Th>
                                <Th align="center">Pitches</Th>
                                <Th align="center">Max Pitches</Th>
                                <Th align="center">Assigned</Th>
                                <Th align="center">Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {plans.map((plan) => (
                                <Row key={plan.id} onClick={() => navigate(`/teams/${team_id}/bullpen/plans/${plan.id}/edit`)}>
                                    <Td>{plan.name}</Td>
                                    <Td>
                                        <Description>
                                            {plan.description
                                                ? plan.description.length > 60
                                                    ? plan.description.substring(0, 60) + '...'
                                                    : plan.description
                                                : '-'}
                                        </Description>
                                    </Td>
                                    <Td align="center">{plan.pitch_count ?? '-'}</Td>
                                    <Td align="center">{plan.max_pitches ?? '-'}</Td>
                                    <Td align="center">{plan.assignment_count ?? 0}</Td>
                                    <Td align="center">
                                        <EditButton
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/teams/${team_id}/bullpen/plans/${plan.id}/edit`);
                                            }}
                                        >
                                            Edit
                                        </EditButton>
                                        <DeleteButton onClick={(e) => handleDelete(e, plan.id)}>Delete</DeleteButton>
                                    </Td>
                                </Row>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Content>
        </Container>
    );
};

export default BullpenPlans;
