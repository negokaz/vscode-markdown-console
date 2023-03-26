import { ConsoleEvent } from "@ui/model/consoleEvent";
import { Observable } from "rxjs";

export interface Snippet {
    
    get command(): string;

    get code(): string;

    write(input: string): void;

    run(): Observable<ConsoleEvent>;

    notifyDataConsuming(length: number): void;

    tryResize(rows: number, cols: number): void;

    kill(): void;
}
