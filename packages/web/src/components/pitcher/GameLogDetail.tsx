import styled from '@emotion/styled';
import { PitcherGameLog } from '@pitch-tracker/shared';
import React from 'react';
import { theme } from '../../styles/theme';

interface GameLogDetailProps {
    gameLog: PitcherGameLog;
    onClose: () => void;
    onViewGame?: (gameId: string) => void;
}

const formatPitchType = (type: string): string => {
    const names: { [key: string]: string } = {
        fastball: 'Fastball',
        '2-seam': '2-Seam',
        '4-seam': '4-Seam',
        cutter: 'Cutter',
        sinker: 'Sinker',
        slider: 'Slider',
        curveball: 'Curveball',
        changeup: 'Changeup',
        splitter: 'Splitter',
        knuckleball: 'Knuckleball',
        screwball: 'Screwball',
        other: 'Other',
    };
    return names[type] || type;
};

const GameLogDetail: React.FC<GameLogDetailProps> = ({ gameLog, onClose, onViewGame }) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>vs {gameLog.opponent_name}</ModalTitle>
                    <ModalDate>{formatDate(gameLog.game_date)}</ModalDate>
                    <CloseButton onClick={onClose}>&times;</CloseButton>
                </ModalHeader>

                <SummaryGrid>
                    <SummaryItem>
                        <SummaryValue>{gameLog.batters_faced}</SummaryValue>
                        <SummaryLabel>Batters Faced</SummaryLabel>
                    </SummaryItem>
                    <SummaryItem>
                        <SummaryValue>{gameLog.total_pitches}</SummaryValue>
                        <SummaryLabel>Total Pitches</SummaryLabel>
                    </SummaryItem>
                    <SummaryItem>
                        <SummaryValue>
                            {gameLog.balls}/{gameLog.strikes}
                        </SummaryValue>
                        <SummaryLabel>Balls/Strikes</SummaryLabel>
                    </SummaryItem>
                    <SummaryItem>
                        <SummaryValue highlight>{gameLog.strike_percentage}%</SummaryValue>
                        <SummaryLabel>Strike %</SummaryLabel>
                    </SummaryItem>
                    {gameLog.target_accuracy_percentage !== null && (
                        <SummaryItem>
                            <SummaryValue>{gameLog.target_accuracy_percentage}%</SummaryValue>
                            <SummaryLabel>Target Accuracy</SummaryLabel>
                        </SummaryItem>
                    )}
                </SummaryGrid>

                <BreakdownSection>
                    <BreakdownTitle>Pitch Type Breakdown</BreakdownTitle>
                    {gameLog.pitch_type_breakdown.length > 0 ? (
                        <BreakdownTable>
                            <thead>
                                <tr>
                                    <BTh align="left">Type</BTh>
                                    <BTh align="center">Count</BTh>
                                    <BTh align="center">B/S</BTh>
                                    <BTh align="center">Strike %</BTh>
                                    <BTh align="center">Accuracy</BTh>
                                    <BTh align="center">Top Vel</BTh>
                                    <BTh align="center">Avg Vel</BTh>
                                </tr>
                            </thead>
                            <tbody>
                                {gameLog.pitch_type_breakdown.map((pt) => (
                                    <tr key={pt.pitch_type}>
                                        <BTd align="left">
                                            <PitchTypeBadge>{formatPitchType(pt.pitch_type)}</PitchTypeBadge>
                                        </BTd>
                                        <BTd align="center">{pt.count}</BTd>
                                        <BTd align="center">
                                            {pt.balls}/{pt.strikes}
                                        </BTd>
                                        <BTd align="center" highlight>
                                            {pt.strike_percentage}%
                                        </BTd>
                                        <BTd align="center">
                                            {pt.target_accuracy_percentage !== null ? `${pt.target_accuracy_percentage}%` : '-'}
                                        </BTd>
                                        <BTd align="center" velocity>
                                            {pt.top_velocity !== null ? pt.top_velocity : '-'}
                                        </BTd>
                                        <BTd align="center" velocity>
                                            {pt.avg_velocity !== null ? pt.avg_velocity : '-'}
                                        </BTd>
                                    </tr>
                                ))}
                            </tbody>
                        </BreakdownTable>
                    ) : (
                        <NoDataText>No pitch data available</NoDataText>
                    )}
                </BreakdownSection>

                <ModalFooter>
                    {onViewGame && <ViewGameButton onClick={() => onViewGame(gameLog.game_id)}>View Full Game</ViewGameButton>}
                    <CloseButtonAlt onClick={onClose}>Close</CloseButtonAlt>
                </ModalFooter>
            </Modal>
        </Overlay>
    );
};

const Overlay = styled.div({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: theme.spacing.lg,
});

const Modal = styled.div({
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.xl,
    boxShadow: theme.shadows.xl,
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
});

const ModalHeader = styled.div({
    padding: theme.spacing.lg,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
    position: 'relative',
});

const ModalTitle = styled.h2({
    fontSize: theme.fontSize['xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    margin: 0,
    paddingRight: theme.spacing.xl,
});

const ModalDate = styled.p({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    margin: `${theme.spacing.xs} 0 0 0`,
});

const CloseButton = styled.button({
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    color: theme.colors.gray[400],
    cursor: 'pointer',
    lineHeight: 1,
    padding: theme.spacing.xs,

    '&:hover': {
        color: theme.colors.gray[600],
    },
});

const SummaryGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.gray[50],
});

const SummaryItem = styled.div({
    textAlign: 'center',
});

const SummaryValue = styled.div<{ highlight?: boolean }>((props) => ({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: props.highlight ? theme.colors.green[600] : theme.colors.gray[900],
}));

const SummaryLabel = styled.div({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
    marginTop: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
});

const BreakdownSection = styled.div({
    padding: theme.spacing.lg,
});

const BreakdownTitle = styled.h3({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: `0 0 ${theme.spacing.md} 0`,
});

const BreakdownTable = styled.table({
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.fontSize.sm,
});

const BTh = styled.th<{ align?: string }>((props) => ({
    textAlign: (props.align as 'left' | 'center' | 'right') || 'left',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.gray[100],
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    textTransform: 'uppercase',
    letterSpacing: '0.05em',

    '&:first-of-type': {
        borderTopLeftRadius: theme.borderRadius.md,
    },
    '&:last-child': {
        borderTopRightRadius: theme.borderRadius.md,
    },
}));

const BTd = styled.td<{ align?: string; highlight?: boolean; velocity?: boolean }>((props) => ({
    textAlign: (props.align as 'left' | 'center' | 'right') || 'left',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
    color: props.highlight ? theme.colors.green[600] : props.velocity ? theme.colors.primary[600] : theme.colors.gray[800],
    fontWeight: props.highlight || props.velocity ? theme.fontWeight.semibold : theme.fontWeight.normal,

    'tr:last-child &': {
        borderBottom: 'none',
    },
}));

const PitchTypeBadge = styled.span({
    display: 'inline-block',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.primary[100],
    color: theme.colors.primary[700],
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
});

const NoDataText = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[500],
    padding: theme.spacing.lg,
});

const ModalFooter = styled.div({
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTop: `1px solid ${theme.colors.gray[200]}`,
});

const ViewGameButton = styled.button({
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',

    '&:hover': {
        backgroundColor: theme.colors.primary[700],
    },
});

const CloseButtonAlt = styled.button({
    background: 'none',
    border: `1px solid ${theme.colors.gray[300]}`,
    color: theme.colors.gray[700],
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',

    '&:hover': {
        background: theme.colors.gray[50],
    },
});

export default GameLogDetail;
