import React, { useState, useEffect } from 'react';
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

function deriveFielderPosition(x: number, y: number): string | null {
    const dx = x - 50;
    const dy = 82 - y;
    if (dy <= 2) return null;
    const angleDeg = (Math.atan2(dx, dy) * 180) / Math.PI;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 38) {
        if (angleDeg < -22) return 'LF';
        if (angleDeg > 22) return 'RF';
        return 'CF';
    }
    if (dist < 12) return 'P';
    if (angleDeg < -33) return '3B';
    if (angleDeg < -10) return 'SS';
    if (angleDeg < 10) return '2B';
    if (angleDeg < 33) return '1B';
    return '1B';
}

interface DiamondModalProps {
    hitType: HitType;
    hitLocation: HitLocation | null;
    onHitTypeChange: (type: HitType) => void;
    onHitLocationChange: (location: HitLocation) => void;
    onResult: (result: string, fieldedBy?: string) => void;
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
    const [selectedFielder, setSelectedFielder] = useState<string | null>(null);

    // Auto-derive fielder when hit location changes (user can still override)
    useEffect(() => {
        if (hitLocation && !selectedFielder) {
            const derived = deriveFielderPosition(hitLocation.x, hitLocation.y);
            if (derived) setSelectedFielder(derived);
        }
    }, [hitLocation, selectedFielder]);

    const handleResult = (result: string) => {
        onResult(result, selectedFielder || undefined);
        setSelectedFielder(null);
    };

    const handleClose = () => {
        setSelectedFielder(null);
        onClose();
    };

    return (
        <DiamondModalOverlay>
            <DiamondModalStyled>
                <DiamondModalHeader>
                    <DiamondModalTitle>Record Hit Location</DiamondModalTitle>
                    <DiamondModalClose onClick={handleClose}>&times;</DiamondModalClose>
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

                <DiamondInstructions>
                    Click field to mark hit location · Click a fielder to select who made the play
                    {selectedFielder && (
                        <span style={{ marginLeft: 8, fontWeight: 700, color: '#1e3a5f' }}>— Fielded by: {selectedFielder}</span>
                    )}
                </DiamondInstructions>

                <DiamondContainer>
                    <BaseballDiamond
                        hitType={hitType}
                        selectedLocation={hitLocation}
                        onLocationSelect={(loc) => {
                            onHitLocationChange(loc);
                            // Re-derive on new location only if user hasn't manually overridden
                            const derived = deriveFielderPosition(loc.x, loc.y);
                            if (derived) setSelectedFielder(derived);
                        }}
                        selectedFielder={selectedFielder}
                        onFielderSelect={setSelectedFielder}
                    />
                </DiamondContainer>

                <DiamondResultSection>
                    <DiamondResultTitle>Select Result {!hitLocation && '(select location first)'}</DiamondResultTitle>
                    <DiamondResultGrid>
                        <DiamondResultButton disabled={!hitLocation} onClick={() => handleResult('single')}>
                            Single
                        </DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} onClick={() => handleResult('double')}>
                            Double
                        </DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} onClick={() => handleResult('triple')}>
                            Triple
                        </DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} onClick={() => handleResult('home_run')}>
                            Home Run
                        </DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} isOut onClick={() => handleResult('groundout')}>
                            Groundout
                        </DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} isOut onClick={() => handleResult('flyout')}>
                            Flyout
                        </DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} isOut onClick={() => handleResult('lineout')}>
                            Lineout
                        </DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} isOut onClick={() => handleResult('popout')}>
                            Popout
                        </DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} onClick={() => handleResult('error')}>
                            Error
                        </DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} isOut onClick={() => handleResult('fielders_choice')}>
                            FC
                        </DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} isOut onClick={() => handleResult('double_play')}>
                            DP
                        </DiamondResultButton>
                        <DiamondResultButton disabled={!hitLocation} isOut onClick={() => handleResult('sacrifice_fly')}>
                            Sac Fly
                        </DiamondResultButton>
                    </DiamondResultGrid>
                </DiamondResultSection>
            </DiamondModalStyled>
        </DiamondModalOverlay>
    );
};

export default DiamondModal;
