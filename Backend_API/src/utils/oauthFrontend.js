const http = require('node:http');

function localClientAvailable(origin) {
  return new Promise(resolve => {
    let finished = false;
    const finish = value => {
      if (finished) return;
      finished = true;
      clearTimeout(deadline);
      resolve(value);
    };
    const request = http.get(origin, response => {
      response.resume();
      finish(response.statusCode === 200 && /^text\/html\b/i.test(response.headers['content-type'] || ''));
    });
    const deadline = setTimeout(() => { finish(false); request.destroy(); }, 800);
    request.on('error', () => finish(false));
  });
}

async function resolveOAuthFrontend(req, env = process.env, probe = localClientAvailable) {
  const configured = (env.FRONTEND_URL || '').replace(/\/+$/, '');
  const localRequest = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(req.get('host') || '');
  const primary = 'http://localhost:3001';
  const legacy = 'http://localhost:5173';
  // Production and explicitly configured remote frontends never probe local ports.
  if (!localRequest || env.NODE_ENV === 'production') {
    return configured || 'https://cafe-sync-intelligent-system.vercel.app';
  }
  if (configured && configured !== primary && configured !== legacy) return configured;
  if (await probe(primary)) return primary;
  if (await probe(legacy)) return legacy;
  return primary;
}

module.exports = { resolveOAuthFrontend };
