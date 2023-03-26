import { ConsoleEvent } from "@ui/model/consoleEvent";
import { Observable } from "rxjs";
import { Snippet } from "./snippet";

export class UnavailableSnippet implements Snippet {

    public get command(): string {
        return '';
    }

    public get code(): string {
        return '';
    }

    public write(input: string): void {
        throw new Error("Method not implemented.");
    }
    public run(): Observable<ConsoleEvent> {
        throw new Error("Method not implemented.");
    }
    public notifyDataConsuming(length: number): void {
        throw new Error("Method not implemented.");
    }
    public tryResize(rows: number, cols: number): void {
        return;
    }
    public kill(): void {
        return;
    }
}
