// ===================== 认证路由 =====================
import { jsonResponse, errorResponse, parseBody, hashPassword, verifyPassword, signJWT } from "../utils.js";
import { withAuth, createAuditLog } from "../middleware.js";

export async function handleLogin(request, env) {
  const body = await parseBody(request);
  if (!body || !body.username || !body.password) {
    return errorResponse("请输入用户名和密码", 400);
  }

  const user = await env.DB.prepare(
    "SELECT id, username, password_hash, role FROM users WHERE username = ?"
  ).bind(body.username).first();

  if (!user) return errorResponse("用户名或密码错误", 401);

  const valid = await verifyPassword(body.password, user.password_hash);
  if (!valid) return errorResponse("用户名或密码错误", 401);

  const token = await signJWT(
    { userId: user.id, username: user.username, role: user.role },
    env.JWT_SECRET
  );

  await createAuditLog(env.DB, user.id, "login");

  return jsonResponse({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
}

export async function handleRegister(request, env) {
  const body = await parseBody(request);
  if (!body || !body.username || !body.password) {
    return errorResponse("用户名和密码为必填项", 400);
  }
  if (body.username.length < 2 || body.username.length > 50) {
    return errorResponse("用户名须在 2-50 个字符之间", 400);
  }
  if (body.password.length < 6) {
    return errorResponse("密码长度至少 6 位", 400);
  }
  // 禁止中文用户名
  if (/[一-鿿㐀-䶿]/.test(body.username)) {
    return errorResponse("账户名不能包含中文，请使用英文或拼音", 400);
  }

  // 检查是否已存在用户（首个注册用户自动成为 Chairperson）
  const { count } = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
  const isFirstUser = count === 0;

  // 确定角色：首用户 → Chairperson，管理员操作 → 指定角色，自注册 → user
  let role = "user";
  let actorUser = null;
  if (isFirstUser) {
    role = "Chairperson";
  } else {
    const auth = await withAuth(request, env);
    if (!auth.error) {
      // 已登录的管理员可以指定角色
      const adminRoles = ["Chairperson", "ExecutiveDeputyChair", "SupervisorGeneral", "DeputySupervisor"];
      if (adminRoles.includes(auth.user.role)) {
        actorUser = auth.user;
        if (body.role && adminRoles.includes(body.role) && auth.user.role !== "Chairperson" && auth.user.role !== "ExecutiveDeputyChair") {
          return errorResponse("无权设置此角色", 403);
        }
        role = body.role || "user";
      }
    }
    // 无管理员 token → role 保持 'user'（自注册）
  }

  // 检查用户名唯一
  const existing = await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(body.username).first();
  if (existing) return errorResponse("用户名已被占用", 409);

  const passwordHash = await hashPassword(body.password);
  const result = await env.DB.prepare(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)"
  ).bind(body.username, passwordHash, role).run();

  if (actorUser) {
    await createAuditLog(env.DB, actorUser.id, "create_user", "user", result.meta.last_row_id, `创建用户 ${body.username} 角色 ${role}`);
  }

  return jsonResponse({
    id: result.meta.last_row_id,
    username: body.username,
    role,
    message: isFirstUser ? "首个管理员账户创建成功" : (actorUser ? "委员账号创建成功" : "注册成功，等待管理员分配权限"),
  }, 201);
}

/** PUT /api/auth/password —— 修改当前用户密码 */
export async function handleChangePassword(request, env) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const body = await parseBody(request);
  if (
    !body ||
    typeof body.currentPassword !== "string" ||
    typeof body.newPassword !== "string" ||
    !body.currentPassword ||
    !body.newPassword
  ) {
    return errorResponse("当前密码和新密码为必填项", 400);
  }
  if (body.newPassword.length < 6) {
    return errorResponse("新密码长度至少 6 位", 400);
  }
  if (body.currentPassword === body.newPassword) {
    return errorResponse("新密码不能与当前密码相同", 400);
  }

  const user = await env.DB.prepare(
    "SELECT password_hash FROM users WHERE id = ?"
  ).bind(auth.user.id).first();
  if (!user || !(await verifyPassword(body.currentPassword, user.password_hash))) {
    return errorResponse("当前密码错误", 401);
  }

  const passwordHash = await hashPassword(body.newPassword);
  await env.DB.prepare(
    "UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE id=?"
  ).bind(passwordHash, auth.user.id).run();

  await createAuditLog(
    env.DB,
    auth.user.id,
    "change_password",
    "user",
    auth.user.id,
    "修改账户密码"
  );

  return jsonResponse({ message: "密码修改成功" });
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
