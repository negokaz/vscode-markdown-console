import { Adapter } from 'lowdb';
import { TextFile } from 'lowdb/node';

export type LogSchema = 
    Map<string, LogEntry>;

export type LogEntry = {
    command: string,
    code: string,
    start: Date,
    end: Date,
    output: string,
    exitCode: number,
};

export type LogRawEntry = {
    command: string,
    code: string,
    start: string,
    end: string,
    output: string,
    exitCode: number,
};

export class LogJsonAdapter implements Adapter<LogSchema> {

    private readonly adapter: Adapter<string>;

    constructor(filename: string) {
        this.adapter = new TextFile(filename);
    }

    public async read(): Promise<LogSchema | null> {
        const data = await this.adapter.read();
        if (data) {
            const parsed: [string, LogRawEntry][] = JSON.parse(data);
            const decoded = parsed.map(([key, value]) => {
                return [key, this.decode(value as LogRawEntry)] as [string, LogEntry];
            });
            return new Map(decoded);
        } else {
            return null;
        }
    }

    public async write(data: LogSchema): Promise<void> {
        const encoded = Array.from(data.entries()).map(([key, value]) => {
            return [key, this.encode(value)] as [string, LogRawEntry];
        });
        return this.adapter.write(JSON.stringify(encoded));
    }

    private encode(logEntry: LogEntry): LogRawEntry {
        return {
            command: logEntry.command,
            code: logEntry.code,
            start: logEntry.start.toISOString(),
            end: logEntry.end.toISOString(),
            output: logEntry.output,
            exitCode: logEntry.exitCode,
        };
    }

    private decode(logRawEntry: LogRawEntry): LogEntry {
        return {
            command: logRawEntry.command,
            code: logRawEntry.code,
            start: new Date(logRawEntry.start),
            end: new Date(logRawEntry.end),
            output: logRawEntry.output,
            exitCode: logRawEntry.exitCode,
        };
    }
}
