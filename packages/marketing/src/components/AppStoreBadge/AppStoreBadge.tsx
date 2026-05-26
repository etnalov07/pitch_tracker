import { APP_STORE_URL, PLAY_STORE_URL, hasAppStoreUrl, hasPlayStoreUrl } from '../../config/env';
import { BadgeAnchor, BadgeBox, BadgeInner, Caption, Sub, Title, IconWrap, ComingSoon } from './styles';

type Store = 'apple' | 'google';

const config: Record<Store, { caption: string; title: string; url: string; available: boolean; icon: React.ReactElement }> = {
    apple: {
        caption: 'Download on the',
        title: 'App Store',
        url: APP_STORE_URL,
        available: hasAppStoreUrl,
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                <path
                    fill="currentColor"
                    d="M16.365 1.43c0 1.14-.464 2.232-1.227 3.029-.815.85-2.144 1.508-3.218 1.421a3.62 3.62 0 0 1-.034-.404c0-1.1.521-2.205 1.225-2.97.81-.886 2.166-1.55 3.252-1.55.001.169.002.337.002.474zM20.5 17.46c-.485 1.103-.715 1.595-1.34 2.572-.873 1.36-2.105 3.054-3.633 3.067-1.357.012-1.706-.882-3.547-.871-1.841.01-2.224.886-3.582.874-1.527-.014-2.694-1.546-3.567-2.906-2.44-3.8-2.697-8.26-1.191-10.633.997-1.578 2.57-2.5 4.05-2.5 1.504 0 2.45.825 3.694.825 1.207 0 1.942-.826 3.682-.826 1.318 0 2.713.718 3.706 1.959-3.255 1.783-2.726 6.43.728 7.439z"
                />
            </svg>
        ),
    },
    google: {
        caption: 'Get it on',
        title: 'Google Play',
        url: PLAY_STORE_URL,
        available: hasPlayStoreUrl,
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                <path
                    fill="currentColor"
                    d="m3.5 2.4 9.45 9.45-9.45 9.45a1.5 1.5 0 0 1-.5-1.12V3.52c0-.43.19-.83.5-1.12zM14.36 13.27 17 15.91l-9.96 5.78a1.5 1.5 0 0 1-1.51-.07l8.83-8.35zm0-2.54L5.53 2.38c.45-.26 1-.27 1.51-.07L17 8.09l-2.64 2.64zm6.94 2.71-2.84 1.65-2.94-2.94 2.94-2.94 2.84 1.65a1.5 1.5 0 0 1 0 2.58z"
                />
            </svg>
        ),
    },
};

type Props = {
    store: Store;
    className?: string;
};

export default function AppStoreBadge({ store, className }: Props) {
    const c = config[store];
    const inner = (
        <BadgeInner>
            <IconWrap>{c.icon}</IconWrap>
            <div>
                <Caption>{c.caption}</Caption>
                <Title>{c.title}</Title>
                {!c.available && <Sub>Coming soon</Sub>}
            </div>
        </BadgeInner>
    );

    if (c.available) {
        return (
            <BadgeAnchor href={c.url} target="_blank" rel="noreferrer" className={className}>
                {inner}
            </BadgeAnchor>
        );
    }

    return (
        <BadgeBox aria-disabled="true" title="Coming soon to the store" className={className}>
            {inner}
            <ComingSoon>Coming soon</ComingSoon>
        </BadgeBox>
    );
}
