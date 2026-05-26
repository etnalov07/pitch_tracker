import { useState } from 'react';
import Container from '../../components/Container';
import PricingTier from '../../components/PricingTier';
import SectionHeading from '../../components/SectionHeading';
import { pricing, faq } from '../../config/content';
import {
    PageHero,
    PageHeroEyebrow,
    PageHeroTitle,
    PageHeroSub,
    TierSection,
    TierGrid,
    FaqSection,
    FaqList,
    FaqItem,
    FaqQuestion,
    FaqAnswer,
    FaqToggle,
} from './styles';

export default function Pricing() {
    const [openIdx, setOpenIdx] = useState<number | null>(0);
    return (
        <>
            <PageHero>
                <Container>
                    <PageHeroEyebrow>Pricing</PageHeroEyebrow>
                    <PageHeroTitle>Simple pricing for every program.</PageHeroTitle>
                    <PageHeroSub>
                        Free for personal use. Coach for the dugout. Team for the whole organization. No hidden fees, no per-user
                        surprises.
                    </PageHeroSub>
                </Container>
            </PageHero>

            <TierSection>
                <Container>
                    <TierGrid>
                        {pricing.map((tier) => (
                            <PricingTier key={tier.id} tier={tier} />
                        ))}
                    </TierGrid>
                </Container>
            </TierSection>

            <FaqSection>
                <Container>
                    <SectionHeading eyebrow="FAQ" headline="Common questions" />
                    <FaqList>
                        {faq.map((item, idx) => (
                            <FaqItem key={item.question}>
                                <FaqToggle
                                    type="button"
                                    aria-expanded={openIdx === idx}
                                    onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                                >
                                    <FaqQuestion>{item.question}</FaqQuestion>
                                    <span aria-hidden="true">{openIdx === idx ? '−' : '+'}</span>
                                </FaqToggle>
                                {openIdx === idx && <FaqAnswer>{item.answer}</FaqAnswer>}
                            </FaqItem>
                        ))}
                    </FaqList>
                </Container>
            </FaqSection>
        </>
    );
}
