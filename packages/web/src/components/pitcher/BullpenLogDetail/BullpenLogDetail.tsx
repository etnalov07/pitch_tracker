import { BullpenSessionSummary } from '@pitch-tracker/shared';
import React from 'react';
import {
    Overlay,
    Modal,
    ModalHeader,
    ModalTitle,
    ModalDate,
    CloseButton,
    IntensityBadge,
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
    NotesSection,
    NotesTitle,
    NotesText,
    ModalFooter,
    CloseButtonAlt,
} from './styles';

interface BullpenLogDetailProps {
    session: BullpenSessionSummary;
    onClose: () => void;
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

const BullpenLogDetail: React.FC<BullpenLogDetailProps> = ({ session, onClose }) => {
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
                    <ModalTitle>
                        Bullpen Session <IntensityBadge intensity={session.intensity}>{session.intensity} intensity</IntensityBadge>
                    </ModalTitle>
                    <ModalDate>{formatDate(session.date)}</ModalDate>
                    <CloseButton onClick={onClose}>&times;</CloseButton>
                </ModalHeader>

                <SummaryGrid>
                    <SummaryItem>
                        <SummaryValue>{session.total_pitches}</SummaryValue>
                        <SummaryLabel>Total Pitches</SummaryLabel>
                    </SummaryItem>
                    <SummaryItem>
                        <SummaryValue>
                            {session.balls}/{session.strikes}
                        </SummaryValue>
                        <SummaryLabel>Balls/Strikes</SummaryLabel>
                    </SummaryItem>
                    <SummaryItem>
                        <SummaryValue highlight>{session.strike_percentage}%</SummaryValue>
                        <SummaryLabel>Strike %</SummaryLabel>
                    </SummaryItem>
                    {session.target_accuracy_percentage !== null && (
                        <SummaryItem>
                            <SummaryValue>{session.target_accuracy_percentage}%</SummaryValue>
                            <SummaryLabel>Target Accuracy</SummaryLabel>
                        </SummaryItem>
                    )}
                </SummaryGrid>

                <BreakdownSection>
                    <BreakdownTitle>Pitch Type Breakdown</BreakdownTitle>
                    {session.pitch_type_breakdown.length > 0 ? (
                        <BreakdownTable>
                            <thead>
                                <tr>
                                    <BTh align="left">Type</BTh>
                                    <BTh align="center">Count</BTh>
                                    <BTh align="center">B/S</BTh>
                                    <BTh align="center">Top Vel</BTh>
                                    <BTh align="center">Avg Vel</BTh>
                                </tr>
                            </thead>
                            <tbody>
                                {session.pitch_type_breakdown
                                    .sort((a, b) => b.count - a.count)
                                    .map((pt) => (
                                        <tr key={pt.pitch_type}>
                                            <BTd align="left">
                                                <PitchTypeBadge>{formatPitchType(pt.pitch_type)}</PitchTypeBadge>
                                            </BTd>
                                            <BTd align="center">{pt.count}</BTd>
                                            <BTd align="center">
                                                {pt.balls}/{pt.strikes}
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

                {session.notes && (
                    <NotesSection>
                        <NotesTitle>Notes</NotesTitle>
                        <NotesText>{session.notes}</NotesText>
                    </NotesSection>
                )}

                <ModalFooter>
                    <CloseButtonAlt onClick={onClose}>Close</CloseButtonAlt>
                </ModalFooter>
            </Modal>
        </Overlay>
    );
};

export default BullpenLogDetail;
