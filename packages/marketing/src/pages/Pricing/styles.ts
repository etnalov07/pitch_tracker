import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const PageHero = styled.section`
    background: linear-gradient(180deg, ${theme.colors.primary[50]} 0%, #ffffff 100%);
    padding: ${theme.spacing['4xl']} 0 ${theme.spacing['3xl']};
    text-align: center;
`;

export const PageHeroEyebrow = styled.div`
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.green[600]};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: ${theme.spacing.sm};
`;

export const PageHeroTitle = styled.h1`
    font-size: ${theme.fontSize['4xl']};
    font-weight: ${theme.fontWeight.extrabold};
    color: ${theme.colors.primary[900]};
    letter-spacing: -0.025em;
    line-height: 1.1;
    max-width: 720px;
    margin: 0 auto ${theme.spacing.lg};

    @media (min-width: ${theme.breakpoints.md}) {
        font-size: ${theme.fontSize['5xl']};
    }
`;

export const PageHeroSub = styled.p`
    font-size: ${theme.fontSize.lg};
    color: ${theme.surfaces.textMuted};
    max-width: 640px;
    margin: 0 auto;
    line-height: 1.6;
`;

export const TierSection = styled.section`
    padding: ${theme.spacing['3xl']} 0 ${theme.spacing['4xl']};
`;

export const TierGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${theme.spacing.xl};

    @media (min-width: ${theme.breakpoints.md}) {
        grid-template-columns: repeat(3, 1fr);
        gap: ${theme.spacing.lg};
        align-items: stretch;
    }
`;

export const FaqSection = styled.section`
    padding: ${theme.spacing['3xl']} 0 ${theme.spacing['4xl']};
    background-color: ${theme.surfaces.elevated};
`;

export const FaqList = styled.div`
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.md};
`;

export const FaqItem = styled.div`
    background-color: ${theme.surfaces.card};
    border: 1px solid ${theme.surfaces.border};
    border-radius: ${theme.borderRadius.lg};
    overflow: hidden;
`;

export const FaqToggle = styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: ${theme.spacing.lg} ${theme.spacing.xl};
    text-align: left;
    color: ${theme.colors.primary[900]};
    font-size: ${theme.fontSize.lg};
    font-weight: ${theme.fontWeight.semibold};

    & > span {
        font-size: ${theme.fontSize['2xl']};
        color: ${theme.colors.green[600]};
        line-height: 1;
    }
`;

export const FaqQuestion = styled.span``;

export const FaqAnswer = styled.div`
    padding: 0 ${theme.spacing.xl} ${theme.spacing.lg};
    color: ${theme.surfaces.textMuted};
    line-height: 1.6;
`;
