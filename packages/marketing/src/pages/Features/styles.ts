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

export const FeatureSection = styled.section<{ alt: boolean }>`
    background-color: ${(p) => (p.alt ? theme.surfaces.elevated : '#fff')};
    padding: ${theme.spacing['4xl']} 0;
`;

export const FeatureRow = styled.div<{ reverse: boolean }>`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${theme.spacing['2xl']};
    align-items: center;

    @media (min-width: ${theme.breakpoints.lg}) {
        grid-template-columns: 1fr 1fr;
        gap: ${theme.spacing['4xl']};

        & > div:first-of-type {
            order: ${(p) => (p.reverse ? 2 : 1)};
        }
        & > div:last-of-type {
            order: ${(p) => (p.reverse ? 1 : 2)};
        }
    }
`;

export const Copy = styled.div`
    display: flex;
    flex-direction: column;
`;

export const CopyTitle = styled.h2`
    font-size: ${theme.fontSize['3xl']};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.primary[900]};
    margin-bottom: ${theme.spacing.md};
    letter-spacing: -0.02em;
    display: none; /* hidden because SectionHeading above already renders the title */
`;

export const CopyBlurb = styled.p`
    font-size: ${theme.fontSize.lg};
    color: ${theme.surfaces.textMuted};
    line-height: 1.6;
    margin-bottom: ${theme.spacing.xl};
`;

export const Bullets = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.md};
`;

export const Bullet = styled.li`
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
    width: 22px;
    height: 22px;
    background-color: ${theme.colors.green[500]};
    color: #fff;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: ${theme.fontWeight.bold};
    flex-shrink: 0;
    margin-top: 1px;
`;

export const Visual = styled.div`
    display: flex;
    justify-content: center;
`;

export const VisualInner = styled.div`
    background: linear-gradient(135deg, ${theme.colors.primary[800]}, ${theme.colors.primary[900]});
    border-radius: ${theme.borderRadius['3xl']};
    padding: ${theme.spacing.lg};
    box-shadow: ${theme.shadows.xl};
    width: 100%;
    max-width: 380px;
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
    }
`;

export const Placeholder = styled.div`
    font-size: 4rem;
    color: ${theme.colors.primary[400]};
`;
