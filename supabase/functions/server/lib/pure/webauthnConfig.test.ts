import { describe, it, expect } from 'vitest';
import { missingWebauthnConfigVars } from './webauthnConfig';

describe('missingWebauthnConfigVars', () => {
  it('returns an empty list when both vars are set', () => {
    expect(missingWebauthnConfigVars('gigwrangler.com', 'https://gigwrangler.com')).toEqual([]);
  });

  it('names RP_ID when only it is missing', () => {
    expect(missingWebauthnConfigVars(undefined, 'https://gigwrangler.com')).toEqual(['RP_ID']);
  });

  it('names ORIGIN when only it is missing', () => {
    expect(missingWebauthnConfigVars('gigwrangler.com', undefined)).toEqual(['ORIGIN']);
  });

  it('names both when both are missing', () => {
    expect(missingWebauthnConfigVars(undefined, undefined)).toEqual(['RP_ID', 'ORIGIN']);
  });

  it('treats an empty string the same as unset', () => {
    expect(missingWebauthnConfigVars('', '')).toEqual(['RP_ID', 'ORIGIN']);
  });
});
