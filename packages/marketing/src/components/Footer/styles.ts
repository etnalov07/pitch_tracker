import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { Link } from 'react-router-dom';
import { theme } from '../../styles/theme';

export const Bar = styled.footer`
    background-color: ${theme.colors.primary[900]};
    color: #fff;
    padding: ${theme.spacing['3xl']} 0 ${theme.spacing.xl};
    margin-top: ${theme.spacing['5xl']};
`;

export const Inner = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${theme.spacing['2xl']};

    @media (min-width: ${theme.breakpoints.md}) {
        grid-template-columns: 2fr 3fr;
    }
`;

export const BrandCol = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.lg};
`;

export const BrandRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
`;

export const BrandName = styled.span`
    font-size: ${theme.fontSize.xl};
    font-weight: ${theme.fontWeight.bold};
    color: #fff;
`;

export const Tagline = styled.p`
    color: rgba(255, 255, 255, 0.7);
    font-size: ${theme.fontSize.base};
    max-width: 320px;
`;

export const Columns = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${theme.spacing.xl};

    @media (min-width: ${theme.breakpoints.md}) {
        grid-template-columns: repeat(3, 1fr);
    }
`;

export const Col = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.md};
`;

export const ColTitle = styled.div`
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.bold};
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: ${theme.spacing.xs};
`;

const linkBase = css`
    color: rgba(255, 255, 255, 0.7);
    font-size: ${theme.fontSize.base};
    text-decoration: none;
    transition: color 0.15s ease;

    &:hover {
        color: #fff;
    }
`;

export const ColRouterLink = styled(Link)`
    ${linkBase}
`;

export const ColExternalLink = styled.a`
    ${linkBase}
`;

export const BadgeRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${theme.spacing.md};
`;

export const Bottom = styled.div`
    margin-top: ${theme.spacing['2xl']};
    padding-top: ${theme.spacing.lg};
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.5);
    font-size: ${theme.fontSize.sm};
    text-align: center;
`;
