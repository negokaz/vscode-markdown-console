import * as vscode from 'vscode';
import { ConsoleView } from './consoleView';

export class ConsoleViewManager {
    
    private views: Map<string, ConsoleView> = new Map();

    public constructor(
        private readonly context: vscode.ExtensionContext,
    ) {}

    public async openPreview(document: vscode.TextDocument): Promise<void> {
        const key = document.uri.fsPath;
        let maybeView = this.views.get(key);
        if (maybeView) {
            await maybeView.render('preview');
            maybeView.show();
        } else {
            maybeView = new ConsoleView('preview', document, this.context);
            this.views.set(key, maybeView);
            this.context.subscriptions.push(maybeView);
            maybeView.onDidDispose(() => {
                this.views.delete(key);
            });
            await maybeView.render('preview');
        }
    }

    public async activateConsole(document: vscode.TextDocument): Promise<void> {
        const key = document.uri.fsPath;
        let maybeView = this.views.get(key);
        if (maybeView) {
            await maybeView.render('runnable');
            maybeView.show();
        } else {
            maybeView = new ConsoleView('runnable', document, this.context);
            this.views.set(key, maybeView);
            this.context.subscriptions.push(maybeView);
            maybeView.onDidDispose(() => {
                this.views.delete(key);
            });
            await maybeView.render('runnable');
        }
    }
}
