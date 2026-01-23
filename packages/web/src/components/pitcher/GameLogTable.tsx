import styled from '@emotion/styled';
import { PitcherGameLog } from '@pitch-tracker/shared';
import React from 'react';
import { theme } from '../../styles/theme';

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

const Table = styled.table({
    width: '100%',
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
    borderCollapse: 'collapse',
    overflow: 'hidden',
});

const Th = styled.th<{ align?: string }>((props) => ({
    textAlign: (props.align as 'left' | 'center' | 'right') || 'left',
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    background: theme.colors.gray[50],
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
}));

const Row = styled.tr({
    cursor: 'pointer',
    transition: 'background-color 0.15s',

    '&:hover': {
        backgroundColor: theme.colors.gray[50],
    },
});

const Td = styled.td<{ align?: string; highlight?: boolean }>((props) => ({
    textAlign: (props.align as 'left' | 'center' | 'right') || 'left',
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
    verticalAlign: 'middle',
    color: props.highlight ? theme.colors.green[600] : theme.colors.gray[800],
    fontWeight: props.highlight ? theme.fontWeight.semibold : theme.fontWeight.normal,

    'tr:last-child &': {
        borderBottom: 'none',
    },
}));

const ViewButton = styled.button({
    background: 'none',
    border: `1px solid ${theme.colors.primary[300]}`,
    color: theme.colors.primary[600],
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    cursor: 'pointer',
    fontWeight: theme.fontWeight.medium,

    '&:hover': {
        background: theme.colors.primary[50],
    },
});

const EmptyState = styled.div({
    textAlign: 'center',
    padding: theme.spacing.xl,
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
    color: theme.colors.gray[500],
    fontSize: theme.fontSize.base,
});

export default GameLogTable;
