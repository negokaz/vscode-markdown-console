import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'yaml';
import { promises as fs, constants as fsConstants } from 'fs';
import fastGlob from 'fast-glob';
import { merge } from 'merge-anything'; 
import * as micromustache from 'micromustache';

type ConfigSchema = {
    env?: any,
    variable?: any,
};

export class Config {

    public static async load(documentUri: vscode.Uri): Promise<Config> {
        const documentDirectoryPath = vscode.Uri.file(path.dirname(documentUri.fsPath));
        const configPath = await this.findConfigFile(documentDirectoryPath.fsPath);
        if (configPath) {
            const basePath = vscode.Uri.file(path.dirname(configPath.fsPath));
            const config = fs.readFile(configPath.fsPath, 'utf-8').then(data => {
                const parsed = yaml.parse(data) as ConfigSchema | null;
                return parsed ? parsed : {} as ConfigSchema;
            });
            const extraConfigPaths = await this.findExtraConfigFiles(basePath.fsPath);
            const extraConfigs = Promise.all(
                extraConfigPaths.map(async (p) => {
                    const data = fs.readFile(p.fsPath, 'utf-8');
                    const parsed =  yaml.parse(await data) as ConfigSchema | null;
                    return parsed ? parsed : {} as ConfigSchema;
                })
            );
            const allConfigs: ConfigSchema[] = 
                [await config].concat(await extraConfigs);
            const baseEnv = this.createBaseEnv(basePath, documentDirectoryPath);
            const envEntries: [string, string][] = 
                allConfigs.reduce<[string, any][]>((acc, c) => {
                    return c.env ? acc.concat(Object.entries(c.env)) : acc;
                }, [])
                .map(([k, v]) => {
                    if (Array.isArray(v)) {
                        return [k, v.reduce((acc, v) => acc + v, '')];
                    } else {
                        return [k, v.toString()];
                    }
                })
                .map(([k, v]) => {
                    return [k, micromustache.render(v, baseEnv)];
                });
            const variable: any =
                allConfigs.reduce<any>((acc, c) => {
                    return c.variable ? merge(acc, c.variable) : acc;
                }, {});
            const env: Map<string, any> = new Map(envEntries);
            const configUris = [configPath].concat(extraConfigPaths);
            return new Config(configUris, documentUri, basePath, documentDirectoryPath, baseEnv, env, variable);
        } else {
            const baseEnv = this.createBaseEnv(documentDirectoryPath, documentDirectoryPath);
            return new Config([], documentUri, documentDirectoryPath, documentDirectoryPath, baseEnv, new Map(), {});
        }
    }

    private static async findConfigFile(directoryPath: string): Promise<vscode.Uri | null> {
        const parentDir = path.dirname(directoryPath);
        if (directoryPath === parentDir) {
            // arrived at root directory
            return Promise.resolve(null);
        } else {
            const configPath = path.join(directoryPath, 'markdown-console.yml');
            return fs.access(configPath, fsConstants.R_OK)
                .then(_ => vscode.Uri.file(configPath))
                .catch(_ => this.findConfigFile(parentDir));
        }
    }

    private static async findExtraConfigFiles(basePath: string): Promise<vscode.Uri[]> {
        return fastGlob(['markdown-console_*.yml'], { cwd: basePath }).then(paths => {
            return paths.sort((a, b) => {
                if (a < b) {
                    return -1;
                } else if (a > b) {
                    return 1;
                } else {
                    return 0;
                }
            }).map(p => vscode.Uri.file(path.join(basePath, p)));
        });
    }

    private static createBaseEnv(basePath: vscode.Uri, workingDirectory: vscode.Uri): NodeJS.ProcessEnv {
        return Object.assign({} as any, process.env, {
            'MDCON_BASE_DIR': basePath.fsPath,
            'MDCON_WORKING_DIR': workingDirectory.fsPath,
        });
    }

    public readonly env: NodeJS.ProcessEnv;

    private constructor(
        public readonly configUris: vscode.Uri[],
        public readonly documentUri: vscode.Uri,
        public readonly baseDirectry: vscode.Uri,
        public readonly workingDirectory: vscode.Uri,
        baseEnv: NodeJS.ProcessEnv,
        env: Map<string, string>,
        public readonly variable: any,
    ) {
        const originalEnv = Object.assign({} as any, baseEnv);
        // assign configured env
        this.env = Array.from(env.entries())
            .reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, originalEnv);
    }

    public get dataDirectory(): vscode.Uri {
        return vscode.Uri.file(path.join(this.baseDirectry.fsPath, 'markdown-console'));
    }

    public get dbUri(): vscode.Uri {
        const relativePath = path.relative(this.baseDirectry.fsPath, this.workingDirectory.fsPath);
        return vscode.Uri.file(path.join(this.dataDirectory.fsPath, 'data', relativePath, `${this.documentName}.db`));
    }

    public get snapshotUri(): vscode.Uri {
        const relativePath = path.relative(this.baseDirectry.fsPath, this.workingDirectory.fsPath);
        return vscode.Uri.file(path.join(this.dataDirectory.fsPath, 'snapshot', relativePath, `${this.documentName}.html`));
    }

    public get documentName(): string {
        return path.basename(this.documentUri.fsPath, '.con.md');
    }
}
