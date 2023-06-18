import * as vscode from 'vscode';
import { ConsoleViewManager } from './console/consoleViewManager';
import { Messages } from '@ui/i18n/messages';

export function activate(context: vscode.ExtensionContext) {

    const consoleViewManager = new ConsoleViewManager(context);
    
    const messages = new Messages(vscode.env.language);

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
            const editorAlreadyOpened = vscode.window.visibleTextEditors.find(e => e.document.uri.fsPath === uri.fsPath);
            if (editorAlreadyOpened) {
                await vscode.window.showTextDocument(editorAlreadyOpened.document, editorAlreadyOpened.viewColumn);
                await consoleViewManager.openPreview(editorAlreadyOpened.document);
            } else {
                const document = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
                await consoleViewManager.openPreview(document);
            }
		}),
        vscode.commands.registerCommand('markdown-console.generateConMd', async (uri: vscode.Uri) => {
            const input = await vscode.window.showInputBox({ prompt: messages.get('input-new-con-md-file-name') });
            if (input) {
                const fileName = input.length > 0 ? input : 'newFile';
                const mdUri = uri.with({ path: uri.path + `/${fileName}.con.md` });
                const edit = new vscode.WorkspaceEdit();
                edit.createFile(mdUri, { ignoreIfExists: true, contents: Buffer.from(ConMdTemplate(fileName)) });
                await vscode.workspace.applyEdit(edit);
                const document = await vscode.workspace.openTextDocument(mdUri);
                await vscode.window.showTextDocument(document);
                await consoleViewManager.openPreview(document);
            }
        }),
        vscode.commands.registerCommand('markdown-console.generateMarkdownConsoleYml', async (uri: vscode.Uri) => {
            const ymlUri = uri.with({ path: uri.path + '/markdown-console.yml' });
            const edit = new vscode.WorkspaceEdit();
            edit.createFile(ymlUri, { ignoreIfExists: true, contents: Buffer.from(MarkdownConsoleYmlTemplate) });
            await vscode.workspace.applyEdit(edit);
            const document = await vscode.workspace.openTextDocument(ymlUri);
            await vscode.window.showTextDocument(document);
        }),
	);
}

const ConMdTemplate = (title: string) => `# ${title}

\`\`\`bash
#@cmd:[bash -c]
echo Hello, World!
\`\`\`
`;

const MarkdownConsoleYmlTemplate = `# Markdown Console Configuration File
# You can override each value by creating a file which was named "markdown-console_*.yml".
# (e.g., markdown-console_override.yml, markdown-console_prod.yml)

# Environment variables to run commands
# 
# [example]
# env:
#    PATH:
#        - "C:/Program Files/Git/bin;"
#        - "{{PATH}}"
env: 
    PATH:
        - "{{PATH}}"

# Markdown Console (*.con.md) templating variables
# 
# [example]
# variable:
#    server1:
#        user: "user1"
#        host: "server1.example.com"
variable:
    var1: example
`;

// this method is called when your extension is deactivated
export function deactivate() {}
