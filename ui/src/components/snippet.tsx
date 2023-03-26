import { computed, batch } from '@preact/signals';
import { SnippetState } from '../state/snippetState';
import { ComponentChildren } from 'preact';
import { useContext } from 'preact/hooks';
import { HighlightedCode } from './highlightedCode';
import { CmdError, SnippetAttributeSuccess } from '@ui/model/snippetModel';
import { ConsoleEvent } from '@ui/model/consoleEvent';
import { Term } from './term';
import { MessageContext, ModeContext } from '@ui/model/context';
import { TimeSpan } from '@ui/components/timeSpan';

type Props = {
    state: SnippetState,
    attr: SnippetAttributeSuccess,
    children: ComponentChildren,
};

export function Snippet({ state, attr, children }: Props) {

    const mode = useContext(ModeContext);
    const messages = useContext(MessageContext);

    const run = () => {
        if (state.webview) {
            batch(() => {
                state.status.value = 'running';
                state.endDate.value = undefined;
            });
            state.webview.term.focus();
            state.webview.term.reset();
        }
        if (state.webview) {
            const event: ConsoleEvent = { 
                startClicked: { 
                    snippetId: attr.id,
                    rows: state.webview.term.rows,
                    cols: state.webview.term.cols,
                } 
            };
            state.webview.vscodeApi.postMessage(event);
        }
    };

    const stop = () => {
        if (state.webview) {
            const event: ConsoleEvent = {
                stopClicked: { snippetId: attr.id }
            };
            state.webview.vscodeApi.postMessage(event);
        }
    };

    const copy = () => {
        if (state.webview) {
            const event: ConsoleEvent = {
                copyText: { text: attr.code }
            };
            state.webview.vscodeApi.postMessage(event);
        }
    };

    const exitCode = computed(() => {
        switch(state.status.value) {
            case 'init':
                return <div></div>;
            case 'running':
                return (
                    <div class="exit-status">
                        <span class="exit-code">...</span>
                        <TimeSpan start={state.startDate} end={state.endDate} />
                    </div>
                );
            case 'complete':
                return (
                    <div class="exit-status">
                        <span class="exit-code">
                            {state.exitCode.value === 0 ? <i class="icon-check" /> : <i class="icon-x" />}
                            {state.exitCode}
                        </span>
                        <TimeSpan start={state.startDate} end={state.endDate} />
                    </div>
                );
        }
    });

    const snippetClasses = computed(() => {
        const classes = [state.status.value.toString()];
        if (state.status.value === 'complete') {
            if (state.exitCode.value === 0) {
                classes.push('succeeded');
            } else {
                classes.push('failed');
            }
        }
        return classes;
    });

    const snippetLabel = computed(() => {
        if (typeof attr.cmdAbsolutePath === 'string') {
            return (
                <div class="snippet-label">
                    {attr.tty ? <span class="tag">tty</span> : <></>}
                    {attr.stdin ? <span class="tag">stdin</span> : <></>}
                    <code>{[attr.cmd].concat(attr.args).join(" ")}</code>
                </div>
            );
        } else {
            const error: CmdError = attr.cmdAbsolutePath;
            return (
                <div class="snippet-label unavailable-snippet-label">
                    <code>{[attr.cmd].concat(attr.args).join(" ") + " "}</code>
                    <wbr />
                    <code>{`[${error.message}]`}</code>
                </div>
            );
        }
    });

    const snippetControl = computed(() => {
        if (state.webview && mode === 'runnable') {
            if (attr.avaiable) {
                switch (state.status.value) {
                    case 'init':
                        return <a class="button" onClick={run}><i class="icon-player-play-filled" />{messages.get('run')}</a>;
                    case 'running':
                        return <a class="button" onClick={stop}><i class="icon-player-stop-filled" />{messages.get('stop')}</a>;
                    case 'complete':
                        return <a class="button" onClick={run}><i class="icon-rotate-clockwise" />{messages.get('retry')}</a>;
                }
            } else {
                // disable
                return <span class="button button-disabled"><i class="icon-exclamation-circle" />{messages.get('run')}</span>;
            }
        }
    });

    const copyButton = computed(() => {
        if (state.webview) {
            return <a class="button" onClick={copy}><i class="icon-copy" />{messages.get('copy')}</a>;
        }
    });

    return (
        <div class={["snippet"].concat(snippetClasses.value).join(' ')}>
            <div class="snippet-header">
                {snippetLabel}
                <div class="snippet-control">
                    {snippetControl}
                    {copyButton}
                </div>
            </div>
            <HighlightedCode language={attr.language}>{children}</HighlightedCode>
            <Term state={state} attr={attr}></Term>
            {exitCode}
        </div>
    );
}
