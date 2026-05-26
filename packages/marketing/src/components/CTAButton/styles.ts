import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { Link } from 'react-router-dom';
import { theme } from '../../styles/theme';

type Variant = 'primary' | 'secondary';
type Size = 'md' | 'lg';

const base = css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${theme.spacing.sm};
    font-weight: ${theme.fontWeight.semibold};
    border-radius: ${theme.borderRadius.lg};
    text-decoration: none;
    transition: all 0.15s ease;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        transform: translateY(-1px);
        box-shadow: ${theme.shadows.md};
    }

    &:active {
        transform: translateY(0);
    }
`;

const sized = (size: Size) =>
    size === 'lg'
        ? css`
              padding: ${theme.spacing.md} ${theme.spacing.xl};
              font-size: ${theme.fontSize.lg};
          `
        : css`
              padding: ${theme.spacing.sm} ${theme.spacing.lg};
              font-size: ${theme.fontSize.base};
          `;

const variantStyles = (variant: Variant) =>
    variant === 'primary'
        ? css`
              background-color: ${theme.accents.green};
              color: #fff;

              &:hover {
                  background-color: ${theme.accents.greenHover};
              }
          `
        : css`
              background-color: transparent;
              color: ${theme.colors.primary[900]};
              border: 1.5px solid ${theme.colors.primary[900]};

              &:hover {
                  background-color: ${theme.colors.primary[900]};
                  color: #fff;
              }
          `;

export const StyledExternal = styled.a<{ variant: Variant; size: Size }>`
    ${base}
    ${(p) => sized(p.size)}
    ${(p) => variantStyles(p.variant)}
`;

export const StyledRouterLink = styled(Link)<{ variant: Variant; size: Size }>`
    ${base}
    ${(p) => sized(p.size)}
    ${(p) => variantStyles(p.variant)}
`;
