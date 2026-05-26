import { createApp } from './app.js';
import { JwksCache } from './jwt/jwks.cache.js';

const PORT = Number(process.env['PORT'] ?? 3001);
const TENANT = process.env['AZURE_TENANT_ID'] ?? '';
const AUD = process.env['AZURE_CLIENT_ID'] ?? '';
const JWKS_URI = `https://login.microsoftonline.com/${TENANT}/discovery/v2.0/keys`;
const ISS = `https://login.microsoftonline.com/${TENANT}/v2.0`;

const jwksCache = new JwksCache({ jwksUri: JWKS_URI });

const app = createApp({
  jwksCache,
  aud: AUD,
  iss: ISS,
  upstreams: {
    'ms-auth': 'http://ms-auth:4000',
    'ms-crear': 'http://ms-crear:4001',
    'ms-modificar': 'http://ms-modificar:4002',
    'ms-consultar': 'http://ms-consultar:4003',
    'ms-borrar': 'http://ms-borrar:4004',
    'ms-log': 'http://ms-log:4005',
  },
});

app.listen(PORT, () => {
  process.stdout.write(`api-gateway middleware listening on :${PORT}\n`);
});
