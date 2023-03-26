import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const mimeTypeByExt = {
    '.png': 'image/png',
    '.apng': 'image/apng',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.bm': 'image/bmp',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
};

type Ext = keyof typeof mimeTypeByExt;

export default function imageToDataUri(uri: vscode.Uri): string {
    const fallback = uri.toString(true);
    if (uri.scheme === 'file') {
        const ext = path.extname(uri.fsPath) as Ext;
        const mimeType = mimeTypeByExt[ext];
        const image = fs.readFileSync(uri.fsPath);
        return mimeType ? `data:${mimeType};base64,${image.toString('base64')}` : fallback;
    } else {
        return fallback;
    }
}
