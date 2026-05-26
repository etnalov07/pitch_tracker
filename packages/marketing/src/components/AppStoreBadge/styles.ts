import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { theme } from '../../styles/theme';

const badgeBase = css`
    position: relative;
    display: inline-flex;
    align-items: center;
    background-color: #000;
    color: #fff;
    border-radius: ${theme.borderRadius.lg};
    padding: ${theme.spacing.sm} ${theme.spacing.lg};
    text-decoration: none;
    min-height: 56px;
    min-width: 180px;
    overflow: hidden;
`;

export const BadgeAnchor = styled.a`
    ${badgeBase}
    transition: transform 0.15s ease;
    cursor: pointer;

    &:hover {
        transform: translateY(-1px);
    }
`;

export const BadgeBox = styled.div`
    ${badgeBase}
    opacity: 0.55;
    cursor: not-allowed;
`;

export const BadgeInner = styled.div`
    display: flex;
    align-items: center;
    gap: ${theme.spacing.md};
`;

export const IconWrap = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
`;

export const Caption = styled.div`
    font-size: ${theme.fontSize.xs};
    line-height: 1.1;
    opacity: 0.85;
`;

export const Title = styled.div`
    font-size: ${theme.fontSize.lg};
    font-weight: ${theme.fontWeight.semibold};
    line-height: 1.15;
`;

export const Sub = styled.div`
    font-size: ${theme.fontSize.xs};
    margin-top: 2px;
    color: ${theme.colors.green[400]};
`;

export const ComingSoon = styled.div`
    position: absolute;
    top: 6px;
    right: 6px;
    font-size: 9px;
    font-weight: ${theme.fontWeight.bold};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background-color: ${theme.colors.yellow[500]};
    color: ${theme.colors.gray[900]};
    padding: 2px 6px;
    border-radius: ${theme.borderRadius.sm};
`;
