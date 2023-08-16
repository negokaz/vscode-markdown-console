import { UiState } from '@ui/state/uiState';
import { LogStorage } from '../storage/logStorage';
import { SnippetData } from '@ui/model/consoleEvent';

type RenderMode = 'webview' | 'snapshot';

export class MarkdownEngineEnv {
    
    public constructor(
        public readonly state: UiState,
        public readonly logStorage: LogStorage,
        public readonly renderMode: RenderMode,
        public readonly snippetOutputHtmls: Map<string, string>,
    ) {}
}

export class MarkdownEngineEnvBuilder {

    public constructor(
        public readonly state: UiState,
        public readonly logStorage: LogStorage,
        public readonly renderMode: RenderMode,
    ) {}

    public build(snippets: SnippetData[] = []): MarkdownEngineEnv {
        const htmls = snippets ? snippets.map(snippet => {
            return [snippet.id, snippet.outputHtml] as [string, string];
        }) : [];
        return new MarkdownEngineEnv(this.state, this.logStorage, this.renderMode, new Map(htmls));
    }
}
