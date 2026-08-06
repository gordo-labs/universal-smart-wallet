import { describe, expect, it } from 'vitest';
import {
  buildOpenId4VpRequest,
  parseOpenId4VpRequest,
  verifyOpenId4VpDirectPost,
} from '../dist/index.js';

const request = () =>
  buildOpenId4VpRequest({
    clientId: 'https://verifier.example',
    responseUri: 'https://verifier.example/cb',
    nonce: 'nonce-1',
    state: 'state-1',
    dcqlQuery: { credentials: [] },
  });

describe('OpenID4VP same-device direct_post', () => {
  it('builds and parses a strict request', async () => {
    const value = request();
    const parsed = await parseOpenId4VpRequest(value, {
      resolveVerifier: async () => true,
    });
    expect(parsed.client_id).toBe(value.client_id);
  });
  it('rejects duplicate and untrusted parameters', async () => {
    await expect(
      parseOpenId4VpRequest(
        'https://verifier.example/authorize?response_type=vp_token&response_type=vp_token',
      ),
    ).rejects.toMatchObject({ code: 'duplicate_parameter' });
    await expect(
      parseOpenId4VpRequest(
        'https://verifier.example/authorize?request_uri=https%3A%2F%2Fverifier.example%2Fr',
      ),
    ).rejects.toMatchObject({ code: 'untrusted_request' });
  });

  it('requires HTTPS and trusted hooks for remote or transaction-bound requests', async () => {
    await expect(
      parseOpenId4VpRequest(
        'https://verifier.example/authorize?response_type=vp_token&response_mode=direct_post&client_id=https%3A%2F%2Fverifier.example&response_uri=http%3A%2F%2Fverifier.example%2Fcb&nonce=n&state=s&dcql_query=%7B%22credentials%22%3A%5B%5D%7D',
      ),
    ).rejects.toMatchObject({ code: 'insecure_origin' });
    await expect(
      parseOpenId4VpRequest({
        response_type: 'vp_token',
        response_mode: 'direct_post',
        client_id: 'https://verifier.example',
        response_uri: 'https://verifier.example/cb',
        nonce: 'n',
        state: 's',
        dcql_query: { credentials: [] },
        transaction_data: ['tx'],
      }),
    ).rejects.toMatchObject({ code: 'invalid_transaction_data' });
    await expect(
      parseOpenId4VpRequest(
        {
          response_type: 'vp_token',
          response_mode: 'direct_post',
          client_id: 'https://verifier.example',
          response_uri: 'https://verifier.example/cb',
          nonce: 'n',
          state: 's',
          dcql_query: { credentials: [] },
          transaction_data: ['tx'],
        },
        { validateTransactionData: async () => false },
      ),
    ).rejects.toMatchObject({ code: 'invalid_transaction_data' });
  });
  it('consumes state before verification and rejects replay/disclosure mismatch', async () => {
    const value = request();
    let consumed = false;
    const verify = () =>
      Promise.resolve({
        disclosures: ['approved'],
        claims: { is_over_18: true },
      });
    const input = {
      body: 'state=state-1&vp_token=token',
      expected: value,
      consumeState: (state) =>
        !consumed && state === 'state-1' && ((consumed = true), true),
      verifyVpToken: verify,
      expectedDisclosures: ['approved'],
    };
    await expect(verifyOpenId4VpDirectPost(input)).resolves.toHaveProperty(
      'claims.is_over_18',
      true,
    );
    await expect(verifyOpenId4VpDirectPost(input)).rejects.toMatchObject({
      code: 'replay',
    });
  });
  it('rejects wrong state and exact disclosure violations', async () => {
    const value = request();
    await expect(
      verifyOpenId4VpDirectPost({
        body: 'state=bad&vp_token=token',
        expected: value,
        consumeState: () => true,
        verifyVpToken: async () => ({ disclosures: [], claims: {} }),
        expectedDisclosures: [],
      }),
    ).rejects.toMatchObject({ code: 'state_mismatch' });
    await expect(
      verifyOpenId4VpDirectPost({
        body: 'state=state-1&vp_token=token',
        expected: value,
        consumeState: () => true,
        verifyVpToken: async () => ({ disclosures: ['extra'], claims: {} }),
        expectedDisclosures: [],
      }),
    ).rejects.toMatchObject({ code: 'disclosure_mismatch' });
  });

  it('consumes state only after size and parameter checks, and rejects duplicates', async () => {
    const value = request();
    let consumed = 0;
    const verify = async () => ({ disclosures: [], claims: {} });
    const base = {
      expected: value,
      consumeState: () => ((consumed += 1), true),
      verifyVpToken: verify,
    };
    await expect(
      verifyOpenId4VpDirectPost({
        ...base,
        body: 'state=s&state=s&vp_token=t',
      }),
    ).rejects.toMatchObject({ code: 'duplicate_parameter' });
    await expect(
      verifyOpenId4VpDirectPost({
        ...base,
        body: `state=${value.state}&vp_token=${'x'.repeat(8_193)}`,
      }),
    ).rejects.toMatchObject({ code: 'invalid_request' });
    expect(consumed).toBe(0);
  });
});
