import { ComponentChildren } from "preact";
import hljs from "highlight.js";

type Props = {
    language: string,
    children: ComponentChildren,
};

export function HighlightedCode({language, children}: Props) {
    const code = typeof children === "string" ? children : `invalid type: ${typeof children}`;
    let highlightedCode: {__html: string} | null = null;
    if (language.length > 0) {
        try {
            highlightedCode = {__html: hljs.highlight(code, {language: language, ignoreIllegals: true }).value};
        } catch (e: unknown) {
            // ignore
        }
    }
    return (
        <pre class={highlightedCode ? `hljs language-${language}` : ''}>
            {
                highlightedCode
                    ? <code dangerouslySetInnerHTML={highlightedCode}></code>
                    : <code>{code}</code>
            }
        </pre>
    );
}
