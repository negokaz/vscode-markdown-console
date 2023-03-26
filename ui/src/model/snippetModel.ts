export type SnippetModel = {
    attr: SnippetAttribute,
    data?: SnippetData,
};

export type SnippetAttribute = {
    success?: SnippetAttributeSuccess,
    error?: SnippetAttributeError,
};

export type SnippetAttributeSuccess = {
    id: string,
    avaiable: boolean,
    cmd: string,
    cmdAbsolutePath: string | CmdError,
    args: string[],
    encoding: string,
    stdin: boolean,
    tty: boolean,
    code: string,
    language: string,
};

export type SnippetAttributeError = {
    message: string,
    code: string,
    language: string,
};

export type CmdError = {
    message: string,
};

export type SnippetData = {
    output: string,
    outputHtml: string,
    startDateTime: string,
    endDateTime: string,
    exitCode: number,
};
