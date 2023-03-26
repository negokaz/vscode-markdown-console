import Token = require("markdown-it/lib/token");
import type { SnippetAttribute } from '@ui/model/snippetModel';
import { MarkdownEngine } from "../markdown/markdownEngine";
import { Snippet } from "./snippet";
import { PtySnippet } from "./ptySnippet";
import { ProcSnippet } from "./procSnippet";
import { UnavailableSnippet } from "./unavailableSnippet";
import { Config } from "../config/config";
import { Disposable } from "vscode";

export class SnippetManager extends Disposable {

    public static async initialize(tokens: Token[], config: Config): Promise<SnippetManager> {
        const snippets =
            tokens
                .filter(token => token.type === 'fence')
                .reduce((acc, token) => {
                    const attr = MarkdownEngine.tryExtractSnippetAttribute(token);
                    if (attr && attr.success) {
                        const snippet = attr.success;
                        if (typeof snippet.cmdAbsolutePath === 'string') {
                            if (snippet.tty) {
                                return acc.set(snippet.id, new PtySnippet(snippet.id, snippet.cmd, snippet.cmdAbsolutePath, snippet.args, snippet.encoding, snippet.stdin, snippet.code, config));
                            } else {
                                return acc.set(snippet.id, new ProcSnippet(snippet.id, snippet.cmd, snippet.cmdAbsolutePath, snippet.args, snippet.encoding, snippet.stdin, snippet.code, config));
                            }
                        } else {
                            return acc.set(snippet.id, new UnavailableSnippet());
                        }
                    } else {
                        return acc;
                    }
                }, new Map<string, Snippet>());
        return new SnippetManager(snippets);
    }

    private constructor(
        private readonly snippets: Map<string, Snippet>
    ) {
        super(() => {
            // kill all snippets
            Array.from(this.snippets.values()).forEach(snippet => {
                snippet.kill();
            });
        });
    }

    public get(snippetId: string): Snippet {
        const snippet = this.snippets.get(snippetId);
        if (snippet) {
            return snippet;
        } else {
            throw new Error(`illegal snippet ID: ${snippetId}`);
        }
    }
}
