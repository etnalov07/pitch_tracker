import styled from '@emotion/styled';
import React from 'react';
import { theme } from '../../../styles/theme';

interface TeamColors {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
}

interface ColorPickerProps {
    colors: TeamColors;
    onChange: (colors: TeamColors) => void;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const ColorRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const ColorLabel = styled.label`
    font-size: 13px;
    font-weight: 500;
    color: ${theme.colors.gray[700]};
    width: 80px;
`;

const ColorInputWrapper = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ColorInput = styled.input`
    width: 40px;
    height: 40px;
    border: 2px solid ${theme.colors.gray[300]};
    border-radius: 8px;
    cursor: pointer;
    padding: 2px;
    background: white;

    &::-webkit-color-swatch-wrapper {
        padding: 0;
    }

    &::-webkit-color-swatch {
        border: none;
        border-radius: 4px;
    }
`;

const HexInput = styled.input`
    width: 80px;
    padding: 6px 8px;
    font-size: 13px;
    font-family: monospace;
    border: 1px solid ${theme.colors.gray[300]};
    border-radius: 6px;
    text-transform: uppercase;

    &:focus {
        outline: none;
        border-color: ${theme.colors.primary[500]};
    }
`;

const PresetColors = styled.div`
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
`;

const PresetColor = styled.button<{ color: string }>`
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 2px solid ${theme.colors.gray[200]};
    background-color: ${(props) => props.color};
    cursor: pointer;
    transition: transform 0.1s;

    &:hover {
        transform: scale(1.1);
        border-color: ${theme.colors.gray[400]};
    }
`;

const Preview = styled.div`
    margin-top: 8px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid ${theme.colors.gray[200]};
`;

const PreviewHeader = styled.div<{ primary: string; secondary: string }>`
    background: linear-gradient(135deg, ${(props) => props.primary} 0%, ${(props) => props.secondary} 100%);
    padding: 12px 16px;
    color: white;
    font-weight: 600;
    font-size: 14px;
`;

const PreviewBody = styled.div`
    padding: 12px 16px;
    background: white;
    display: flex;
    gap: 8px;
`;

const PreviewButton = styled.button<{ accent: string }>`
    background: ${(props) => props.accent};
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
`;

const ContrastWarning = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: ${theme.colors.yellow[50]};
    border: 1px solid ${theme.colors.yellow[200]};
    border-radius: 6px;
    font-size: 12px;
    color: ${theme.colors.yellow[700]};
`;

const PRESET_COLORS = [
    '#0B1F3A', // Navy
    '#ef4444', // Red
    '#22c55e', // Green
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#1f2937', // Dark Gray
    '#000000', // Black
];

const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;

    const [rs, gs, bs] = [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const getContrastRatio = (hex1: string, hex2: string): number => {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
};

const ColorPicker: React.FC<ColorPickerProps> = ({ colors, onChange }) => {
    const handleColorChange = (key: keyof TeamColors, value: string) => {
        onChange({ ...colors, [key]: value });
    };

    const handleHexInputChange = (key: keyof TeamColors, value: string) => {
        // Allow partial input while typing
        if (value.match(/^#?[0-9A-Fa-f]{0,6}$/)) {
            const hex = value.startsWith('#') ? value : `#${value}`;
            if (hex.length <= 7) {
                handleColorChange(key, hex);
            }
        }
    };

    const primaryContrast = getContrastRatio(colors.primary_color, '#ffffff');
    const hasLowContrast = primaryContrast < 4.5;

    return (
        <Container>
            <ColorRow>
                <ColorLabel>Primary</ColorLabel>
                <ColorInputWrapper>
                    <ColorInput
                        type="color"
                        value={colors.primary_color}
                        onChange={(e) => handleColorChange('primary_color', e.target.value)}
                    />
                    <HexInput
                        value={colors.primary_color}
                        onChange={(e) => handleHexInputChange('primary_color', e.target.value)}
                        maxLength={7}
                    />
                </ColorInputWrapper>
                <PresetColors>
                    {PRESET_COLORS.slice(0, 5).map((color) => (
                        <PresetColor
                            key={color}
                            color={color}
                            onClick={() => handleColorChange('primary_color', color)}
                            title={color}
                        />
                    ))}
                </PresetColors>
            </ColorRow>

            <ColorRow>
                <ColorLabel>Secondary</ColorLabel>
                <ColorInputWrapper>
                    <ColorInput
                        type="color"
                        value={colors.secondary_color}
                        onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                    />
                    <HexInput
                        value={colors.secondary_color}
                        onChange={(e) => handleHexInputChange('secondary_color', e.target.value)}
                        maxLength={7}
                    />
                </ColorInputWrapper>
                <PresetColors>
                    {PRESET_COLORS.slice(5, 10).map((color) => (
                        <PresetColor
                            key={color}
                            color={color}
                            onClick={() => handleColorChange('secondary_color', color)}
                            title={color}
                        />
                    ))}
                </PresetColors>
            </ColorRow>

            <ColorRow>
                <ColorLabel>Accent</ColorLabel>
                <ColorInputWrapper>
                    <ColorInput
                        type="color"
                        value={colors.accent_color}
                        onChange={(e) => handleColorChange('accent_color', e.target.value)}
                    />
                    <HexInput
                        value={colors.accent_color}
                        onChange={(e) => handleHexInputChange('accent_color', e.target.value)}
                        maxLength={7}
                    />
                </ColorInputWrapper>
                <PresetColors>
                    {PRESET_COLORS.slice(0, 5).map((color) => (
                        <PresetColor
                            key={color}
                            color={color}
                            onClick={() => handleColorChange('accent_color', color)}
                            title={color}
                        />
                    ))}
                </PresetColors>
            </ColorRow>

            {hasLowContrast && (
                <ContrastWarning>
                    <span>Low contrast warning: White text may be hard to read on the primary color.</span>
                </ContrastWarning>
            )}

            <Preview>
                <PreviewHeader primary={colors.primary_color} secondary={colors.secondary_color}>
                    Team Header Preview
                </PreviewHeader>
                <PreviewBody>
                    <PreviewButton accent={colors.accent_color}>Action Button</PreviewButton>
                </PreviewBody>
            </Preview>
        </Container>
    );
};

export default ColorPicker;
