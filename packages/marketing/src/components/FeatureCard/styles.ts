import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Card = styled.div`
    background-color: ${theme.surfaces.card};
    border: 1px solid ${theme.surfaces.border};
    border-radius: ${theme.borderRadius.xl};
    padding: ${theme.spacing.xl};
    transition: all 0.2s ease;

    &:hover {
        transform: translateY(-2px);
        box-shadow: ${theme.shadows.lg};
        border-color: ${theme.colors.primary[300]};
    }
`;

export const Icon = styled.div`
    font-size: 2rem;
    margin-bottom: ${theme.spacing.md};
    line-height: 1;
`;

export const Title = styled.h3`
    font-size: ${theme.fontSize.xl};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.primary[900]};
    margin-bottom: ${theme.spacing.sm};
`;

export const Blurb = styled.p`
    color: ${theme.surfaces.textMuted};
    font-size: ${theme.fontSize.base};
    line-height: 1.6;
`;
