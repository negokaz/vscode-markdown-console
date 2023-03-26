import * as vscode from "vscode";
import * as path from 'path';
import { Config } from '../config/config';
import { LogStorage } from '../storage/logStorage';
import { SnippetManager } from '../snippet/snippetManager';
import { ConsoleViewController, ConsoleViewMode } from "./consoleViewController";

export class ConsoleView extends vscode.Disposable {

    public constructor(
        private document: vscode.TextDocument,
        private context: vscode.ExtensionContext,
    ) {
        super(() => {
            if (this.webviewPanel) {
                this.webviewPanel.dispose();
                this.webviewPanel = undefined;
            }
            if (this.controller) {
                this.controller.dispose();
                this.controller = undefined;
            }
            this.onDisposeEmitter.fire();
        });
    }

    private webviewPanel: vscode.WebviewPanel | undefined;

    private controller: ConsoleViewController | undefined;

    private readonly onDisposeEmitter: vscode.EventEmitter<void> = new vscode.EventEmitter();

    public async open(mode: ConsoleViewMode): Promise<void> {
        if (!this.webviewPanel) {
            const workspace = vscode.workspace.getWorkspaceFolder(this.document.uri);
            const localResourceRoots =
                [
                    vscode.Uri.file(path.join(this.context.extensionPath, 'dist', 'webview')),
                ].concat(workspace ? [workspace.uri] : []);
            const viewColumn =
                mode === 'runnable' ? vscode.ViewColumn.Active : vscode.ViewColumn.Beside;
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
        }
        this.webviewPanel.onDidDispose(() => {
            this.webviewPanel = undefined;
            this.controller?.dispose();
            this.controller = undefined;
            this.onDisposeEmitter.fire();
        });
        vscode.workspace.onDidDeleteFiles(e => {
            if (e.files.find(f => f.fsPath === this.document.uri.fsPath)) {
                this.dispose();
            }
        });
        await this.render(mode);
    }

    public async render(mode: ConsoleViewMode) {
        if (this.webviewPanel) {
            // Reload the document to get the latest text if it is disposed
            const document = await vscode.workspace.openTextDocument(this.document.uri);
            const config = await Config.load(document.uri);
            const snippetManager = SnippetManager.initialize([], config);
            const logStorage = LogStorage.load(config);
            this.controller?.dispose();
            this.controller = new ConsoleViewController(mode, await snippetManager, this.webviewPanel, document, config, await logStorage, this.context);
            this.controller.render();
            this.controller.onRequestReloadConfig(async () => {
                await this.render('preview');
            });
        }
    }
    
    public get onDidDispose(): vscode.Event<void> {
        return this.onDisposeEmitter.event;
    }

    public show() {
        if (this.controller) {
            this.controller.show();
        }
    }   
}
