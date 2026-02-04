import React from 'react';
import BaseballDiamond, { HitType, HitLocation } from '../../components/live/BaseballDiamond';
import { theme } from '../../styles/theme';
import {
    DiamondModalOverlay,
    DiamondModal as DiamondModalStyled,
    DiamondModalHeader,
    DiamondModalTitle,
    DiamondModalClose,
    HitTypeSelector,
    HitTypeButton,
    DiamondInstructions,
    DiamondContainer,
    DiamondResultSection,
    DiamondResultTitle,
    DiamondResultGrid,
    DiamondResultButton,
} from './styles';

interface DiamondModalProps {
    hitType: HitType;
    hitLocation: HitLocation | null;
    onHitTypeChange: (type: HitType) => void;
    onHitLocationChange: (location: HitLocation) => void;
    onResult: (result: string) => void;
    onClose: () => void;
}

const DiamondModal: React.FC<DiamondModalProps> = ({
    hitType,
    hitLocation,
    onHitTypeChange,
    onHitLocationChange,
    onResult,
    onClose,
}) => {
    return (
        <DiamondModalOverlay>
            <DiamondModalStyled>
                <DiamondModalHeader>
                    <DiamondModalTitle>Record Hit Location</DiamondModalTitle>
                    <DiamondModalClose onClick={onClose}>&times;</DiamondModalClose>
                </DiamondModalHeader>

                <HitTypeSelector>
                    <HitTypeButton
                        active={hitType === 'fly_ball'}
                        hitColor={theme.colors.primary[500]}
                        onClick={() => onHitTypeChange('fly_ball')}
                    >
                        Fly Ball
                    </HitTypeButton>
                    <HitTypeButton
                        active={hitType === 'line_drive'}
                        hitColor={theme.colors.red[500]}
                        onClick={() => onHitTypeChange('line_drive')}
                    >
                        Line Drive
                    </HitTypeButton>
                    <HitTypeButton
                        active={hitType === 'ground_ball'}
                        hitColor={theme.colors.yellow[600]}
                        onClick={() => onHitTypeChange('ground_ball')}
                    >
                        Ground Ball
                    </HitTypeButton>
                </HitTypeSelector>

                <DiamondInstructions>Click on the field to mark where the ball was hit</DiamondInstructions>

                <DiamondContainer>
                    <BaseballDiamond
                        hitType={hitType}
                        selectedLocation={hitLocation}
                        onLocationSelect={onHitLocationChange}
                    />
                </DiamondContainer>

                <DiamondResultSection>
                    <DiamondResultTitle>Select Result {!hitLocation && '(select location first)'}</DiamondResultTitle>
                    <DiamondResultGrid>
                        <DiamondResultButton disabled={!hitLocation} onClick={() => onResult('single')}>Single</DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} onClick={() => onResult('double')}>Double</DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} onClick={() => onResult('triple')}>Triple</DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} onClick={() => onResult('home_run')}>Home Run</DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} isOut onClick={() => onResult('groundout')}>Groundout</DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} isOut onClick={() => onResult('flyout')}>Flyout</DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} isOut onClick={() => onResult('lineout')}>Lineout</DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} isOut onClick={() => onResult('popout')}>Popout</DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} onClick={() => onResult('error')}>Error</DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} isOut onClick={() => onResult('fielders_choice')}>FC</DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} isOut onClick={() => onResult('double_play')}>DP</DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} isOut onClick={() => onResult('sacrifice_fly')}>Sac Fly</DiamondResultButton>
                    </DiamondResultGrid>
                </DiamondResultSection>
            </DiamondModalStyled>
        </DiamondModalOverlay>
    );
};

export default DiamondModal;
