// ===================== 15class-history Pages Functions API 入口 =====================
// 匹配 /api/* 的所有请求
import { corsHeaders, errorResponse, jsonResponse } from '../_lib/utils.js';
import { handleLogin, handleRegister, handleMe } from '../_lib/routes/auth.js';
import { handleRecordsRoute } from '../_lib/routes/records.js';
import { handleCharactersRoute } from '../_lib/routes/characters.js';
import { handleMaterialsRoute } from '../_lib/routes/materials.js';
import { handleUsersRoute } from '../_lib/routes/users.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const method = request.method;
  // 从 catch-all params 重建路径
  const pathParts = params.path || [];
  const path = '/api/' + (Array.isArray(pathParts) ? pathParts.join('/') : pathParts);
  const origin = env.CORS_ORIGIN || '*';

  // CORS 预检
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  let response;
  try {
    if (path === '/api/auth/login' && method === 'POST') {
      response = await handleLogin(request, env);
    } else if (path === '/api/auth/login-debug' && method === 'POST') {
      // 临时调试：详细追踪登录流程
      const { parseBody, verifyPassword } = await import('../_lib/utils.js');
      const body = await parseBody(request);
      const user = await env.DB.prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?').bind(body?.username).first();
      let verifyResult = null;
      if (user) verifyResult = await verifyPassword(body.password, user.password_hash);
      response = jsonResponse({
        bodyReceived: !!body,
        username: body?.username,
        passwordLen: body?.password?.length,
        userFound: !!user,
        userId: user?.id,
        storedHashLen: user?.password_hash?.length,
        verifyResult
      });
    } else if (path === '/api/auth/register' && method === 'POST') {
      response = await handleRegister(request, env);
    } else if (path === '/api/auth/me' && method === 'GET') {
      response = await handleMe(request, env);
    } else if (path.startsWith('/api/records')) {
      response = await handleRecordsRoute(request, env, path);
    } else if (path.startsWith('/api/characters')) {
      response = await handleCharactersRoute(request, env, path);
    } else if (path.startsWith('/api/materials')) {
      response = await handleMaterialsRoute(request, env, path);
    } else if (path.startsWith('/api/users') || path.startsWith('/api/logs') || path.startsWith('/api/config')) {
      response = await handleUsersRoute(request, env, path);
    } else if (path === '/api/health') {
      response = jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
    } else if (path === '/api/debug/hash') {
      // 调试端点：生成测试哈希
      const { hashPassword, verifyPassword } = await import('../_lib/utils.js');
      const h = await hashPassword('admin123456');
      const v = await verifyPassword('admin123456', h);
      response = jsonResponse({ hash: h, verify: v, algo: 'PBKDF2-SHA256-100000' });
    } else if (path === '/api/debug/verify') {
      // 调试端点：验证现有用户密码
      const { verifyPassword } = await import('../_lib/utils.js');
      const user = await env.DB.prepare('SELECT * FROM users WHERE id = 2').first();
      const v = await verifyPassword('admin123456', user.password_hash);
      response = jsonResponse({
        userId: user.id,
        verify: v,
        hashPreview: user.password_hash.substring(0, 32) + '...'
      });
    } else {
      response = errorResponse('API 路由不存在', 404);
    }
  } catch (err) {
    console.error('Pages Function error:', err);
    response = errorResponse('服务器内部错误', 500);
  }

  // 附加 CORS 头
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
