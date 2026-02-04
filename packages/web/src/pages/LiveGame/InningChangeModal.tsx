import React from 'react';
import {
    InningChangeOverlay,
    InningChangeModal as InningChangeModalStyled,
    InningChangeText,
    InningChangeSubtext,
    InningChangeDismiss,
    RunsInputSection,
    RunsInputLabel,
    RunsInput,
} from './styles';

interface InningChangeModalProps {
    inningChangeInfo: { inning: number; half: string };
    teamRunsScored: string;
    onTeamRunsChange: (value: string) => void;
    onConfirm: () => void;
}

const InningChangeModal: React.FC<InningChangeModalProps> = ({ inningChangeInfo, teamRunsScored, onTeamRunsChange, onConfirm }) => {
    return (
        <InningChangeOverlay>
            <InningChangeModalStyled>
                <InningChangeText>End of Inning {inningChangeInfo.inning}</InningChangeText>
                <InningChangeSubtext>3 outs recorded. Enter runs scored by your team:</InningChangeSubtext>
                <RunsInputSection>
                    <RunsInputLabel>Runs Scored</RunsInputLabel>
                    <RunsInput
                        type="number"
                        min="0"
                        max="99"
                        value={teamRunsScored}
                        onChange={(e) => onTeamRunsChange(e.target.value)}
                    />
                </RunsInputSection>
                <InningChangeDismiss onClick={onConfirm}>Continue to Next Inning</InningChangeDismiss>
            </InningChangeModalStyled>
        </InningChangeOverlay>
    );
};

export default InningChangeModal;
