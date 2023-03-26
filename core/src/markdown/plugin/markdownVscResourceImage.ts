import MarkdownIt = require("markdown-it");
import * as vscode from 'vscode';
import * as path from 'path';
import { Config } from '../../config/config';
import Token = require("markdown-it/lib/token");
import Renderer = require("markdown-it/lib/renderer");
import { MarkdownEngineEnv } from "../markdownEngineEnv";
import imageToDataUri from '../../util/imageToDataUri';

export default function markdownVscResourceImage(config: Config) {
    return (md: MarkdownIt) => {
        const imageRule = md.renderer.rules.image;
        if (imageRule) {
            const resolveLocalFileUri = (src: string): vscode.Uri | undefined => {
                const uri = vscode.Uri.parse(src);
                // if the link points local file path
                if (!src.startsWith('file:') && uri.scheme === 'file') {
                    if (path.isAbsolute(src)) {
                        // absolute path
                        return vscode.Uri.file(src);
                    } else {
                        // relative path
                        return vscode.Uri.file(path.join(config.workingDirectory.fsPath, src));
                    }
                } else {
                    return undefined;
                }
            };
            const resolveLink = (src: string) => {
                const localFileUri = resolveLocalFileUri(src);
                if (localFileUri) {
                    return localFileUri.with({ scheme: 'vscode-resource' }).toString(true);
                } else {
                    return src;
                }
            };
            md.renderer.rules.image = (tokens: Token[], idx: number, options: MarkdownIt.Options, env: MarkdownEngineEnv, self: Renderer) => {
                const token = tokens[idx];
                const src = token.attrGet('src');
                if (src) {
                    switch (env.renderMode) {
                        case 'webview':
                            token.attrSet('src', resolveLink(src));
                            return imageRule(tokens, idx, options, env, self);
                        case 'snapshot':
                            const localFileUri = resolveLocalFileUri(src);
                            if (localFileUri) {
                                token.attrSet('src', imageToDataUri(localFileUri));
                            }
                            return imageRule(tokens, idx, options, env, self);
                    }
                } else {
                    return imageRule(tokens, idx, options, env, self);
                }
            };
        }
    };
}
