import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const ConfirmOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(10, 22, 40, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 16px;
`;

export const ConfirmDialog = styled.div`
    background: ${theme.surfaces.card};
    border-radius: 12px;
    box-shadow: ${theme.shadows.xl};
    max-width: 440px;
    width: 100%;
    padding: 24px;
`;

export const ConfirmTitle = styled.h2`
    margin: 0 0 12px;
    font-size: 18px;
    font-weight: 700;
    color: ${theme.colors.gray[900]};
`;

export const ConfirmMessage = styled.p`
    margin: 0 0 20px;
    color: ${theme.colors.gray[700]};
    line-height: 1.5;
    font-size: 14px;
`;

export const ConfirmActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

export const CancelBtn = styled.button`
    padding: 8px 16px;
    border: 1px solid ${theme.colors.gray[300]};
    background: ${theme.surfaces.card};
    color: ${theme.colors.gray[700]};
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    &:hover {
        background: ${theme.colors.gray[100]};
    }
`;

export const ConfirmBtn = styled.button<{ destructive: boolean }>`
    padding: 8px 16px;
    border: none;
    background: ${({ destructive }) => (destructive ? theme.colors.red[600] : theme.colors.primary[600])};
    color: white;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    &:hover {
        background: ${({ destructive }) => (destructive ? theme.colors.red[700] : theme.colors.primary[700])};
    }
`;
