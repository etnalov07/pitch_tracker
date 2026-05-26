import styled from '@emotion/styled';
import { Link, NavLink } from 'react-router-dom';
import { theme } from '../../styles/theme';

export const Bar = styled.header`
    background: linear-gradient(135deg, ${theme.brand.headerStart}, ${theme.brand.headerEnd});
    color: #fff;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: ${theme.shadows.md};
`;

export const Inner = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    gap: ${theme.spacing.lg};
`;

export const Brand = styled(Link)`
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
    color: #fff;
    text-decoration: none;
`;

export const BrandMark = styled.img`
    width: 32px;
    height: 32px;
    border-radius: ${theme.borderRadius.sm};
`;

export const BrandName = styled.span`
    font-size: ${theme.fontSize.xl};
    font-weight: ${theme.fontWeight.bold};
    letter-spacing: -0.01em;
`;

export const DesktopNav = styled.nav`
    display: none;
    align-items: center;
    gap: ${theme.spacing.xl};
    margin-left: auto;
    margin-right: ${theme.spacing.xl};

    @media (min-width: ${theme.breakpoints.md}) {
        display: flex;
    }
`;

export const DesktopNavItem = styled(NavLink)`
    color: rgba(255, 255, 255, 0.85);
    font-size: ${theme.fontSize.base};
    font-weight: ${theme.fontWeight.medium};
    text-decoration: none;
    padding: ${theme.spacing.xs} 0;
    border-bottom: 2px solid transparent;
    transition: all 0.15s ease;

    &:hover {
        color: #fff;
    }

    &.active {
        color: #fff;
        border-bottom-color: ${theme.colors.green[500]};
    }
`;

export const DesktopActions = styled.div`
    display: none;
    align-items: center;
    gap: ${theme.spacing.md};

    @media (min-width: ${theme.breakpoints.md}) {
        display: flex;
    }

    /* Secondary CTA on dark header — invert colors */
    & a {
        color: #fff;
        border-color: rgba(255, 255, 255, 0.6);

        &:hover {
            background-color: #fff;
            color: ${theme.colors.primary[900]};
        }
    }
`;

export const MobileToggle = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    margin-left: auto;

    @media (min-width: ${theme.breakpoints.md}) {
        display: none;
    }
`;

export const Hamburger = styled.div<{ open: boolean }>`
    width: 24px;
    height: 18px;
    position: relative;

    span {
        display: block;
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background-color: #fff;
        border-radius: 2px;
        transition: all 0.25s ease;
    }

    span:nth-of-type(1) {
        top: ${(p) => (p.open ? '8px' : '0')};
        transform: rotate(${(p) => (p.open ? '45deg' : '0')});
    }
    span:nth-of-type(2) {
        top: 8px;
        opacity: ${(p) => (p.open ? 0 : 1)};
    }
    span:nth-of-type(3) {
        top: ${(p) => (p.open ? '8px' : '16px')};
        transform: rotate(${(p) => (p.open ? '-45deg' : '0')});
    }
`;

export const MobileDrawer = styled.div<{ open: boolean }>`
    display: ${(p) => (p.open ? 'flex' : 'none')};
    flex-direction: column;
    gap: ${theme.spacing.sm};
    padding: ${theme.spacing.lg} ${theme.spacing.xl};
    background-color: ${theme.brand.headerEnd};
    border-top: 1px solid rgba(255, 255, 255, 0.1);

    @media (min-width: ${theme.breakpoints.md}) {
        display: none;
    }
`;

export const MobileNavItem = styled(Link)`
    display: block;
    color: #fff;
    font-size: ${theme.fontSize.lg};
    font-weight: ${theme.fontWeight.medium};
    text-decoration: none;
    padding: ${theme.spacing.md} 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

export const MobileActions = styled.div`
    margin-top: ${theme.spacing.lg};

    & a {
        width: 100%;
        color: #fff;
        border-color: rgba(255, 255, 255, 0.6);

        &:hover {
            background-color: #fff;
            color: ${theme.colors.primary[900]};
        }
    }
`;
