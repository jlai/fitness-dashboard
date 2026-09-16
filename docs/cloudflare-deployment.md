# Cloudflare deployment

For hosted setups, the dashboard is mainly written to run on Cloudflare. Keep in mind that
hosted deployments will be limited to ~100 users unless you go through a potentially expensive
[security review](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).

# Setup

## KV

Create a KV store for revoked sessions. Copy the ID for use in the build-time variable `CF_BINDING_SESSION_REVOCATION`.

## Secrets Store

The secret store currently needs to be manually seeded. Generate initial keys and manually upload
the secrets to the Secrets Store in the Cloudflare dashboard.

```sh
node -e "const {randomBytes}=require('crypto'); console.log(JSON.stringify({kty:'oct',kid:'session-1',alg:'HS256',k:randomBytes(32).toString('base64url'),iat:Math.floor(Date.now()/1000)}))"
node -e "const {randomBytes}=require('crypto'); console.log(JSON.stringify({kty:'oct',kid:'health-1',alg:'A256GCM',k:randomBytes(32).toString('base64url'),iat:Math.floor(Date.now()/1000)}))"
```

Copy the ID of the Secrets Store (there's only one per account) to the build-time variable `CF_BINDING_SECRETS_STORE_ID`.

## Worker setup

Build command: `npm run build:cf`

Deploy command: `npm run deploy:cf`
