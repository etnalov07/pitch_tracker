import React from 'react';
import { theme } from '../../../styles/theme';
import { SituationalCallType } from '../../../types';

interface SituationalCallsRowProps {
    gameId: string;
    teamId: string;
    pitcherId?: string;
    batterId?: string;
    opponentBatterId?: string;
    inning?: number;
    shakeCount?: number;
    disabled?: boolean;
    onCallSent?: (type: SituationalCallType) => void;
}

interface SitCall {
    type: SituationalCallType;
    abbrev: string;
    label: string;
    color: string;
}

const SITUATIONAL_CALLS: SitCall[] = [
    { type: 'pickoff', abbrev: 'PO', label: 'Pickoff', color: '#7c3aed' },
    { type: 'bunt_coverage', abbrev: 'BNT', label: 'Bunt Coverage', color: '#0891b2' },
    { type: '1st_3rd_coverage', abbrev: '1&3', label: '1st & 3rd', color: '#059669' },
    { type: 'shake', abbrev: 'SHK', label: 'Shake', color: '#d97706' },
];

const SituationalCallsRow: React.FC<SituationalCallsRowProps> = ({ shakeCount = 0, disabled, onCallSent }) => {
    const handlePress = (call: SitCall) => {
        if (disabled) return;
        if (onCallSent) onCallSent(call.type);
    };

    return (
        <div
            style={{
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                padding: '6px 0',
                borderTop: `1px solid ${theme.colors.gray[200]}`,
                marginTop: 4,
            }}
        >
            <span style={{ fontSize: '10px', color: theme.colors.gray[400], fontWeight: 600, minWidth: 52 }}>SITUATIONAL</span>
            {SITUATIONAL_CALLS.map((call) => (
                <button
                    key={call.type}
                    onClick={() => handlePress(call)}
                    disabled={disabled}
                    title={call.label}
                    style={{
                        padding: '4px 8px',
                        borderRadius: theme.borderRadius.sm,
                        border: `1px solid ${call.color}`,
                        background: 'white',
                        color: call.color,
                        fontSize: '11px',
                        fontWeight: theme.fontWeight.bold,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        transition: 'background 0.15s',
                        whiteSpace: 'nowrap' as const,
                    }}
                    onMouseEnter={(e) => {
                        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = call.color + '18';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'white';
                    }}
                >
                    {call.abbrev}
                    {call.type === 'shake' && shakeCount > 0 && (
                        <span
                            style={{
                                background: call.color,
                                color: 'white',
                                borderRadius: '50%',
                                width: 14,
                                height: 14,
                                fontSize: '9px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {shakeCount}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
};

export default SituationalCallsRow;
