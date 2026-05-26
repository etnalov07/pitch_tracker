import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Card = styled.div`
    background: linear-gradient(180deg, ${theme.colors.primary[50]} 0%, #ffffff 100%);
    border: 1px solid ${theme.surfaces.border};
    border-radius: ${theme.borderRadius['2xl']};
    padding: ${theme.spacing['2xl']};
    height: 100%;
    display: flex;
    flex-direction: column;
`;

export const Title = styled.h3`
    font-size: ${theme.fontSize['2xl']};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.primary[900]};
    margin-bottom: ${theme.spacing.md};
`;

export const ValueProp = styled.p`
    font-size: ${theme.fontSize.lg};
    color: ${theme.surfaces.textMuted};
    margin-bottom: ${theme.spacing.xl};
    line-height: 1.5;
`;

export const BulletList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.md};
`;

export const Bullet = styled.li`
    display: flex;
    align-items: flex-start;
    gap: ${theme.spacing.md};
    font-size: ${theme.fontSize.base};
    color: ${theme.surfaces.text};
    line-height: 1.5;
`;

export const Check = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background-color: ${theme.colors.green[500]};
    color: #fff;
    border-radius: 50%;
    font-size: 0.7rem;
    font-weight: ${theme.fontWeight.bold};
    flex-shrink: 0;
    margin-top: 2px;
`;
