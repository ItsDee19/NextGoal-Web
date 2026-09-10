import { lookup } from 'node:dns';
import { isIP } from 'node:net';

export class UnsafeApplicationAddressError extends Error {
    readonly code = 'UNSAFE_APPLICATION_ADDRESS';
}

/** Accept ordinary public web links; never allow executable URLs or local services. */
export function normalizeApplicationUrl(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\u007f\\]/.test(value)) return null;
    try {
        const url = new URL(value.trim());
        const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
        if (url.port && !['80', '443'].includes(url.port)) return null;
        if (isIP(hostname) || hostname.startsWith('[') || !hostname.includes('.')) return null;
        if (/(^|\.)(localhost|local|internal|test|invalid|example)$/.test(hostname)) return null;
        if (/^(example\.(com|org|net)|metadata\.google\.internal)$/.test(hostname)) return null;
        return url.href;
    } catch {
        return null;
    }
}

export function isPublicAddress(address: string): boolean {
    if (isIP(address) === 4) {
        const [a, b] = address.split('.').map(Number);
        return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
            (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) ||
            (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0));
    }
    // Only global unicast IPv6; excludes loopback, mapped IPv4, link-local and private ranges.
    return isIP(address) === 6 && /^[23]/i.test(address) &&
        !/^2001:0*db8:/i.test(address) && !/^2001:0{1,4}:/i.test(address) && !/^2002:/i.test(address);
}

/** Validate the actual DNS answers used by the socket, including on every redirect. */
export const publicDnsLookup = (hostname: string, options: any, callback: any): void => {
    lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
        if (error) return callback(error);
        if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
            return callback(new UnsafeApplicationAddressError('Application URL resolves to a non-public address'));
        }
        const family = typeof options === 'number' ? options : options?.family;
        const available = family ? addresses.filter((item) => item.family === family) : addresses;
        if (!available.length) return callback(new Error('No public address for requested family'));
        if (options?.all) return callback(null, available);
        callback(null, available[0].address, available[0].family);
    });
};
