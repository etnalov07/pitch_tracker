import React, { useState } from 'react';
import styled from '@emotion/styled';
import { theme } from '../../styles/theme';
import { Pitch } from '../../types';

interface StrikeZoneProps {
  onLocationSelect: (x: number, y: number) => void;
  previousPitches?: Pitch[];
}

const StrikeZone: React.FC<StrikeZoneProps> = ({ onLocationSelect, previousPitches = [] }) => {
  const [selectedLocation, setSelectedLocation] = useState<{ x: number; y: number } | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setSelectedLocation({ x, y });
    onLocationSelect(x, y);
  };

  const getPitchColor = (result: string): string => {
    switch (result) {
      case 'ball':
        return theme.colors.gray[400];
      case 'called_strike':
        return theme.colors.green[500];
      case 'swinging_strike':
        return theme.colors.red[500];
      case 'foul':
        return theme.colors.yellow[500];
      case 'in_play':
        return theme.colors.primary[600];
      default:
        return theme.colors.gray[500];
    }
  };

  return (
    <Container>
      <Title>Strike Zone</Title>
      <ZoneWrapper>
        <Zone onClick={handleClick}>
          {/* Strike zone outline */}
          <StrikeZoneBox />

          {/* Grid lines for reference */}
          <GridLine style={{ left: '33.33%' }} />
          <GridLine style={{ left: '66.66%' }} />
          <GridLine style={{ top: '33.33%' }} horizontal />
          <GridLine style={{ top: '66.66%' }} horizontal />

          {/* Previous pitches */}
          {previousPitches.map((pitch, idx) => (
            pitch.locationX !== undefined && pitch.locationY !== undefined && (
              <PitchMarker
                key={pitch.id || idx}
                x={pitch.locationX}
                y={pitch.locationY}
                color={getPitchColor(pitch.result)}
                title={`${pitch.pitchType} - ${pitch.result} (${pitch.velocity || 'N/A'} mph)`}
              >
                {idx + 1}
              </PitchMarker>
            )
          ))}

          {/* Selected location indicator */}
          {selectedLocation && (
            <SelectedMarker x={selectedLocation.x} y={selectedLocation.y}>
              ×
            </SelectedMarker>
          )}
        </Zone>

        <Legend>
          <LegendItem>
            <LegendDot color={theme.colors.green[500]} />
            <span>Called Strike</span>
          </LegendItem>
          <LegendItem>
            <LegendDot color={theme.colors.red[500]} />
            <span>Swinging Strike</span>
          </LegendItem>
          <LegendItem>
            <LegendDot color={theme.colors.gray[400]} />
            <span>Ball</span>
          </LegendItem>
          <LegendItem>
            <LegendDot color={theme.colors.yellow[500]} />
            <span>Foul</span>
          </LegendItem>
          <LegendItem>
            <LegendDot color={theme.colors.primary[600]} />
            <span>In Play</span>
          </LegendItem>
        </Legend>
      </ZoneWrapper>
      <Instructions>Click on the zone to select pitch location</Instructions>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const Title = styled.h3`
  font-size: ${theme.fontSize.lg};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.gray[900]};
  margin: 0;
`;

const ZoneWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const Zone = styled.div`
  position: relative;
  width: 100%;
  max-width: 400px;
  aspect-ratio: 1;
  background: linear-gradient(135deg, ${theme.colors.green[50]} 0%, ${theme.colors.primary[50]} 100%);
  border: 2px solid ${theme.colors.gray[300]};
  border-radius: ${theme.borderRadius.lg};
  cursor: crosshair;
  box-shadow: ${theme.shadows.md};

  &:hover {
    border-color: ${theme.colors.primary[400]};
  }
`;

const StrikeZoneBox = styled.div`
  position: absolute;
  top: 20%;
  left: 20%;
  width: 60%;
  height: 60%;
  border: 3px solid ${theme.colors.gray[700]};
  border-radius: ${theme.borderRadius.sm};
  pointer-events: none;
`;

const GridLine = styled.div<{ horizontal?: boolean }>`
  position: absolute;
  background-color: ${theme.colors.gray[300]};
  pointer-events: none;

  ${props => props.horizontal ? `
    left: 20%;
    width: 60%;
    height: 1px;
  ` : `
    top: 20%;
    width: 1px;
    height: 60%;
  `}
`;

const PitchMarker = styled.div<{ x: number; y: number; color: string }>`
  position: absolute;
  left: ${props => props.x * 100}%;
  top: ${props => props.y * 100}%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  background-color: ${props => props.color};
  border: 2px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.bold};
  color: white;
  box-shadow: ${theme.shadows.sm};
  pointer-events: none;
  z-index: 10;
`;

const SelectedMarker = styled.div<{ x: number; y: number }>`
  position: absolute;
  left: ${props => props.x * 100}%;
  top: ${props => props.y * 100}%;
  transform: translate(-50%, -50%);
  width: 32px;
  height: 32px;
  background-color: ${theme.colors.red[600]};
  border: 3px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSize.xl};
  font-weight: ${theme.fontWeight.bold};
  color: white;
  box-shadow: ${theme.shadows.lg};
  pointer-events: none;
  z-index: 20;
  animation: pulse 1s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      opacity: 0.8;
      transform: translate(-50%, -50%) scale(1.1);
    }
  }
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.gray[50]};
  border-radius: ${theme.borderRadius.md};
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.gray[700]};
`;

const LegendDot = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  background-color: ${props => props.color};
  border-radius: 50%;
  border: 1px solid white;
  box-shadow: ${theme.shadows.sm};
`;

const Instructions = styled.p`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.gray[600]};
  text-align: center;
  margin: 0;
  font-style: italic;
`;

export default StrikeZone;
