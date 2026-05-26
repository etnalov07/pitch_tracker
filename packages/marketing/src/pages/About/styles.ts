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
    margin: 0 auto;

    @media (min-width: ${theme.breakpoints.md}) {
        font-size: ${theme.fontSize['5xl']};
    }
`;

export const Body = styled.section`
    padding: ${theme.spacing['3xl']} 0;
`;

export const Paragraph = styled.p`
    max-width: 680px;
    margin: 0 auto ${theme.spacing.xl};
    font-size: ${theme.fontSize.lg};
    color: ${theme.surfaces.text};
    line-height: 1.7;
`;

export const ContactBlock = styled.section`
    background: linear-gradient(135deg, ${theme.colors.primary[800]}, ${theme.colors.primary[900]});
    color: #fff;
    padding: ${theme.spacing['4xl']} 0;
    text-align: center;
`;

export const ContactHeadline = styled.h2`
    color: #fff;
    font-size: ${theme.fontSize['3xl']};
    font-weight: ${theme.fontWeight.bold};
    margin-bottom: ${theme.spacing.md};

    @media (min-width: ${theme.breakpoints.md}) {
        font-size: ${theme.fontSize['4xl']};
    }
`;

export const ContactSub = styled.p`
    color: rgba(255, 255, 255, 0.85);
    font-size: ${theme.fontSize.lg};
    margin-bottom: ${theme.spacing.xl};
`;
