// ===================== 管理面板 JS =====================
const API_BASE = '/api';
let currentUser = null;

// ===================== Auth =====================
function getToken() { return localStorage.getItem('admin_token'); }
function setToken(t) { localStorage.setItem('admin_token', t); }
function clearToken() { localStorage.removeItem('admin_token'); }

async function api(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

function toast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.remove(); }, 3500);
}

// ===================== 登录 =====================
async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  if (!username || !password) { errorEl.textContent = '请填写用户名和密码'; return; }

  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    // 检查是否有管理权限（非普通 user）
    if (data.user.role === 'user') {
      errorEl.textContent = '普通用户请从主页登录，管理面板仅限编纂委员访问';
      return;
    }
    setToken(data.token);
    currentUser = data.user;
    showApp();
    toast(`欢迎，${data.user.username}！`, 'success');
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

function logout() {
  clearToken();
  currentUser = null;
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('adminApp').style.display = 'none';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
}

async function checkAutoLogin() {
  const token = getToken();
  if (!token) return;
  try {
    const data = await api('/auth/me');
    if (data.role === 'user') { clearToken(); return; }
    currentUser = data;
    showApp();
  } catch { clearToken(); }
}

function showApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('adminApp').style.display = 'flex';
  document.getElementById('sidebarUser').textContent =
    `${currentUser.username} · ${roleLabel(currentUser.role)}`;
  buildNav();
  navigate('dashboard');
}

// ===================== 角色标签 =====================
function roleLabel(role) {
  const map = {
    'Chairperson': '主任委员',
    'ExecutiveDeputyChair': '常务副主任委员',
    'SupervisorGeneral': '总监制委员',
    'DeputySupervisor': '总副监制委员',
    'Reviewer': '审定委员',
    'DraftWriter': '执笔委员',
    'MaterialCollector': '执书委员',
    'user': '普通用户',
  };
  return map[role] || role;
}

function statusLabel(s) {
  const map = { 'draft': '草稿', 'pending_review': '待审核', 'approved': '已通过', 'rejected': '已驳回' };
  return map[s] || s;
}

// ===================== 权限判断 =====================
function isAtLeast(role) {
  const levels = { 'user':0, 'MaterialCollector':1, 'DraftWriter':2, 'Reviewer':3, 'SupervisorGeneral':4, 'DeputySupervisor':4, 'Chairperson':5, 'ExecutiveDeputyChair':5 };
  return (levels[currentUser.role] || 0) >= (levels[role] || 0);
}

// ===================== 导航 =====================
function buildNav() {
  const nav = document.getElementById('sidebarNav');
  const items = [];

  items.push({ id: 'dashboard', icon: '📊', label: '工作台' });

  if (isAtLeast('MaterialCollector')) {
    items.push({ id: 'materials', icon: '📁', label: '素材资料' });
  }
  if (isAtLeast('DraftWriter')) {
    items.push({ id: 'drafts', icon: '✍️', label: '史事稿件' });
  }
  if (isAtLeast('Reviewer')) {
    items.push({ id: 'review', icon: '🔍', label: '待审稿件', badge: true });
  }
  if (isAtLeast('SupervisorGeneral')) {
    items.push({ id: 'records', icon: '📜', label: '全部史事' });
    items.push({ id: 'characters', icon: '👥', label: '人物管理' });
    items.push({ id: 'users', icon: '👤', label: '委员管理' });
  }
  if (currentUser.role === 'Chairperson' || currentUser.role === 'ExecutiveDeputyChair') {
    items.push({ id: 'logs', icon: '📋', label: '操作日志' });
    items.push({ id: 'config', icon: '⚙️', label: '系统配置' });
  }

  nav.innerHTML = items.map(i =>
    `<a data-nav="${i.id}" onclick="navigate('${i.id}')">
      ${i.icon} <span>${i.label}</span>
      ${i.badge ? '<span class="badge" id="reviewBadge"></span>' : ''}
    </a>`
  ).join('');

  // 更新待审核数量
  if (isAtLeast('Reviewer')) updateReviewBadge();
}

function navigate(view) {
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  const link = document.querySelector(`[data-nav="${view}"]`);
  if (link) link.classList.add('active');

  const main = document.getElementById('mainContent');
  switch (view) {
    case 'dashboard': renderDashboard(main); break;
    case 'materials': renderMaterials(main); break;
    case 'drafts': renderDrafts(main); break;
    case 'review': renderReview(main); break;
    case 'records': renderRecords(main); break;
    case 'characters': renderCharacters(main); break;
    case 'users': renderUsers(main); break;
    case 'logs': renderLogs(main); break;
    case 'config': renderConfig(main); break;
  }
}

// ===================== 模态框 =====================
function showModal(title, bodyHtml, onSave) {
  document.getElementById('modalContent').innerHTML = `
    <h2>${title}</h2>
    <div class="modal-body">${bodyHtml}</div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">取消</button>
      ${onSave ? '<button class="btn btn-primary" id="modalSaveBtn">保存</button>' : ''}
    </div>
  `;
  document.getElementById('modalOverlay').style.display = 'flex';
  if (onSave) {
    document.getElementById('modalSaveBtn').addEventListener('click', async () => {
      try { await onSave(); closeModal(); } catch (err) { toast(err.message, 'error'); }
    });
  }
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}

function formValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

// ===================== 异步加载指示 =====================
async function updateReviewBadge() {
  try {
    const data = await api('/records?status=pending_review');
    const badge = document.getElementById('reviewBadge');
    if (badge && data.length > 0) badge.textContent = data.length;
    else if (badge) badge.style.display = 'none';
  } catch {}
}

// ===================== 视图：工作台 =====================
async function renderDashboard(main) {
  main.innerHTML = '<h1>📊 工作台</h1><p class="subtitle">编纂委员会管理系统</p>';
  try {
    const records = await api('/records');
    const approvedCount = records.filter(r => r.status === 'approved').length;
    const pendingCount = records.filter(r => r.status === 'pending_review').length;
    const draftCount = records.filter(r => r.status === 'draft').length;

    main.innerHTML += `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${records.length}</div><div class="stat-label">史事总数</div></div>
        <div class="stat-card"><div class="stat-value">${approvedCount}</div><div class="stat-label">已发布</div></div>
        <div class="stat-card"><div class="stat-value">${pendingCount}</div><div class="stat-label">待审核</div></div>
        <div class="stat-card"><div class="stat-value">${draftCount}</div><div class="stat-label">草稿</div></div>
      </div>
      <div class="card">
        <h3>📋 快捷操作</h3>
        <div class="btn-group" style="margin-top:12px">
          ${isAtLeast('DraftWriter') ? '<button class="btn btn-primary" onclick="navigate(\'drafts\');showCreateDraftModal()">✍️ 撰写新史事</button>' : ''}
          ${isAtLeast('MaterialCollector') ? '<button class="btn btn-success" onclick="navigate(\'materials\');showCreateMaterialModal()">📁 上传素材</button>' : ''}
          ${isAtLeast('Reviewer') ? '<button class="btn btn-warning" onclick="navigate(\'review\')">🔍 审核稿件</button>' : ''}
        </div>
      </div>
    `;
  } catch (err) {
    main.innerHTML += `<div class="card"><p style="color:var(--admin-danger)">加载失败: ${err.message}</p></div>`;
  }
}

// ===================== 视图：素材资料 =====================
async function renderMaterials(main) {
  main.innerHTML = `<h1>📁 素材资料</h1><p class="subtitle">${isAtLeast('DraftWriter') ? '查看所有参考资料' : '管理已提交的素材'}</p>
    <div class="btn-group" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="showCreateMaterialModal()">📤 上传新素材</button>
    </div>
    <div id="materialsList"><p style="color:var(--admin-muted)">加载中...</p></div>`;

  try {
    const materials = await api('/materials');
    const container = document.getElementById('materialsList');
    if (materials.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>暂无素材资料</p></div>';
      return;
    }
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>标题</th><th>类型</th><th>提交者</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
        <tbody>${materials.map(m => `
          <tr>
            <td><strong>${escHtml(m.title)}</strong></td>
            <td>${typeIcon(m.material_type)}</td>
            <td>${escHtml(m.submitter_name || '')}</td>
            <td>${statusBadge(m.status)}</td>
            <td>${fmtDate(m.created_at)}</td>
            <td>
              <div class="btn-group">
                <button class="btn btn-sm btn-primary" onclick="viewMaterial(${m.id})">查看</button>
                ${canEditMaterial(m) ? `<button class="btn btn-sm btn-success" onclick="editMaterial(${m.id})">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="deleteMaterial(${m.id})">删除</button>` : ''}
              </div>
            </td>
          </tr>`).join('')}</tbody>
      </table>`;
  } catch (err) {
    document.getElementById('materialsList').innerHTML =
      `<div class="empty-state"><p style="color:var(--admin-danger)">加载失败: ${err.message}</p></div>`;
  }
}

function canEditMaterial(m) {
  if (isAtLeast('SupervisorGeneral')) return true;
  if (currentUser.role === 'MaterialCollector' && m.submitter_id === currentUser.id) return true;
  return false;
}

function showCreateMaterialModal() {
  showModal('上传新素材', `
    <div class="form-group"><label>标题 *</label><input id="matTitle" placeholder="素材标题" /></div>
    <div class="form-group"><label>类型</label>
      <select id="matType"><option value="text">文字资料</option><option value="image">图片资料</option><option value="file">档案文件</option></select>
    </div>
    <div class="form-group"><label>内容</label><textarea id="matContent" placeholder="素材内容（文字资料填写正文，图片/文件填写描述）"></textarea></div>
    <div class="form-group"><label>文件链接</label><input id="matFileUrl" placeholder="图片或文件的 URL 地址" /></div>
  `, async () => {
    const body = {
      title: formValue('matTitle'),
      materialType: formValue('matType'),
      content: formValue('matContent'),
      fileUrl: formValue('matFileUrl'),
    };
    if (!body.title) throw new Error('标题为必填项');
    await api('/materials', { method: 'POST', body: JSON.stringify(body) });
    toast('素材上传成功', 'success');
    renderMaterials(document.getElementById('mainContent'));
  });
}

async function viewMaterial(id) {
  const materials = await api('/materials');
  const m = materials.find(x => x.id === id);
  if (!m) return;
  showModal(`查看素材: ${m.title}`, `
    <div class="form-group"><label>标题</label><p>${escHtml(m.title)}</p></div>
    <div class="form-group"><label>类型</label><p>${typeIcon(m.material_type)}</p></div>
    <div class="form-group"><label>内容</label><div style="white-space:pre-wrap;background:var(--admin-bg);padding:12px;border-radius:6px">${escHtml(m.content)}</div></div>
    ${m.file_url ? `<div class="form-group"><label>文件链接</label><p><a href="${escHtml(m.file_url)}" target="_blank" style="color:var(--admin-primary-hover)">${escHtml(m.file_url)}</a></p></div>` : ''}
    <div class="form-group"><label>提交者</label><p>${escHtml(m.submitter_name || '')} · ${fmtDate(m.created_at)}</p></div>
  `);
}

async function editMaterial(id) {
  const materials = await api('/materials');
  const m = materials.find(x => x.id === id);
  if (!m) return;
  showModal('编辑素材', `
    <div class="form-group"><label>标题</label><input id="matTitle" value="${escAttr(m.title)}" /></div>
    <div class="form-group"><label>类型</label>
      <select id="matType">${['text','image','file'].map(t => `<option value="${t}" ${m.material_type === t ? 'selected' : ''}>${t === 'text' ? '文字资料' : t === 'image' ? '图片资料' : '档案文件'}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>内容</label><textarea id="matContent">${escHtml(m.content)}</textarea></div>
    <div class="form-group"><label>文件链接</label><input id="matFileUrl" value="${escAttr(m.file_url || '')}" /></div>
  `, async () => {
    await api(`/materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: formValue('matTitle'), materialType: formValue('matType'),
        content: formValue('matContent'), fileUrl: formValue('matFileUrl'),
      }),
    });
    toast('素材修改成功', 'success');
    renderMaterials(document.getElementById('mainContent'));
  });
}

async function deleteMaterial(id) {
  if (!confirm('确认删除此素材？此操作不可撤销。')) return;
  try {
    await api(`/materials/${id}`, { method: 'DELETE' });
    toast('素材已删除', 'success');
    renderMaterials(document.getElementById('mainContent'));
  } catch (err) { toast(err.message, 'error'); }
}

// ===================== 视图：史事稿件（DraftWriter） =====================
async function renderDrafts(main) {
  const statusFilter = isAtLeast('SupervisorGeneral') ? '' : '&status=draft&status=pending_review&status=rejected';
  main.innerHTML = `<h1>✍️ 史事稿件</h1><p class="subtitle">撰写和管理史事内容</p>
    <div class="btn-group" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="showCreateDraftModal()">✍️ 新建稿件</button>
      <select id="draftStatusFilter" onchange="renderDrafts(document.getElementById('mainContent'))" style="margin-left:8px;padding:8px 12px;background:var(--admin-bg);border:1px solid var(--admin-border);border-radius:6px;color:var(--admin-text)">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="pending_review">待审核</option>
        <option value="approved">已通过</option>
        <option value="rejected">已驳回</option>
      </select>
    </div>
    <div id="draftsList"><p style="color:var(--admin-muted)">加载中...</p></div>`;

  try {
    const filterStatus = document.getElementById('draftStatusFilter')?.value || '';
    let url = '/records';
    const params = [];
    if (filterStatus) params.push(`status=${filterStatus}`);
    // DraftWriter 看到自己的草稿+所有非草稿
    if (currentUser.role === 'DraftWriter' && !filterStatus) {
      // 默认看自己的所有稿件
    }
    if (params.length) url += '?' + params.join('&');

    const records = await api(url);
    let filtered = records;
    // DraftWriter 默认只显示自己的草稿 + 所有已审核
    if (currentUser.role === 'DraftWriter' && !filterStatus) {
      filtered = records.filter(r => r.author_id === currentUser.id || r.status === 'approved');
    }

    const container = document.getElementById('draftsList');
    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📝</div><p>暂无稿件</p></div>';
      return;
    }
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>标题</th><th>学期</th><th>类型</th><th>状态</th><th>作者</th><th>日期</th><th>操作</th></tr></thead>
        <tbody>${filtered.map(r => `
          <tr>
            <td><strong>${escHtml(r.title)}</strong></td>
            <td>${escHtml(r.grade)}</td>
            <td>${typeLabel(r.type)}</td>
            <td>${statusBadge(r.status)}</td>
            <td>${escHtml(r.author_name || '')}</td>
            <td>${fmtDate(r.date || r.created_at)}</td>
            <td>
              <div class="btn-group">
                <button class="btn btn-sm btn-primary" onclick="viewDraft(${r.id})">查看</button>
                ${canEditDraft(r) ? `<button class="btn btn-sm btn-success" onclick="editDraft(${r.id})">编辑</button>` : ''}
                ${canSubmitReview(r) ? `<button class="btn btn-sm btn-warning" onclick="submitReview(${r.id})">提交审核</button>` : ''}
                ${isAtLeast('SupervisorGeneral') ? `<button class="btn btn-sm btn-danger" onclick="deleteRecord(${r.id})">删除</button>` : ''}
              </div>
            </td>
          </tr>`).join('')}</tbody>
      </table>`;
  } catch (err) {
    document.getElementById('draftsList').innerHTML =
      `<div class="empty-state"><p style="color:var(--admin-danger)">加载失败: ${err.message}</p></div>`;
  }
}

function canEditDraft(r) {
  if (isAtLeast('SupervisorGeneral')) return true;
  if (r.author_id === currentUser.id && (r.status === 'draft' || r.status === 'rejected')) return true;
  return false;
}

function canSubmitReview(r) {
  return currentUser.role === 'DraftWriter' && r.author_id === currentUser.id &&
    (r.status === 'draft' || r.status === 'rejected');
}

function showCreateDraftModal() {
  showModal('新建史事稿件', `
    <div class="form-group"><label>标题 *</label><input id="draftTitle" placeholder="史事标题" /></div>
    <div class="form-group"><label>学期 *</label>
      <select id="draftGrade">
        <option value="七上">七上</option><option value="七下" selected>七下</option>
        <option value="八上">八上</option><option value="八下">八下</option>
        <option value="九上">九上</option><option value="九下">九下</option>
      </select>
    </div>
    <div class="form-group"><label>类型</label>
      <select id="draftType"><option value="zhengshi">正史</option><option value="waishi">外史</option><option value="xishi">戏史</option></select>
    </div>
    <div class="form-group"><label>日期</label><input id="draftDate" type="date" /></div>
    <div class="form-group"><label>正文 *</label><textarea id="draftContent" placeholder="史事正文，支持 [b]粗体[/b]、[=]居中[/=]、[poem]诗歌[/poem] 等标签" style="min-height:200px"></textarea></div>
    <div class="form-group"><label>评语</label><input id="draftHonorific" placeholder="如：—— 史称XXX，为15班XXX之始。" /></div>
    <div class="form-group"><label>注释</label><input id="draftNotes" placeholder="补充说明（可选）" /></div>
  `, async () => {
    const body = {
      title: formValue('draftTitle'), grade: formValue('draftGrade'),
      type: formValue('draftType'), date: formValue('draftDate'),
      content: formValue('draftContent'), honorific: formValue('draftHonorific'),
      notes: formValue('draftNotes'),
    };
    if (!body.title || !body.grade) throw new Error('标题和学期为必填项');
    await api('/records', { method: 'POST', body: JSON.stringify(body) });
    toast('稿件创建成功（草稿状态）', 'success');
    renderDrafts(document.getElementById('mainContent'));
  });
}

async function viewDraft(id) {
  const records = await api('/records');
  const r = records.find(x => x.id === id);
  if (!r) return;
  showModal(`史事: ${r.title}`, `
    <div style="margin-bottom:16px">${statusBadge(r.status)} <span style="color:var(--admin-muted);margin-left:8px">${escHtml(r.grade)} · ${typeLabel(r.type)} · ${fmtDate(r.date || r.created_at)}</span></div>
    <div class="form-group"><label>正文</label><div style="white-space:pre-wrap;background:var(--admin-bg);padding:16px;border-radius:6px;max-height:300px;overflow-y:auto">${escHtml(r.content)}</div></div>
    ${r.honorific ? `<div class="form-group"><label>评语</label><p>${escHtml(r.honorific)}</p></div>` : ''}
    ${r.notes ? `<div class="form-group"><label>注释</label><p>${escHtml(r.notes)}</p></div>` : ''}
    ${r.review_comment ? `<div class="form-group"><label>审核意见</label><p style="color:${r.status==='rejected'?'var(--admin-danger)':'var(--admin-success)'}">${escHtml(r.review_comment)}</p></div>` : ''}
    <div class="form-group"><label>作者</label><p>${escHtml(r.author_name || '')} · ${fmtDate(r.created_at)}</p></div>
  `);
}

async function editDraft(id) {
  const records = await api('/records');
  const r = records.find(x => x.id === id);
  if (!r) return;
  showModal('编辑稿件', `
    <div class="form-group"><label>标题</label><input id="draftTitle" value="${escAttr(r.title)}" /></div>
    <div class="form-group"><label>学期</label>
      <select id="draftGrade">${['七上','七下','八上','八下','九上','九下'].map(g => `<option value="${g}" ${r.grade===g?'selected':''}>${g}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>类型</label>
      <select id="draftType">${['zhengshi','waishi','xishi'].map(t => `<option value="${t}" ${r.type===t?'selected':''}>${typeLabel(t)}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>日期</label><input id="draftDate" type="date" value="${r.date || ''}" /></div>
    <div class="form-group"><label>正文</label><textarea id="draftContent" style="min-height:200px">${escHtml(r.content)}</textarea></div>
    <div class="form-group"><label>评语</label><input id="draftHonorific" value="${escAttr(r.honorific || '')}" /></div>
    <div class="form-group"><label>注释</label><input id="draftNotes" value="${escAttr(r.notes || '')}" /></div>
  `, async () => {
    await api(`/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: formValue('draftTitle'), grade: formValue('draftGrade'),
        type: formValue('draftType'), date: formValue('draftDate'),
        content: formValue('draftContent'), honorific: formValue('draftHonorific'),
        notes: formValue('draftNotes'),
      }),
    });
    toast('稿件已更新', 'success');
    renderDrafts(document.getElementById('mainContent'));
  });
}

async function submitReview(id) {
  if (!confirm('确认提交审核？提交后将无法编辑。')) return;
  try {
    await api(`/records/${id}/submit-review`, { method: 'POST' });
    toast('已提交审核', 'success');
    renderDrafts(document.getElementById('mainContent'));
  } catch (err) { toast(err.message, 'error'); }
}

// ===================== 视图：待审稿件（Reviewer） =====================
async function renderReview(main) {
  main.innerHTML = `<h1>🔍 待审稿件</h1><p class="subtitle">审核执笔委员提交的史事稿件</p>
    <div id="reviewList"><p style="color:var(--admin-muted)">加载中...</p></div>`;

  try {
    const records = await api('/records?status=pending_review');
    const container = document.getElementById('reviewList');
    if (records.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">✅</div><p>暂无待审核稿件</p></div>';
      return;
    }
    container.innerHTML = records.map(r => `
      <div class="card">
        <h3>${escHtml(r.title)} <span style="font-size:12px;color:var(--admin-muted);font-weight:normal">${escHtml(r.grade)} · ${typeLabel(r.type)}</span></h3>
        <div style="white-space:pre-wrap;background:var(--admin-bg);padding:16px;border-radius:6px;margin:12px 0;max-height:200px;overflow-y:auto">${escHtml(r.content)}</div>
        ${r.honorific ? `<p style="color:var(--admin-muted)">${escHtml(r.honorific)}</p>` : ''}
        <p style="font-size:12px;color:var(--admin-muted);margin-top:8px">作者: ${escHtml(r.author_name || '')} · ${fmtDate(r.created_at)}</p>
        <div class="btn-group" style="margin-top:12px">
          <button class="btn btn-success" onclick="approveRecord(${r.id})">✅ 通过</button>
          <button class="btn btn-danger" onclick="showRejectModal(${r.id})">❌ 驳回</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('reviewList').innerHTML =
      `<div class="empty-state"><p style="color:var(--admin-danger)">加载失败: ${err.message}</p></div>`;
  }
}

async function approveRecord(id) {
  try {
    await api(`/records/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', comment: '审核通过' }),
    });
    toast('审核通过，已自动发布', 'success');
    renderReview(document.getElementById('mainContent'));
  } catch (err) { toast(err.message, 'error'); }
}

function showRejectModal(id) {
  showModal('驳回稿件', `
    <p style="margin-bottom:12px;color:var(--admin-muted)">请填写驳回理由，稿件将退回执笔委员修改。</p>
    <textarea id="rejectComment" class="review-comment" placeholder="驳回理由（必填）..." rows="4"></textarea>
  `, async () => {
    const comment = formValue('rejectComment');
    if (!comment.trim()) throw new Error('请填写驳回理由');
    await api(`/records/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', comment }),
    });
    toast('已驳回，稿件退回执笔委员', 'success');
    renderReview(document.getElementById('mainContent'));
  });
}

// ===================== 视图：全部史事（SupervisorGeneral+） =====================
async function renderRecords(main) {
  main.innerHTML = `<h1>📜 全部史事</h1><p class="subtitle">管理所有史事记录</p>
    <div id="recordsList"><p style="color:var(--admin-muted)">加载中...</p></div>`;

  try {
    const records = await api('/records');
    const container = document.getElementById('recordsList');
    if (records.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>暂无史事</p></div>';
      return;
    }
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>ID</th><th>标题</th><th>学期</th><th>类型</th><th>状态</th><th>作者</th><th>操作</th></tr></thead>
        <tbody>${records.map(r => `
          <tr>
            <td>${r.id}</td>
            <td><strong>${escHtml(r.title)}</strong></td>
            <td>${escHtml(r.grade)}</td>
            <td>${typeLabel(r.type)}</td>
            <td>${statusBadge(r.status)}</td>
            <td>${escHtml(r.author_name || '')}</td>
            <td>
              <div class="btn-group">
                <button class="btn btn-sm btn-primary" onclick="viewDraft(${r.id})">查看</button>
                <button class="btn btn-sm btn-success" onclick="editDraft(${r.id})">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="deleteRecord(${r.id})">删除</button>
              </div>
            </td>
          </tr>`).join('')}</tbody>
      </table>`;
  } catch (err) {
    document.getElementById('recordsList').innerHTML =
      `<div class="empty-state"><p style="color:var(--admin-danger)">加载失败: ${err.message}</p></div>`;
  }
}

async function deleteRecord(id) {
  if (!confirm('确认删除此史事？此操作不可撤销。')) return;
  try {
    await api(`/records/${id}`, { method: 'DELETE' });
    toast('史事已删除', 'success');
    renderRecords(document.getElementById('mainContent'));
  } catch (err) { toast(err.message, 'error'); }
}

// ===================== 视图：人物管理 =====================
async function renderCharacters(main) {
  main.innerHTML = `<h1>👥 人物管理</h1><p class="subtitle">管理班级史记相关人物档案</p>
    <div class="btn-group" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="showCreateCharModal()">➕ 添加人物</button>
    </div>
    <div id="charList"><p style="color:var(--admin-muted)">加载中...</p></div>`;

  try {
    const chars = await api('/characters');
    const container = document.getElementById('charList');
    if (chars.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">👤</div><p>暂无人物档案</p></div>';
      return;
    }
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>姓名</th><th>别号</th><th>性别</th><th>初龄</th><th>操作</th></tr></thead>
        <tbody>${chars.map(c => `
          <tr>
            <td><strong>${escHtml(c.name)}</strong></td>
            <td>${escHtml((c.nicknames || []).join(' · '))}</td>
            <td>${escHtml(c.gender || '')}</td>
            <td>${escHtml(String(c.firstAge || c.first_age || ''))}</td>
            <td>
              <div class="btn-group">
                <button class="btn btn-sm btn-primary" onclick="viewChar(${c.id})">查看</button>
                <button class="btn btn-sm btn-success" onclick="editChar(${c.id})">编辑</button>
                ${isAtLeast('SupervisorGeneral') ? `<button class="btn btn-sm btn-danger" onclick="deleteChar(${c.id})">删除</button>` : ''}
              </div>
            </td>
          </tr>`).join('')}</tbody>
      </table>`;
  } catch (err) {
    document.getElementById('charList').innerHTML =
      `<div class="empty-state"><p style="color:var(--admin-danger)">加载失败: ${err.message}</p></div>`;
  }
}

function showCreateCharModal() {
  showModal('添加人物', `
    <div class="form-group"><label>姓名 *</label><input id="charName" placeholder="人物姓名" /></div>
    <div class="form-group"><label>别号（逗号分隔）</label><input id="charNicks" placeholder="如：屎高祖, 屎皇帝" /></div>
    <div class="form-group"><label>性别</label><select id="charGender"><option value="">不详</option><option value="男">男</option><option value="女">女</option></select></div>
    <div class="form-group"><label>初龄</label><input id="charAge" placeholder="初次出场年龄，如 13" /></div>
    <div class="form-group"><label>特征</label><input id="charTraits" placeholder="如：带眼镜、调皮" /></div>
    <div class="form-group"><label>描述</label><textarea id="charDesc" placeholder="人物详情描述"></textarea></div>
  `, async () => {
    const nicknames = formValue('charNicks').split(/[,，、]/).map(s => s.trim()).filter(Boolean);
    await api('/characters', {
      method: 'POST',
      body: JSON.stringify({
        name: formValue('charName'), nicknames,
        gender: formValue('charGender'), firstAge: formValue('charAge'),
        traits: formValue('charTraits'), desc: formValue('charDesc'),
      }),
    });
    toast('人物已添加', 'success');
    renderCharacters(document.getElementById('mainContent'));
  });
}

async function viewChar(id) {
  const chars = await api('/characters');
  const c = chars.find(x => x.id === id);
  if (!c) return;
  const nicks = (c.nicknames || []).join(' · ');
  showModal(`人物: ${c.name}`, `
    <div class="form-group"><label>姓名</label><p>${escHtml(c.name)}</p></div>
    ${nicks ? `<div class="form-group"><label>别号</label><p>🏷️ ${escHtml(nicks)}</p></div>` : ''}
    <div class="form-group"><label>性别</label><p>${escHtml(c.gender || '不详')}</p></div>
    <div class="form-group"><label>初龄</label><p>${escHtml(String(c.firstAge || c.first_age || '不详'))}</p></div>
    ${c.traits ? `<div class="form-group"><label>特征</label><p>${escHtml(c.traits)}</p></div>` : ''}
    <div class="form-group"><label>描述</label><div style="white-space:pre-wrap;background:var(--admin-bg);padding:12px;border-radius:6px">${escHtml(c.desc || c.description || '')}</div></div>
  `);
}

async function editChar(id) {
  const chars = await api('/characters');
  const c = chars.find(x => x.id === id);
  if (!c) return;
  const nicks = (c.nicknames || []).join(', ');
  showModal('编辑人物', `
    <div class="form-group"><label>姓名</label><input id="charName" value="${escAttr(c.name)}" /></div>
    <div class="form-group"><label>别号（逗号分隔）</label><input id="charNicks" value="${escAttr(nicks)}" /></div>
    <div class="form-group"><label>性别</label><select id="charGender">${['', '男', '女'].map(g => `<option value="${g}" ${(c.gender||'')===g?'selected':''}>${g||'不详'}</option>`).join('')}</select></div>
    <div class="form-group"><label>初龄</label><input id="charAge" value="${escAttr(String(c.firstAge || c.first_age || ''))}" /></div>
    <div class="form-group"><label>特征</label><input id="charTraits" value="${escAttr(c.traits || '')}" /></div>
    <div class="form-group"><label>描述</label><textarea id="charDesc" style="min-height:120px">${escHtml(c.desc || c.description || '')}</textarea></div>
  `, async () => {
    const nicknames = formValue('charNicks').split(/[,，、]/).map(s => s.trim()).filter(Boolean);
    await api(`/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: formValue('charName'), nicknames,
        gender: formValue('charGender'), firstAge: formValue('charAge'),
        traits: formValue('charTraits'), desc: formValue('charDesc'),
      }),
    });
    toast('人物已更新', 'success');
    renderCharacters(document.getElementById('mainContent'));
  });
}

async function deleteChar(id) {
  if (!confirm('确认删除此人物？')) return;
  try {
    await api(`/characters/${id}`, { method: 'DELETE' });
    toast('人物已删除', 'success');
    renderCharacters(document.getElementById('mainContent'));
  } catch (err) { toast(err.message, 'error'); }
}

// ===================== 视图：委员管理 =====================
async function renderUsers(main) {
  main.innerHTML = `<h1>👤 委员管理</h1><p class="subtitle">管理编纂委员会成员账号</p>
    <div class="btn-group" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="showCreateUserModal()">➕ 添加委员</button>
    </div>
    <div id="usersList"><p style="color:var(--admin-muted)">加载中...</p></div>`;

  try {
    const users = await api('/users');
    const container = document.getElementById('usersList');
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>用户名</th><th>角色</th><th>注册时间</th><th>操作</th></tr></thead>
        <tbody>${users.map(u => `
          <tr>
            <td><strong>${escHtml(u.username)}</strong></td>
            <td>${roleLabel(u.role)}</td>
            <td>${fmtDate(u.created_at)}</td>
            <td>
              <div class="btn-group">
                ${canManageUserRole(u) ? `<button class="btn btn-sm btn-success" onclick="showChangeRoleModal(${u.id}, '${escAttr(u.username)}', '${u.role}')">改角色</button>` : ''}
                ${canDeleteUser(u) ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id}, '${escAttr(u.username)}')">删除</button>` : ''}
              </div>
            </td>
          </tr>`).join('')}</tbody>
      </table>`;
  } catch (err) {
    document.getElementById('usersList').innerHTML =
      `<div class="empty-state"><p style="color:var(--admin-danger)">加载失败: ${err.message}</p></div>`;
  }
}

function canManageUserRole(target) {
  const levels = { 'user':0, 'MaterialCollector':1, 'DraftWriter':2, 'Reviewer':3, 'SupervisorGeneral':4, 'DeputySupervisor':4, 'Chairperson':5, 'ExecutiveDeputyChair':5 };
  if ((levels[currentUser.role] || 0) <= (levels[target.role] || 0)) return false;
  if (currentUser.role === 'DeputySupervisor' && target.role === 'SupervisorGeneral') return false;
  if (currentUser.role === 'ExecutiveDeputyChair' && target.role === 'Chairperson') return false;
  return true;
}

function canDeleteUser(target) {
  return canManageUserRole(target);
}

function showCreateUserModal() {
  const manageableRoles = ['user', 'MaterialCollector', 'DraftWriter', 'Reviewer'];
  if (isAtLeast('Chairperson')) manageableRoles.push('SupervisorGeneral', 'DeputySupervisor', 'ExecutiveDeputyChair');
  else if (isAtLeast('SupervisorGeneral')) manageableRoles.push('SupervisorGeneral'); // 可以创建同级

  showModal('添加委员', `
    <div class="form-group"><label>用户名 *</label><input id="newUsername" placeholder="登录用户名" /></div>
    <div class="form-group"><label>密码 *</label><input id="newPassword" type="password" placeholder="至少6位" /></div>
    <div class="form-group"><label>角色</label>
      <select id="newRole">${manageableRoles.map(r => `<option value="${r}">${roleLabel(r)}</option>`).join('')}</select>
    </div>
  `, async () => {
    const username = formValue('newUsername');
    const password = formValue('newPassword');
    if (!username || !password) throw new Error('用户名和密码为必填项');
    await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, role: formValue('newRole') }),
    });
    toast('委员账号创建成功', 'success');
    renderUsers(document.getElementById('mainContent'));
  });
}

function showChangeRoleModal(userId, username, currentRole) {
  const manageableRoles = ['user', 'MaterialCollector', 'DraftWriter', 'Reviewer'];
  if (isAtLeast('Chairperson')) manageableRoles.push('SupervisorGeneral', 'DeputySupervisor', 'ExecutiveDeputyChair');
  else if (isAtLeast('SupervisorGeneral')) manageableRoles.push('DeputySupervisor');

  showModal(`修改角色: ${username}`, `
    <p style="color:var(--admin-muted);margin-bottom:16px">当前角色: ${roleLabel(currentRole)}</p>
    <div class="form-group"><label>新角色</label>
      <select id="newRole">${manageableRoles.map(r => `<option value="${r}" ${r===currentRole?'selected':''}>${roleLabel(r)}</option>`).join('')}</select>
    </div>
  `, async () => {
    await api(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: formValue('newRole') }),
    });
    toast(`角色更新成功`, 'success');
    renderUsers(document.getElementById('mainContent'));
  });
}

async function deleteUser(userId, username) {
  if (!confirm(`确认删除委员「${username}」？此操作不可撤销。`)) return;
  try {
    await api(`/users/${userId}`, { method: 'DELETE' });
    toast(`已删除委员 ${username}`, 'success');
    renderUsers(document.getElementById('mainContent'));
  } catch (err) { toast(err.message, 'error'); }
}

// ===================== 视图：操作日志 =====================
async function renderLogs(main) {
  main.innerHTML = `<h1>📋 操作日志</h1><p class="subtitle">系统操作审计记录（仅主任/常务副主任可查看）</p>
    <div id="logsList"><p style="color:var(--admin-muted)">加载中...</p></div>`;

  try {
    const logs = await api('/logs?limit=200');
    const container = document.getElementById('logsList');
    if (logs.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>暂无操作日志</p></div>';
      return;
    }
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>时间</th><th>操作者</th><th>动作</th><th>目标</th><th>详情</th></tr></thead>
        <tbody>${logs.map(l => `
          <tr>
            <td style="white-space:nowrap">${fmtDate(l.created_at)}</td>
            <td>${escHtml(l.username || '')}</td>
            <td>${actionLabel(l.action)}</td>
            <td>${escHtml(l.target_type || '')} ${l.target_id ? '#'+l.target_id : ''}</td>
            <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escAttr(l.details || '')}">${escHtml(l.details || '')}</td>
          </tr>`).join('')}</tbody>
      </table>`;
  } catch (err) {
    document.getElementById('logsList').innerHTML =
      `<div class="empty-state"><p style="color:var(--admin-danger)">加载失败: ${err.message}</p></div>`;
  }
}

function actionLabel(a) {
  const map = { 'login':'登录', 'create_user':'创建用户', 'delete_user':'删除用户', 'change_role':'修改角色',
    'create_record':'创建史事', 'update_record':'更新史事', 'delete_record':'删除史事',
    'submit_review':'提交审核', 'approve_record':'审核通过', 'reject_record':'审核驳回',
    'create_character':'创建人物', 'update_character':'更新人物', 'delete_character':'删除人物',
    'create_material':'上传素材', 'update_material':'修改素材', 'delete_material':'删除素材' };
  return map[a] || a;
}

// ===================== 视图：系统配置 =====================
async function renderConfig(main) {
  main.innerHTML = `<h1>⚙️ 系统配置</h1><p class="subtitle">系统统计与配置信息（仅主任/常务副主任可查看）</p>`;

  try {
    const config = await api('/config');
    main.innerHTML += `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${config.users}</div><div class="stat-label">注册用户</div></div>
        <div class="stat-card"><div class="stat-value">${config.records}</div><div class="stat-label">史事总数</div></div>
        <div class="stat-card"><div class="stat-value">${config.materials}</div><div class="stat-label">素材总数</div></div>
      </div>
      <div class="card">
        <h3>📋 可用角色</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          ${config.roles.map(r => `<span style="padding:6px 12px;background:var(--admin-bg);border-radius:6px;font-size:13px">${roleLabel(r)}</span>`).join('')}
        </div>
      </div>
      <div class="card">
        <h3>🔧 权限组说明</h3>
        <table class="admin-table">
          <thead><tr><th>角色</th><th>权限概述</th></tr></thead>
          <tbody>
            <tr><td>主任委员</td><td>最高权限，管理所有内容、用户、系统配置</td></tr>
            <tr><td>常务副主任委员</td><td>仅次于主任，不可修改主任账号</td></tr>
            <tr><td>总监制委员</td><td>管理所有内容 + 下级委员账号，不可改系统配置</td></tr>
            <tr><td>总副监制委员</td><td>同总监制，不可操作总监制账号</td></tr>
            <tr><td>审定委员</td><td>审核稿件（通过/驳回），不可直接编辑正文</td></tr>
            <tr><td>执笔委员</td><td>编写/修改史事正文，提交审核</td></tr>
            <tr><td>执书委员</td><td>上传/管理素材资料，不可访问史书正文</td></tr>
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    main.innerHTML += `<div class="card"><p style="color:var(--admin-danger)">加载失败: ${err.message}</p></div>`;
  }
}

// ===================== 工具函数 =====================
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(s) {
  return escHtml(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtDate(d) {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  } catch { return d; }
}

function typeLabel(t) {
  const map = { 'zhengshi': '正史', 'waishi': '外史', 'xishi': '戏史' };
  return map[t] || t;
}

function typeIcon(t) {
  const map = { 'text': '📝 文字', 'image': '🖼️ 图片', 'file': '📎 档案' };
  return map[t] || t;
}

function statusBadge(s) {
  return `<span class="status-badge status-${s}">${statusLabel(s)}</span>`;
}

// ===================== 注册 =====================
async function register() {
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const errorEl = document.getElementById('loginError');
  if (!username || !password) { errorEl.textContent = '请填写用户名和密码'; return; }
  if (/[一-鿿]/.test(username)) { errorEl.textContent = '账户名不能包含中文，请使用英文或拼音'; return; }

  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    toast(data.message || '注册成功', 'success');
    // 自动填充登录表单
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = password;
    // 切换到登录模式
    switchTab('login');
    errorEl.textContent = '';
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

function switchTab(tab) {
  document.querySelectorAll('.login-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('loginError').textContent = '';
}

// ===================== 初始化 =====================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
  });
  document.getElementById('loginUsername').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('loginPassword').focus();
  });
  document.getElementById('registerBtn').addEventListener('click', register);
  document.getElementById('regPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') register();
  });
  document.getElementById('regUsername').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('regPassword').focus();
  });
  document.querySelectorAll('.login-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  checkAutoLogin();
});

// 点击模态框背景关闭
document.addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') closeModal();
});
