import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Wrap = styled.div<{ align: 'left' | 'center' }>`
    text-align: ${(p) => p.align};
    max-width: ${(p) => (p.align === 'center' ? '720px' : 'none')};
    margin: ${(p) => (p.align === 'center' ? '0 auto' : '0')} ${theme.spacing['2xl']}
        ${(p) => (p.align === 'center' ? 'auto' : '0')};
    margin-bottom: ${theme.spacing['2xl']};
`;

export const Eyebrow = styled.div`
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.green[600]};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: ${theme.spacing.sm};
`;

export const Headline = styled.h2`
    font-size: ${theme.fontSize['3xl']};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.primary[900]};
    letter-spacing: -0.02em;
    line-height: 1.15;

    @media (min-width: ${theme.breakpoints.md}) {
        font-size: ${theme.fontSize['4xl']};
    }
`;

export const Sub = styled.p`
    font-size: ${theme.fontSize.lg};
    color: ${theme.surfaces.textMuted};
    margin-top: ${theme.spacing.md};
    line-height: 1.6;
`;
