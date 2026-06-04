import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Page = styled.div`
    max-width: 860px;
    margin: 0 auto;
    padding: ${theme.spacing.lg};
`;

export const TopBar = styled.div`
    display: flex;
    align-items: center;
    gap: ${theme.spacing.md};
    margin-bottom: ${theme.spacing.lg};
`;

export const BackButton = styled.button`
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.medium};
    color: ${theme.colors.primary[600]};
    background: none;
    border: 1px solid ${theme.colors.primary[300]};
    border-radius: ${theme.borderRadius.md};
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        background: ${theme.colors.primary[50]};
    }
`;

export const Title = styled.h1`
    font-size: ${theme.fontSize.xl};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.gray[900]};
    margin: 0;
`;

export const Subtitle = styled.p`
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.gray[500]};
    margin: 0 0 ${theme.spacing.lg};
`;

export const PitcherTabRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${theme.spacing.xs};
    margin-bottom: ${theme.spacing.md};
    border-bottom: 1px solid ${theme.colors.gray[200]};
    padding-bottom: ${theme.spacing.sm};
`;

export const PitcherTab = styled.button<{ active: boolean }>`
    padding: ${theme.spacing.xs} ${theme.spacing.md};
    border: 1px solid ${({ active }) => (active ? theme.colors.primary[300] : theme.colors.gray[200])};
    background: ${({ active }) => (active ? theme.colors.primary[50] : 'white')};
    color: ${({ active }) => (active ? theme.colors.primary[700] : theme.colors.gray[600])};
    font-weight: ${({ active }) => (active ? theme.fontWeight.semibold : theme.fontWeight.normal)};
    font-size: ${theme.fontSize.sm};
    border-radius: ${theme.borderRadius.md};
    cursor: pointer;

    &:hover {
        background: ${theme.colors.primary[50]};
    }
`;

export const PasteRow = styled.div`
    display: flex;
    align-items: flex-start;
    gap: ${theme.spacing.sm};
    margin-bottom: ${theme.spacing.md};
`;

export const PasteArea = styled.textarea`
    flex: 1;
    min-height: 44px;
    resize: vertical;
    font-size: ${theme.fontSize.sm};
    font-family: inherit;
    padding: ${theme.spacing.sm};
    border: 1px solid ${theme.colors.gray[300]};
    border-radius: ${theme.borderRadius.md};
`;

export const SmallButton = styled.button`
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.medium};
    color: ${theme.colors.primary[700]};
    background: ${theme.colors.primary[50]};
    border: 1px solid ${theme.colors.primary[300]};
    border-radius: ${theme.borderRadius.md};
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        background: ${theme.colors.primary[100]};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export const Hint = styled.div`
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.gray[500]};
    margin-bottom: ${theme.spacing.md};
`;

export const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: ${theme.fontSize.sm};
`;

export const Th = styled.th<{ align?: 'left' | 'right' | 'center' }>`
    text-align: ${({ align }) => align ?? 'left'};
    color: ${theme.colors.gray[500]};
    font-weight: ${theme.fontWeight.semibold};
    font-size: ${theme.fontSize.xs};
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    border-bottom: 1px solid ${theme.colors.gray[200]};
`;

export const Td = styled.td<{ align?: 'left' | 'right' | 'center' }>`
    text-align: ${({ align }) => align ?? 'left'};
    color: ${theme.colors.gray[800]};
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    border-bottom: 1px solid ${theme.colors.gray[100]};
    white-space: nowrap;
`;

export const VelocityInput = styled.input<{ dirty: boolean }>`
    width: 72px;
    text-align: right;
    font-size: ${theme.fontSize.sm};
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    border: 1px solid ${({ dirty }) => (dirty ? theme.colors.primary[400] : theme.colors.gray[300])};
    background: ${({ dirty }) => (dirty ? theme.colors.primary[50] : 'white')};
    border-radius: ${theme.borderRadius.sm};

    &:focus {
        outline: none;
        border-color: ${theme.colors.primary[500]};
    }
`;

export const SaveBar = styled.div`
    position: sticky;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: ${theme.spacing.md};
    padding: ${theme.spacing.md} 0;
    margin-top: ${theme.spacing.md};
    background: linear-gradient(to top, white 70%, transparent);
`;

export const SaveButton = styled.button`
    font-size: ${theme.fontSize.base};
    font-weight: ${theme.fontWeight.semibold};
    color: white;
    background: ${theme.colors.primary[600]};
    border: none;
    border-radius: ${theme.borderRadius.md};
    padding: ${theme.spacing.sm} ${theme.spacing.xl};
    cursor: pointer;

    &:hover {
        background: ${theme.colors.primary[700]};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export const StatusText = styled.span<{ kind: 'error' | 'success' | 'muted' }>`
    font-size: ${theme.fontSize.sm};
    color: ${({ kind }) =>
        kind === 'error' ? theme.colors.red[600] : kind === 'success' ? theme.colors.green[600] : theme.colors.gray[500]};
`;

export const Empty = styled.div`
    text-align: center;
    color: ${theme.colors.gray[500]};
    padding: ${theme.spacing['2xl']};
    font-size: ${theme.fontSize.sm};
`;
