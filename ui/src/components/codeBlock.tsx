import { ConsoleEvent } from "@ui/model/consoleEvent";
import { WebviewApi } from "vscode-webview";
import { HighlightedCode } from "./highlightedCode";

type Props = {
    language: string,
    code: string,
    vscodeApi?: WebviewApi<unknown>;
};

export function CodeBlock({ language, code, vscodeApi }: Props) {

    const copy = () => {
        if (vscodeApi) {
            const event: ConsoleEvent = {
                copyText: { text: code }
            };
            vscodeApi.postMessage(event);
        }
    };

    return (
        <div class="codeblock">
            <div class="codeblock-header">
                { vscodeApi ? <a class="button" onClick={copy}><i class="icon-copy" />Copy</a> : <></> }
            </div>
            <HighlightedCode language={language}>{code}</HighlightedCode>
        </div>
    );
}
