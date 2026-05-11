import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Page = styled.div`
    min-height: 100vh;
    background: ${theme.colors.gray[50]};
`;

export const HeaderBar = styled.header`
    background: ${theme.colors.primary[800]};
    color: #ffffff;
    padding: ${theme.spacing.md} ${theme.spacing.lg};
    box-shadow: ${theme.shadows.sm};
`;

export const HeaderInner = styled.div`
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${theme.spacing.md};
    flex-wrap: wrap;
`;

export const Brand = styled.div`
    font-size: ${theme.fontSize.lg};
    font-weight: ${theme.fontWeight.bold};
    letter-spacing: 0.5px;
`;

export const HeaderMeta = styled.div`
    font-size: ${theme.fontSize.sm};
    opacity: 0.85;
`;

export const Body = styled.main`
    max-width: 1100px;
    margin: 0 auto;
    padding: ${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing['2xl']};
`;

export const GameTitle = styled.h1`
    margin: 0 0 ${theme.spacing.xs};
    font-size: ${theme.fontSize['2xl']};
    color: ${theme.colors.gray[900]};
`;

export const GameSub = styled.p`
    margin: 0 0 ${theme.spacing.lg};
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.gray[600]};
`;

export const StateMessage = styled.div`
    padding: ${theme.spacing.xl} ${theme.spacing.lg};
    text-align: center;
    color: ${theme.colors.gray[600]};
    font-size: ${theme.fontSize.base};
`;

export const PitcherSectionTitle = styled.h2`
    margin: ${theme.spacing.xl} 0 ${theme.spacing.md};
    font-size: ${theme.fontSize.lg};
    color: ${theme.colors.gray[700]};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

export const Footer = styled.footer`
    margin-top: ${theme.spacing['2xl']};
    text-align: center;
    color: ${theme.colors.gray[500]};
    font-size: ${theme.fontSize.xs};
`;
