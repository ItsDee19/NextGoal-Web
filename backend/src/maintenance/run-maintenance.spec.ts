import { MaintenanceServices, parseMaintenanceOptions, runMaintenance } from './run-maintenance';

function services(): jest.Mocked<MaintenanceServices> {
    return {
        refresh: jest.fn().mockResolvedValue({ total: 12, added: 8, updated: 4, successful: 2, failed: 0, errors: 0, englishReady: 10, translationPending: 2 }),
        translate: jest.fn().mockResolvedValue({ examined: 2, ready: 0, pending: 2, failed: 0, skipped: 0 }),
        verify: jest.fn().mockResolvedValue({ verified: 8, markedInactive: 1, errors: 0, inconclusive: 3 }),
        close: jest.fn().mockResolvedValue(undefined),
    };
}

describe('maintenance runner', () => {
    test('refreshes, retries translations and verifies in order, then closes all connections', async () => {
        const dependencies = services();
        const result = await runMaintenance(dependencies, parseMaintenanceOptions([]));
        const order = (['refresh', 'translate', 'verify', 'close'] as const).map(method => dependencies[method].mock.invocationCallOrder[0]);
        expect(order).toEqual([...order].sort((a, b) => a - b));
        expect(result.success).toBe(true);
        expect(result.stages.map(stage => stage.status)).toEqual(['completed', 'completed', 'completed']);
        expect(dependencies.translate).toHaveBeenCalledWith({ force: false, limit: 1000 });
    });

    test('pending non-English jobs and inconclusive application checks are retained without failing the workflow', async () => {
        const result = await runMaintenance(services(), parseMaintenanceOptions([]));
        expect(result.success).toBe(true);
        expect(result.stages[1].counts?.pending).toBe(2);
        expect(result.stages[2].counts?.inconclusive).toBe(3);
    });

    test('reports partial source failure but continues translation, verification and cleanup', async () => {
        const dependencies = services();
        dependencies.refresh.mockResolvedValue({ total: 4, added: 4, updated: 0, successful: 1, failed: 1, errors: 2, englishReady: 4, translationPending: 0 });
        const result = await runMaintenance(dependencies, parseMaintenanceOptions([]));
        expect(result.success).toBe(false);
        expect(result.stages[0].status).toBe('failed');
        expect(dependencies.translate).toHaveBeenCalledTimes(1);
        expect(dependencies.verify).toHaveBeenCalledTimes(1);
        expect(dependencies.close).toHaveBeenCalledTimes(1);
    });

    test.each(['refresh', 'translate', 'verify'] as const)('continues after a thrown %s error without exposing its contents', async (method) => {
        const dependencies = services();
        dependencies[method].mockRejectedValue(new Error('postgres://private-user:secret@private-host/db'));
        const result = await runMaintenance(dependencies, parseMaintenanceOptions([]));
        expect(result.success).toBe(false);
        expect(result.stages.find(stage => stage.stage === method)?.status).toBe('failed');
        expect(JSON.stringify(result)).not.toMatch(/private-user|secret|private-host/);
        expect(dependencies.refresh).toHaveBeenCalledTimes(1);
        expect(dependencies.translate).toHaveBeenCalledTimes(1);
        expect(dependencies.verify).toHaveBeenCalledTimes(1);
        expect(dependencies.close).toHaveBeenCalledTimes(1);
    });

    test('does not copy provider error details or company result payloads into logs', async () => {
        const dependencies = services();
        dependencies.refresh.mockResolvedValue({ total: 0, added: 0, updated: 0, successful: 0, failed: 1, errors: 1, englishReady: 0, translationPending: 0,
            companies: [{ error: 'Token=secret', sourceText: 'private original' }] } as any);
        const result = await runMaintenance(dependencies, parseMaintenanceOptions([]));
        expect(JSON.stringify(result)).not.toMatch(/secret|private original|companies/);
    });

    test.each(['translate', 'verify'] as const)('fails when %s reports errors without throwing', async (method) => {
        const dependencies = services();
        if (method === 'translate') dependencies.translate.mockResolvedValue({ examined: 1, ready: 0, pending: 0, failed: 1, skipped: 0 });
        else dependencies.verify.mockResolvedValue({ verified: 0, markedInactive: 0, errors: 1, inconclusive: 0 });
        const result = await runMaintenance(dependencies, parseMaintenanceOptions([]));
        expect(result.success).toBe(false);
        expect(result.stages.find(stage => stage.stage === method)?.status).toBe('failed');
    });

    test('reports lease contention as a skipped refresh while continuing other maintenance', async () => {
        const dependencies = services();
        dependencies.refresh.mockResolvedValue({ total: 0, added: 0, updated: 0, successful: 0, failed: 0, errors: 0, englishReady: 0, translationPending: 0, skipped: 'already-running' });
        const result = await runMaintenance(dependencies, parseMaintenanceOptions([]));
        expect(result.success).toBe(true);
        expect(result.stages[0]).toMatchObject({ status: 'skipped', reason: 'already-running' });
        expect(dependencies.verify).toHaveBeenCalledTimes(1);
    });

    test('runs only the requested stage and honors explicit retry options', async () => {
        const dependencies = services();
        const result = await runMaintenance(dependencies, parseMaintenanceOptions(['--operation=translate', '--force-translation', '--translation-limit=25']));
        expect(result.stages.map(stage => stage.stage)).toEqual(['translate']);
        expect(dependencies.refresh).not.toHaveBeenCalled();
        expect(dependencies.verify).not.toHaveBeenCalled();
        expect(dependencies.translate).toHaveBeenCalledWith({ force: true, limit: 25 });
        expect(dependencies.close).toHaveBeenCalledTimes(1);
    });

    test('reports cleanup failure without exposing connection errors', async () => {
        const dependencies = services();
        dependencies.close.mockRejectedValue(new Error('redis://private-token@host:6379'));
        const result = await runMaintenance(dependencies, parseMaintenanceOptions([]));
        expect(result.success).toBe(false);
        expect(result.stages[result.stages.length - 1]).toMatchObject({ stage: 'close', status: 'failed' });
        expect(JSON.stringify(result)).not.toContain('private-token');
    });

    test('closes connections when application initialization fails before any maintenance starts', async () => {
        const dependencies = services();
        dependencies.initialize = jest.fn().mockRejectedValue(new Error('postgres://private-user:secret@private-host/db'));
        const result = await runMaintenance(dependencies, parseMaintenanceOptions([]));
        expect(result.success).toBe(false);
        expect(result.stages).toEqual([{ stage: 'initialize', status: 'failed', reason: expect.any(String) }]);
        expect(dependencies.refresh).not.toHaveBeenCalled();
        expect(dependencies.translate).not.toHaveBeenCalled();
        expect(dependencies.verify).not.toHaveBeenCalled();
        expect(dependencies.close).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(result)).not.toMatch(/private-user|secret|private-host/);
    });

    test.each(['--operation=delete', '--translation-limit=0', '--translation-limit=-2', '--translation-limit=1.5', '--translation-limit=Infinity', '--translation-limit=9007199254740992', '--jwt=secret'])('rejects unsafe or invalid input %s', (argument) => {
        expect(() => parseMaintenanceOptions([argument])).toThrow();
    });
});
