import fg from 'fast-glob';
import { BaseNotification } from './base-notification';
import { registerNotificationType } from './notification.registry';
import path from 'path';
import * as fs from 'node:fs';

interface AutoDiscoverOptions {
    /**
     * Optional list of base directories to scan.
     * Defaults to ['src', 'dist'] relative to process.cwd().
     */
    directories?: string[];
}

/**
 * Auto-discovers and registers all classes extending BaseNotification
 * from any file ending with `.notification.ts` or `.notification.js`
 * under the specified directories.
 */
export async function autoDiscoverNotifications(options: AutoDiscoverOptions = {}): Promise<void> {
    const baseDirs = options.directories?.length
        ? options.directories.map((dir) => path.resolve(process.cwd(), dir))
        : [path.resolve(process.cwd(), 'src'), path.resolve(process.cwd(), 'dist')];

    const existingDirs = baseDirs.filter((dir) => fs.existsSync(dir));
    if (!existingDirs.length) return;

    const patterns = baseDirs.map((dir) => `${dir}/**/*.notification.{ts,js}`);
    const files = await fg(patterns, {
        absolute: true,
        ignore: ['**/node_modules/**', '**/*.d.ts'],
    });

    const seen = new Set<string>();

    for (const file of files) {
        const ext = path.extname(file);
        const baseName = file.replace(/\.(ts|js)$/, '');

        if (seen.has(baseName)) {
            continue;
        }

        seen.add(baseName);

        if (ext === '.ts' && fs.existsSync(`${baseName}.js`)) {
            continue;
        }

        try {
            const module = await import(file);
            for (const exported of Object.values(module)) {
                if (typeof exported === 'function' && isSubclassOf(exported, BaseNotification)) {
                    const type = (exported as any).type ?? exported.name;
                    if (!type) continue;
                    registerNotificationType(
                        type,
                        exported as new (...args: any[]) => BaseNotification,
                    );
                }
            }
        } catch (err) {
            console.warn(`Skipped ${file}`);
        }
    }
}

/**
 * Determines whether a given subclass is derived from a specified superclass.
 *
 * @param {any} subclass - The constructor function or class to be checked for inheritance.
 * @param {any} superclass - The constructor function or class to check against as the parent.
 * @return {boolean} True if the subclass is derived from the superclass; otherwise, false.
 */
export function isSubclassOf(subclass: any, superclass: any): boolean {
    return typeof subclass === 'function' && subclass.prototype instanceof superclass;
}
