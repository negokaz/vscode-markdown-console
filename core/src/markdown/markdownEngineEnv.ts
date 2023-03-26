import { UiState } from '@ui/state/uiState';
import { LogStorage } from '../storage/logStorage';

type RenderMode = 'webview' | 'snapshot';

export class MarkdownEngineEnv {
    
    public constructor(
        public readonly state: UiState,
        public readonly logStorage: LogStorage,
        public readonly renderMode: RenderMode,
    ) {}
}
