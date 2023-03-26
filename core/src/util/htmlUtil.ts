export default class HtmlUtil {

    public static escapeHtml(text: string): string {
        return text.replace(/[&'`"<>]/g, (match) => {
            switch (match) {
                case '&':
                    return '&amp;';
                case "'":
                    return '&#x27;';
                case '`':
                    return '&#x60;';
                case '"':
                    return '&quot;';
                case '<':
                    return '&lt;';
                case '>':
                    return '&gt;';
                default:
                    throw new Error(`unhandled: [${match}]`);
            }
        });
    }
}
