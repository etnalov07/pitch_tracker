import { PitcherGameLog } from '@pitch-tracker/shared';
import React from 'react';
import { Table, Th, Row, Td, ViewButton, EmptyState } from './styles';

interface GameLogTableProps {
    gameLogs: PitcherGameLog[];
    onGameSelect: (game: PitcherGameLog) => void;
}

const GameLogTable: React.FC<GameLogTableProps> = ({ gameLogs, onGameSelect }) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (gameLogs.length === 0) {
        return <EmptyState>No game logs found</EmptyState>;
    }

    return (
        <Table>
            <thead>
                <tr>
                    <Th>Date</Th>
                    <Th>Opponent</Th>
                    <Th align="center">BF</Th>
                    <Th align="center">Pitches</Th>
                    <Th align="center">B/S</Th>
                    <Th align="center">Strike %</Th>
                    <Th align="center">Accuracy</Th>
                    <Th align="center"></Th>
                </tr>
            </thead>
            <tbody>
                {gameLogs.map((log) => (
                    <Row key={log.game_id} onClick={() => onGameSelect(log)}>
                        <Td>{formatDate(log.game_date)}</Td>
                        <Td>vs {log.opponent_name}</Td>
                        <Td align="center">{log.batters_faced}</Td>
                        <Td align="center">{log.total_pitches}</Td>
                        <Td align="center">
                            {log.balls}/{log.strikes}
                        </Td>
                        <Td align="center" highlight>
                            {log.strike_percentage}%
                        </Td>
                        <Td align="center">
                            {log.target_accuracy_percentage !== null ? `${log.target_accuracy_percentage}%` : '-'}
                        </Td>
                        <Td align="center">
                            <ViewButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onGameSelect(log);
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

export default GameLogTable;
