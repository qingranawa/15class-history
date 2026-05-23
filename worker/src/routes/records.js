// ===================== 史事记录路由 =====================
import { jsonResponse, errorResponse, parseBody, getQueryParams, matchRoute } from '../utils.js';
import { withAuth, requireRole, createAuditLog } from '../middleware.js';

/** GET /api/records —— 查询史事列表 */
export async function handleListRecords(request, env) {
  const params = getQueryParams(new URL(request.url));
  let sql = 'SELECT r.*, u.username as author_name FROM records r LEFT JOIN users u ON r.author_id = u.id WHERE 1=1';
  const binds = [];

  // 公开浏览：只看已审核通过的
  const auth = await withAuth(request, env);
  const isAdmin = !auth.error && (auth.user.role === 'Chairperson' || auth.user.role === 'ExecutiveDeputyChair' ||
    auth.user.role === 'SupervisorGeneral' || auth.user.role === 'DeputySupervisor' ||
    auth.user.role === 'Reviewer' || auth.user.role === 'DraftWriter');

  if (!isAdmin) {
    sql += ' AND r.status = ?';
    binds.push('approved');
  } else if (params.status) {
    sql += ' AND r.status = ?';
    binds.push(params.status);
  }

  if (params.type) {
    sql += ' AND r.type = ?';
    binds.push(params.type);
  }
  if (params.grade) {
    sql += ' AND r.grade = ?';
    binds.push(params.grade);
  }

  // 执笔委员只看到自己的草稿
  if (!auth.error && auth.user.role === 'DraftWriter' && params.status === 'draft') {
    sql += ' AND r.author_id = ?';
    binds.push(auth.user.id);
  }

  sql += ' ORDER BY r.date DESC, r.created_at DESC';

  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return jsonResponse(results);
}

/** POST /api/records —— 创建史事 */
export async function handleCreateRecord(request, env) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const roleErr = requireRole(auth.user, 'DraftWriter');
  if (roleErr) return errorResponse(roleErr.error, roleErr.status);

  const body = await parseBody(request);
  if (!body || !body.title || !body.grade) {
    return errorResponse('标题和学期为必填项', 400);
  }

  const type = body.type || 'zhengshi';
  if (!['zhengshi', 'waishi', 'xishi'].includes(type)) {
    return errorResponse('类型无效', 400);
  }

  const status = body.status || 'draft';
  if (!['draft', 'pending_review'].includes(status)) {
    return errorResponse('状态值无效', 400);
  }

  const result = await env.DB.prepare(
    `INSERT INTO records (title, grade, content, honorific, notes, date, type, status, author_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title, body.grade, body.content || '', body.honorific || '',
    body.notes || '', body.date || '', type, status, auth.user.id
  ).run();

  await createAuditLog(env.DB, auth.user.id, 'create_record', 'record', result.meta.last_row_id, `创建史事「${body.title}」`);
  if (status === 'pending_review') {
    await createAuditLog(env.DB, auth.user.id, 'submit_review', 'record', result.meta.last_row_id, `提交审核「${body.title}」`);
  }

  return jsonResponse({ id: result.meta.last_row_id, message: status === 'pending_review' ? '史事创建成功并已提交审核' : '史事创建成功（草稿状态）' }, 201);
}

/** PUT /api/records/:id —— 更新史事 */
export async function handleUpdateRecord(request, env, recordId) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const record = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first();
  if (!record) return errorResponse('记录不存在', 404);

  // 权限检查：作者本人 或 DraftWriter 及以上角色
  const isAuthor = record.author_id === auth.user.id;
  const roleErr = requireRole(auth.user, 'DraftWriter');

  if (!isAuthor && roleErr) {
    return errorResponse('无权修改此记录', 403);
  }

  // DraftWriter 只能修改自己的草稿
  if (isAuthor && auth.user.role === 'DraftWriter' && record.status !== 'draft' && record.status !== 'rejected') {
    return errorResponse('只能修改草稿或已退回的稿件', 403);
  }

  const body = await parseBody(request);
  if (!body) return errorResponse('请求体无效', 400);

  // Reviewer 不可直接编辑正文
  if (auth.user.role === 'Reviewer' && body.content && body.content !== record.content) {
    return errorResponse('审定委员不可直接修改正文', 403);
  }

  const title = body.title !== undefined ? body.title : record.title;
  const grade = body.grade !== undefined ? body.grade : record.grade;
  const content = body.content !== undefined ? body.content : record.content;
  const honorific = body.honorific !== undefined ? body.honorific : record.honorific;
  const notes = body.notes !== undefined ? body.notes : record.notes;
  const date = body.date !== undefined ? body.date : record.date;
  const type = body.type !== undefined ? body.type : record.type;
  const status = body.status !== undefined ? body.status : record.status;

  // 状态变更校验
  if (status !== record.status) {
    const allowedStatuses = ['draft', 'pending_review', 'approved', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return errorResponse('状态值无效', 400);
    }
    // DraftWriter 只能变更为 draft 或 pending_review 喵
    if (isAuthor && auth.user.role === 'DraftWriter' && !['draft', 'pending_review'].includes(status)) {
      return errorResponse('无权设置该状态', 403);
    }
  }

  await env.DB.prepare(
    `UPDATE records SET title=?, grade=?, content=?, honorific=?, notes=?, date=?, type=?, status=?, updated_at=datetime('now')
     WHERE id=?`
  ).bind(title, grade, content, honorific, notes, date, type, status, recordId).run();

  await createAuditLog(env.DB, auth.user.id, 'update_record', 'record', recordId, `更新史事「${title}」`);
  if (status === 'pending_review' && status !== record.status) {
    await createAuditLog(env.DB, auth.user.id, 'submit_review', 'record', recordId, `提交审核「${title}」`);
  }

  return jsonResponse({ message: '更新成功' });
}

/** DELETE /api/records/:id —— 删除史事 */
export async function handleDeleteRecord(request, env, recordId) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const roleErr = requireRole(auth.user, 'SupervisorGeneral');
  if (roleErr) return errorResponse(roleErr.error, roleErr.status);

  const record = await env.DB.prepare('SELECT title FROM records WHERE id = ?').bind(recordId).first();
  if (!record) return errorResponse('记录不存在', 404);

  await env.DB.prepare('DELETE FROM records WHERE id = ?').bind(recordId).run();
  await createAuditLog(env.DB, auth.user.id, 'delete_record', 'record', recordId, `删除史事「${record.title}」`);

  return jsonResponse({ message: '删除成功' });
}

/** POST /api/records/:id/submit-review —— 提交审核 */
export async function handleSubmitReview(request, env, recordId) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const roleErr = requireRole(auth.user, 'DraftWriter');
  if (roleErr) return errorResponse(roleErr.error, roleErr.status);

  const record = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first();
  if (!record) return errorResponse('记录不存在', 404);
  if (record.author_id !== auth.user.id) return errorResponse('只能提交自己的稿件', 403);
  if (record.status !== 'draft' && record.status !== 'rejected') {
    return errorResponse('只能提交草稿或已退回的稿件', 400);
  }

  await env.DB.prepare(
    `UPDATE records SET status='pending_review', updated_at=datetime('now') WHERE id=?`
  ).bind(recordId).run();

  await createAuditLog(env.DB, auth.user.id, 'submit_review', 'record', recordId, `提交审核「${record.title}」`);

  return jsonResponse({ message: '已提交审核' });
}

/** POST /api/records/:id/review —— 审核稿件 */
export async function handleReview(request, env, recordId) {
  const auth = await withAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const roleErr = requireRole(auth.user, 'Reviewer');
  if (roleErr) return errorResponse(roleErr.error, roleErr.status);

  const record = await env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first();
  if (!record) return errorResponse('记录不存在', 404);
  if (record.status !== 'pending_review') return errorResponse('该稿件不在待审核状态', 400);

  const body = await parseBody(request);
  if (!body || !body.action || !['approve', 'reject'].includes(body.action)) {
    return errorResponse('请指定审核动作：approve 或 reject', 400);
  }

  const newStatus = body.action === 'approve' ? 'approved' : 'rejected';
  await env.DB.prepare(
    `UPDATE records SET status=?, reviewer_id=?, review_comment=?, updated_at=datetime('now') WHERE id=?`
  ).bind(newStatus, auth.user.id, body.comment || '', recordId).run();

  await createAuditLog(env.DB, auth.user.id,
    body.action === 'approve' ? 'approve_record' : 'reject_record',
    'record', recordId,
    `${body.action === 'approve' ? '通过' : '驳回'}「${record.title}」${body.comment ? '：' + body.comment : ''}`
  );

  return jsonResponse({
    message: body.action === 'approve' ? '审核通过，已自动发布' : '已驳回，稿件退回执笔委员',
    status: newStatus,
  });
}

/** 路由分发 */
export async function handleRecordsRoute(request, env, path) {
  const method = request.method;

  // GET /api/records
  if (method === 'GET' && path === '/api/records') {
    return handleListRecords(request, env);
  }
  // POST /api/records
  if (method === 'POST' && path === '/api/records') {
    return handleCreateRecord(request, env);
  }

  // /api/records/:id/...
  const idMatch = path.match(/^\/api\/records\/(\d+)(\/.+)?$/);
  if (idMatch) {
    const recordId = parseInt(idMatch[1]);
    const subPath = idMatch[2] || '';

    if (method === 'PUT' && subPath === '') return handleUpdateRecord(request, env, recordId);
    if (method === 'DELETE' && subPath === '') return handleDeleteRecord(request, env, recordId);
    if (method === 'POST' && subPath === '/submit-review') return handleSubmitReview(request, env, recordId);
    if (method === 'POST' && subPath === '/review') return handleReview(request, env, recordId);
  }

  return errorResponse('路由不存在', 404);
}
