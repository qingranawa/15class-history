// ===================== 认证路由 =====================
import { jsonResponse, errorResponse, parseBody, hashPassword, verifyPassword, signJWT } from '../utils.js';
import { withAuth, createAuditLog } from '../middleware.js';

export async function handleLogin(request, env) {
  const body = await parseBody(request);
  if (!body || !body.username || !body.password) {
    return errorResponse('请输入用户名和密码', 400);
  }

  const user = await env.DB.prepare(
    'SELECT id, username, password_hash, role FROM users WHERE username = ?'
  ).bind(body.username).first();

  if (!user) return jsonResponse({ debug: 'no_user', bodyUsername: body.username, bodyPasswordLen: body.password?.length }, 401);

  const valid = await verifyPassword(body.password, user.password_hash);
  if (!valid) return jsonResponse({ debug: 'bad_password', bodyPassword: body.password, bodyPasswordLen: body.password.length, hashPreview: user.password_hash.substring(0, 32) }, 401);

  const token = await signJWT(
    { userId: user.id, username: user.username, role: user.role },
    env.JWT_SECRET
  );

  await createAuditLog(env.DB, user.id, 'login');

  return jsonResponse({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
}

export async function handleRegister(request, env) {
  const body = await parseBody(request);
  if (!body || !body.username || !body.password) {
    return errorResponse('用户名和密码为必填项', 400);
  }
  if (body.username.length < 2 || body.username.length > 50) {
    return errorResponse('用户名须在 2-50 个字符之间', 400);
  }
  if (body.password.length < 6) {
    return errorResponse('密码长度至少 6 位', 400);
  }

  // 检查是否已存在用户（首个注册用户自动成为 Chairperson）
  const { count } = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
  const isFirstUser = count === 0;

  // 非首个用户需要认证 + 管理员权限
  let actorUser = null;
  if (!isFirstUser) {
    const auth = await withAuth(request, env);
    if (auth.error) return errorResponse(auth.error, auth.status);
    if (auth.user.role !== 'Chairperson' && auth.user.role !== 'ExecutiveDeputyChair' && auth.user.role !== 'SupervisorGeneral' && auth.user.role !== 'DeputySupervisor') {
      return errorResponse('权限不足', 403);
    }
    actorUser = auth.user;
  }

  // 检查用户名唯一
  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(body.username).first();
  if (existing) return errorResponse('用户名已被占用', 409);

  const passwordHash = await hashPassword(body.password);
  const role = isFirstUser ? 'Chairperson' : (body.role || 'user');

  const result = await env.DB.prepare(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
  ).bind(body.username, passwordHash, role).run();

  if (actorUser) {
    await createAuditLog(env.DB, actorUser.id, 'create_user', 'user', result.meta.last_row_id, `创建用户 ${body.username} 角色 ${role}`);
  }

  return jsonResponse({
    id: result.meta.last_row_id,
    username: body.username,
    role,
    message: isFirstUser ? '首个管理员账户创建成功' : '用户创建成功',
  }, 201);
}

export async function handleMe(request, env) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  return jsonResponse({
    id: auth.user.id,
    username: auth.user.username,
    role: auth.user.role,
  });
}
