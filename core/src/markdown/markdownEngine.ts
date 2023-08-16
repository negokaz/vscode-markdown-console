import MarkdownIt = require("markdown-it");
import Token = require("markdown-it/lib/token");
import markdownItAnchor from "markdown-it-anchor";
import markdownItTocDoneRight from "markdown-it-toc-done-right";
import { MarkdownEngineEnvBuilder, MarkdownEngineEnv } from "./markdownEngineEnv";
import { markdownItSnippet } from "./plugin/markdownItSnippet";
import * as crypto from 'crypto';
import * as rjson from 'really-relaxed-json';
import * as iconv from 'iconv-lite';
import type { CmdError, SnippetAttribute } from '@ui/model/snippetModel';
import { UiState } from "@ui/state/uiState";
import which from 'which';
import { Config } from "../config/config";
import { LogStorage } from "../storage/logStorage";
import markdownVscResourceImage from "./plugin/markdownVscResourceImage";
import { SnippetData } from "@ui/model/consoleEvent";

type SettingsSchema = {
    "@cmd": string | string[] | undefined,
    encoding: string | undefined,
    stdin: boolean | undefined,
    tty: boolean | undefined,
};

type RenderingResult = {
    bodyHtml: string,
    tocHtml: string,
};

export class MarkdownEngine {

    private static readonly snippetAttrName: string = 'snippet';

    public static tryExtractSnippetAttribute(token: Token): SnippetAttribute | null {
        if (token.type === 'fence') {
            const maybeAttr = token.attrGet(this.snippetAttrName);
            if (maybeAttr) {
                return JSON.parse(maybeAttr) as SnippetAttribute;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    private readonly md: MarkdownIt;

    private readonly webviewEnvBuilder: MarkdownEngineEnvBuilder;

    private readonly snapshotEnvBuilder: MarkdownEngineEnvBuilder;

    private readonly snippetDeclarationPattern = /@cmd *:.+$/;

    constructor(
        private readonly config: Config,
        logStorage: LogStorage,
    ) {
        this.md = new MarkdownIt({
            html: true,
            breaks: true,
            linkify: true,
        });
        this.md.use(markdownItSnippet());
        this.md.use(markdownVscResourceImage(this.config));
        this.md.use(markdownItAnchor);
        this.md.use(markdownItTocDoneRight, { placeholder: '' });
        this.webviewEnvBuilder = new MarkdownEngineEnvBuilder(new UiState(), logStorage, 'webview');
        this.snapshotEnvBuilder = new MarkdownEngineEnvBuilder(new UiState(), logStorage, 'snapshot');
    }

    public async parse(markdown: string): Promise<Token[]> {
        const tokens = this.md.parse(markdown, this.webviewEnvBuilder);
        return this.decorateTokens(tokens);
    }

    public async renderWebview(tokens: Token[]): Promise<RenderingResult> {
        const env = this.webviewEnvBuilder.build();
        return {
            bodyHtml: this.md.renderer.render(tokens, this.md.options, env),
            tocHtml: this.generateToc(env),
        };
    }

    public async renderSnapshot(tokens: Token[], snippets: SnippetData[]): Promise<RenderingResult> {
        const env = this.snapshotEnvBuilder.build(snippets);
        return {
            bodyHtml: this.md.renderer.render(tokens, this.md.options, env),
            tocHtml: this.generateToc(env),
        };
    }

    private generateToc(env: MarkdownEngineEnv): string {
        if (this.md.renderer.rules.tocOpen && this.md.renderer.rules.tocBody && this.md.renderer.rules.tocClose) {
            const toc = 
                this.md.renderer.rules.tocOpen([], -1, this.md.options, env, this.md.renderer) + 
                this.md.renderer.rules.tocBody([], -1, this.md.options, env, this.md.renderer) + 
                this.md.renderer.rules.tocClose([], -1, this.md.options, env, this.md.renderer);
            return toc;
        } else {
            throw new Error('markdown-it-toc-done-right unavailable: generating TOC requires markdown-it-toc-done-right');
        }
    }

    private async decorateTokens(tokens: Token[]): Promise<Token[]> {
        return tokens
            .reduce<Promise<[Token[], Set<string>]>>(async (acc, token) => {
                const [accTokens, knownIds] = await acc;
                if (token.type === 'fence') {
                    const settingsTextLine = token.content.split('\n', 1).concat([''])[0];
                    const settingsText = this.snippetDeclarationPattern.exec(settingsTextLine);
                    const settings: SettingsSchema | Error = 
                        settingsText ? this.tryParseSnippetText(settingsText[0]) : {} as SettingsSchema;
                    if (settings instanceof Error) {
                        const attr: SnippetAttribute = {
                            error: {
                                message: settings.message,
                                code: token.content,
                                language: token.info,
                            }
                        };
                        token.attrSet(MarkdownEngine.snippetAttrName, JSON.stringify(attr));
                        return [accTokens.concat([token]), knownIds];
                    } else if (settings["@cmd"]) {
                        const commandLine = Array.isArray(settings["@cmd"]) ? settings["@cmd"] : [settings["@cmd"]];
                        const cmd = commandLine.length > 0 ? commandLine[0] : '';
                        const cmdAbsolutePath = await which(cmd, { path: this.config.env['PATH'] }).catch(e => {
                            if (e instanceof Error) {
                                const error: CmdError = {
                                    message: e.message,
                                };
                                return error;
                            } else {
                                throw new Error('unexpected error');
                            }
                        });
                        const args = commandLine.slice(1);
                        const code = token.content.substring(token.content.indexOf('\n') + 1);
                        const snippetId = this.generateSnippetId(cmd, args, code, knownIds);
                        const attr: SnippetAttribute = {
                            success: {
                                id: this.generateSnippetId(cmd, args, code, knownIds),
                                avaiable: typeof cmdAbsolutePath === 'string',
                                cmd: cmd,
                                cmdAbsolutePath: cmdAbsolutePath,
                                args: args,
                                encoding: settings.encoding && iconv.encodingExists(settings.encoding) ? settings.encoding : 'utf-8',
                                stdin: settings.stdin ? settings.stdin : false,
                                tty: settings.tty ? settings.tty : false,
                                code: code,
                                language: token.info,
                            }
                        };
                        token.attrSet(MarkdownEngine.snippetAttrName, JSON.stringify(attr));
                        return [accTokens.concat([token]), knownIds.add(snippetId)];
                    } else {
                        return [accTokens.concat([token]), knownIds];
                    }
                } else {
                    return [accTokens.concat([token]), knownIds];
                }
            }, Promise.resolve([[], new Set<string>()])).then(r => r[0]);
    }

    private generateSnippetId(cmd: string, args: string[], code: string, knownIds: Set<string>): string {
        let snippetId = '';
        for (let i = 0; snippetId === '' || knownIds.has(snippetId); i++) {
            const md5 = crypto.createHash('md5');
            md5.update(cmd);
            md5.update(args.join(' '));
            md5.update(code);
            md5.update(i.toString());
            snippetId = md5.digest('hex');
        }
        return snippetId;
    }

    private tryParseSnippetText(text: string): SettingsSchema | Error {
        try {
            return JSON.parse(rjson.toJson(`{ ${text} }`, true)) as SettingsSchema;
        } catch (e: unknown) {
            return e as Error;
        }
    }
}
