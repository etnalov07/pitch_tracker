import { useState } from 'react';
import CTAButton from '../CTAButton';
import Container from '../Container';
import { nav } from '../../config/content';
import { signInUrl } from '../../config/env';
import {
    Bar,
    Inner,
    Brand,
    BrandMark,
    BrandName,
    DesktopNav,
    DesktopNavItem,
    DesktopActions,
    MobileToggle,
    MobileDrawer,
    MobileNavItem,
    MobileActions,
    Hamburger,
} from './styles';

export default function Header() {
    const [open, setOpen] = useState(false);
    return (
        <Bar>
            <Container>
                <Inner>
                    <Brand to="/" onClick={() => setOpen(false)}>
                        <BrandMark src="/logo.png" alt="" />
                        <BrandName>PitchChart</BrandName>
                    </Brand>

                    <DesktopNav>
                        {nav.map((item) => (
                            <DesktopNavItem key={item.href} to={item.href}>
                                {item.label}
                            </DesktopNavItem>
                        ))}
                    </DesktopNav>

                    <DesktopActions>
                        <CTAButton href={signInUrl} variant="secondary" size="md">
                            Sign in
                        </CTAButton>
                    </DesktopActions>

                    <MobileToggle
                        type="button"
                        aria-label={open ? 'Close navigation' : 'Open navigation'}
                        aria-expanded={open}
                        onClick={() => setOpen((v) => !v)}
                    >
                        <Hamburger open={open}>
                            <span />
                            <span />
                            <span />
                        </Hamburger>
                    </MobileToggle>
                </Inner>
            </Container>

            <MobileDrawer open={open}>
                {nav.map((item) => (
                    <MobileNavItem key={item.href} to={item.href} onClick={() => setOpen(false)}>
                        {item.label}
                    </MobileNavItem>
                ))}
                <MobileActions>
                    <CTAButton href={signInUrl} variant="secondary" size="md">
                        Sign in
                    </CTAButton>
                </MobileActions>
            </MobileDrawer>
        </Bar>
    );
}
