// ===================== 认证中间件 =====================
import { verifyJWT, hasMinRole, errorResponse, jsonResponse, ROLE_LEVELS } from './utils.js';

/** 从请求中提取 Bearer token */
function extractToken(request) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/** 认证中间件：验证 JWT 并将 user 附加到 request */
export async function withAuth(request, env) {
  const token = extractToken(request);
  if (!token) return { error: '未提供认证令牌', status: 401 };

  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return { error: '认证已过期或无效，请重新登录', status: 401 };

  // 查询用户最新信息（确保角色是最新的）
  const user = await env.DB.prepare(
    'SELECT id, username, role FROM users WHERE id = ?'
  ).bind(payload.userId).first();

  if (!user) return { error: '用户不存在', status: 401 };

  return { user };
}

/** 角色检查：返回错误或 null（表示通过） */
export function requireRole(user, ...roles) {
  for (const role of roles) {
    if (hasMinRole(user.role, role)) return null;
  }
  return { error: '权限不足，无法执行此操作', status: 403 };
}

/** 检查是否可管理目标用户（处理特殊权限规则） */
export function canManageUser(actor, target) {
  const actorLevel = ROLE_LEVELS[actor.role] || 0;
  const targetLevel = ROLE_LEVELS[target.role] || 0;

  // 不能管理同级或更高级
  if (targetLevel >= actorLevel) return false;

  // DeputySupervisor 不能管理 SupervisorGeneral
  if (actor.role === 'DeputySupervisor' && target.role === 'SupervisorGeneral') return false;

  // ExecutiveDeputyChair 不能管理 Chairperson
  if (actor.role === 'ExecutiveDeputyChair' && target.role === 'Chairperson') return false;

  return true;
}

/** 审计日志 */
export async function createAuditLog(db, userId, action, targetType = null, targetId = null, details = null) {
  await db.prepare(
    'INSERT INTO audit_logs (user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)'
  ).bind(userId, action, targetType, targetId, details).run();
}
