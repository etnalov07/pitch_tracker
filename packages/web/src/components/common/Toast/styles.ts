import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

const slideUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

export const ToastContainer = styled.div`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    pointer-events: none;
`;

export const ToastBar = styled.div<{ type: 'info' | 'error' | 'success' }>`
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 280px;
    max-width: 480px;
    padding: 12px 16px;
    border-radius: 8px;
    background: ${({ type }) =>
        type === 'error' ? theme.colors.red[600] : type === 'success' ? theme.colors.green[600] : theme.colors.gray[800]};
    color: white;
    box-shadow: ${theme.shadows.lg};
    font-size: 14px;
    animation: ${slideUp} 0.2s ease-out;
`;

export const ToastMessage = styled.span`
    flex: 1;
    line-height: 1.4;
`;

export const ToastAction = styled.button`
    background: transparent;
    color: white;
    border: none;
    padding: 4px 8px;
    font-weight: 700;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    cursor: pointer;
    border-radius: 4px;
    &:hover {
        background: rgba(255, 255, 255, 0.15);
    }
`;

export const ToastDismiss = styled.button`
    background: transparent;
    color: white;
    border: none;
    padding: 0 4px;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    opacity: 0.7;
    &:hover {
        opacity: 1;
    }
`;
