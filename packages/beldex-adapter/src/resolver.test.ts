import { describe, it, expect } from 'vitest';
import { validateBnsName, MAX_NAME_LENGTH } from './resolver';

describe('validateBnsName', () => {
  it('accepts a valid BNS name', () => {
    expect(validateBnsName('merchant.bdx')).toEqual({ valid: true });
    expect(validateBnsName('lynx123.bdx')).toEqual({ valid: true });
    expect(validateBnsName('0-lynx.bdx')).toEqual({ valid: true });
  });

  it('rejects empty names', () => {
    expect(validateBnsName('')).toEqual({ valid: false, reason: 'Enter a BNS name.' });
    expect(validateBnsName('   ')).toEqual({ valid: false, reason: 'Enter a BNS name.' });
  });

  it('rejects wrong suffix', () => {
    expect(validateBnsName('merchant.eth')).toMatchObject({
      valid: false,
      reason: expect.stringContaining('.bdx'),
    });
    expect(validateBnsName('merchant')).toMatchObject({ valid: false });
  });

  it('rejects invalid characters', () => {
    expect(validateBnsName('#lynx.bdx')).toMatchObject({ valid: false });
    expect(validateBnsName('$_$lynx.bdx')).toMatchObject({ valid: false });
    expect(validateBnsName('Lynx-.bdx')).toMatchObject({ valid: false });
  });

  it('rejects uppercase names with an accurate reason', () => {
    expect(validateBnsName('Merchant.BDX')).toEqual({
      valid: false,
      reason: 'Use only lowercase letters, numbers, and hyphens.',
    });
  });

  it('rejects leading/trailing/consecutive hyphens', () => {
    expect(validateBnsName('-lynx.bdx')).toMatchObject({ valid: false });
    expect(validateBnsName('lynx-.bdx')).toMatchObject({ valid: false });
    expect(validateBnsName('lynx--x.bdx')).toMatchObject({ valid: false });
  });

  it('rejects empty label before suffix', () => {
    expect(validateBnsName('.bdx')).toMatchObject({ valid: false });
  });

  it('rejects excessively long names', () => {
    const long = 'a'.repeat(MAX_NAME_LENGTH + 1) + '.bdx';
    expect(validateBnsName(long)).toMatchObject({ valid: false });
  });
});
