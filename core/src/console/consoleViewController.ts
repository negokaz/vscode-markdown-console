import * as vscode from 'vscode';
import * as path from 'path';
import * as micromustache from 'micromustache';
import open from 'open';
import { promises as fs } from 'fs';
import { MarkdownEngine } from '../markdown/markdownEngine';
import { SnippetManager } from '../snippet/snippetManager';
import { SaveSnapshotClicked, ConsoleEvent } from '@ui/model/consoleEvent';
import { Config } from '../config/config';
import { LogStorage } from '../storage/logStorage';
import HtmlUtil from '../util/htmlUtil';
import Token = require('markdown-it/lib/token');
import { Messages } from '@ui/i18n/messages';

export type ConsoleViewMode = 'preview' | 'runnable';

export class ConsoleViewController extends vscode.Disposable {

    private readonly markdownEngine: MarkdownEngine;

    private readonly messages: Messages;

    private readonly onDisposeEmitter: vscode.EventEmitter<void> = new vscode.EventEmitter();

    private readonly onRequestReloadConfigEmitter: vscode.EventEmitter<ConsoleViewMode> = new vscode.EventEmitter();

    private readonly disposable: vscode.Disposable[] = [];

    public constructor(
        private mode: ConsoleViewMode,
        private snippetManager: SnippetManager,
        private readonly webviewPanel: vscode.WebviewPanel, 
        private readonly document: vscode.TextDocument,
        private readonly config: Config,
        private readonly logStorage: LogStorage,
        private readonly context: vscode.ExtensionContext,
    ) {
        super(() => {
            this.disposable.forEach(d => d.dispose());
            this.onDisposeEmitter.fire();
        });
        this.disposable.push(
            this.snippetManager,
            this.webviewPanel.webview.onDidReceiveMessage(e => this.receiveWebviewMessage(e)),
            vscode.workspace.onDidChangeTextDocument(e => this.handleDocumentChange(e)),
        );
        this.markdownEngine = new MarkdownEngine(config, logStorage);
        this.messages = new Messages(vscode.env.language);
    }

    public async render(): Promise<void> {
        this.webviewPanel.webview.html = await this.generateWebviewPreviewContent();
    }

    private async receiveWebviewMessage(event: ConsoleEvent): Promise<void> {
        if (this.context.extensionMode === vscode.ExtensionMode.Development) {
            console.debug(event);
        }
        if (event.switchPreview) {
            this.mode = 'preview';
            await vscode.commands.executeCommand('markdown-console.editWithPreview', this.document.uri);
            this.onRequestReloadConfigEmitter.fire(this.mode);
        } else if (event.switchRunnable) {
            this.mode = 'runnable';
            this.webviewPanel.webview.html = await this.generateWebviewPreviewContent();
        } else if (event.reloadRunnablePage) {
            this.mode = 'runnable';
            this.onRequestReloadConfigEmitter.fire(this.mode);
        } else if (event.copyText) {
            await vscode.env.clipboard.writeText(event.copyText.text.trim());
        } else if (event.startClicked) {
            const snippet = this.snippetManager.get(event.startClicked.snippetId);
            snippet.run().subscribe(e => this.receiveSnippetEvent(e));
            snippet.tryResize(event.startClicked.rows, event.startClicked.cols);
        } else if (event.userInput) {
            if (this.context.extensionMode === vscode.ExtensionMode.Development) {
                console.debug('userInput', event.userInput.data);
            }
            const snippet = this.snippetManager.get(event.userInput.snippetId);
            snippet.write(event.userInput.data);
        } else if (event.stopClicked) {
            const snippet = this.snippetManager.get(event.stopClicked.snippetId);
            snippet.kill();
        } else if (event.dataConsumed) {
            const snippet = this.snippetManager.get(event.dataConsumed.snippetId);
            snippet.notifyDataConsuming(event.dataConsumed.length);
        } else if (event.termResized) {
            const snippet = this.snippetManager.get(event.termResized.snippetId);
            snippet.tryResize(event.termResized.rows, event.termResized.cols);
        } else if (event.termBufferDetermined) {
            const termBufferDetermined = event.termBufferDetermined;
            this.logStorage.update(termBufferDetermined.snippetId, (data) => {
                data.output = termBufferDetermined.bufferData;
                return data;
            });
            this.logStorage.write();
        } else if (event.saveSnapshotClicked) {
            this.writeSnapshotHtml(event.saveSnapshotClicked);
        } else if (event.openLink) {
            this.openLink(event.openLink.href);
        } else {
            console.error(`unhandled event`, event);
        }
    }

    private receiveSnippetEvent(event: ConsoleEvent): void {
        this.webviewPanel.webview.postMessage(event);
        if (event.processStarted) {
            const processStarted = event.processStarted;
            const snippet = this.snippetManager.get(processStarted.snippetId);
            this.logStorage.update(processStarted.snippetId, (data) => {
                data.command = snippet.command;
                data.code = snippet.code;
                data.start = new Date(processStarted.startDateTime);
                return data;
            });
        } else if (event.processCompleted) {
            const processCompleted = event.processCompleted;
            this.logStorage.update(processCompleted.snippetId, (data) => {
                data.end = new Date(processCompleted.endDateTime);
                data.exitCode = processCompleted.exitCode;
                return data;
            });
        }
    }

    private previewReloadTimeout: NodeJS.Timeout | undefined;

    private configReloadTimeout: NodeJS.Timeout | undefined;

    private handleDocumentChange(e: vscode.TextDocumentChangeEvent) {
        const changedDocumentPath = e.document.uri.fsPath;
        if (this.document.uri.fsPath === changedDocumentPath) {
            switch (this.mode) {
                case 'preview':
                    if (this.previewReloadTimeout) {
                        clearTimeout(this.previewReloadTimeout);
                    }
                    this.previewReloadTimeout = setTimeout(async () => {
                        this.webviewPanel.webview.html = await this.generateWebviewPreviewContent();
                    }, 500);
                    return;
                case 'runnable':
                    const event: ConsoleEvent = {
                        documentChanged: {}
                    };
                    this.webviewPanel.webview.postMessage(event);
                    return;
            }
        }
        const configPaths = this.config.configUris.map(u => u.fsPath);
        if (configPaths.includes(changedDocumentPath)) {
            switch (this.mode) {
                case 'preview':
                        if (this.configReloadTimeout) {
                            clearTimeout(this.configReloadTimeout);
                        }
                        this.configReloadTimeout = setTimeout(() => {
                            this.onRequestReloadConfigEmitter.fire(this.mode);
                        }, 500);
                    return;
                case 'runnable':
                    const event: ConsoleEvent = {
                        documentChanged: {}
                    };
                    this.webviewPanel.webview.postMessage(event);
                    return;
            }
        }
    }

    private async generateWebviewPreviewContent(): Promise<string> {
        const tokens = await this.parseMarkdown(this.document.getText());
        const renderingResult = await this.markdownEngine.renderWebview(tokens);
        this.snippetManager = await SnippetManager.initialize(tokens, this.config);
        const debugging = this.context.extensionMode === vscode.ExtensionMode.Development;
        return `<!DOCTYPE html>
        <html class="webview">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="${this.resourceUri('main.css')}" />
                <script src="${this.resourceUri('webview.js')}"></script>
            </head>
            <body class="console-${this.mode}${debugging ? ' debug' : ''}">
                <div id="menu-margin"></div>
                <div id="menu"></div>
                <div id="content">
                    <div id="console-main">
                        ${renderingResult.bodyHtml}
                    </div>
                    <div id="console-sidebar">
                        ${renderingResult.tocHtml}
                    </div>
                </div>
            </body>
        </html>
        `;
    }

    private resourceUri(...paths: string[]): string {
        const uri = vscode.Uri.file(path.join(this.context.extensionPath, 'dist', 'webview', ...paths));
        return uri.with({ scheme: 'vscode-resource' }).toString();
    }

    private async writeSnapshotHtml(event: SaveSnapshotClicked): Promise<void> {
        await fs.mkdir(path.dirname(this.config.snapshotUri.fsPath), { recursive: true });
        const html = await this.generateSnapshotContent(event);
        await fs.writeFile(this.config.snapshotUri.fsPath, html);
        const openSnapshotMessage = this.messages.get('open-snapshot');
        const openSnapshotFolderMessage = this.messages.get('open-snapshot-folder');
        // Don't await to process in background
        vscode.window.showInformationMessage(
            this.messages.get('save-a-snapshot-was-successful'),
            openSnapshotMessage,
            openSnapshotFolderMessage,
        ).then((selection) => {
            switch (selection) {
                case openSnapshotMessage:
                    // NOTE: vscode.env.openExternal() を使うと非ASCII文字を含むパスが正しく開けないため、代わりに open を使う
                    // https://github.com/microsoft/vscode/issues/85930
                    return open(this.config.snapshotUri.fsPath);
                case openSnapshotFolderMessage:
                    const dir = vscode.Uri.file(path.dirname(this.config.snapshotUri.fsPath));
                    // NOTE: vscode.env.openExternal() を使うと非ASCII文字を含むパスが正しく開けないため、代わりに open を使う
                    // https://github.com/microsoft/vscode/issues/85930
                    return open(dir.fsPath);
            }
        });
    }

    private async generateSnapshotContent(event: SaveSnapshotClicked): Promise<string> {
        const tokens = await this.parseMarkdown(this.document.getText());
        const cssUri = vscode.Uri.file(path.join(this.context.extensionPath, 'dist', 'webview', 'main.css'));
        const css = fs.readFile(cssUri.fsPath);
        const scriptUri = vscode.Uri.file(path.join(this.context.extensionPath, 'dist', 'snapshot', 'snapshot.js'));
        const script = fs.readFile(scriptUri.fsPath);
        const renderingResult = await this.markdownEngine.renderSnapshot(tokens, event.snippetData);
        return `
        <!DOCTYPE html>
        <html style="${HtmlUtil.escapeHtml(event.style)}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script>
                    ${await script}
                </script>
                <style>
                    ${await css}
                </style>
            </head>
            <body class="${HtmlUtil.escapeHtml(event.bodyClassList.join(' '))}">
                <div id="content">
                    <div id="console-main">
                        ${renderingResult.bodyHtml}
                    </div>
                    <div id="console-sidebar">
                        ${renderingResult.tocHtml}
                    </div>
                </div>
                <div id="snapshot-file-annotation">
                    <small>${this.messages.get('this-file-was-generated-by-markdown-console')}</small>
                </div>
            </body>
        </html>
        `;
    }
    private async openLink(href: string): Promise<void> {
        const uri = 
            path.isAbsolute(href)
                ? vscode.Uri.file(href)
                : vscode.Uri.file(path.join(this.config.workingDirectory.fsPath, href));
        await vscode.commands.executeCommand('vscode.open', uri);
    }

    public get onRequestReloadConfig(): vscode.Event<ConsoleViewMode> {
        return this.onRequestReloadConfigEmitter.event;
    }

    public get onDidDispose(): vscode.Event<void> {
        return this.onDisposeEmitter.event;
    }

    private async parseMarkdown(markdown: string): Promise<Token[]> {
        try {
            const rendered = micromustache.render(markdown, this.config.variable);
            return this.markdownEngine.parse(rendered);
        } catch (e: unknown) {
            console.warn('Render Error:', e);
            return this.markdownEngine.parse(markdown);
        }
    }
}
