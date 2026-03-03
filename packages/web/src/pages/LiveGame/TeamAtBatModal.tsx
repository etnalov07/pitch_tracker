import React from 'react';
import {
    InningChangeOverlay,
    InningChangeModal,
    InningChangeText,
    InningChangeSubtext,
    InningChangeDismiss,
    RunsInputSection,
    RunsInputLabel,
    RunsInput,
} from './styles';

interface TeamAtBatModalProps {
    inning: number;
    inningHalf: string;
    teamRunsScored: string;
    onTeamRunsChange: (value: string) => void;
    onConfirm: () => void;
}

const TeamAtBatModal: React.FC<TeamAtBatModalProps> = ({ inning, inningHalf, teamRunsScored, onTeamRunsChange, onConfirm }) => {
    return (
        <InningChangeOverlay>
            <InningChangeModal>
                <InningChangeText>Your Team At Bat</InningChangeText>
                <InningChangeSubtext>
                    {inningHalf === 'top' ? 'Top' : 'Bottom'} of Inning {inning} — Enter your team's runs scored
                </InningChangeSubtext>
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
                <InningChangeDismiss onClick={onConfirm}>Continue</InningChangeDismiss>
            </InningChangeModal>
        </InningChangeOverlay>
    );
};

export default TeamAtBatModal;
