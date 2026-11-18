// Cloudflare Access: verifies the Cf-Access-Jwt-Assertion token and returns the signed-in email.
import { createRemoteJWKSet, jwtVerify } from "jose";

export type AccessEnv = {
  /** Issuer, e.g. https://<team>.cloudflareaccess.com. A Worker secret. */
  ACCESS_TEAM_DOMAIN?: string;
  /** Application Audience (AUD) tag of the studio's Access application. A Worker secret. */
  ACCESS_AUD?: string;
  /** Local development only, from .dev.vars. */
  ACCESS_DEV_EMAIL?: string;
};

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function keySet(issuer: string) {
  let set = keySets.get(issuer);
  if (!set) {
    set = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    keySets.set(issuer, set);
  }
  return set;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

// Fails closed: without both secrets nobody gets in. The dev email is honoured on a local host only.
export async function accessEmail(request: Request, env: AccessEnv): Promise<string | null> {
  if (env.ACCESS_DEV_EMAIL && LOCAL_HOSTS.has(new URL(request.url).hostname)) {
    return env.ACCESS_DEV_EMAIL;
  }
  const issuer = env.ACCESS_TEAM_DOMAIN?.replace(/\/+$/, "");
  const audience = env.ACCESS_AUD;
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!issuer || !audience || !token) return null;
  try {
    const { payload } = await jwtVerify(token, keySet(issuer), { issuer, audience });
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}
