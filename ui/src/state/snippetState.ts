import { batch, Signal, signal } from "@preact/signals";
import { SnippetData } from "@ui/model/snippetModel";
import { WebviewApi } from "vscode-webview";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { SerializeAddon } from "xterm-addon-serialize";

type SnippetStatus = "init" | "running" | "complete";

type SnippetStateProps = {
    webview?: WebviewProps,
    data?: SnippetData,
};

type WebviewProps = {
    vscodeApi: WebviewApi<unknown>,
    term: Terminal,
    fitAddon: FitAddon,
    serializeAddon: SerializeAddon,
};

export type LogProps = {
    output: string,
    exitCode: number, 
};

export class SnippetState {

    public readonly status: Signal<SnippetStatus> = signal('init');

    public readonly startDate: Signal<Date | undefined> = signal(undefined);

    public readonly endDate: Signal<Date | undefined> = signal(undefined);

    public readonly exitCode: Signal<number | undefined> = signal(undefined);

    public readonly outputExists: Signal<boolean> = signal(false);

    public readonly output: Signal<string | undefined> = signal('');

    public readonly outputHtml: string | undefined;

    public readonly webview: WebviewProps | undefined;

    public constructor(props: SnippetStateProps) {
        this.webview = props.webview;
        if (props.data) {
            this.outputHtml = props.data.outputHtml;
            const data = props.data;
            batch(() => {
                if (data.output.length !== 0) {
                    this.outputExists.value = true;
                }
                this.output.value = data.output;
                this.startDate.value = new Date(data.startDateTime);
                this.endDate.value = new Date(data.endDateTime);
                this.exitCode.value = data.exitCode;
                this.status.value = 'complete';
            });
        }
    }

    private writings: Promise<string>[] = [];

    public writeStdoutToTerm(data: string): Promise<string> {
        if (this.webview) {
            this.outputExists.value = true;
            const term = this.webview.term;
            const promise = new Promise<string>((resolve) => {
                term.write(data, () => resolve(data));
            });
            this.writings.push(promise);
            return promise;
        } else {
            return Promise.resolve(data);
        }
    }

    public writelnToTerm(data: string): void {
        if (this.webview) {
            this.outputExists.value = true;
            const term = this.webview.term;
            const promise = new Promise<string>((resolve) => {
                term.writeln(data, () => resolve(data));
            });
            this.writings.push(promise);
        }
    }

    public markComplete(exitCode: number, endDate: Date): Promise<void> {
        const result = this.writingCompleted().then(() => {
            batch(() => {
                this.endDate.value = endDate;
                this.exitCode.value = exitCode;
                this.status.value = 'complete';
            });
        });
        this.writings = [];
        return result;
    }
    
    public resizeTerm() {
        if (this.webview) {
            const webview = this.webview;
            this.writingCompleted().then(() => {
                const serializedData = webview.serializeAddon.serialize();
                webview.term.reset();
                webview.fitAddon.fit();
                webview.term.write(serializedData);
            });
        }
    }

    private writingCompleted(): Promise<string[]> {
        return Promise.all(this.writings);
    }
}
