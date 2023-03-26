import { signal, Signal } from "@preact/signals";
import { SnippetState } from "@ui/state/snippetState";

type Props = {
    start: Signal<Date | undefined>,
    end: Signal<Date | undefined>,
};

export function TimeSpan({ start, end }: Props) {

    if (start.value || end.value) {
        return (
            <div class="time-span">
                <i class="icon-clock" />
                {
                    start.value
                        ? (
                            <abbr class="time-span-start" title={dateToISOStringWithTZ(start.value)}>
                                {start.value.toLocaleDateString()}
                                &nbsp;
                                {start.value.toLocaleTimeString()}
                            </abbr>
                        )
                        : <></>
                }
                <i class="icon-chevrons-right" />
                {
                    end.value
                        ? (
                            <abbr class="time-span-end" title={dateToISOStringWithTZ(end.value)}>
                                {end.value.toLocaleTimeString()}
                            </abbr>
                        )
                        : <span class="time-span-end">...</span>
                }
                {
                    start.value && end.value
                        ? (
                            <span class="elapsed-time">({Math.floor((end.value.getTime() - start.value.getTime()) / 1000)}s)</span>
                        )
                        : (
                            <span></span>
                        )
                }
            </div>
        );
    } else {
        return (
            <div class="time-span"></div>
        );
    }
}


function dateToISOStringWithTZ(date: Date): string {
    const toPaddedString = (num: number, length: number): string => num.toString().padStart(length, '0');
    const year = date.getFullYear().toString();
    const month = toPaddedString(date.getMonth() + 1, 2);
    const day = toPaddedString(date.getDate(), 2);
    const hour = toPaddedString(date.getHours(), 2);
    const min = toPaddedString(date.getMinutes(), 2);
    const sec = toPaddedString(date.getSeconds(), 2);
    const ms = toPaddedString(date.getMilliseconds(), 3);
    const tz = -date.getTimezoneOffset();
    const tzSign = tz >= 0 ? '+' : '-';
    const tzHour = toPaddedString(tz / 60, 2);
    const tzMin = toPaddedString(tz % 60, 2);
    return `${year}-${month}-${day}T${hour}:${min}:${sec}.${ms}${tzSign}${tzHour}:${tzMin}`;
};
