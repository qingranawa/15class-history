// ===================== 用户管理路由 =====================
import { jsonResponse, errorResponse, parseBody } from '../utils.js';
import { withAuth, requireRole, canManageUser, createAuditLog } from '../middleware.js';

const ADMIN_ROLES = [
  'MaterialCollector', 'DraftWriter', 'Reviewer',
  'SupervisorGeneral', 'DeputySupervisor',
  'Chairperson', 'ExecutiveDeputyChair',
];
const DEFAULT_GRADE = '八上';
const VALID_GRADES = ['七上', '七下', '八上', '八下', '九上', '九下'];

async function getDefaultGrade(env) {
  try {
    const config = await env.DB.prepare(
      `SELECT config_value FROM system_config WHERE config_key = 'default_grade'`
    ).first();
    return VALID_GRADES.includes(config?.config_value) ? config.config_value : DEFAULT_GRADE;
  } catch {
    return DEFAULT_GRADE;
  }
}

/** GET /api/users —— 用户列表 */
export async function handleListUsers(request, env) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const roleErr = requireRole(auth.user, 'SupervisorGeneral');
  if (roleErr) return errorResponse(roleErr.error, roleErr.status);

  const { results } = await env.DB.prepare(
    'SELECT id, username, role, created_at, updated_at FROM users ORDER BY id ASC'
  ).all();

  return jsonResponse(results);
}

/** PUT /api/users/:id/role —— 修改用户角色 */
export async function handleUpdateUserRole(request, env, userId) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const roleErr = requireRole(auth.user, 'SupervisorGeneral');
  if (roleErr) return errorResponse(roleErr.error, roleErr.status);

  const target = await env.DB.prepare(
    'SELECT id, username, role FROM users WHERE id = ?'
  ).bind(userId).first();
  if (!target) return errorResponse('用户不存在', 404);

  // 检查管理权限
  if (!canManageUser(auth.user, target)) {
    return errorResponse('无权管理此用户', 403);
  }

  const body = await parseBody(request);
  if (!body || !body.role) return errorResponse('请指定新角色', 400);
  if (!ADMIN_ROLES.includes(body.role) && body.role !== 'user') {
    return errorResponse('无效的角色', 400);
  }

  // 不能将用户提升到自己的级别或更高
  if (!canManageUser(auth.user, { role: body.role })) {
    return errorResponse('不能设置高于或等于自己的角色', 403);
  }

  await env.DB.prepare(
    `UPDATE users SET role=?, updated_at=datetime('now') WHERE id=?`
  ).bind(body.role, userId).run();

  await createAuditLog(env.DB, auth.user.id, 'change_role', 'user', userId,
    `将 ${target.username} 的角色从 ${target.role} 改为 ${body.role}`);

  return jsonResponse({ message: `已将 ${target.username} 的角色更新为 ${body.role}` });
}

/** DELETE /api/users/:id —— 删除用户 */
export async function handleDeleteUser(request, env, userId) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const roleErr = requireRole(auth.user, 'SupervisorGeneral');
  if (roleErr) return errorResponse(roleErr.error, roleErr.status);

  const target = await env.DB.prepare(
    'SELECT id, username, role FROM users WHERE id = ?'
  ).bind(userId).first();
  if (!target) return errorResponse('用户不存在', 404);

  if (!canManageUser(auth.user, target)) {
    return errorResponse('无权删除此用户', 403);
  }

  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  await createAuditLog(env.DB, auth.user.id, 'delete_user', 'user', userId,
    `删除用户 ${target.username}（原角色 ${target.role}）`);

  return jsonResponse({ message: `已删除用户 ${target.username}` });
}

/** GET /api/logs —— 操作日志（仅 Chairperson / ExecutiveDeputyChair） */
export async function handleListLogs(request, env) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  if (auth.user.role !== 'Chairperson' && auth.user.role !== 'ExecutiveDeputyChair') {
    return errorResponse('权限不足，仅主任委员和常务副主任委员可查看操作日志', 403);
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const { results } = await env.DB.prepare(
    `SELECT al.*, u.username FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ORDER BY al.created_at DESC LIMIT ? OFFSET ?`
  ).bind(Math.min(limit, 500), offset).all();

  return jsonResponse(results);
}

/** GET /api/config/public —— 获取访客需要的公开配置 */
export async function handleGetPublicConfig(request, env) {
  return jsonResponse({ defaultGrade: await getDefaultGrade(env) });
}

/** GET /api/config —— 获取系统配置（Chairperson / ExecutiveDeputyChair） */
export async function handleGetConfig(request, env) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  if (auth.user.role !== 'Chairperson' && auth.user.role !== 'ExecutiveDeputyChair') {
    return errorResponse('权限不足', 403);
  }

  // 返回系统统计信息
  const userCount = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
  const recordCount = await env.DB.prepare('SELECT COUNT(*) as count FROM records').first();
  const materialCount = await env.DB.prepare('SELECT COUNT(*) as count FROM materials').first();

  return jsonResponse({
    users: userCount.count,
    records: recordCount.count,
    materials: materialCount.count,
    roles: ADMIN_ROLES,
  });
}

/** 路由分发 */
export async function handleUsersRoute(request, env, path) {
  const method = request.method;

  if (method === 'GET' && path === '/api/users') return handleListUsers(request, env);
  if (method === 'GET' && path === '/api/logs') return handleListLogs(request, env);
  if (method === 'GET' && path === '/api/config/public') return handleGetPublicConfig(request, env);
  if (method === 'GET' && path === '/api/config') return handleGetConfig(request, env);

  const roleMatch = path.match(/^\/api\/users\/(\d+)\/role$/);
  if (roleMatch && method === 'PUT') {
    return handleUpdateUserRole(request, env, parseInt(roleMatch[1]));
  }

  const idMatch = path.match(/^\/api\/users\/(\d+)$/);
  if (idMatch && method === 'DELETE') {
    return handleDeleteUser(request, env, parseInt(idMatch[1]));
  }

  return errorResponse('路由不存在', 404);
}
