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
            maybeView.show();
            await maybeView.render('preview');
            return;
        } else {
            maybeView = new ConsoleView(document, this.context);
            this.context.subscriptions.push(maybeView);
            maybeView.onDidDispose(() => {
                this.views.delete(key);
            });
            this.views.set(key, maybeView);
            return maybeView.open('preview'); 
        }
    }

    public async activateConsole(document: vscode.TextDocument): Promise<void> {
        const key = document.uri.fsPath;
        let maybeView = this.views.get(key);
        if (maybeView) {
            maybeView.show();
            await maybeView.render('runnable');
            return;
        } else {
            maybeView = new ConsoleView(document, this.context);
            this.context.subscriptions.push(maybeView);
            maybeView.onDidDispose(() => {
                this.views.delete(key);
            });
            this.views.set(key, maybeView);
            return maybeView.open('runnable'); 
        }
    }
}
