// ===================== 人物档案路由 =====================
import { jsonResponse, errorResponse, parseBody } from "../utils.js";
import { withAuth, requireRole, createAuditLog } from "../middleware.js";

/** GET /api/characters */
export async function handleListCharacters(request, env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM characters ORDER BY name ASC"
  ).all();
  // 解析 nicknames JSON 字段
  const parsed = results.map(c => ({
    ...c,
    nicknames: safeParseJSON(c.nicknames, []),
    firstAge: c.first_age, // DB 字段名映射
  }));
  return jsonResponse(parsed);
}

/** POST /api/characters */
export async function handleCreateCharacter(request, env) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const roleErr = requireRole(auth.user, "DraftWriter");
  if (roleErr) return errorResponse(roleErr.error, roleErr.status);

  const body = await parseBody(request);
  if (!body || !body.name) return errorResponse("人物名称为必填项", 400);

  const nicknames = JSON.stringify(body.nicknames || []);
  const result = await env.DB.prepare(
    `INSERT INTO characters (name, nicknames, gender, first_age, traits, description)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(body.name, nicknames, body.gender || "", body.firstAge || "", body.traits || "", body.desc || "").run();

  await createAuditLog(env.DB, auth.user.id, "create_character", "character", result.meta.last_row_id, `创建人物「${body.name}」`);

  return jsonResponse({ id: result.meta.last_row_id, message: "人物创建成功" }, 201);
}

/** PUT /api/characters/:id */
export async function handleUpdateCharacter(request, env, charId) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const roleErr = requireRole(auth.user, "DraftWriter");
  if (roleErr) return errorResponse(roleErr.error, roleErr.status);

  const existing = await env.DB.prepare("SELECT * FROM characters WHERE id = ?").bind(charId).first();
  if (!existing) return errorResponse("人物不存在", 404);

  const body = await parseBody(request);
  if (!body) return errorResponse("请求体无效", 400);

  const name = body.name !== undefined ? body.name : existing.name;
  const nicknames = JSON.stringify(body.nicknames !== undefined ? body.nicknames : safeParseJSON(existing.nicknames, []));
  const gender = body.gender !== undefined ? body.gender : existing.gender;
  const firstAge = body.firstAge !== undefined ? body.firstAge : existing.first_age;
  const traits = body.traits !== undefined ? body.traits : existing.traits;
  const desc = body.desc !== undefined ? body.desc : existing.description;

  await env.DB.prepare(
    `UPDATE characters SET name=?, nicknames=?, gender=?, first_age=?, traits=?, description=?, updated_at=datetime('now')
     WHERE id=?`
  ).bind(name, nicknames, gender, firstAge, traits, desc, charId).run();

  await createAuditLog(env.DB, auth.user.id, "update_character", "character", charId, `更新人物「${name}」`);

  return jsonResponse({ message: "人物更新成功" });
}

/** DELETE /api/characters/:id */
export async function handleDeleteCharacter(request, env, charId) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const roleErr = requireRole(auth.user, "SupervisorGeneral");
  if (roleErr) return errorResponse(roleErr.error, roleErr.status);

  const existing = await env.DB.prepare("SELECT name FROM characters WHERE id = ?").bind(charId).first();
  if (!existing) return errorResponse("人物不存在", 404);

  await env.DB.prepare("DELETE FROM characters WHERE id = ?").bind(charId).run();
  await createAuditLog(env.DB, auth.user.id, "delete_character", "character", charId, `删除人物「${existing.name}」`);

  return jsonResponse({ message: "人物删除成功" });
}

function safeParseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

/** 路由分发 */
export async function handleCharactersRoute(request, env, path) {
  const method = request.method;

  if (method === "GET" && path === "/api/characters") {
    return handleListCharacters(request, env);
  }
  if (method === "POST" && path === "/api/characters") {
    return handleCreateCharacter(request, env);
  }

  const idMatch = path.match(/^\/api\/characters\/(\d+)$/);
  if (idMatch) {
    const charId = parseInt(idMatch[1]);
    if (method === "PUT") return handleUpdateCharacter(request, env, charId);
    if (method === "DELETE") return handleDeleteCharacter(request, env, charId);
  }

  return errorResponse("路由不存在", 404);
}
