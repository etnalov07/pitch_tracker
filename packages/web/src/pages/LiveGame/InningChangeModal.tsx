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
    showRunsInput?: boolean;
}

const InningChangeModal: React.FC<InningChangeModalProps> = ({
    inningChangeInfo,
    teamRunsScored,
    onTeamRunsChange,
    onConfirm,
    showRunsInput = true,
}) => {
    return (
        <InningChangeOverlay>
            <InningChangeModalStyled>
                <InningChangeText>
                    End of {inningChangeInfo.half === 'top' ? 'Top' : 'Bottom'} {inningChangeInfo.inning}
                </InningChangeText>
                <InningChangeSubtext>
                    {showRunsInput ? '3 outs recorded. Enter opponent runs scored this inning:' : '3 outs recorded.'}
                </InningChangeSubtext>
                {showRunsInput && (
                    <RunsInputSection>
                        <RunsInputLabel>Opponent Runs Scored</RunsInputLabel>
                        <RunsInput
                            type="number"
                            min="0"
                            max="99"
                            value={teamRunsScored}
                            onChange={(e) => onTeamRunsChange(e.target.value)}
                        />
                    </RunsInputSection>
                )}
                <InningChangeDismiss onClick={onConfirm}>Next Half Inning</InningChangeDismiss>
            </InningChangeModalStyled>
        </InningChangeOverlay>
    );
};

export default InningChangeModal;
