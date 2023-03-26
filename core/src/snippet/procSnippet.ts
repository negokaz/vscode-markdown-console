import * as childProcess from "child_process";
import { ChildProcessByStdio } from "child_process";
import * as iconv from 'iconv-lite';
import * as os from 'os';
import * as path from 'path';
import * as nodeProcess from 'process';
import { ConsoleEvent } from "@ui/model/consoleEvent";
import { Observable } from "rxjs";
import { Snippet } from "./snippet";
import { Readable, Writable } from "stream";
import { Config } from "../config/config";

type State = 'init' | 'running' | 'killed';

export class ProcSnippet implements Snippet {

    private state: State = 'init';

    private process: ChildProcessByStdio<Writable, Readable, Readable> | undefined = undefined;

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

    public write(input: string): void {
        if (this.process) {
            this.process.stdin.write(input);
        }
    }

    private watermark: number = 0;

    private readonly watermarkHigh: number = 10000;

    private readonly watermarkLow: number = 1000;
    
    public get command(): string {
        return [this.cmd].concat(this.args).join(' ');
    }

    public run(): Observable<ConsoleEvent> {
        if (this.process) {
            throw new Error(`The snippet already running: ${this.toString()}`);
        }
        this.state = 'running';
        return new Observable((subscriber) => {
            const args = this.args.map(a => this.convertEncoding(a));
            const code = this.convertEncoding(this.code);
            const detachProcess = os.platform() !== 'win32';
            if (this.stdin) {
                this.process = childProcess.spawn(this.cmdAbsolutePath, args, {
                    detached: detachProcess,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: this.config.env,
                    cwd: this.config.workingDirectory.fsPath,
                });
                this.process.stdin.write(code);
                this.process.stdin.end();
            } else {
                const concattedArgs = args.concat(code);
                this.process = childProcess.spawn(this.cmdAbsolutePath, concattedArgs, {
                    detached: detachProcess,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: this.config.env,
                    cwd: this.config.workingDirectory.fsPath,
                });
            }
            if (this.process) {
                const event: ConsoleEvent = {
                    processStarted: {
                        snippetId: this.id,
                        startDateTime: new Date().toISOString(),
                    }
                };
                subscriber.next(event);
                this.process.stdout
                    .pipe(iconv.decodeStream(this.encoding))
                    .on('data', data => {
                        const event: ConsoleEvent = {
                            stdoutProduced: {
                                snippetId: this.id,
                                data: data,
                            }
                        };
                        subscriber.next(event);
                        this.countWatermark(data);
                    });
                this.process.stderr
                    .pipe(iconv.decodeStream(this.encoding))
                    .on('data', data => {
                        const event: ConsoleEvent = {
                            stderrProduced: {
                                snippetId: this.id,
                                data: data,
                            }
                        };
                        subscriber.next(event);
                        this.countWatermark(data);
                    });
                this.process.on('error', error => {
                    const event: ConsoleEvent = {
                        stdoutProduced: {
                            snippetId: this.id,
                            data: `${error.name}, ${error.message}`,
                        }
                    };
                    subscriber.next(event);
                });
                this.process.on('close', exitCode => {
                    this.process = undefined;
                    this.state = 'init';
                    const event: ConsoleEvent = {
                        processCompleted: {
                            snippetId: this.id,
                            endDateTime: new Date().toISOString(),
                            exitCode: exitCode,
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
        if (this.process && this.watermark < this.watermarkLow) {
            this.process.stdout.resume();
            this.process.stderr.resume();
        }
    }

    public tryResize(rows: number, cols: number): void {
        // non-tty process can not handle resize
    }

    public kill(): void {
        if (this.process) {
            switch (os.platform()) {
                case 'win32':
                    const taskkillPath = process.env.SYSTEMROOT ? path.join(process.env.SYSTEMROOT, 'system32', 'taskkill') : 'taskkill';
                    childProcess.spawn(taskkillPath, ['/pid', this.process.pid.toString(), '/t', '/f']);
                    this.state = 'killed';
                    return;
                default:
                    switch(this.state) {
                        case 'init':
                            return;
                        case 'running':
                            // > Please note `-` before pid. This converts a pid to a group of pids for process kill() method.
                            // https://azimi.me/2014/12/31/kill-child_process-node-js.html#pid-range-hack
                            nodeProcess.kill(-this.process.pid, 'SIGINT');
                            this.state = 'killed';
                            return;
                        case 'killed':
                            // force kill if it already trying to kill
                            // > Please note `-` before pid. This converts a pid to a group of pids for process kill() method.
                            // https://azimi.me/2014/12/31/kill-child_process-node-js.html#pid-range-hack
                            nodeProcess.kill(-this.process.pid, 'SIGKILL');
                            this.state = 'killed';
                            return;
                    }
            }
        }
    }

    public toString(): string {
        return `[${this.id}] ${this.cmd} ${this.args.map(v => `"${v}"`).join(' ')}`;
    }

    private countWatermark(data: string): void {
        this.watermark += data.length;
        if (this.process && this.watermarkHigh < this.watermark) {
            this.process.stdout.pause();
            this.process.stderr.pause();
        }
    }

    private convertEncoding(str: string): string {
        return iconv.decode(iconv.encode(str, this.encoding), this.encoding);
    }
}
