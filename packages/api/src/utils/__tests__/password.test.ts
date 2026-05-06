import { hashPassword, comparePassword } from '../password';

describe('utils/password', () => {
    it('hashPassword returns a bcrypt-formatted hash, not the plaintext', async () => {
        const hash = await hashPassword('correcthorsebatterystaple');

        expect(hash).not.toBe('correcthorsebatterystaple');
        expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('comparePassword returns true for the matching plaintext', async () => {
        const hash = await hashPassword('hunter2');
        await expect(comparePassword('hunter2', hash)).resolves.toBe(true);
    });

    it('comparePassword returns false for a non-matching plaintext', async () => {
        const hash = await hashPassword('hunter2');
        await expect(comparePassword('not-it', hash)).resolves.toBe(false);
    });
});
