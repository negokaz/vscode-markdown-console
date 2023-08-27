import { hydrate, render } from 'preact';
import { Snippet } from '@ui/components/snippet';
import { CodeBlock } from '@ui/components/codeBlock';
import { SnippetState } from '@ui/state/snippetState';
import { UiState } from '@ui/state/uiState';
import { SnippetModel } from '@ui/model/snippetModel';
import { CodeBlockModel } from '@ui/model/codeBlockModel';
import 'xterm/css/xterm.css';
import 'highlight.js/styles/vs2015.css';
import  'vscode-webview';
import { ConsoleEvent } from "@ui/model/consoleEvent";
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SerializeAddon } from 'xterm-addon-serialize';
import { MessageContext, Mode, ModeContext } from '@ui/model/context';
import { Menu } from '@ui/components/menu';
import { Messages } from '@ui/i18n/messages';
import { setupTocTo } from '@ui/toc/toc';

window.addEventListener('load', () => {

    const vscode = acquireVsCodeApi();

    const state = new UiState();

    const mode: Mode = 
        document.body.classList.contains('console-preview') ? 'preview' : 'runnable';

    const debugging: boolean = document.body.classList.contains('debug');

    const language = window.navigator.language;

    const menuElement = document.getElementById('menu');
    if (menuElement) {
        const menu = (
            <ModeContext.Provider value={mode}>
                <MessageContext.Provider value={new Messages(language)}>
                    <Menu vscodeApi={vscode} state={state}></Menu>
                </MessageContext.Provider>
            </ModeContext.Provider>
        );
        render(menu, menuElement);
    }

    Array.from(document.querySelectorAll('div.snippet-root')).forEach(e => {
        if (e instanceof HTMLElement) {
            if (e.dataset.model) {
                const model: SnippetModel = JSON.parse(e.dataset.model);
                e.removeAttribute('data-model');
                if (model.attr.success) {
                    const attr = model.attr.success;
                    const term = new Terminal({
                        cursorBlink: true,
                        cursorStyle: 'bar',
                        convertEol: attr.tty === false,
                        scrollback: 256,
                    });
                    const fitAddon = new FitAddon();
                    term.loadAddon(fitAddon);
                    const serializeAddon = new SerializeAddon();
                    term.loadAddon(serializeAddon);
                    const snippetState = new SnippetState({
                        webview: {
                            vscodeApi: vscode,
                            term: term,
                            fitAddon: fitAddon,
                            serializeAddon: serializeAddon, 
                        },
                        data: model.data,
                    });
                    const snippet = (
                        <ModeContext.Provider value={mode}>
                            <MessageContext.Provider value={new Messages(language)}>
                                <Snippet state={snippetState} attr={attr}>{attr.code}</Snippet>
                            </MessageContext.Provider>
                        </ModeContext.Provider>
                    );
                    state.register(attr.id, snippetState);
                    hydrate(snippet, e);
                }
            } else {
                console.error('data-model attribute not found', e);
            }
        }
    });

    Array.from(document.querySelectorAll('div.codeblock-root')).forEach(e => {
        if (e instanceof HTMLElement && e.dataset.model) {
            const model: CodeBlockModel = JSON.parse(e.dataset.model);
            e.removeAttribute('data-model');
            const codeBlockElement =
                <CodeBlock language={model.language} code={model.code} vscodeApi={vscode} />;
            hydrate(codeBlockElement, e);
        }
    });

    /**
     * URI: handle by webview native 
     * Ancher: handle by webview native 
     * Absolute path: open in vscode
     * Relative path: open in vscode
     */
    const webUrlPattern = /^(([a-zA-Z][a-zA-Z0-9+.-]*:)|(#))/;
    Array.from(document.querySelectorAll('a'))
        .filter(elem => elem.href)
        .forEach(elem => {
            // elem.href returns vscode-webview: scheme URI instead of raw path
            const href = elem.getAttribute('href');
            if (href) {
                if (!webUrlPattern.test(href)) {
                    // open link on vscode if the href points local file path
                    elem.addEventListener('click', event => {
                        event.preventDefault();
                        event.stopPropagation();
                        const consoleEvent: ConsoleEvent = {
                            openLink: {
                                href: href,
                            }
                        };
                        vscode.postMessage(consoleEvent);
                    });
                }
            }
        });

    window.addEventListener('message', event => {
        const consoleEvent: ConsoleEvent = event.data;
        if (debugging) {
            console.debug(consoleEvent);
        }
        if (consoleEvent.spawnFailed) {
            const snippetState = state.get(consoleEvent.spawnFailed.snippetId);
            snippetState.writelnToTerm(consoleEvent.spawnFailed.cause);
        } else if (consoleEvent.processStarted) {
            const snippetState = state.get(consoleEvent.processStarted.snippetId);
            snippetState.startDate.value = new Date(consoleEvent.processStarted.startDateTime);
        } else if (consoleEvent.stdoutProduced) {
            const stdoutProduced = consoleEvent.stdoutProduced;
            const snippetState = state.get(stdoutProduced.snippetId);
            snippetState.writeStdoutToTerm(consoleEvent.stdoutProduced.data).then((data) => {
                const event: ConsoleEvent = {
                    dataConsumed: {
                        snippetId: stdoutProduced.snippetId,
                        length: data.length,
                    }
                };
                vscode.postMessage(event);
            });
        } else if (consoleEvent.stderrProduced) {
            const stderrProduced = consoleEvent.stderrProduced;
            const snippetState = state.get(consoleEvent.stderrProduced.snippetId);
            snippetState.writeStdoutToTerm(consoleEvent.stderrProduced.data).then((data) => {
                const event: ConsoleEvent = {
                    dataConsumed: {
                        snippetId: stderrProduced.snippetId,
                        length: data.length,
                    }
                };
                vscode.postMessage(event);
            });
        } else if (consoleEvent.processCompleted) {
            const processCompleted = consoleEvent.processCompleted;
            const snippetState = state.get(consoleEvent.processCompleted.snippetId);
            snippetState.markComplete(processCompleted.exitCode, new Date(processCompleted.endDateTime)).then(() => {
                if (snippetState.webview) {
                    const event: ConsoleEvent = {
                        termBufferDetermined: {
                            snippetId: processCompleted.snippetId,
                            bufferData: snippetState.webview.serializeAddon.serialize(),
                        }
                    };
                    vscode.postMessage(event);
                }
            });
        } else if (consoleEvent.documentChanged) { 
            state.dirty.value = true;
        } else {
            console.error('unhandled', event.data);
        }
    });
    setupTocTo(window, {
        topPaddingPx: 100,
        bottomPaddingPx: 100,
    });
});
