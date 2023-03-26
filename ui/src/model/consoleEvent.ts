
export type ConsoleEvent = {
        switchPreview?: SwitchPreview,
        switchRunnable?: SwitchRunnable,
        copyText?: CopyText,
        startClicked?: StartClicked,
        processStarted?: ProcessStarted,
        userInput?: UserInput,
        stopClicked?: StopClicked,
        termResized?: TermResized,
        dataConsumed?: DataConsumed,
        termBufferDetermined?: TermBufferDetermined,
        saveSnapshotClicked?: SaveSnapshotClicked,
        openLink?: OpenLink,
        stdoutProduced?: StdoutProduced,
        stderrProduced?: StderrProduced,
        spawnFailed?: SpawnFailed,
        processCompleted?: ProcessCompleted,
        documentChanged?: DocumentChanged,
};

export type SwitchPreview = {

};

export type SwitchRunnable = {

};

export type CopyText = {

    text: string,
};

export type StartClicked = {

    snippetId: string,

    rows: number,

    cols: number,
};

export type ProcessStarted = {

    snippetId: string,

    startDateTime: string,
};

export type UserInput = {

    snippetId: string,

    data: string,
};

export type StopClicked = {

    snippetId: string,
};

export type TermResized = {
    
    snippetId: string,

    rows: number,

    cols: number,
};

export type DataConsumed = {

    snippetId: string,
    
    length: number;
};

export type StdoutProduced = {

    snippetId: string,

    data: string,
};

export type StderrProduced = {
    
    snippetId: string,

    data: string,
};

export type SpawnFailed = {
    
    snippetId: string,

    cause: string,
};

export type ProcessCompleted = {
    
    snippetId: string,

    exitCode: number,

    endDateTime: string,
};

export type TermBufferDetermined = {

    snippetId: string,

    bufferData: string,

    html: string,
};

export type SaveSnapshotClicked = {

    style: string,

    bodyClassList: string[],
};

export type OpenLink = {
    href: string,
};

export type DocumentChanged = {

};
