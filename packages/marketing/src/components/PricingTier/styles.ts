import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Card = styled.div<{ highlight: boolean }>`
    position: relative;
    background-color: ${theme.surfaces.card};
    border: 2px solid ${(p) => (p.highlight ? theme.colors.green[500] : theme.surfaces.border)};
    border-radius: ${theme.borderRadius['2xl']};
    padding: ${theme.spacing['2xl']};
    display: flex;
    flex-direction: column;
    box-shadow: ${(p) => (p.highlight ? theme.shadows.xl : theme.shadows.sm)};
    transform: ${(p) => (p.highlight ? 'scale(1.02)' : 'none')};
`;

export const Highlight = styled.div`
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background-color: ${theme.colors.green[500]};
    color: #fff;
    font-size: ${theme.fontSize.xs};
    font-weight: ${theme.fontWeight.bold};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: ${theme.spacing.xs} ${theme.spacing.md};
    border-radius: ${theme.borderRadius.full};
`;

export const Name = styled.h3`
    font-size: ${theme.fontSize['2xl']};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.primary[900]};
    margin-bottom: ${theme.spacing.sm};
`;

export const Tagline = styled.p`
    color: ${theme.surfaces.textMuted};
    font-size: ${theme.fontSize.base};
    margin-bottom: ${theme.spacing.lg};
    min-height: 2.5em;
`;

export const Price = styled.span`
    font-size: ${theme.fontSize['5xl']};
    font-weight: ${theme.fontWeight.extrabold};
    color: ${theme.colors.primary[900]};
`;

export const Cadence = styled.span`
    font-size: ${theme.fontSize.base};
    color: ${theme.surfaces.textMuted};
    margin-left: ${theme.spacing.sm};
`;

export const FeatureList = styled.ul`
    list-style: none;
    margin: ${theme.spacing.xl} 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.md};
    flex: 1;
`;

export const Feature = styled.li`
    display: flex;
    align-items: flex-start;
    gap: ${theme.spacing.md};
    font-size: ${theme.fontSize.base};
    color: ${theme.surfaces.text};
    line-height: 1.5;
`;

export const Check = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background-color: ${theme.colors.green[100]};
    color: ${theme.colors.green[700]};
    border-radius: 50%;
    font-size: 0.7rem;
    font-weight: ${theme.fontWeight.bold};
    flex-shrink: 0;
    margin-top: 2px;
`;

export const CtaWrap = styled.div`
    margin-top: auto;
    display: flex;

    & > a {
        width: 100%;
    }
`;
