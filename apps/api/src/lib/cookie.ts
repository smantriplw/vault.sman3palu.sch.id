export function getCookie(c: any, name: string): string | undefined {
  const cookie = c.req.header("Cookie");
  if (!cookie) return undefined;
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.split("=");
    if (key?.trim() === name) {
      return rest.join("=").trim();
    }
  }
  return undefined;
}

export function setCookie(c: any, name: string, value: string, opts?: {
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  secure?: boolean;
  domain?: string;
}) {
  let cookie = `${name}=${value}`;
  if (opts?.maxAge) cookie += `; Max-Age=${opts.maxAge}`;
  if (opts?.path) cookie += `; Path=${opts.path}`;
  else cookie += "; Path=/";
  if (opts?.httpOnly) cookie += "; HttpOnly";
  if (opts?.sameSite) cookie += `; SameSite=${opts.sameSite}`;
  else cookie += "; SameSite=Lax";
  if (opts?.secure) cookie += "; Secure";
  if (opts?.domain) cookie += `; Domain=${opts.domain}`;

  c.header("Set-Cookie", cookie, { append: true });
}
