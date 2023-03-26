import { ConsoleEvent } from "@ui/model/consoleEvent";
import { Observable } from "rxjs";
import * as os from 'os';
import * as childProcess from "child_process";
import * as path from 'path';
import * as pty from 'node-pty';
import * as iconv from 'iconv-lite';
import { Snippet } from "./snippet";
import { Config } from "../config/config";

type State = 'init' | 'running' | 'killed';

export class PtySnippet implements Snippet {

    private state: State = 'init';

    private ptyProcess: pty.IPty | undefined = undefined;

    public constructor(
        private readonly id: string,
        private readonly cmd: string, 
        private readonly cmdAbsolutePath: string, 
        private readonly args: string[],
        private readonly encoding: string,
        private readonly stdin: boolean,
        public readonly code: string,
        private readonly config: Config,
    ) {}

    public get command(): string {
        return [this.cmd].concat(this.args).join(' ');
    }

    public write(input: string): void {
        if (this.ptyProcess) {
            this.ptyProcess.write(input);
        }
    }

    private watermark: number = 0;

    private readonly watermarkHigh: number = 10000;

    private readonly watermarkLow: number = 1000;
    
    public run(): Observable<ConsoleEvent> {
        if (this.ptyProcess) {
            throw new Error(`The snippet already running: ${this.toString()}`);
        }
        this.state = 'running';
        return new Observable((subscriber) => {
            const args = this.args.map(a => this.convertEncoding(a));
            const code = this.convertEncoding(this.code);
            try {
                if (this.stdin) {
                    this.ptyProcess = pty.spawn(this.cmdAbsolutePath, args, {
                        name: '',
                        cols: 80,
                        rows: 24,
                        useConpty: false,
                        env: this.config.env,
                        cwd: this.config.workingDirectory.fsPath,
                    });
                    this.ptyProcess.write(code);
                } else {
                    const concattedArgs = args.concat(code);
                    this.ptyProcess = pty.spawn(this.cmdAbsolutePath, concattedArgs, {
                        name: '',
                        cols: 80,
                        rows: 24,
                        useConpty: false,
                        env: this.config.env,
                        cwd: this.config.workingDirectory.fsPath,
                    });
                }
            } catch (e) {
                if (e instanceof Error) {
                    const event: ConsoleEvent = {
                        spawnFailed: {
                            snippetId: this.id,
                            cause: `[${e.name}] ${e.message}`,
                        }
                    };
                    subscriber.next(event);
                    this.state = 'init';
                    const completeEvent: ConsoleEvent = {
                        processCompleted: {
                            snippetId: this.id,
                            endDateTime: new Date().toISOString(),
                            exitCode: -1, // unknown
                        }
                    };
                    subscriber.next(completeEvent);
                    subscriber.complete();
                }
            }
            if (this.ptyProcess) {
                const event: ConsoleEvent = {
                    processStarted: {
                        snippetId: this.id,
                        startDateTime: new Date().toISOString(),
                    }
                };
                subscriber.next(event);
                this.ptyProcess.onData(data => {
                    const event: ConsoleEvent = {
                        stdoutProduced: {
                            snippetId: this.id,
                            data: data,
                        }
                    };
                    subscriber.next(event);
                    this.watermark += data.length;
                    if (this.ptyProcess && this.watermarkHigh < this.watermark) {
                        this.ptyProcess.pause();
                    }
                });
                this.ptyProcess.onExit(e => {
                    this.ptyProcess = undefined;
                    this.state = 'init';
                    const event: ConsoleEvent = {
                        processCompleted: {
                            snippetId: this.id,
                            endDateTime: new Date().toISOString(),
                            exitCode: e.exitCode,
                        }
                    };
                    subscriber.next(event);
                    subscriber.complete();
                });
            }
        });
    }

    public notifyDataConsuming(length: number): void {
        this.watermark = Math.max(this.watermark - length, 0);
        if (this.ptyProcess && this.watermark < this.watermarkLow) {
            this.ptyProcess.resume();
        }
    }

    public tryResize(rows: number, cols: number): void {
        if (this.ptyProcess) {
            this.ptyProcess.resize(cols, rows);
        }
    }

    public kill(): void {
        if(this.ptyProcess) {
            switch(this.state) {
                case 'init':
                    return;
                case 'running':
                    this.ptyProcess.kill();
                    this.state = 'killed';
                    return;
                case 'killed':
                    switch (os.platform()) {
                        case 'win32':
                            const taskkillPath = process.env.SYSTEMROOT ? path.join(process.env.SYSTEMROOT, 'system32', 'taskkill') : 'taskkill';
                            childProcess.spawn(taskkillPath, ['/pid', this.ptyProcess.pid.toString(), '/t', '/f']);
                            this.state = 'killed';
                            return;
                        default:
                            this.ptyProcess.kill('SIGKILL');
                            this.state = 'killed';
                            return;
                    }
            }
        }
    }

    public toString(): string {
        return `[${this.id}] ${this.cmd} ${this.args.map(v => `"${v}"`).join(' ')}`;
    }
    
    private convertEncoding(str: string): string {
        return iconv.decode(iconv.encode(str, this.encoding), this.encoding);
    }
}
