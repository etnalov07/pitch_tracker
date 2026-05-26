import Container from '../../components/Container';
import CTAButton from '../../components/CTAButton';
import FeatureCard from '../../components/FeatureCard';
import PersonaCard from '../../components/PersonaCard';
import SectionHeading from '../../components/SectionHeading';
import AppStoreBadge from '../../components/AppStoreBadge';
import { hero, features, personas } from '../../config/content';
import { signInUrl } from '../../config/env';
import {
    Hero,
    HeroGrid,
    HeroCopy,
    HeroEyebrow,
    HeroHeadline,
    HeroSub,
    HeroCtas,
    HeroBadges,
    HeroVisual,
    HeroVisualInner,
    Section,
    FeatureGrid,
    PersonaGrid,
    FinalCta,
    FinalCtaInner,
    FinalCtaHeadline,
    FinalCtaSub,
    FinalBadgeRow,
} from './styles';

export default function Landing() {
    return (
        <>
            <Hero>
                <Container>
                    <HeroGrid>
                        <HeroCopy>
                            <HeroEyebrow>{hero.eyebrow}</HeroEyebrow>
                            <HeroHeadline>{hero.headline}</HeroHeadline>
                            <HeroSub>{hero.subhead}</HeroSub>
                            <HeroCtas>
                                <CTAButton to="/features" variant="primary" size="lg">
                                    See Features
                                </CTAButton>
                                <CTAButton href={signInUrl} variant="secondary" size="lg">
                                    {hero.secondaryCta}
                                </CTAButton>
                            </HeroCtas>
                            <HeroBadges>
                                <AppStoreBadge store="apple" />
                                <AppStoreBadge store="google" />
                            </HeroBadges>
                        </HeroCopy>
                        <HeroVisual>
                            <HeroVisualInner>
                                <img src="/screenshots/live-game.png" alt="PitchChart live game tracking screen" />
                            </HeroVisualInner>
                        </HeroVisual>
                    </HeroGrid>
                </Container>
            </Hero>

            <Section>
                <Container>
                    <SectionHeading
                        eyebrow="Everything in one app"
                        headline="Built for every part of your pitching program"
                        sub="From the first bullpen of preseason to the championship game — track it, scout it, report it, share it."
                    />
                    <FeatureGrid>
                        {features.map((f) => (
                            <FeatureCard key={f.id} feature={f} />
                        ))}
                    </FeatureGrid>
                </Container>
            </Section>

            <Section>
                <Container>
                    <SectionHeading
                        eyebrow="Who it's for"
                        headline="One app, three points of view"
                        sub="PitchChart adapts to whether you're coaching a team, owning your own development, or running a whole organization."
                    />
                    <PersonaGrid>
                        {personas.map((p) => (
                            <PersonaCard key={p.id} persona={p} />
                        ))}
                    </PersonaGrid>
                </Container>
            </Section>

            <FinalCta>
                <Container>
                    <FinalCtaInner>
                        <FinalCtaHeadline>Ready to chart your next bullpen?</FinalCtaHeadline>
                        <FinalCtaSub>Free for personal use. No credit card required.</FinalCtaSub>
                        <FinalBadgeRow>
                            <AppStoreBadge store="apple" />
                            <AppStoreBadge store="google" />
                        </FinalBadgeRow>
                    </FinalCtaInner>
                </Container>
            </FinalCta>
        </>
    );
}
