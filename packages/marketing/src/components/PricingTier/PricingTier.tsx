import type { PricingTier as TierType } from '../../config/content';
import CTAButton from '../CTAButton';
import { signUpUrl, mailtoUrl } from '../../config/env';
import { Card, Highlight, Name, Tagline, Price, Cadence, FeatureList, Feature, Check, CtaWrap } from './styles';

type Props = { tier: TierType };

export default function PricingTier({ tier }: Props) {
    const isContact = tier.id === 'team';
    const ctaHref = isContact ? mailtoUrl : signUpUrl;
    return (
        <Card highlight={!!tier.highlight}>
            {tier.highlight && <Highlight>Most popular</Highlight>}
            <Name>{tier.name}</Name>
            <Tagline>{tier.tagline}</Tagline>
            <div>
                <Price>{tier.price}</Price>
                <Cadence>/ {tier.cadence}</Cadence>
            </div>
            <FeatureList>
                {tier.features.map((f) => (
                    <Feature key={f}>
                        <Check aria-hidden="true">✓</Check>
                        <span>{f}</span>
                    </Feature>
                ))}
            </FeatureList>
            <CtaWrap>
                <CTAButton href={ctaHref} variant={tier.highlight ? 'primary' : 'secondary'} size="md">
                    {tier.cta}
                </CTAButton>
            </CtaWrap>
        </Card>
    );
}
