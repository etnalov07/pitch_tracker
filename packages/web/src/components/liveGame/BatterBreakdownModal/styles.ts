import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    padding: ${theme.spacing.md};
`;

export const Modal = styled.div`
    background: ${theme.surfaces.card};
    border-radius: ${theme.borderRadius.lg};
    box-shadow: ${theme.shadows.lg};
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

export const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${theme.spacing.md} ${theme.spacing.lg};
    border-bottom: 1px solid ${theme.surfaces.border};
`;

export const Title = styled.h2`
    margin: 0;
    font-size: ${theme.fontSize.xl};
    color: ${theme.surfaces.text};
`;

export const Subtitle = styled.div`
    font-size: ${theme.fontSize.sm};
    color: ${theme.surfaces.textMuted};
    margin-top: ${theme.spacing.xs};
`;

export const CloseBtn = styled.button`
    background: transparent;
    border: 1px solid ${theme.surfaces.border};
    color: ${theme.surfaces.text};
    border-radius: ${theme.borderRadius.md};
    padding: ${theme.spacing.xs} ${theme.spacing.md};
    cursor: pointer;
    font-size: ${theme.fontSize.lg};
    line-height: 1;

    &:hover {
        background: ${theme.colors.gray[100]};
    }
`;

export const Body = styled.div`
    overflow-y: auto;
    padding: ${theme.spacing.md};
    flex: 1;
`;

export const LoadingText = styled.div`
    text-align: center;
    color: ${theme.surfaces.textMuted};
    font-size: ${theme.fontSize.base};
    padding: ${theme.spacing['2xl']};
`;
