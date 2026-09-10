import { isPublicAddress, normalizeApplicationUrl } from './application-url';

describe('application URLs', () => {
    it('preserves a real provider URL including its application path and query', () => {
        expect(normalizeApplicationUrl(' https://jobs.lever.co/acme/123/apply?source=NextGoal '))
            .toBe('https://jobs.lever.co/acme/123/apply?source=NextGoal');
    });

    it.each([
        'javascript:alert(1)', 'data:text/html,test', '/relative', 'https://user:pass@jobs.lever.co/job',
        'http://localhost/job', 'http://127.0.0.1/job', 'http://2130706433/job', 'http://[::1]/job',
        'https://metadata.google.internal/job', 'https://corp.local/job', 'https://jobs.lever.co:8080/job',
        'https://jobs.lever.co\\@localhost/job', 'https://jobs.lever.co/\njob',
    ])('rejects unsafe destination %s', (url) => {
        expect(normalizeApplicationUrl(url)).toBeNull();
    });

    it.each(['127.0.0.1', '10.0.0.1', '172.16.1.1', '192.168.1.1', '169.254.169.254',
        '100.100.100.200', '0.0.0.0', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1', '2001:db8::1'])
    ('rejects private and reserved DNS answer %s', (address) => {
        expect(isPublicAddress(address)).toBe(false);
    });

    it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('accepts public DNS answer %s', (address) => {
        expect(isPublicAddress(address)).toBe(true);
    });
});
