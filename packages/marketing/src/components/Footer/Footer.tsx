import Container from '../Container';
import AppStoreBadge from '../AppStoreBadge';
import { footer } from '../../config/content';
import { CONTACT_EMAIL, mailtoUrl } from '../../config/env';
import {
    Bar,
    Inner,
    BrandCol,
    BrandRow,
    BrandName,
    Tagline,
    Columns,
    Col,
    ColTitle,
    ColRouterLink,
    ColExternalLink,
    BadgeRow,
    Bottom,
} from './styles';

const year = new Date().getFullYear();

export default function FooterComponent() {
    return (
        <Bar>
            <Container>
                <Inner>
                    <BrandCol>
                        <BrandRow>
                            <img src="/logo.png" alt="" width={32} height={32} style={{ borderRadius: 4 }} />
                            <BrandName>PitchChart</BrandName>
                        </BrandRow>
                        <Tagline>{footer.tagline}</Tagline>
                        <BadgeRow>
                            <AppStoreBadge store="apple" />
                            <AppStoreBadge store="google" />
                        </BadgeRow>
                    </BrandCol>

                    <Columns>
                        {footer.columns.map((col) => (
                            <Col key={col.title}>
                                <ColTitle>{col.title}</ColTitle>
                                {col.links.map((link) => (
                                    <ColRouterLink key={link.href} to={link.href}>
                                        {link.label}
                                    </ColRouterLink>
                                ))}
                            </Col>
                        ))}
                        <Col>
                            <ColTitle>Contact</ColTitle>
                            <ColExternalLink href={mailtoUrl}>{CONTACT_EMAIL}</ColExternalLink>
                        </Col>
                    </Columns>
                </Inner>

                <Bottom>© {year} PitchChart. All rights reserved.</Bottom>
            </Container>
        </Bar>
    );
}
