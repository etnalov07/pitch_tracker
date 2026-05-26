import Container from '../../components/Container';
import SectionHeading from '../../components/SectionHeading';
import { features } from '../../config/content';
import {
    PageHero,
    PageHeroEyebrow,
    PageHeroTitle,
    PageHeroSub,
    FeatureSection,
    FeatureRow,
    Copy,
    CopyTitle,
    CopyBlurb,
    Bullets,
    Bullet,
    Check,
    Visual,
    VisualInner,
    Placeholder,
} from './styles';

export default function Features() {
    return (
        <>
            <PageHero>
                <Container>
                    <PageHeroEyebrow>Features</PageHeroEyebrow>
                    <PageHeroTitle>Everything PitchChart does, in detail.</PageHeroTitle>
                    <PageHeroSub>
                        Six pillars that cover the entire pitching workflow — from the first preseason bullpen to the final playoff
                        scouting report.
                    </PageHeroSub>
                </Container>
            </PageHero>

            {features.map((feature, idx) => (
                <FeatureSection key={feature.id} alt={idx % 2 === 1}>
                    <Container>
                        <FeatureRow reverse={idx % 2 === 1}>
                            <Copy>
                                <SectionHeading
                                    eyebrow={`${(idx + 1).toString().padStart(2, '0')} · ${feature.icon} ${feature.title}`}
                                    headline={feature.title}
                                    align="left"
                                />
                                <CopyTitle>{feature.title}</CopyTitle>
                                <CopyBlurb>{feature.blurb}</CopyBlurb>
                                <Bullets>
                                    {feature.bullets.map((b) => (
                                        <Bullet key={b}>
                                            <Check aria-hidden="true">✓</Check>
                                            <span>{b}</span>
                                        </Bullet>
                                    ))}
                                </Bullets>
                            </Copy>
                            <Visual>
                                <VisualInner>
                                    {feature.screenshot ? (
                                        <img src={feature.screenshot} alt={`${feature.title} screen`} />
                                    ) : (
                                        <Placeholder>{feature.icon}</Placeholder>
                                    )}
                                </VisualInner>
                            </Visual>
                        </FeatureRow>
                    </Container>
                </FeatureSection>
            ))}
        </>
    );
}
