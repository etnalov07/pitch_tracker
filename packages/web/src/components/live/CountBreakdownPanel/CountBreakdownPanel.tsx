import React, { useEffect, useState } from 'react';
import { CountBucketBreakdown, TeamSide } from '../../../types';
import { analyticsService } from '../../../services/analyticsService';
import {
    BucketCard,
    BucketLabel,
    BucketStrike,
    BucketTotal,
    EmptyText,
    Grid,
    Panel,
    PanelTitle,
    TypeList,
    TypeRow,
} from './styles';

interface Props {
    gameId: string;
    pitcherId?: string;
    teamSide?: TeamSide;
    refreshTrigger?: number;
}

const BUCKET_LABELS: Record<string, string> = {
    '1st_pitch': '1st Pitch (0-0)',
    ahead: 'Ahead (K > B)',
    even: 'Even',
    behind: 'Behind (B > K)',
};

const CountBreakdownPanel: React.FC<Props> = ({ gameId, pitcherId, teamSide, refreshTrigger }) => {
    const [data, setData] = useState<CountBucketBreakdown | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        analyticsService
            .getCountBreakdown(gameId, pitcherId, teamSide)
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [gameId, pitcherId, teamSide, refreshTrigger]);

    if (loading)
        return (
            <Panel>
                <PanelTitle>Count Breakdown</PanelTitle>
                <EmptyText>Loading...</EmptyText>
            </Panel>
        );

    const buckets = data ? (['1st_pitch', 'ahead', 'even', 'behind'] as const) : [];
    const hasData = data && buckets.some((k) => data[k].total > 0);

    return (
        <Panel>
            <PanelTitle>Count Breakdown</PanelTitle>
            {!hasData ? (
                <EmptyText>No pitches yet</EmptyText>
            ) : (
                <Grid>
                    {buckets.map((key) => {
                        const bucket = data![key];
                        if (bucket.total === 0) return null;
                        return (
                            <BucketCard key={key}>
                                <BucketLabel>{BUCKET_LABELS[key]}</BucketLabel>
                                <BucketTotal>{bucket.total} pitches</BucketTotal>
                                <BucketStrike pct={bucket.strike_percentage}>{bucket.strike_percentage}% strikes</BucketStrike>
                                <TypeList>
                                    {bucket.pitch_type_breakdown
                                        .sort((a, b) => b.count - a.count)
                                        .slice(0, 4)
                                        .map((t) => (
                                            <TypeRow key={t.pitch_type}>
                                                <span>{t.pitch_type}</span>
                                                <span>
                                                    {t.count} ({t.strike_percentage}%K)
                                                </span>
                                            </TypeRow>
                                        ))}
                                </TypeList>
                            </BucketCard>
                        );
                    })}
                </Grid>
            )}
        </Panel>
    );
};

export default CountBreakdownPanel;
