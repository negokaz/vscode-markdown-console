import { signal } from "@preact/signals";
import { SnippetState } from "./snippetState";
import { SnippetData } from "@ui/model/consoleEvent";

export class UiState {

    public readonly dirty = signal<boolean>(false);

    private readonly snippets: Map<string, SnippetState> = new Map();

    constructor() {
    }

    public get(id: string): SnippetState {
        const snippet = this.snippets.get(id);
        if (snippet) {
            return snippet;
        } else {
            throw new Error(`illegal snippet ID: ${id}`);
        }
    }

    public register(id: string, state: SnippetState): void {
        this.snippets.set(id, state);
    }

    public extractSnippetData(): SnippetData[] {
        return Array.from(this.snippets).reduce((acc, [id, snippet]) => {
            if (snippet.webview) {
                const outputHtml =
                    snippet.webview.serializeAddon.serializeAsHTML({includeGlobalBackground: true});
                const data: SnippetData = {
                    id: id,
                    outputHtml: this.trimRightForSerializedHtml(outputHtml),
                };
                return acc.concat([data]);
            } else {
                return acc;
            }
        }, [] as SnippetData[]);
    }

    /*
     * Remove trailing spaces of each line
     */
    private trimRightForSerializedHtml(html: string): string {
        // Remove <div>...</span>[[<span> </span>]]</div>,
        // keep <div><span> </span></div>
        return html
            .replaceAll(/ +(<\/span><\/div>)/g, ' $1')
            .replaceAll(/(<\/span>)<span> +<\/span>(<\/div>)/g, '$1$2');
    }
}
