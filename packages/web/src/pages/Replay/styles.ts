import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Page = styled.div`
    min-height: 100vh;
    background: ${theme.colors.gray[50]};
    color: ${theme.colors.gray[900]};
    padding: ${theme.spacing.lg};
`;

export const TopBar = styled.div`
    display: flex;
    align-items: center;
    gap: ${theme.spacing.md};
    margin-bottom: ${theme.spacing.lg};
`;

export const BackButton = styled.button`
    background: transparent;
    border: 1px solid ${theme.colors.gray[300]};
    color: ${theme.colors.gray[700]};
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border-radius: ${theme.borderRadius.md};
    cursor: pointer;
    &:hover {
        background: ${theme.colors.gray[100]};
    }
`;

export const Title = styled.h1`
    font-size: ${theme.fontSize.xl};
    font-weight: ${theme.fontWeight.semibold};
    margin: 0;
`;

export const StripWrap = styled.div`
    display: flex;
    gap: ${theme.spacing.sm};
    overflow-x: auto;
    padding: ${theme.spacing.sm} 0;
    margin-bottom: ${theme.spacing.md};
`;

export const BatterChip = styled.button<{ selected: boolean }>`
    flex: 0 0 auto;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border-radius: ${theme.borderRadius.full};
    border: 1px solid ${(p) => (p.selected ? theme.colors.primary[600] : theme.colors.gray[300])};
    background: ${(p) => (p.selected ? theme.colors.primary[600] : theme.colors.gray[100])};
    color: ${(p) => (p.selected ? '#fff' : theme.colors.gray[800])};
    font-size: ${theme.fontSize.sm};
    cursor: pointer;
    white-space: nowrap;
`;

export const Body = styled.div`
    display: grid;
    grid-template-columns: minmax(280px, 360px) 1fr;
    gap: ${theme.spacing.lg};
    @media (max-width: 720px) {
        grid-template-columns: 1fr;
    }
`;

export const ZoneCard = styled.div`
    background: ${theme.colors.gray[100]};
    padding: ${theme.spacing.md};
    border-radius: ${theme.borderRadius.lg};
    display: flex;
    align-items: center;
    justify-content: center;
`;

export const InfoCol = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.md};
`;

export const InfoCard = styled.div`
    background: #fff;
    border: 1px solid ${theme.colors.gray[200]};
    padding: ${theme.spacing.md};
    border-radius: ${theme.borderRadius.lg};
`;

export const BatterHeader = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: ${theme.spacing.sm};
`;

export const BatterName = styled.div`
    font-size: ${theme.fontSize.lg};
    font-weight: ${theme.fontWeight.semibold};
`;

export const BatterMeta = styled.div`
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.gray[600]};
`;

export const ScrubberRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
`;

export const StepButton = styled.button`
    background: ${theme.colors.gray[200]};
    border: none;
    width: 36px;
    height: 36px;
    border-radius: ${theme.borderRadius.full};
    cursor: pointer;
    font-size: ${theme.fontSize.lg};
    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

export const Slider = styled.input`
    flex: 1;
    accent-color: ${theme.colors.primary[600]};
`;

export const Counter = styled.span`
    min-width: 56px;
    text-align: right;
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.gray[700]};
`;

export const PitchSummary = styled.div`
    font-size: ${theme.fontSize.lg};
    font-weight: ${theme.fontWeight.semibold};
`;

export const PitchMeta = styled.div`
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.gray[600]};
    margin-top: ${theme.spacing.xs};
`;

export const Empty = styled.div`
    padding: ${theme.spacing.xl};
    text-align: center;
    color: ${theme.colors.gray[600]};
`;
