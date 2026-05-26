import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Hero = styled.section`
    background: linear-gradient(180deg, ${theme.colors.primary[50]} 0%, #ffffff 100%);
    padding: ${theme.spacing['3xl']} 0 ${theme.spacing['4xl']};

    @media (min-width: ${theme.breakpoints.md}) {
        padding: ${theme.spacing['5xl']} 0;
    }
`;

export const HeroGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${theme.spacing['2xl']};
    align-items: center;

    @media (min-width: ${theme.breakpoints.lg}) {
        grid-template-columns: 1.1fr 1fr;
        gap: ${theme.spacing['4xl']};
    }
`;

export const HeroCopy = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.lg};
`;

export const HeroEyebrow = styled.div`
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.green[600]};
    text-transform: uppercase;
    letter-spacing: 0.08em;
`;

export const HeroHeadline = styled.h1`
    font-size: ${theme.fontSize['4xl']};
    font-weight: ${theme.fontWeight.extrabold};
    color: ${theme.colors.primary[900]};
    letter-spacing: -0.025em;
    line-height: 1.1;

    @media (min-width: ${theme.breakpoints.md}) {
        font-size: ${theme.fontSize['5xl']};
    }

    @media (min-width: ${theme.breakpoints.lg}) {
        font-size: ${theme.fontSize['6xl']};
    }
`;

export const HeroSub = styled.p`
    font-size: ${theme.fontSize.lg};
    color: ${theme.surfaces.textMuted};
    line-height: 1.6;
    max-width: 560px;

    @media (min-width: ${theme.breakpoints.md}) {
        font-size: ${theme.fontSize.xl};
    }
`;

export const HeroCtas = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${theme.spacing.md};
    margin-top: ${theme.spacing.sm};
`;

export const HeroBadges = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${theme.spacing.md};
    margin-top: ${theme.spacing.md};
`;

export const HeroVisual = styled.div`
    display: flex;
    justify-content: center;
`;

export const HeroVisualInner = styled.div`
    background: linear-gradient(135deg, ${theme.colors.primary[800]}, ${theme.colors.primary[900]});
    border-radius: ${theme.borderRadius['3xl']};
    padding: ${theme.spacing.lg};
    box-shadow: ${theme.shadows['2xl']};
    width: 100%;
    max-width: 480px;
    aspect-ratio: 9 / 16;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: ${theme.borderRadius.xl};
        background-color: ${theme.colors.gray[100]};
        color: ${theme.colors.gray[400]};
        font-size: ${theme.fontSize.sm};
        font-style: italic;
    }

    @media (max-width: ${theme.breakpoints.md}) {
        max-width: 280px;
    }
`;

export const Section = styled.section`
    padding: ${theme.spacing['4xl']} 0;
`;

export const FeatureGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${theme.spacing.xl};

    @media (min-width: ${theme.breakpoints.md}) {
        grid-template-columns: repeat(2, 1fr);
    }

    @media (min-width: ${theme.breakpoints.lg}) {
        grid-template-columns: repeat(3, 1fr);
    }
`;

export const PersonaGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${theme.spacing.xl};

    @media (min-width: ${theme.breakpoints.md}) {
        grid-template-columns: repeat(3, 1fr);
    }
`;

export const FinalCta = styled.section`
    background: linear-gradient(135deg, ${theme.colors.primary[800]}, ${theme.colors.primary[900]});
    color: #fff;
    padding: ${theme.spacing['4xl']} 0;
`;

export const FinalCtaInner = styled.div`
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${theme.spacing.lg};
`;

export const FinalCtaHeadline = styled.h2`
    color: #fff;
    font-size: ${theme.fontSize['3xl']};
    font-weight: ${theme.fontWeight.bold};
    letter-spacing: -0.02em;

    @media (min-width: ${theme.breakpoints.md}) {
        font-size: ${theme.fontSize['4xl']};
    }
`;

export const FinalCtaSub = styled.p`
    color: rgba(255, 255, 255, 0.85);
    font-size: ${theme.fontSize.lg};
`;

export const FinalBadgeRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: ${theme.spacing.md};
    margin-top: ${theme.spacing.lg};
`;
