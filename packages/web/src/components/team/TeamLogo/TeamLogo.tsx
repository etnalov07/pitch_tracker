import React from 'react';
import styled from '@emotion/styled';
import { Team } from '../../../types';
import { theme } from '../../../styles/theme';

export type LogoSize = 'sm' | 'md' | 'lg';

interface TeamLogoProps {
    team: Team;
    size?: LogoSize;
    className?: string;
}

const sizeMap: Record<LogoSize, { container: number; font: number }> = {
    sm: { container: 32, font: 14 },
    md: { container: 48, font: 20 },
    lg: { container: 80, font: 32 },
};

const Container = styled.div<{ size: LogoSize; bgColor: string }>`
    width: ${(props) => sizeMap[props.size].container}px;
    height: ${(props) => sizeMap[props.size].container}px;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${(props) => props.bgColor};
    flex-shrink: 0;
`;

const LogoImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: contain;
`;

const Initials = styled.span<{ size: LogoSize }>`
    font-size: ${(props) => sizeMap[props.size].font}px;
    font-weight: 600;
    color: white;
    text-transform: uppercase;
`;

const getLogoUrl = (logoPath: string, size: LogoSize): string => {
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/bt-api', '') || 'http://localhost:5000';

    // SVG files don't have size variants
    if (logoPath.endsWith('.svg')) {
        return `${baseUrl}${logoPath}`;
    }

    // For PNG images, use the appropriate size variant
    const sizeVariant = size === 'sm' ? 'thumbnail' : size === 'md' ? 'small' : 'medium';
    return `${baseUrl}${logoPath}_${sizeVariant}.png`;
};

const getTeamInitials = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].substring(0, 2);
    }
    return words
        .slice(0, 2)
        .map((w) => w[0])
        .join('');
};

const TeamLogo: React.FC<TeamLogoProps> = ({ team, size = 'md', className }) => {
    const bgColor = team.primary_color || theme.colors.primary[600];

    if (team.logo_path) {
        return (
            <Container size={size} bgColor={bgColor} className={className}>
                <LogoImage src={getLogoUrl(team.logo_path, size)} alt={`${team.name} logo`} />
            </Container>
        );
    }

    return (
        <Container size={size} bgColor={bgColor} className={className}>
            <Initials size={size}>{getTeamInitials(team.name)}</Initials>
        </Container>
    );
};

export default TeamLogo;
