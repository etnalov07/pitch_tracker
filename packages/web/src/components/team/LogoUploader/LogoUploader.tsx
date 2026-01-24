import styled from '@emotion/styled';
import React, { useRef, useState } from 'react';
import { theme } from '../../../styles/theme';
import { Team } from '../../../types';
import TeamLogo from '../TeamLogo';

interface LogoUploaderProps {
    team: Team;
    onUpload: (file: File) => Promise<void>;
    onDelete: () => Promise<void>;
    isUploading?: boolean;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const PreviewSection = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const PreviewLabel = styled.span`
    font-size: 13px;
    color: ${theme.colors.gray[500]};
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 8px;
`;

const Button = styled.button<{ variant?: 'primary' | 'danger' }>`
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;

    ${(props) =>
        props.variant === 'danger'
            ? `
        background: transparent;
        border: 1px solid ${theme.colors.red[400]};
        color: ${theme.colors.red[400]};
        &:hover {
            background: ${theme.colors.red[50]};
        }
    `
            : `
        background: ${theme.colors.primary[600]};
        border: 1px solid ${theme.colors.primary[600]};
        color: white;
        &:hover {
            background: ${theme.colors.primary[700]};
        }
    `}

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const HiddenInput = styled.input`
    display: none;
`;

const DropZone = styled.div<{ isDragging: boolean }>`
    border: 2px dashed ${(props) => (props.isDragging ? theme.colors.primary[500] : theme.colors.gray[300])};
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    background: ${(props) => (props.isDragging ? theme.colors.primary[50] : theme.colors.gray[50])};
    transition: all 0.2s;
    cursor: pointer;

    &:hover {
        border-color: ${theme.colors.primary[400]};
        background: ${theme.colors.primary[50]};
    }
`;

const DropZoneText = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${theme.colors.gray[600]};
`;

const DropZoneHint = styled.span`
    font-size: 11px;
    color: ${theme.colors.gray[400]};
    display: block;
    margin-top: 4px;
`;

const ErrorText = styled.p`
    margin: 0;
    font-size: 12px;
    color: ${theme.colors.red[500]};
`;

const LogoUploader: React.FC<LogoUploaderProps> = ({ team, onUpload, onDelete, isUploading = false }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validateFile = (file: File): string | null => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            return 'Only PNG, JPG, and SVG files are allowed';
        }
        if (file.size > 5 * 1024 * 1024) {
            return 'File size must be less than 5MB';
        }
        return null;
    };

    const handleFileSelect = async (file: File) => {
        setError(null);
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            await onUpload(file);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to remove the team logo?')) {
            return;
        }
        try {
            await onDelete();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
        }
    };

    return (
        <Container>
            <PreviewSection>
                <TeamLogo team={team} size="lg" />
                <div>
                    <PreviewLabel>{team.logo_path ? 'Current logo' : 'No logo uploaded'}</PreviewLabel>
                    {team.logo_path && (
                        <ButtonGroup>
                            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                {isUploading ? 'Uploading...' : 'Change'}
                            </Button>
                            <Button variant="danger" onClick={handleDelete} disabled={isUploading}>
                                Remove
                            </Button>
                        </ButtonGroup>
                    )}
                </div>
            </PreviewSection>

            {!team.logo_path && (
                <DropZone
                    isDragging={isDragging}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <DropZoneText>{isUploading ? 'Uploading...' : 'Drop a logo here or click to upload'}</DropZoneText>
                    <DropZoneHint>PNG, JPG, or SVG. Max 5MB.</DropZoneHint>
                </DropZone>
            )}

            {error && <ErrorText>{error}</ErrorText>}

            <HiddenInput ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleInputChange} />
        </Container>
    );
};

export default LogoUploader;
