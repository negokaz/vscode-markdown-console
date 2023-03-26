import * as preact from "preact-render-to-string";
import { Snippet } from "@ui/components/snippet";
import { CodeBlock } from "@ui/components/codeBlock";
import { CodeBlockModel } from "@ui/model/codeBlockModel";
import MarkdownIt = require("markdown-it");
import Renderer = require("markdown-it/lib/renderer");
import Token = require("markdown-it/lib/token");
import { MarkdownEngine } from "../markdownEngine";
import { MarkdownEngineEnv } from "../markdownEngineEnv";
import { SnippetState } from "@ui/state/snippetState";
import { SnippetAttribute, SnippetModel } from "@ui/model/snippetModel";

export function markdownItSnippet() {
    return (md: MarkdownIt) => {
        md.renderer.rules.fence = (tokens: Token[], index: number, options: any, env: MarkdownEngineEnv, self: Renderer) => {
            const token = tokens[index];
            const attr = MarkdownEngine.tryExtractSnippetAttribute(token);
            if (attr && attr.success) {
                const maybeLog = attr.success ? env.logStorage.data.get(attr.success.id) : undefined;
                const model: SnippetModel = {
                    attr: attr,
                    data: maybeLog ? {
                        output: maybeLog.output,
                        outputHtml: maybeLog.outputHtml,
                        startDateTime: maybeLog.start.toISOString(),
                        endDateTime: maybeLog.end.toISOString(),
                        exitCode: maybeLog.exitCode,
                    } : undefined,
                };
                const state = new SnippetState({ data: model.data });
                switch (env.renderMode) {
                    case 'webview':
                        // We should SSR to keep scroll position
                        return preact.render(
                            <div class="snippet-root" data-model={JSON.stringify(model)}>
                                <Snippet state={state} attr={attr.success}>{attr.success.code}</Snippet>
                            </div>
                        );
                    case 'snapshot':
                        return preact.render(
                            <div class="snippet-root">
                                <Snippet state={state} attr={attr.success}>{attr.success.code}</Snippet>
                            </div>
                        );
                }
            } else if (attr && attr.error) {
                return preact.render(createCodeBlock({language: attr.error.language, code: `${attr.error.message}\n\n${attr.error.code}`}, env));
            } else {
                return preact.render(createCodeBlock({language: token.info, code: token.content}, env));
            }
        };
    };
}

function createCodeBlock(model: CodeBlockModel, env: MarkdownEngineEnv) {
    switch (env.renderMode) {
        case 'webview':
            // We should SSR to keep scroll position
            return (
                <div class="codeblock-root" data-model={JSON.stringify(model)}>
                    <CodeBlock language={model.language} code={model.code} />
                </div>
            );
        case 'snapshot':
            return (
                <div class="codeblock-root">
                    <CodeBlock language={model.language} code={model.code} />
                </div>
            );
    }
}
