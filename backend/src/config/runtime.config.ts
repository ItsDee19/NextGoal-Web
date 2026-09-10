type Environment = Record<string, unknown>;

export function appMode(env: Environment = process.env): 'api' | 'combined' {
    const mode = env.APP_MODE || 'combined';
    if (mode !== 'api' && mode !== 'combined') throw new Error('APP_MODE must be api or combined');
    return mode;
}

export function frontendOrigins(value: unknown, production = false): string[] {
    const configured = typeof value === 'string' ? value.trim() : '';
    if (!configured && production) throw new Error('FRONTEND_URL is required in production');
    const origins = (configured || 'http://localhost:3000').split(',').map((origin) => origin.trim());
    for (const origin of origins) {
        let url: URL;
        try { url = new URL(origin); } catch { throw new Error('FRONTEND_URL must contain exact HTTP(S) origins separated by commas'); }
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash ||
            url.pathname !== '/' || url.hostname.includes('*') || origin !== url.origin || (production && url.protocol !== 'https:')) {
            throw new Error('FRONTEND_URL must contain exact origins without paths, trailing slashes or wildcards; production requires HTTPS');
        }
    }
    return [...new Set(origins)];
}

function requireConnection(env: Environment, name: string, protocols: string[]) {
    const value = env[name];
    try {
        if (typeof value !== 'string' || !value) throw new Error();
        const url = new URL(value);
        if (!protocols.includes(url.protocol) || !url.hostname) throw new Error();
    } catch {
        // Never include connection strings or credentials in startup errors.
        throw new Error(`${name} must be a valid ${protocols.map((protocol) => protocol.slice(0, -1)).join('/')} connection URL`);
    }
}

export function validateHttpEnvironment(env: Environment): Environment {
    const mode = appMode(env);
    const production = env.NODE_ENV === 'production';
    frontendOrigins(env.FRONTEND_URL, production);
    if (env.PORT !== undefined && (!/^\d+$/.test(String(env.PORT)) || Number(env.PORT) < 1 || Number(env.PORT) > 65535)) {
        throw new Error('PORT must be an integer between 1 and 65535');
    }
    if (production) {
        requireConnection(env, 'DATABASE_URL', ['postgres:', 'postgresql:']);
        requireConnection(env, 'DIRECT_URL', ['postgres:', 'postgresql:']);
        const secret = env.JWT_SECRET;
        if (typeof secret !== 'string' || secret.length < 32 || /change.in.production|your.super.secret|placeholder/i.test(secret)) {
            throw new Error('JWT_SECRET must be a unique secret of at least 32 characters in production');
        }
        if (mode === 'combined') requireConnection(env, 'REDIS_URL', ['redis:', 'rediss:']);
    }
    return env;
}

export function validateMaintenanceEnvironment(env: Environment): Environment {
    requireConnection(env, 'DATABASE_URL', ['postgres:', 'postgresql:']);
    requireConnection(env, 'DIRECT_URL', ['postgres:', 'postgresql:']);
    requireConnection(env, 'REDIS_URL', ['redis:', 'rediss:']);
    return env;
}
