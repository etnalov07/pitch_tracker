import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const Card = styled.section`
    background: ${theme.surfaces.card};
    border: 1px solid ${theme.colors.gray[200]};
    border-radius: ${theme.borderRadius.lg};
    padding: ${theme.spacing.lg};
    margin-bottom: ${theme.spacing.lg};
    box-shadow: ${theme.shadows.sm};
`;

export const HeaderRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${theme.spacing.md};
`;

export const Title = styled.h2`
    margin: 0;
    font-size: ${theme.fontSize.xl};
    color: ${theme.colors.gray[900]};
`;

export const RegenerateButton = styled.button`
    padding: 6px 14px;
    background: ${theme.colors.gray[100]};
    border: 1px solid ${theme.colors.gray[300]};
    color: ${theme.colors.gray[700]};
    border-radius: ${theme.borderRadius.md};
    font-size: ${theme.fontSize.sm};
    cursor: pointer;

    &:hover {
        background: ${theme.colors.gray[200]};
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

export const Narrative = styled.p`
    background: ${theme.colors.primary[50]};
    border-left: 4px solid ${theme.colors.primary[500]};
    padding: ${theme.spacing.md};
    margin: 0 0 ${theme.spacing.lg} 0;
    font-size: ${theme.fontSize.base};
    color: ${theme.colors.gray[800]};
    line-height: 1.5;
    border-radius: 0 ${theme.borderRadius.md} ${theme.borderRadius.md} 0;
`;

export const NarrativePlaceholder = styled.p`
    color: ${theme.colors.gray[500]};
    font-style: italic;
    margin: 0 0 ${theme.spacing.lg} 0;
`;

export const SectionTitle = styled.h3`
    font-size: ${theme.fontSize.base};
    font-weight: ${theme.fontWeight.semibold};
    color: ${theme.colors.gray[700]};
    margin: ${theme.spacing.lg} 0 ${theme.spacing.sm} 0;
`;

export const PitchMixRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${theme.spacing.sm};
`;

export const PitchMixChip = styled.div`
    background: ${theme.surfaces.elevated};
    border: 1px solid ${theme.colors.gray[200]};
    border-radius: ${theme.borderRadius.full};
    padding: 4px 12px;
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.gray[800]};
    display: flex;
    gap: 6px;
    align-items: center;

    .pct {
        font-weight: ${theme.fontWeight.bold};
        color: ${theme.colors.primary[700]};
    }
    .count {
        color: ${theme.colors.gray[500]};
        font-size: ${theme.fontSize.xs};
    }
`;

export const HeatmapWrap = styled.div`
    display: grid;
    grid-template-columns: 32px repeat(3, 56px);
    grid-template-rows: 24px repeat(3, 56px);
    gap: 4px;
    width: fit-content;
    align-items: center;
`;

export const HeatmapColLabel = styled.div`
    font-size: ${theme.fontSize.xs};
    font-weight: ${theme.fontWeight.semibold};
    color: ${theme.colors.gray[500]};
    text-align: center;
    text-transform: uppercase;
`;

export const HeatmapRowLabel = styled.div`
    font-size: ${theme.fontSize.xs};
    font-weight: ${theme.fontWeight.semibold};
    color: ${theme.colors.gray[500]};
    text-align: right;
    text-transform: uppercase;
    padding-right: 4px;
`;

export const ZoneCell = styled.div<{ $intensity: number }>`
    background: ${(p) => `rgba(220, 38, 38, ${0.08 + p.$intensity * 0.6})`};
    border: 1px solid ${theme.colors.gray[300]};
    border-radius: ${theme.borderRadius.sm};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${(p) => (p.$intensity > 0.55 ? '#ffffff' : theme.colors.gray[800])};
    font-size: ${theme.fontSize.lg};
    font-weight: ${theme.fontWeight.bold};
`;

export const HeatmapCaption = styled.div`
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.gray[500]};
    margin-top: 4px;
    font-style: italic;
`;

export const SituationTable = styled.table`
    border-collapse: collapse;
    width: 100%;
    font-size: ${theme.fontSize.sm};

    th,
    td {
        padding: 6px 8px;
        border-bottom: 1px solid ${theme.colors.gray[200]};
        text-align: left;
    }
    th {
        background: ${theme.surfaces.elevated};
        font-weight: ${theme.fontWeight.semibold};
        color: ${theme.colors.gray[600]};
    }
`;

export const OutcomeColumns = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${theme.spacing.md};

    @media (max-width: 720px) {
        grid-template-columns: 1fr;
    }
`;

export const OutcomeCard = styled.div<{ $variant: 'good' | 'bad' }>`
    background: ${(p) => (p.$variant === 'good' ? theme.colors.green[50] : theme.colors.red[50])};
    border: 1px solid ${(p) => (p.$variant === 'good' ? theme.colors.green[200] : theme.colors.red[200])};
    border-radius: ${theme.borderRadius.md};
    padding: ${theme.spacing.md};

    h4 {
        margin: 0 0 ${theme.spacing.sm} 0;
        font-size: ${theme.fontSize.sm};
        color: ${(p) => (p.$variant === 'good' ? theme.colors.green[800] : theme.colors.red[800])};
    }
`;

export const OutcomeChipRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 6px;
`;

export const OutcomeChip = styled.span`
    background: ${theme.surfaces.card};
    border: 1px solid ${theme.colors.gray[200]};
    border-radius: ${theme.borderRadius.full};
    padding: 3px 10px;
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.gray[800]};

    .count {
        font-weight: ${theme.fontWeight.bold};
        margin-left: 4px;
        color: ${theme.colors.primary[700]};
    }
`;

export const HitterAccordion = styled.details`
    border: 1px solid ${theme.colors.gray[200]};
    border-radius: ${theme.borderRadius.md};
    margin-bottom: 6px;
    background: ${theme.surfaces.card};

    summary {
        padding: ${theme.spacing.sm} ${theme.spacing.md};
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: ${theme.spacing.md};
        font-size: ${theme.fontSize.sm};
        color: ${theme.colors.gray[800]};
    }

    summary::marker {
        color: ${theme.colors.gray[500]};
    }

    &[open] summary {
        border-bottom: 1px solid ${theme.colors.gray[200]};
    }
`;

export const HitterBody = styled.div`
    padding: ${theme.spacing.md};
`;

export const OutcomeStats = styled.div`
    display: flex;
    gap: ${theme.spacing.md};
    margin-left: auto;
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.gray[600]};

    span strong {
        color: ${theme.colors.gray[900]};
        font-weight: ${theme.fontWeight.bold};
        margin-right: 2px;
    }
`;

export const Empty = styled.p`
    color: ${theme.colors.gray[500]};
    font-style: italic;
    margin: 0;
    font-size: ${theme.fontSize.sm};
`;
