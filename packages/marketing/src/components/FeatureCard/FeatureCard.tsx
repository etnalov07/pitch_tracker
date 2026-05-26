import type { FeaturePillar } from '../../config/content';
import { Card, Icon, Title, Blurb } from './styles';

type Props = { feature: FeaturePillar };

export default function FeatureCard({ feature }: Props) {
    return (
        <Card>
            <Icon aria-hidden="true">{feature.icon}</Icon>
            <Title>{feature.title}</Title>
            <Blurb>{feature.blurb}</Blurb>
        </Card>
    );
}
