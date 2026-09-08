// ===================== 15class-history Pages Functions API 入口 =====================
// 匹配 /api/* 的所有请求
import { corsHeaders, errorResponse, jsonResponse } from '../_lib/utils.js';
import { handleLogin, handleRegister, handleChangePassword, handleMe } from '../_lib/routes/auth.js';
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
    } else if (path === '/api/auth/register' && method === 'POST') {
      response = await handleRegister(request, env);
    } else if (path === '/api/auth/password' && method === 'PUT') {
      response = await handleChangePassword(request, env);
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
