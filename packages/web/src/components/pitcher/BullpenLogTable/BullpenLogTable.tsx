import { BullpenSessionSummary } from '@pitch-tracker/shared';
import React from 'react';
import { Table, Th, Row, Td, IntensityBadge, ViewButton, EmptyState } from './styles';

interface BullpenLogTableProps {
    sessions: BullpenSessionSummary[];
    onSessionSelect: (session: BullpenSessionSummary) => void;
}

const BullpenLogTable: React.FC<BullpenLogTableProps> = ({ sessions, onSessionSelect }) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (sessions.length === 0) {
        return <EmptyState>No bullpen sessions found</EmptyState>;
    }

    return (
        <Table>
            <thead>
                <tr>
                    <Th>Date</Th>
                    <Th align="center">Intensity</Th>
                    <Th align="center">Pitches</Th>
                    <Th align="center">B/S</Th>
                    <Th align="center">Strike %</Th>
                    <Th align="center">Accuracy</Th>
                    <Th align="center"></Th>
                </tr>
            </thead>
            <tbody>
                {sessions.map((session) => (
                    <Row key={session.session_id} onClick={() => onSessionSelect(session)}>
                        <Td>{formatDate(session.date)}</Td>
                        <Td align="center">
                            <IntensityBadge intensity={session.intensity}>
                                {session.intensity}
                            </IntensityBadge>
                        </Td>
                        <Td align="center">{session.total_pitches}</Td>
                        <Td align="center">
                            {session.balls}/{session.strikes}
                        </Td>
                        <Td align="center" highlight>
                            {session.strike_percentage}%
                        </Td>
                        <Td align="center">
                            {session.target_accuracy_percentage !== null
                                ? `${session.target_accuracy_percentage}%`
                                : '-'}
                        </Td>
                        <Td align="center">
                            <ViewButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSessionSelect(session);
                                }}
                            >
                                View
                            </ViewButton>
                        </Td>
                    </Row>
                ))}
            </tbody>
        </Table>
    );
};

export default BullpenLogTable;
