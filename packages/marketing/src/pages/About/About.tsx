import Container from '../../components/Container';
import CTAButton from '../../components/CTAButton';
import { about } from '../../config/content';
import { mailtoUrl, CONTACT_EMAIL } from '../../config/env';
import { PageHero, PageHeroEyebrow, PageHeroTitle, Body, Paragraph, ContactBlock, ContactHeadline, ContactSub } from './styles';

export default function About() {
    return (
        <>
            <PageHero>
                <Container>
                    <PageHeroEyebrow>About</PageHeroEyebrow>
                    <PageHeroTitle>{about.headline}</PageHeroTitle>
                </Container>
            </PageHero>

            <Body>
                <Container>
                    {about.paragraphs.map((p) => (
                        <Paragraph key={p}>{p}</Paragraph>
                    ))}
                </Container>
            </Body>

            <ContactBlock>
                <Container>
                    <ContactHeadline>Want to talk?</ContactHeadline>
                    <ContactSub>Reach the team directly at {CONTACT_EMAIL}.</ContactSub>
                    <CTAButton href={mailtoUrl} variant="primary" size="lg">
                        {about.contactCta}
                    </CTAButton>
                </Container>
            </ContactBlock>
        </>
    );
}
