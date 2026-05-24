// ===================== 工具函数 =====================

/** 字符串 → Base64URL（自动处理非 ASCII 字符） */
function base64UrlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** 原始字节 → Base64URL（用于签名等二进制数据） */
function base64UrlEncodeRaw(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** Base64URL → Uint8Array（解码为原始字节，文本需用 TextDecoder 还原） */
function base64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ===================== CORS =====================
export function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleCORS(request, env) {
  const origin = env.CORS_ORIGIN || "*";
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

// ===================== 响应助手 =====================
export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

export async function parseBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function getQueryParams(url) {
  const params = {};
  url.searchParams.forEach((v, k) => { params[k] = v; });
  return params;
}

// ===================== 密码哈希（PBKDF2） =====================
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key, 256
  );
  const saltHex = [...salt].map(b => b.toString(16).padStart(2, "0")).join("");
  const hashHex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, storedHash] = stored.split(":");
  if (!saltHex || !storedHash) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key, 256
  );
  const hashHex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex === storedHash;
}

// ===================== JWT =====================
export async function signJWT(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
  }));
  const data = `${encodedHeader}.${encodedPayload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const encodedSig = base64UrlEncodeRaw(new Uint8Array(sig));
  return `${data}.${encodedSig}`;
}

export async function verifyJWT(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSig] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sig = base64UrlDecode(encodedSig);
    const valid = await crypto.subtle.verify("HMAC", key, sig, encoder.encode(data));
    if (!valid) return null;
    const payloadBytes = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    // 检查过期（24小时）
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ===================== 角色权限等级 =====================
export const ROLE_LEVELS = {
  "user": 0,
  "MaterialCollector": 1,
  "DraftWriter": 2,
  "Reviewer": 3,
  "SupervisorGeneral": 4,
  "DeputySupervisor": 4,
  "Chairperson": 5,
  "ExecutiveDeputyChair": 5,
};

export function hasMinRole(userRole, requiredRole) {
  return (ROLE_LEVELS[userRole] || 0) >= (ROLE_LEVELS[requiredRole] || 0);
}

// ===================== 路径匹配 =====================
export function matchRoute(pattern, path) {
  const patternParts = pattern.split("/");
  const pathParts = path.split("/");
  if (patternParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}
