import { signal } from "@preact/signals";
import { SnippetState } from "./snippetState";

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
}
