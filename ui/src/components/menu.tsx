import { MessageContext, ModeContext } from '@ui/model/context';
import { ConsoleEvent } from '@ui/model/consoleEvent';
import { UiState } from '@ui/state/uiState';
import { useContext } from 'preact/hooks';
import { WebviewApi } from 'vscode-webview';

export type Props = {
    vscodeApi: WebviewApi<unknown>,
    state: UiState,
};

export function Menu({ vscodeApi, state }: Props) {
    const mode = useContext(ModeContext);
    const messages = useContext(MessageContext);

    const saveSnapshot = () => {
        const styleElement = document.documentElement;
        const style = styleElement.getAttribute('style');
        if (!style) {
            console.warn('style attribute not found', styleElement);
        }
        const event: ConsoleEvent = {
            saveSnapshotClicked: {
                style: style ? style : '',
                bodyClassList: Array.from(document.body.classList),
                snippetData: state.extractSnippetData(),
            },
        };
        vscodeApi.postMessage(event);
    };

    const switchPreview = () => {
        const event: ConsoleEvent = {
            switchPreview: {},
        };
        vscodeApi.postMessage(event);
    };

    const switchRunnable = () => {
        const event: ConsoleEvent = {
            switchRunnable: {},
        };
        vscodeApi.postMessage(event);
    };

    switch(mode) {
        case 'preview':
            return (
                <>
                    <a class="button highlight" onClick={switchRunnable}><i class="icon-terminal-2" />{messages.get('activate-console')}</a>
                    <a class="button" onClick={saveSnapshot}><i class="icon-camera" />{messages.get('save-snapshot')}</a>
                </>
            );
        case 'runnable':
            return (
                <>
                    {
                        state.dirty.value
                            ? <a class="button highlight" onClick={switchPreview}><i class="icon-edit" />{messages.get('edit')}<span>*</span></a>
                            : <a class="button" onClick={switchPreview}><i class="icon-edit" />{messages.get('edit')}</a>
                    }
                    <a class="button" onClick={saveSnapshot}><i class="icon-camera" />{messages.get('save-snapshot')}</a>
                </>
            );
    }
}
