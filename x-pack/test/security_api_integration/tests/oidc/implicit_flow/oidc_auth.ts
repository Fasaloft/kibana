/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { JSDOM } from 'jsdom';
import { parse as parseCookie, Cookie } from 'tough-cookie';
import { format as formatURL } from 'url';
import { createTokens, getStateAndNonce } from '../../../fixtures/oidc/oidc_tools';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const config = getService('config');

  describe('OpenID Connect Implicit Flow authentication', () => {
    describe('finishing handshake', () => {
      let stateAndNonce: ReturnType<typeof getStateAndNonce>;
      let handshakeCookie: Cookie;

      beforeEach(async () => {
        const handshakeResponse = await supertest
          .post('/internal/security/login')
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'oidc',
            providerName: 'oidc',
            currentURL:
              'https://kibana.com/internal/security/capture-url?next=%2Fabc%2Fxyz%2Fhandshake%3Fone%3Dtwo%2520three&providerType=oidc&providerName=oidc#/workpad',
          })
          .expect(200);

        handshakeCookie = parseCookie(handshakeResponse.headers['set-cookie'][0])!;
        stateAndNonce = getStateAndNonce(handshakeResponse.body.location);
      });

      it('should return an HTML page that will parse URL fragment', async () => {
        const response = await supertest.get('/api/security/oidc/implicit').expect(200);
        const dom = new JSDOM(response.text, {
          url: formatURL({ ...config.get('servers.kibana'), auth: false }),
          runScripts: 'dangerously',
          resources: 'usable',
          beforeParse(window) {
            // JSDOM doesn't support changing of `window.location` and throws an exception if script
            // tries to do that and we have to workaround this behaviour. We also need to wait until our
            // script is loaded and executed, __isScriptExecuted__ is used exactly for that.
            (window as Record<string, any>).__isScriptExecuted__ = new Promise<void>((resolve) => {
              Object.defineProperty(window, 'location', {
                value: {
                  href:
                    'https://kibana.com/api/security/oidc/implicit#token=some_token&access_token=some_access_token',
                  replace(newLocation: string) {
                    this.href = newLocation;
                    resolve();
                  },
                },
              });
            });
          },
        });

        await (dom.window as Record<string, any>).__isScriptExecuted__;

        // Check that proxy page is returned with proper headers.
        expect(response.headers['content-type']).to.be('text/html; charset=utf-8');
        expect(response.headers['cache-control']).to.be(
          'private, no-cache, no-store, must-revalidate'
        );
        expect(response.headers['content-security-policy']).to.be(
          `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`
        );

        // Check that script that forwards URL fragment worked correctly.
        expect(dom.window.location.href).to.be(
          '/api/security/oidc/callback?authenticationResponseURI=https%3A%2F%2Fkibana.com%2Fapi%2Fsecurity%2Foidc%2Fimplicit%23token%3Dsome_token%26access_token%3Dsome_access_token'
        );
      });

      it('should fail if OpenID Connect response is not complemented with handshake cookie', async () => {
        const { idToken, accessToken } = createTokens('1', stateAndNonce.nonce);
        const authenticationResponse = `https://kibana.com/api/security/oidc/implicit#id_token=${idToken}&state=${stateAndNonce.state}&token_type=bearer&access_token=${accessToken}`;

        const unauthenticatedResponse = await supertest
          .get(
            `/api/security/oidc/callback?authenticationResponseURI=${encodeURIComponent(
              authenticationResponse
            )}`
          )
          .expect(401);

        expect(unauthenticatedResponse.headers['content-security-policy']).to.be(
          `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`
        );
        expect(unauthenticatedResponse.text).to.contain('We couldn&#x27;t log you in');
      });

      it('should fail if state is not matching', async () => {
        const { idToken, accessToken } = createTokens('1', stateAndNonce.nonce);
        const authenticationResponse = `https://kibana.com/api/security/oidc/implicit#id_token=${idToken}&state=$someothervalue&token_type=bearer&access_token=${accessToken}`;

        const unauthenticatedResponse = await supertest
          .get(
            `/api/security/oidc/callback?authenticationResponseURI=${encodeURIComponent(
              authenticationResponse
            )}`
          )
          .set('Cookie', handshakeCookie.cookieString())
          .expect(401);

        expect(unauthenticatedResponse.headers['content-security-policy']).to.be(
          `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`
        );
        expect(unauthenticatedResponse.text).to.contain('We couldn&#x27;t log you in');
      });

      it('should succeed if both the OpenID Connect response and the cookie are provided', async () => {
        const { idToken, accessToken } = createTokens('1', stateAndNonce.nonce);
        const authenticationResponse = `https://kibana.com/api/security/oidc/implicit#id_token=${idToken}&state=${stateAndNonce.state}&token_type=bearer&access_token=${accessToken}`;

        const oidcAuthenticationResponse = await supertest
          .get(
            `/api/security/oidc/callback?authenticationResponseURI=${encodeURIComponent(
              authenticationResponse
            )}`
          )
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);

        // User should be redirected to the URL that initiated handshake.
        expect(oidcAuthenticationResponse.headers.location).to.be(
          '/abc/xyz/handshake?one=two%20three#/workpad'
        );

        const cookies = oidcAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const sessionCookie = parseCookie(cookies[0])!;
        expect(sessionCookie.key).to.be('sid');
        expect(sessionCookie.value).to.not.be.empty();
        expect(sessionCookie.path).to.be('/');
        expect(sessionCookie.httpOnly).to.be(true);

        const apiResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);
        expect(apiResponse.body).to.only.have.keys([
          'username',
          'full_name',
          'email',
          'roles',
          'metadata',
          'enabled',
          'authentication_realm',
          'lookup_realm',
          'authentication_provider',
          'authentication_type',
        ]);

        expect(apiResponse.body.username).to.be('user1');
        expect(apiResponse.body.authentication_realm).to.eql({ name: 'oidc1', type: 'oidc' });
        expect(apiResponse.body.authentication_provider).to.eql({ type: 'oidc', name: 'oidc' });
        expect(apiResponse.body.authentication_type).to.be('token');
      });
    });
  });
}
