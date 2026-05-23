// ===================== 素材资料路由 =====================
import { jsonResponse, errorResponse, parseBody } from '../utils.js';
import { withAuth, requireRole, createAuditLog } from '../middleware.js';

/** GET /api/materials —— 查询素材列表 */
export async function handleListMaterials(request, env) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const url = new URL(request.url);
  const status = url.searchParams.get('status');

  let sql = 'SELECT m.*, u.username as submitter_name FROM materials m LEFT JOIN users u ON m.submitter_id = u.id WHERE 1=1';
  const binds = [];

  // 普通用户只看自己的，执书委员及以上看全部
  if (auth.user.role === 'user') {
    sql += ' AND m.submitter_id = ?';
    binds.push(auth.user.id);
  }

  if (status) {
    sql += ' AND m.status = ?';
    binds.push(status);
  }

  sql += ' ORDER BY m.created_at DESC';

  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return jsonResponse(results);
}

/** POST /api/materials —— 上传素材（任何登录用户均可投稿） */
export async function handleCreateMaterial(request, env) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const body = await parseBody(request);
  if (!body || !body.title) return errorResponse('素材标题为必填项', 400);

  const materialType = body.materialType || 'text';
  if (!['text', 'image', 'file'].includes(materialType)) {
    return errorResponse('素材类型无效', 400);
  }

  const result = await env.DB.prepare(
    `INSERT INTO materials (title, content, material_type, file_url, submitter_id)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(body.title, body.content || '', materialType, body.fileUrl || null, auth.user.id).run();

  await createAuditLog(env.DB, auth.user.id, 'create_material', 'material', result.meta.last_row_id, `上传素材「${body.title}」`);

  return jsonResponse({ id: result.meta.last_row_id, message: '投稿成功' }, 201);
}

/** PUT /api/materials/:id —— 修改素材（提交者本人或管理员） */
export async function handleUpdateMaterial(request, env, matId) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const existing = await env.DB.prepare('SELECT * FROM materials WHERE id = ?').bind(matId).first();
  if (!existing) return errorResponse('素材不存在', 404);

  // 本人可改自己的，管理员可改所有
  const isOwner = existing.submitter_id === auth.user.id;
  const isAdmin = !requireRole(auth.user, 'SupervisorGeneral');
  if (!isOwner && !isAdmin) {
    return errorResponse('只能修改自己提交的素材', 403);
  }

  const body = await parseBody(request);
  if (!body) return errorResponse('请求体无效', 400);

  const title = body.title !== undefined ? body.title : existing.title;
  const content = body.content !== undefined ? body.content : existing.content;
  const materialType = body.materialType !== undefined ? body.materialType : existing.material_type;
  const fileUrl = body.fileUrl !== undefined ? body.fileUrl : existing.file_url;

  await env.DB.prepare(
    `UPDATE materials SET title=?, content=?, material_type=?, file_url=?, updated_at=datetime('now')
     WHERE id=?`
  ).bind(title, content, materialType, fileUrl, matId).run();

  await createAuditLog(env.DB, auth.user.id, 'update_material', 'material', matId, `修改素材「${title}」`);

  return jsonResponse({ message: '素材修改成功' });
}

/** DELETE /api/materials/:id —— 删除素材 */
export async function handleDeleteMaterial(request, env, matId) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const existing = await env.DB.prepare('SELECT * FROM materials WHERE id = ?').bind(matId).first();
  if (!existing) return errorResponse('素材不存在', 404);

  // 执书委员只能删除自己的；DraftWriter 不可删除；管理员可删除任何
  const isOwner = existing.submitter_id === auth.user.id;
  const isAdmin = !requireRole(auth.user, 'SupervisorGeneral');

  if (!isOwner && !isAdmin) {
    return errorResponse('无权删除此素材', 403);
  }
  if (auth.user.role === 'DraftWriter') {
    return errorResponse('执笔委员不可删除素材', 403);
  }

  await env.DB.prepare('DELETE FROM materials WHERE id = ?').bind(matId).run();
  await createAuditLog(env.DB, auth.user.id, 'delete_material', 'material', matId, `删除素材「${existing.title}」`);

  return jsonResponse({ message: '素材删除成功' });
}

/** 路由分发 */
export async function handleMaterialsRoute(request, env, path) {
  const method = request.method;

  if (method === 'GET' && path === '/api/materials') {
    return handleListMaterials(request, env);
  }
  if (method === 'POST' && path === '/api/materials') {
    return handleCreateMaterial(request, env);
  }

  const idMatch = path.match(/^\/api\/materials\/(\d+)$/);
  if (idMatch) {
    const matId = parseInt(idMatch[1]);
    if (method === 'PUT') return handleUpdateMaterial(request, env, matId);
    if (method === 'DELETE') return handleDeleteMaterial(request, env, matId);
  }

  return errorResponse('路由不存在', 404);
}
