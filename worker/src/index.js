// ===================== 15class-history Worker 入口 =====================
import { corsHeaders, handleCORS, errorResponse, jsonResponse } from "./utils.js";
import { handleLogin, handleRegister, handleMe } from "./routes/auth.js";
import { handleRecordsRoute } from "./routes/records.js";
import { handleCharactersRoute } from "./routes/characters.js";
import { handleMaterialsRoute } from "./routes/materials.js";
import { handleUsersRoute } from "./routes/users.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const origin = env.CORS_ORIGIN || "*";

    // CORS 预检
    if (method === "OPTIONS") return handleCORS(request, env);

    // API 路由
    let response;
    try {
      if (path === "/api/auth/login" && method === "POST") {
        response = await handleLogin(request, env);
      } else if (path === "/api/auth/register" && method === "POST") {
        response = await handleRegister(request, env);
      } else if (path === "/api/auth/me" && method === "GET") {
        response = await handleMe(request, env);
      } else if (path.startsWith("/api/records")) {
        response = await handleRecordsRoute(request, env, path);
      } else if (path.startsWith("/api/characters")) {
        response = await handleCharactersRoute(request, env, path);
      } else if (path.startsWith("/api/materials")) {
        response = await handleMaterialsRoute(request, env, path);
      } else if (path.startsWith("/api/users") || path.startsWith("/api/logs") || path.startsWith("/api/config")) {
        response = await handleUsersRoute(request, env, path);
      } else if (path === "/api/health") {
        response = jsonResponse({ status: "ok", timestamp: new Date().toISOString() });
      } else {
        response = errorResponse("API 路由不存在", 404);
      }
    } catch (err) {
      console.error("Worker error:", err);
      response = errorResponse("服务器内部错误", 500);
    }

    // 附加 CORS 头
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
