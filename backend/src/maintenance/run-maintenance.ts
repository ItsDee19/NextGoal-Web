export type MaintenanceOperation = 'all' | 'refresh' | 'translate' | 'verify';

export interface MaintenanceOptions {
    operation: MaintenanceOperation;
    forceTranslation: boolean;
    translationLimit: number;
}

export interface MaintenanceServices {
    initialize?(): Promise<void>;
    refresh(): Promise<{ total: number; added: number; updated: number; successful: number; failed: number;
        errors: number; englishReady: number; translationPending: number; skipped?: 'already-running' | 'not-due' }>;
    translate(options: { force: boolean; limit: number }): Promise<{ examined: number; ready: number; pending: number; failed: number; skipped: number }>;
    verify(): Promise<{ verified: number; markedInactive: number; errors: number; inconclusive: number }>;
    close(): Promise<void>;
}

export interface MaintenanceStageResult {
    stage: 'initialize' | 'refresh' | 'translate' | 'verify' | 'close';
    status: 'completed' | 'failed' | 'skipped';
    counts?: Record<string, number>;
    reason?: string;
}

export interface MaintenanceResult {
    success: boolean;
    stages: MaintenanceStageResult[];
}

/** Errors may contain credentials or source text. Only fixed reasons and selected counters leave the runner. */
function counts(result: object, keys: string[]): Record<string, number> {
    const values = result as Record<string, unknown>;
    return Object.fromEntries(keys.map((key) => [key, typeof values[key] === 'number' ? values[key] : 0]));
}

export function parseMaintenanceOptions(args: string[]): MaintenanceOptions {
    const options: MaintenanceOptions = { operation: 'all', forceTranslation: false, translationLimit: 1000 };
    for (const argument of args) {
        if (argument.startsWith('--operation=')) {
            const operation = argument.slice('--operation='.length);
            if (!['all', 'refresh', 'translate', 'verify'].includes(operation)) throw new Error('Invalid maintenance operation');
            options.operation = operation as MaintenanceOperation;
        } else if (argument === '--force-translation') {
            options.forceTranslation = true;
        } else if (argument.startsWith('--translation-limit=')) {
            const value = argument.slice('--translation-limit='.length);
            if (!/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('Invalid translation limit');
            options.translationLimit = Number(value);
        } else {
            throw new Error('Unrecognized maintenance argument');
        }
    }
    return options;
}

/** Run independent stages even after a partial failure, and always release database/Redis connections. */
export async function runMaintenance(services: MaintenanceServices, options: MaintenanceOptions): Promise<MaintenanceResult> {
    const stages: MaintenanceStageResult[] = [];
    const selected = (operation: MaintenanceOperation) => options.operation === 'all' || options.operation === operation;
    try {
        await services.initialize?.();
        if (selected('refresh')) {
            try {
                const result = await services.refresh();
                stages.push({ stage: 'refresh', status: result.skipped ? 'skipped' : result.failed > 0 || result.errors > 0 ? 'failed' : 'completed',
                    counts: counts(result, ['total', 'added', 'updated', 'successful', 'failed', 'errors', 'englishReady', 'translationPending']),
                    ...(result.skipped ? { reason: result.skipped } : {}) });
            } catch {
                stages.push({ stage: 'refresh', status: 'failed', reason: 'Refresh failed; check source, database and Redis configuration.' });
            }
        }
        if (selected('translate')) {
            try {
                const result = await services.translate({ force: options.forceTranslation, limit: options.translationLimit });
                stages.push({ stage: 'translate', status: result.failed > 0 ? 'failed' : 'completed',
                    counts: counts(result, ['examined', 'ready', 'pending', 'failed', 'skipped']) });
            } catch {
                stages.push({ stage: 'translate', status: 'failed', reason: 'English publication failed; check database and translation configuration.' });
            }
        }
        if (selected('verify')) {
            try {
                const result = await services.verify();
                stages.push({ stage: 'verify', status: result.errors > 0 ? 'failed' : 'completed',
                    counts: counts(result, ['verified', 'markedInactive', 'errors', 'inconclusive']) });
            } catch {
                stages.push({ stage: 'verify', status: 'failed', reason: 'Application-link verification failed; check database and network access.' });
            }
        }
    } catch {
        stages.push({ stage: 'initialize', status: 'failed', reason: 'Maintenance could not initialize; check database migrations and connection configuration.' });
    } finally {
        try { await services.close(); }
        catch { stages.push({ stage: 'close', status: 'failed', reason: 'Could not close maintenance connections cleanly.' }); }
    }
    return { success: stages.every((stage) => stage.status !== 'failed'), stages };
}
