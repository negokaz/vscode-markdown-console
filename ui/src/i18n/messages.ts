import localeEn from '../../../package.nls.json';
import localeJa from '../../../package.nls.ja.json';

export type MessageId = keyof typeof localeEn;

export class Messages {

    public constructor(private readonly language: string) {}

    public get(id: MessageId): string {
        switch(this.language) {
            case 'ja':
                return localeJa[id];
            default:
                return localeEn[id];
        }
    }
}
