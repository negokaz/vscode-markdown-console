import * as vscode from 'vscode';
import { ConsoleViewManager } from './console/consoleViewManager';

export function activate(context: vscode.ExtensionContext) {

    const consoleViewManager = new ConsoleViewManager(context);

	console.log('Congratulations, your extension "markdown-console" is now active!');

	context.subscriptions.push(
		vscode.commands.registerCommand('markdown-console.openPreviewToTheSide', async (uri: vscode.Uri) => {
            const document = await vscode.workspace.openTextDocument(uri);
            await consoleViewManager.openPreview(document);
		}),
		vscode.commands.registerCommand('markdown-console.activateConsole', async (uri: vscode.Uri) => {
            const document = await vscode.workspace.openTextDocument(uri);
            await consoleViewManager.activateConsole(document);
		}),
		vscode.commands.registerCommand('markdown-console.editWithPreview', async (uri: vscode.Uri) => {
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document, vscode.ViewColumn.Active, true);
            await consoleViewManager.openPreview(document);
		}),
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor && isMarkdownConsoleDocument(editor.document)) {
				consoleViewManager.tryShow(editor.document);
			}
		}),
	);
}

function isMarkdownConsoleDocument(document: vscode.TextDocument): Boolean {
	return document.fileName.endsWith('.con.md');
}

// this method is called when your extension is deactivated
export function deactivate() {}
