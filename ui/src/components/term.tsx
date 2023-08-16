import { ConsoleEvent } from "@ui/model/consoleEvent";
import { SnippetAttributeSuccess } from "@ui/model/snippetModel";
import { SnippetState } from "@ui/state/snippetState";
import { memo } from 'preact/compat';
import { useContext } from 'preact/hooks';
import { ModeContext } from "@ui/model/context";

type Props = {
    state: SnippetState,
    attr: SnippetAttributeSuccess,
};

// Suppress re-rendering
export const Term = memo(({state, attr}: Props) => {

    const mode = useContext(ModeContext);

    const newTerm = (ref: HTMLElement | null) => {
        if (ref && state.webview) {
            const vscodeApi = state.webview.vscodeApi;
            const term = state.webview.term;
            term.attachCustomKeyEventHandler(e => {
                if (term.getSelectionPosition() && (e.ctrlKey || e.metaKey ) && e.key === 'c') {
                    // copy if selected text
                    const event: ConsoleEvent = {
                        copyText: {
                            text: term.getSelection(),
                        }
                    };
                    vscodeApi.postMessage(event);
                    return false;
                } else if ((e.ctrlKey || e.metaKey ) && e.key === 'v') {
                    // paste
                    return false;
                } else {
                    return true;
                }
            });
            term.onResize(size => {
                const event: ConsoleEvent = {
                    termResized: {
                        snippetId: attr.id,
                        rows: size.rows,
                        cols: size.cols,
                    }
                };
                vscodeApi.postMessage(event);
            });
            term.onData(data => {
                const event: ConsoleEvent = {
                    userInput: { snippetId: attr.id, data: data }
                };
                vscodeApi.postMessage(event);
            });
            if (state.output.value) {
                term.write(state.output.value, () => {
                    term.open(ref);
                });
            } else {
                term.open(ref);
            }
            if (mode === 'preview') {
                const hideCursorSequence = '\x1b[?25l';
                term.write(hideCursorSequence);
            }
            // trigger resizing term after 1 second after the last resizing
            let timerId: number | undefined = undefined;
            new ResizeObserver(() => {
                if (timerId) {
                    window.clearTimeout(timerId);
                }
                timerId = window.setTimeout(() => resizeTerm(), 100);
            }).observe(ref);
        }
    };

    const resizeTerm = () => {
        if (state.webview) {
            const data = state.webview.serializeAddon.serialize();
            state.webview.term.reset();
            state.webview.fitAddon.fit();
            if (data.trimStart().length !== 0) {
                state.webview.term.write(data);
            }
        }
    };

    const html = {__html: state.outputHtml ? state.outputHtml : ''};

    return (
        <div class="terminal-outer">
            {
                state.webview
                    ? (
                        <div class="terminal-root" ref={ref => newTerm(ref)}></div>
                    )
                    : (
                        <div class="terminal-root" dangerouslySetInnerHTML={html}></div>
                    )
            }
        </div>
    );
});
