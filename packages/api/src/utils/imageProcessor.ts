import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { LOGO_UPLOAD_DIR } from '../middleware/upload';

interface LogoSize {
    name: string;
    width: number;
    height: number;
}

const LOGO_SIZES: LogoSize[] = [
    { name: 'thumbnail', width: 48, height: 48 },
    { name: 'small', width: 96, height: 96 },
    { name: 'medium', width: 192, height: 192 },
];

export async function processLogoUpload(filePath: string, teamId: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    // For SVG files, just rename and return
    if (ext === '.svg') {
        const newPath = path.join(LOGO_UPLOAD_DIR, `${teamId}.svg`);
        fs.renameSync(filePath, newPath);
        return `/uploads/logos/${teamId}.svg`;
    }

    // Process raster images into multiple sizes
    for (const size of LOGO_SIZES) {
        const outputPath = path.join(LOGO_UPLOAD_DIR, `${teamId}_${size.name}.png`);
        await sharp(filePath)
            .resize(size.width, size.height, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 },
            })
            .png()
            .toFile(outputPath);
    }

    // Delete original upload after processing
    fs.unlinkSync(filePath);

    // Return base path (without size suffix)
    return `/uploads/logos/${teamId}`;
}

export function deleteLogoFiles(teamId: string): void {
    // Try to delete all possible logo files
    const possibleFiles = [`${teamId}.svg`, `${teamId}_thumbnail.png`, `${teamId}_small.png`, `${teamId}_medium.png`];

    for (const filename of possibleFiles) {
        const filePath = path.join(LOGO_UPLOAD_DIR, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}
