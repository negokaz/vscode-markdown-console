import * as vscode from "vscode";
import * as path from 'path';
import { Config } from '../config/config';
import { LogStorage } from '../storage/logStorage';
import { SnippetManager } from '../snippet/snippetManager';
import { ConsoleViewController, ConsoleViewMode } from "./consoleViewController";

export class ConsoleView extends vscode.Disposable {

    private readonly webviewPanel: vscode.WebviewPanel;

    private readonly onDisposeEmitter: vscode.EventEmitter<void> = new vscode.EventEmitter();

    public constructor(
        initMode: ConsoleViewMode,
        private document: vscode.TextDocument,
        private context: vscode.ExtensionContext,
    ) {
        super(() => {
            if (this.webviewPanel) {
                this.webviewPanel.dispose();
            }
            if (this.controller) {
                this.controller.dispose();
                this.controller = undefined;
            }
            this.onDisposeEmitter.fire();
        });
        const workspace = vscode.workspace.getWorkspaceFolder(this.document.uri);
        const localResourceRoots =
            [
                vscode.Uri.file(path.join(this.context.extensionPath, 'dist', 'webview')),
            ].concat(workspace ? [workspace.uri] : []);
        const viewColumn = this.resolveViewColumn(initMode);
        this.webviewPanel = vscode.window.createWebviewPanel(
            'Console',
            `Console: ${path.basename(this.document.uri.fsPath, '.con.md')}`,
            viewColumn,
            {
                enableScripts: true,
                localResourceRoots: localResourceRoots,
                retainContextWhenHidden: true,
            },
        );
        this.webviewPanel.onDidDispose(() => {
            this.controller?.dispose();
            this.controller = undefined;
            this.onDisposeEmitter.fire();
        });
        vscode.workspace.onDidDeleteFiles(e => {
            if (e.files.find(f => f.fsPath === this.document.uri.fsPath)) {
                this.dispose();
            }
        });
    }

    private mode: ConsoleViewMode | undefined;

    private controller: ConsoleViewController | undefined;

    public async render(mode: ConsoleViewMode): Promise<void> {
        if (this.mode) {
            if (this.controller) {
                this.controller.dispose();
                this.controller = undefined;
                this.mode = mode;
                await this.renderInternal(mode);
            } else {
                // render is called before the previous render is finished
                // do nothing
            }
        } else {
            this.mode = mode;
            await this.renderInternal(mode);
        }
    }

    private async renderInternal(mode: ConsoleViewMode): Promise<void> {
        // Reload the document to get the latest text if it is disposed
        const document = await vscode.workspace.openTextDocument(this.document.uri);
        const config = await Config.load(document.uri);
        const snippetManager = SnippetManager.initialize([], config);
        const logStorage = LogStorage.load(config);
        this.controller = new ConsoleViewController(mode, await snippetManager, this.webviewPanel, document, config, await logStorage, this.context);
        this.controller.render();
        this.controller.onRequestReloadConfig(async mode => {
            await this.render(mode);
        });
    }
    
    public get onDidDispose(): vscode.Event<void> {
        return this.onDisposeEmitter.event;
    }

    public show() {
        if (this.mode) {
            const viewColumn = this.resolveViewColumn(this.mode);
            this.webviewPanel.reveal(viewColumn, true);
        }
    }

    private resolveViewColumn(mode: ConsoleViewMode): vscode.ViewColumn {
        switch (mode) {
            case 'preview':
                return vscode.ViewColumn.Beside;
            case 'runnable':
                return vscode.ViewColumn.Active;
        }
    }
}
