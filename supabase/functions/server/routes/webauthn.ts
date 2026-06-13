import type { App } from '../lib/types.ts';
import { WebAuthnServer } from '../deps.ts';
import { requireUser } from '../lib/auth.ts';
import { supabaseAdmin } from '../lib/supabaseAdmin.ts';
import * as kv from '../kv_store.ts';
import { RP_NAME, RP_ID, ORIGIN, base64urlEncode, base64urlDecode } from '../lib/webauthnConfig.ts';

// WebAuthn device enrollment + unlock. register/* require auth (enrolling the
// caller's device); authenticate/* are public by design (Q-E — the unlock flow,
// gating only the cosmetic mobile lock, not data access).
export function registerWebauthn(app: App) {
  app.post('/webauthn/register/options', requireUser, async (c) => {
    const user = c.get('user');

    const { data: devices } = await supabaseAdmin
      .from('user_devices').select('credential_id').eq('user_id', user.id);

    const options = await WebAuthnServer.generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: user.id,
      userName: user.email,
      attestationType: 'none',
      excludeCredentials: devices?.map((d: any) => ({ id: d.credential_id, type: 'public-key' })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    });

    await kv.set(`webauthn:registration:challenge:${user.id}`, { challenge: options.challenge, timestamp: Date.now() });
    return c.json(options);
  });

  app.post('/webauthn/register/verify', requireUser, async (c) => {
    const user = c.get('user');
    const { registrationResponse, deviceName } = await c.req.json();

    const stored = await kv.get(`webauthn:registration:challenge:${user.id}`);
    if (!stored || Date.now() - stored.timestamp > 300000) {
      return c.json({ error: 'Challenge expired or not found' }, 400);
    }

    let verification;
    try {
      verification = await WebAuthnServer.verifyRegistrationResponse({
        response: registrationResponse,
        expectedChallenge: stored.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false,
      });
    } catch (error) {
      console.error('Registration verification failed:', error);
      return c.json({ error: 'Verification failed' }, 400);
    }

    const { verified, registrationInfo } = verification;
    if (!verified || !registrationInfo) {
      return c.json({ error: 'Verification failed' }, 400);
    }

    const { credentialID, credentialPublicKey } = registrationInfo;
    const publicKeyBase64url = base64urlEncode(new Uint8Array(credentialPublicKey));
    const credentialIDBase64url = base64urlEncode(new Uint8Array(credentialID));

    const { error: dbError } = await supabaseAdmin.from('user_devices').insert({
      user_id: user.id,
      credential_id: credentialIDBase64url,
      public_key: publicKeyBase64url,
      device_name: deviceName || 'Unknown Device',
    });
    if (dbError) {
      console.error('DB Error storing device:', dbError);
      return c.json({ error: 'Failed to store device' }, 500);
    }

    await kv.del(`webauthn:registration:challenge:${user.id}`);
    return c.json({ success: true });
  });

  // Public (Q-E): unlock flow identifies the user by email.
  app.post('/webauthn/authenticate/options', async (c) => {
    const { email } = await c.req.json();
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = userData?.users.find((u: any) => u.email === email);
    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const { data: devices } = await supabaseAdmin
      .from('user_devices').select('credential_id').eq('user_id', targetUser.id);
    if (!devices || devices.length === 0) {
      return c.json({ error: 'No registered devices found' }, 400);
    }

    const options = await WebAuthnServer.generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: devices.map((d: any) => ({ id: d.credential_id, type: 'public-key' })),
      userVerification: 'preferred',
    });

    await kv.set(`webauthn:authentication:challenge:${targetUser.id}`, { challenge: options.challenge, timestamp: Date.now() });
    return c.json(options);
  });

  // Public (Q-E).
  app.post('/webauthn/authenticate/verify', async (c) => {
    const { authenticationResponse, email } = await c.req.json();
    if (!email || !authenticationResponse) {
      return c.json({ error: 'Email and response are required' }, 400);
    }

    const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = userData?.users.find((u: any) => u.email === email);
    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const stored = await kv.get(`webauthn:authentication:challenge:${targetUser.id}`);
    if (!stored || Date.now() - stored.timestamp > 300000) {
      return c.json({ error: 'Challenge expired or not found' }, 400);
    }

    const { data: device } = await supabaseAdmin
      .from('user_devices').select('*')
      .eq('user_id', targetUser.id).eq('credential_id', authenticationResponse.id).single();
    if (!device) {
      return c.json({ error: 'Device not found' }, 400);
    }

    let verification;
    try {
      const publicKeyBuffer = base64urlDecode(device.public_key);
      const credentialIDBuffer = base64urlDecode(device.credential_id);
      verification = await WebAuthnServer.verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge: stored.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false,
        authenticator: { credentialID: credentialIDBuffer, credentialPublicKey: publicKeyBuffer, counter: 0 },
      });
    } catch (error) {
      console.error('Authentication verification failed:', error);
      return c.json({ error: 'Verification failed' }, 400);
    }

    if (!verification.verified) {
      return c.json({ error: 'Verification failed' }, 400);
    }

    await supabaseAdmin.from('user_devices').update({ last_used_at: new Date().toISOString() }).eq('id', device.id);
    await kv.del(`webauthn:authentication:challenge:${targetUser.id}`);
    return c.json({ success: true, user_id: targetUser.id });
  });
}
