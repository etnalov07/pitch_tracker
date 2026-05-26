import { StyledExternal, StyledRouterLink } from './styles';

type Variant = 'primary' | 'secondary';
type Size = 'md' | 'lg';

type Props = {
    children: React.ReactNode;
    to?: string;
    href?: string;
    variant?: Variant;
    size?: Size;
    onClick?: () => void;
};

export default function CTAButton({ children, to, href, variant = 'primary', size = 'md', onClick }: Props) {
    if (href) {
        const isMailto = href.startsWith('mailto:');
        const external = !isMailto && /^https?:/i.test(href);
        return (
            <StyledExternal
                href={href}
                variant={variant}
                size={size}
                onClick={onClick}
                target={external ? '_blank' : undefined}
                rel={external ? 'noreferrer' : undefined}
            >
                {children}
            </StyledExternal>
        );
    }
    return (
        <StyledRouterLink to={to ?? '/'} variant={variant} size={size} onClick={onClick}>
            {children}
        </StyledRouterLink>
    );
}
