import React from 'react';
import { theme } from '../../../styles/theme';

interface ZoneCell {
    zone: string;
    label?: string;
    value: number; // 0-1 intensity for coloring
    displayValue: string;
    count?: number;
}

interface TendencyZoneGridProps {
    cells: ZoneCell[];
    title?: string;
    lowColor?: string;
    highColor?: string;
}

const ZONE_LABELS: Record<string, string> = {
    '0-0': 'UI',
    '0-1': 'UM',
    '0-2': 'UA',
    '1-0': 'MI',
    '1-1': 'MM',
    '1-2': 'MA',
    '2-0': 'DI',
    '2-1': 'DM',
    '2-2': 'DA',
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

function interpolateColor(lowHex: string, highHex: string, t: number): string {
    const lo = hexToRgb(lowHex);
    const hi = hexToRgb(highHex);
    if (!lo || !hi) return lowHex;
    const r = Math.round(lo.r + (hi.r - lo.r) * t);
    const g = Math.round(lo.g + (hi.g - lo.g) * t);
    const b = Math.round(lo.b + (hi.b - lo.b) * t);
    return `rgb(${r},${g},${b})`;
}

const STRIKE_ZONES = ['0-0', '0-1', '0-2', '1-0', '1-1', '1-2', '2-0', '2-1', '2-2'];

const TendencyZoneGrid: React.FC<TendencyZoneGridProps> = ({
    cells,
    title,
    lowColor = theme.colors.primary[100],
    highColor = theme.colors.primary[700],
}) => {
    const cellMap: Record<string, ZoneCell> = {};
    for (const c of cells) cellMap[c.zone] = c;

    return (
        <div>
            {title && (
                <div
                    style={{
                        fontSize: theme.fontSize.xs,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.colors.gray[500],
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.05em',
                        marginBottom: 6,
                    }}
                >
                    {title}
                </div>
            )}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 3,
                    width: '100%',
                    maxWidth: 180,
                    border: `2px solid ${theme.colors.gray[400]}`,
                    borderRadius: theme.borderRadius.sm,
                    padding: 4,
                    backgroundColor: theme.colors.gray[50],
                }}
            >
                {STRIKE_ZONES.map((zone) => {
                    const cell = cellMap[zone];
                    const intensity = cell ? Math.min(1, Math.max(0, cell.value)) : 0;
                    const bg =
                        cell && (cell.count ?? 0) > 0 ? interpolateColor(lowColor, highColor, intensity) : theme.colors.gray[100];
                    const textColor = intensity > 0.6 ? 'white' : theme.colors.gray[700];
                    return (
                        <div
                            key={zone}
                            style={{
                                backgroundColor: bg,
                                borderRadius: 3,
                                padding: '4px 2px',
                                textAlign: 'center' as const,
                                minHeight: 38,
                                display: 'flex',
                                flexDirection: 'column' as const,
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 1,
                            }}
                            title={cell?.label || ZONE_LABELS[zone]}
                        >
                            <span
                                style={{
                                    fontSize: '9px',
                                    color: intensity > 0.6 ? 'rgba(255,255,255,0.7)' : theme.colors.gray[400],
                                    fontWeight: 600,
                                }}
                            >
                                {ZONE_LABELS[zone]}
                            </span>
                            <span style={{ fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.bold, color: textColor }}>
                                {cell?.displayValue || '—'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TendencyZoneGrid;
