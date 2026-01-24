import { PitcherGameLog } from '@pitch-tracker/shared';
import React from 'react';
import {
    Overlay,
    Modal,
    ModalHeader,
    ModalTitle,
    ModalDate,
    CloseButton,
    SummaryGrid,
    SummaryItem,
    SummaryValue,
    SummaryLabel,
    BreakdownSection,
    BreakdownTitle,
    BreakdownTable,
    BTh,
    BTd,
    PitchTypeBadge,
    NoDataText,
    ModalFooter,
    ViewGameButton,
    CloseButtonAlt,
} from './styles';

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

export default GameLogDetail;
