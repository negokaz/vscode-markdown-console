import { Config } from "../config/config";
import { Low } from 'lowdb';
import { LogEntry, LogSchema, LogYamlAdapter } from './logYamlAdapter';
import { promises as fs } from 'fs';
import * as path from 'path';

export class LogStorage {

    public static async load(config: Config): Promise<LogStorage> {
        await fs.mkdir(path.dirname(config.dbUri.fsPath), { recursive: true });
        const db = new Low(new LogYamlAdapter(config.dbUri.fsPath));
        await db.read();
        if (!db.data) {
            db.data = new Map();
        }
        return new LogStorage(db);
    }

    private constructor(
        private readonly db: Low<LogSchema>
    ) {}

    public get data(): LogSchema {
        if (this.db.data) {
            return this.db.data;
        } else {
            throw new Error('data is not initialized');
        }
    }

    public update(snippetId: string, handler: (f: LogEntry) => LogEntry): void {
        if (this.db.data) {
            const maybeEntry = this.db.data.get(snippetId);
            if (maybeEntry) {
                this.db.data.set(snippetId, handler(maybeEntry));
            } else {
                const entry: LogEntry = {
                    command: '',
                    code: '',
                    start: new Date(0),
                    end: new Date(0),
                    output: '',
                    outputHtml: '',
                    exitCode: -1,
                };
                this.db.data.set(snippetId, handler(entry));
            }
        }
    }

    public write(): Promise<void> {
        return this.db.write();
    }
}
