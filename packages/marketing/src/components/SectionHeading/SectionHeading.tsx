import { Wrap, Eyebrow, Headline, Sub } from './styles';

type Props = {
    eyebrow?: string;
    headline: string;
    sub?: string;
    align?: 'left' | 'center';
};

export default function SectionHeading({ eyebrow, headline, sub, align = 'center' }: Props) {
    return (
        <Wrap align={align}>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <Headline>{headline}</Headline>
            {sub && <Sub>{sub}</Sub>}
        </Wrap>
    );
}
