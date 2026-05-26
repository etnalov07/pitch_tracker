// Single source of truth for all marketing copy. Edit this file to change
// headlines, feature blurbs, pricing tiers, etc. — no JSX changes required.

export type FeaturePillar = {
    id: string;
    title: string;
    blurb: string;
    icon: string; // emoji or short symbol — easy to swap for an SVG later
    bullets: string[];
    screenshot?: string; // path under /public/screenshots/
};

export type Persona = {
    id: string;
    title: string;
    valueProp: string;
    bullets: string[];
};

export type PricingTier = {
    id: string;
    name: string;
    price: string;
    cadence: string;
    tagline: string;
    features: string[];
    cta: string;
    highlight?: boolean;
};

export type FaqItem = {
    question: string;
    answer: string;
};

export const hero = {
    eyebrow: 'Pitcher-focused baseball tracking',
    headline: 'Every pitch. Every game. One app built for pitchers and the people who develop them.',
    subhead:
        'PitchChart turns a clipboard and a radar gun into a live, shareable record of every bullpen, every game, every at-bat — with the scouting, stats, and reports your staff actually uses.',
    primaryCta: 'Get the App',
    secondaryCta: 'Sign in',
};

export const features: FeaturePillar[] = [
    {
        id: 'live-game',
        title: 'Live Game Tracking',
        icon: '⚾',
        blurb: 'Chart every pitch in real time — location, velocity, result, batter, count — with a strike zone built for fast tapping on the dugout rail.',
        bullets: [
            'Strike-zone tap chart with batter handedness mirroring',
            'Auto-advancing count, outs, and base runners',
            'In-game scouting notes per at-bat',
            'Shareable live link so parents and coaches follow from anywhere',
        ],
        screenshot: '/screenshots/live-game.png',
    },
    {
        id: 'bullpen',
        title: 'Bullpen Training',
        icon: '🎯',
        blurb: 'Design pre-built bullpen plans, record live, and review what actually happened versus what was planned — pitch by pitch.',
        bullets: [
            'Mobile-first bullpen plan editor',
            'Live recording with one-tap pitch entry',
            'Undo last pitch when fingers slip',
            'Compare planned vs. actual side-by-side after the session',
        ],
        screenshot: '/screenshots/bullpen.png',
    },
    {
        id: 'scouting',
        title: 'Opponent Scouting',
        icon: '🔍',
        blurb: 'Build opponent lineups, chart their tendencies, and walk into the next series knowing exactly where every hitter is vulnerable.',
        bullets: [
            'Opponent lineups and pitcher-vs-batter history',
            'Heatmaps of where each hitter chases and crushes',
            'Scout reports that your staff actually reads',
            'Charts opposing pitchers too — for prep and game plan',
        ],
        screenshot: '/screenshots/scouting.png',
    },
    {
        id: 'reports',
        title: 'Performance Reports',
        icon: '📊',
        blurb: 'Cross-game reports for every pitcher: velocity trends, zone effectiveness, pitch mix, and AI-written narrative summaries.',
        bullets: [
            'Velocity trend lines across the season',
            'Zone effectiveness by pitch type and count',
            'AI narrative summaries you can paste into a parent email',
            'Player dashboards for self-review and goal-setting',
        ],
        screenshot: '/screenshots/report.png',
    },
    {
        id: 'video',
        title: 'Video & Pitch Analysis',
        icon: '🎥',
        blurb: 'Capture pitch video from the dugout, replay any at-bat by pitch type, and overlay the strike zone — no separate camera setup.',
        bullets: [
            'Pitch-by-pitch replay with batter silhouette',
            'Color-coded pitch type overlays',
            'Camera setup workflow built into the app',
            'Share clips with your pitching coach in seconds',
        ],
    },
    {
        id: 'hardware',
        title: 'Hardware Integration',
        icon: '📡',
        blurb: 'Stalker radar over Bluetooth, walkie-talkie catcher comms (coming soon) — the gear you already own, finally talking to your app.',
        bullets: [
            'Auto-fill velocity from Stalker radar via BLE',
            'No typing — focus on the pitch, not the data entry',
            'Catcher-to-dugout signal calling (coming soon)',
            'Works with the equipment your program already owns',
        ],
    },
];

export const personas: Persona[] = [
    {
        id: 'coach',
        title: 'For Coaches',
        valueProp: 'Run practice, chart the game, write the report — in one app, on one device.',
        bullets: [
            'Manage rosters, lineups, and pitching plans',
            'Chart live games with the team standing next to you',
            'Build bullpen programs your pitchers actually follow',
            'Send opponent prep that earns the second look',
        ],
    },
    {
        id: 'player',
        title: 'For Players',
        valueProp: 'Own your development. See every pitch you’ve thrown and where it’s trending.',
        bullets: [
            'Personal dashboard with velocity and zone trends',
            'Review every bullpen and game you’ve charted',
            'Set goals and track them across the season',
            'Share progress with your private pitching coach',
        ],
    },
    {
        id: 'org-admin',
        title: 'For Organizations',
        valueProp: 'Travel teams, academies, and high-school programs — one org, many teams, one source of truth.',
        bullets: [
            'Multi-team rollups across an entire program',
            'Org-wide read-only views for directors and parents',
            'Consistent reporting across coaching staffs',
            'Onboard new teams with one invite link',
        ],
    },
];

export const pricing: PricingTier[] = [
    {
        id: 'free',
        name: 'Free',
        price: '$0',
        cadence: 'forever',
        tagline: 'For players and parents tracking a single pitcher.',
        features: [
            'Personal player dashboard',
            'Track up to 5 bullpens per month',
            'Basic velocity and zone charts',
            'Read-only shared game reports',
        ],
        cta: 'Get started',
    },
    {
        id: 'coach',
        name: 'Coach',
        price: '$19',
        cadence: 'per month',
        tagline: 'For one coach charting their team’s games and bullpens.',
        features: [
            'Everything in Free',
            'Unlimited games, bullpens, and reports',
            'Opponent scouting + heatmaps',
            'AI narrative performance reports',
            'Stalker radar Bluetooth integration',
            'Up to 25 players on your roster',
        ],
        cta: 'Start free trial',
        highlight: true,
    },
    {
        id: 'team',
        name: 'Team',
        price: '$79',
        cadence: 'per month',
        tagline: 'For programs running multiple teams under one org.',
        features: [
            'Everything in Coach',
            'Multi-team org rollups',
            'Unlimited coaches and assistants',
            'Org-wide read-only access for directors',
            'Priority support and onboarding',
            'Custom branding on shared reports',
        ],
        cta: 'Contact sales',
    },
];

export const faq: FaqItem[] = [
    {
        question: 'Does the free plan really stay free?',
        answer: 'Yes. Free covers personal use for a single player tracking their own pitching journey. No credit card required.',
    },
    {
        question: 'Can I try Coach or Team before I pay?',
        answer: 'Coach includes a 14-day free trial. For Team, reach out and we’ll walk through it with your program.',
    },
    {
        question: 'What devices do I need?',
        answer: 'PitchChart runs on iPhone, iPad, and any modern web browser. The Stalker radar integration requires Bluetooth from your iOS device.',
    },
    {
        question: 'Who owns the data?',
        answer: 'You do. Every chart, every report, every roster — exportable any time. We don’t sell or resell program data.',
    },
];

export const about = {
    headline: 'Built by people who actually chart games.',
    paragraphs: [
        'PitchChart started in the dugout — not in a boardroom. Every feature shipped because a coach, a pitcher, or a parent said "I wish this app did X" and we built it that week.',
        'We focus on pitchers because pitchers don’t get enough tools. Hitters have Rapsodo and HitTrax. Pitchers get a clipboard and a radar gun whose battery is always dead. PitchChart replaces both with one app that the whole staff can use.',
        'No data resale. No "premium AI features" locked behind a higher tier. Just the tracking, scouting, and reporting tools your program needs — built by a small team that uses the product every weekend.',
    ],
    contactCta: 'Get in touch',
};

export const nav = [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'About', href: '/about' },
];

export const footer = {
    tagline: 'Pitcher-focused baseball tracking.',
    columns: [
        {
            title: 'Product',
            links: [
                { label: 'Features', href: '/features' },
                { label: 'Pricing', href: '/pricing' },
            ],
        },
        {
            title: 'Company',
            links: [{ label: 'About', href: '/about' }],
        },
    ],
};
