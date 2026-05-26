import type { Persona } from '../../config/content';
import { Card, Title, ValueProp, BulletList, Bullet, Check } from './styles';

type Props = { persona: Persona };

export default function PersonaCard({ persona }: Props) {
    return (
        <Card>
            <Title>{persona.title}</Title>
            <ValueProp>{persona.valueProp}</ValueProp>
            <BulletList>
                {persona.bullets.map((b) => (
                    <Bullet key={b}>
                        <Check aria-hidden="true">✓</Check>
                        <span>{b}</span>
                    </Bullet>
                ))}
            </BulletList>
        </Card>
    );
}
