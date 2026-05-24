import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const EditOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(10, 22, 40, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 16px;
`;

export const EditDialog = styled.div`
    background: ${theme.surfaces.card};
    border-radius: 12px;
    box-shadow: ${theme.shadows.xl};
    max-width: 520px;
    width: 100%;
    padding: 24px;
`;

export const EditTitle = styled.h2`
    margin: 0 0 6px;
    font-size: 18px;
    font-weight: 700;
    color: ${theme.colors.gray[900]};
    text-align: center;
`;

export const EditSubtitle = styled.p`
    margin: 0 0 18px;
    text-align: center;
    color: ${theme.colors.gray[600]};
    font-size: 13px;
`;

export const EditCurrentResult = styled.span`
    font-weight: 700;
    text-transform: capitalize;
    color: ${theme.colors.gray[800]};
`;

export const EditGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
`;

export const EditOption = styled.button<{ isCurrent: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px 8px;
    border: 1px solid ${theme.colors.gray[300]};
    border-radius: 8px;
    background: ${({ isCurrent }) => (isCurrent ? theme.colors.gray[100] : theme.surfaces.card)};
    color: ${theme.colors.gray[800]};
    cursor: ${({ isCurrent }) => (isCurrent ? 'default' : 'pointer')};
    opacity: ${({ isCurrent }) => (isCurrent ? 0.55 : 1)};
    font-family: inherit;
    transition: background 0.12s;
    &:hover {
        background: ${({ isCurrent }) => (isCurrent ? theme.colors.gray[100] : theme.colors.primary[50])};
    }
`;

export const EditOptionLabel = styled.span`
    font-size: 14px;
    font-weight: 600;
`;

export const EditCurrentTag = styled.span`
    font-size: 10px;
    font-style: italic;
    color: ${theme.colors.gray[500]};
    margin-top: 2px;
`;

export const EditCancel = styled.button`
    margin-top: 16px;
    width: 100%;
    padding: 10px;
    border: 1px solid ${theme.colors.gray[300]};
    background: ${theme.surfaces.card};
    color: ${theme.colors.gray[700]};
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    &:hover {
        background: ${theme.colors.gray[100]};
    }
`;
