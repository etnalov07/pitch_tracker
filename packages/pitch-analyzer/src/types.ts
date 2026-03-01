export interface GlovePop {
    sampleIndex: number;
    timeS: number;
    amplitude: number;
    riseRatio: number;
}

export interface UmpireCall {
    call: 'Strike' | 'Ball';
    confidence: 'high' | 'medium' | 'low' | 'none';
    score: number;
    peakRatio: number;
    p75Ratio: number;
    meanRatio: number;
    sustainedMs: number;
    availableS: number;
    baseline: number;
    postMax: number;
}

export interface AudioFeatures {
    peakAmp: number;
    decayRatio: number;
    zcr: number;
}

export interface PitchAnalysis {
    pitch_number: number;
    video: string;
    estimated_velocity_mph: number;
    velocity_low_mph: number;
    velocity_high_mph: number;
    ball_strike: string;
    confidence: string;
    umpire_score: number;
    peak_ratio: number;
    p75_ratio: number;
    mean_ratio: number;
    sustained_ms: number;
    audio_after_pop_s: number;
    baseline_rms: number;
    post_max_rms: number;
    glove_pop_time_s: number;
    glove_pop_amplitude: number;
    duration_s: number;
}

export interface EnrichedPitch extends PitchAnalysis {
    pitch_type: string;
    fb_score: number;
    decay_ratio: number;
    pop_zcr: number;
    actual_call?: string;
    actual_type?: string;
    actual_detail?: string;
    batter?: string;
    ab_number?: number;
    ab_result?: string;
    count?: string;
}

export interface GroundTruthPitch extends EnrichedPitch {
    actual_pitch_type: string;
    detected_pitch_type: string;
    pitch_type_correct: boolean;
    actual_result: string;
    actual_ball_strike: string;
    bs_correct: boolean;
}

export interface VideoFeatures {
    [key: string]: number;
}

export interface VideoPitchResult extends GroundTruthPitch {
    video_pitch_type: string;
    video_correct: boolean;
    video_features: VideoFeatures;
}

export interface KhsResult {
    video: string;
    error?: string;
    duration_s?: number;
    glove_pop_time_s?: number;
    glove_pop_amplitude?: number;
    audio_amplitude?: number;
    decay_ratio?: number;
    pop_zcr?: number;
    fb_score?: number;
    ball_strike_detected?: string;
    bs_confidence?: string;
    bs_score?: number;
    detected_pitch_type?: string;
    classification_votes?: Record<string, number>;
    actual_pitch_type?: string | null;
    actual_result?: string | null;
    pitch_type_correct?: boolean | null;
    video_features?: VideoFeatures;
}

export interface GroundTruthEntry {
    pitch_type: string;
    result: string;
}
