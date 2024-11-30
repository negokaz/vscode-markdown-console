import * as vscode from 'vscode';
import * as path from 'path';

declare var __webpack_require__: any;
declare var __non_webpack_require__: any;

/**
 * Loads VS Code built-in module dynamically.
 * 
 * VS Code extensions can not bundle node native modules such as 'node-pty'
 * since the modules must be compiled against the exactly same version of node that VS Code uses.
 * This function allows this extension use the native modules that are included in VS Code.
 * 
 * For more details, see:
 * - https://github.com/microsoft/vscode/issues/658
 * - https://github.com/microsoft/node-pty/issues/582
 * 
 * @param module Module name
 */
export function load(module: string): any {
    const requireFunc = 
        typeof __webpack_require__ === "function" 
            ? __non_webpack_require__ 
            : require;
    try {
        return requireFunc(path.join(vscode.env.appRoot, 'node_modules',  module));
    } catch (e) {
        // ignore
    }
    try {
        return requireFunc(path.join(vscode.env.appRoot, 'node_modules.asar', module));
    } catch (e) {
        // ignore
    }
    return requireFunc(module);
}
