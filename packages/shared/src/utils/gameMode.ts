import { CountBucket, GameMode, InningHalf } from '../index';

export function getCountBucket(balls: number, strikes: number): CountBucket {
    if (balls === 0 && strikes === 0) return '1st_pitch';
    if (strikes > balls) return 'ahead';
    if (balls > strikes) return 'behind';
    return 'even';
}

export function deriveGameMode(isHomeGame: boolean, inningHalf: InningHalf): GameMode {
    const fielding = (isHomeGame && inningHalf === 'top') || (!isHomeGame && inningHalf === 'bottom');
    return fielding ? 'our_pitcher' : 'opp_pitcher';
}
