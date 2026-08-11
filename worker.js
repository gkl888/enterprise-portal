/**
 * 企业门户 Worker 后端
 * - 存储员工手册（HTML 格式）
 * - 接收员工签名图片
 * - 提供管理后台API
 * - 生成员工专属二维码URL
 *
 * 部署：wrangler deploy worker.js --name enterprise-portal-api
 * KV Namespace: ENTERPRISE_KV
 */

const ALLOW_ORIGIN = '*'; // 生产环境应该限制域名

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

// HTML 页面
const ADMIN_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>企业门户 - 管理后台</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'PingFang SC', sans-serif; background: #0a0e1a; color: #e2e8f0; min-height: 100vh; padding: 20px; }
  .header { text-align: center; padding: 20px 0; }
  .header h1 { font-size: 24px; margin-bottom: 8px; background: linear-gradient(135deg, #4f8ef7, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .header .sub { color: #94a3b8; font-size: 13px; }
  .container { max-width: 960px; margin: 0 auto; }
  .tabs { display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid #1e2d4a; }
  .tab { padding: 12px 20px; cursor: pointer; color: #94a3b8; border-bottom: 2px solid transparent; transition: all .2s; }
  .tab.active { color: #4f8ef7; border-color: #4f8ef7; }
  .tab:hover { color: #e2e8f0; }
  .panel { display: none; background: #1a2235; border-radius: 12px; padding: 24px; border: 1px solid #1e2d4a; }
  .panel.active { display: block; }
  .form-group { margin-bottom: 16px; }
  .form-group label { display: block; font-size: 13px; color: #94a3b8; margin-bottom: 6px; }
  .form-group input, .form-group textarea, .form-group select { width: 100%; background: #111827; border: 1.5px solid #1e2d4a; border-radius: 8px; padding: 10px 12px; font-size: 14px; color: #e2e8f0; outline: none; font-family: inherit; }
  .form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: #4f8ef7; }
  .form-group textarea { min-height: 200px; font-family: monospace; resize: vertical; }
  .btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; transition: all .2s; margin-right: 8px; }
  .btn-primary { background: linear-gradient(135deg, #4f8ef7, #6ab0ff); color: #fff; }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79,142,247,.4); }
  .btn-success { background: linear-gradient(135deg, #34d399, #10b981); color: #fff; }
  .btn-danger { background: #1a2235; color: #f87171; border: 1px solid #f87171; }
  .btn-small { padding: 6px 12px; font-size: 12px; }
  .employee-list { max-height: 500px; overflow-y: auto; }
  .employee-item { display: flex; align-items: center; gap: 16px; padding: 14px; background: #111827; border-radius: 8px; margin-bottom: 8px; }
  .employee-info { flex: 1; }
  .employee-info .name { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
  .employee-info .meta { font-size: 12px; color: #94a3b8; }
  .employee-actions { display: flex; gap: 8px; align-items: center; }
  .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
  .status-badge.signed { background: rgba(52,211,153,.15); color: #34d399; }
  .status-badge.pending { background: rgba(247,201,72,.15); color: #f7c948; }
  .qr-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 999; align-items: center; justify-content: center; }
  .qr-modal.show { display: flex; }
  .qr-modal-content { background: #1a2235; border-radius: 16px; padding: 24px; max-width: 360px; text-align: center; border: 1px solid #1e2d4a; }
  .qr-modal-content h3 { margin-bottom: 12px; color: #e2e8f0; }
  .qr-modal-content img { width: 240px; height: 240px; background: #fff; padding: 10px; border-radius: 8px; margin: 12px auto; display: block; }
  .qr-modal-content .url { font-size: 11px; color: #94a3b8; word-break: break-all; background: #111827; padding: 8px; border-radius: 6px; margin-top: 10px; }
  .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-80px); background: #1e2a42; border: 1px solid #1e2d4a; border-radius: 10px; padding: 10px 20px; font-size: 14px; z-index: 9999; opacity: 0; transition: all .3s; pointer-events: none; }
  .toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
  .toast.success { border-color: #34d399; color: #34d399; }
  .toast.error { border-color: #f87171; color: #f87171; }
  .empty { text-align: center; padding: 40px; color: #64748b; }
  .help { font-size: 12px; color: #64748b; margin-top: 6px; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
</style>
</head>
<body>
<div class="header">
  <h1>🏢 企业门户管理后台</h1>
  <div class="sub">员工手册与签署管理</div>
</div>
<div class="container">
  <div class="tabs">
    <div class="tab active" onclick="switchTab('handbook')">📋 员工手册</div>
    <div class="tab" onclick="switchTab('employees')">👥 员工管理</div>
  </div>

  <!-- 手册设置 -->
  <div class="panel active" id="panel-handbook">
    <h3 style="margin-bottom: 16px;">编辑员工手册内容</h3>
    <div class="form-group">
      <label>手册标题</label>
      <input type="text" id="handbook-title" placeholder="例如：公司员工手册 v1.0" />
    </div>
    <div class="form-group">
      <label>手册内容（HTML格式）</label>
      <textarea id="handbook-content" placeholder="支持 HTML 标签，如 <h3>第一章</h3><p>...</p>"></textarea>
      <div class="help">使用 &lt;h3&gt; 标题，&lt;p&gt; 段落，&lt;ul&gt;/&lt;li&gt; 列表</div>
    </div>
    <button class="btn btn-primary" onclick="saveHandbook()">保存手册</button>
    <button class="btn btn-success" onclick="previewHandbook()">预览效果</button>
  </div>

  <!-- 员工管理 -->
  <div class="panel" id="panel-employees">
    <h3 style="margin-bottom: 16px;">添加员工 & 生成签署二维码</h3>
    <div class="row">
      <div class="form-group">
        <label>姓名</label>
        <input type="text" id="emp-name" placeholder="员工姓名" />
      </div>
      <div class="form-group">
        <label>部门</label>
        <select id="emp-dept">
          <option value="采购部">采购部</option>
          <option value="摄影部">摄影部</option>
          <option value="综合行政部">综合行政部</option>
          <option value="跨境部">跨境部</option>
        </select>
      </div>
    </div>
    <button class="btn btn-primary" onclick="addEmployee()">添加员工</button>

    <h3 style="margin: 24px 0 12px;">员工列表</h3>
    <div class="employee-list" id="employee-list">
      <div class="empty">暂无员工，请先添加</div>
    </div>
  </div>
</div>

<!-- 二维码弹窗 -->
<div class="qr-modal" id="qr-modal">
  <div class="qr-modal-content">
    <h3 id="qr-title">员工签署二维码</h3>
    <img id="qr-img" />
    <div class="url" id="qr-url"></div>
    <div style="margin-top: 16px;">
      <button class="btn btn-primary" onclick="closeQr()">关闭</button>
      <button class="btn btn-success" onclick="copyUrl()">复制链接</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const API = location.origin;
let currentQrUrl = '';

function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => t.classList.remove('show'), 2800);
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t,i) => {
    t.classList.toggle('active',
      (name==='handbook' && i===0) || (name==='employees' && i===1));
  });
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  if (name === 'employees') loadEmployees();
}

async function saveHandbook() {
  const title = document.getElementById('handbook-title').value.trim();
  const content = document.getElementById('handbook-content').value.trim();
  if (!title || !content) { showToast('请填写完整', 'error'); return; }
  const res = await fetch(API + '/api/handbook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content })
  });
  if (res.ok) showToast('手册已保存');
  else showToast('保存失败', 'error');
}

function previewHandbook() {
  const content = document.getElementById('handbook-content').value;
  const win = window.open('', '_blank');
  win.document.write('<html><head><meta charset="UTF-8"><title>手册预览</title>' +
    '<style>body{font-family:sans-serif;max-width:680px;margin:40px auto;padding:20px;color:#333;line-height:1.8;}' +
    'h3{color:#4f8ef7;margin:16px 0 8px;}p{margin-bottom:10px;}ul{padding-left:20px;}</style></head><body>' +
    content + '</body></html>');
}

async function loadHandbook() {
  const res = await fetch(API + '/api/handbook');
  if (res.ok) {
    const data = await res.json();
    document.getElementById('handbook-title').value = data.title || '';
    document.getElementById('handbook-content').value = data.content || '';
  }
}

async function addEmployee() {
  const name = document.getElementById('emp-name').value.trim();
  const dept = document.getElementById('emp-dept').value;
  if (!name) { showToast('请输入姓名', 'error'); return; }
  const res = await fetch(API + '/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, dept })
  });
  if (res.ok) {
    document.getElementById('emp-name').value = '';
    showToast('已添加：' + name);
    loadEmployees();
  }
}

async function loadEmployees() {
  const res = await fetch(API + '/api/employees');
  const list = await res.json();
  const el = document.getElementById('employee-list');
  if (!list.length) {
    el.innerHTML = '<div class="empty">暂无员工，请先添加</div>';
    return;
  }
  el.innerHTML = list.map(emp => \`
    <div class="employee-item">
      <div class="employee-info">
        <div class="name">\${emp.name}</div>
        <div class="meta">\${emp.dept} · \${emp.id}</div>
      </div>
      <div class="employee-actions">
        <span class="status-badge \${emp.signed ? 'signed' : 'pending'}">
          \${emp.signed ? '✓ 已签署' : '待签署'}
        </span>
        <button class="btn btn-primary btn-small" onclick="showQr('\${emp.id}','\${emp.name}')">二维码</button>
        <button class="btn btn-danger btn-small" onclick="deleteEmp('\${emp.id}')">删除</button>
      </div>
    </div>
  \`).join('');
}

async function deleteEmp(id) {
  if (!confirm('确定删除？')) return;
  await fetch(API + '/api/employees/' + id, { method: 'DELETE' });
  loadEmployees();
  showToast('已删除');
}

function showQr(id, name) {
  currentQrUrl = API + '/m-sign.html?id=' + encodeURIComponent(id);
  document.getElementById('qr-title').textContent = name + ' 的签署二维码';
  document.getElementById('qr-url').textContent = currentQrUrl;
  document.getElementById('qr-img').src =
    'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(currentQrUrl);
  document.getElementById('qr-modal').classList.add('show');
}

function closeQr() {
  document.getElementById('qr-modal').classList.remove('show');
}

function copyUrl() {
  navigator.clipboard.writeText(currentQrUrl).then(() => showToast('链接已复制'));
}

// 启动
loadHandbook();
</script>
</body>
</html>`;

// 手机签名页面（独立路由用）
function getMobileSignHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<title>员工手册签署</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { font-family: -apple-system, 'PingFang SC', sans-serif; background: #0a0e1a; color: #e2e8f0; min-height: 100vh; padding: 16px; padding-bottom: 100px; }
  .header { text-align: center; padding: 20px 0 16px; }
  .header h1 { font-size: 20px; margin-bottom: 6px; }
  .header .sub { font-size: 12px; color: #94a3b8; }
  .signee-card { background: #1a2235; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; border: 1px solid #1e2d4a; }
  .signee-row { display: flex; justify-content: space-between; font-size: 13px; line-height: 1.8; }
  .signee-row .label { color: #94a3b8; }
  .signee-row .value { color: #e2e8f0; font-weight: 600; }
  .section-title { font-size: 14px; color: #4f8ef7; margin: 18px 0 10px; display: flex; align-items: center; gap: 8px; }
  .section-title::before { content: ''; width: 3px; height: 14px; background: #4f8ef7; border-radius: 2px; }
  .handbook-content { background: #111827; border-radius: 12px; padding: 16px; border: 1px solid #1e2d4a; max-height: 300px; overflow-y: auto; font-size: 13px; line-height: 1.7; color: #cbd5e1; }
  .handbook-content h3 { color: #6ab0ff; font-size: 15px; margin: 14px 0 6px; }
  .handbook-content h3:first-child { margin-top: 0; }
  .handbook-content p { margin-bottom: 8px; }
  .handbook-content ul { padding-left: 18px; margin-bottom: 8px; }
  .handbook-content li { margin-bottom: 3px; }
  .confirm-card { background: #1a2235; border-radius: 12px; padding: 14px 16px; margin: 16px 0; border: 1px solid #1e2d4a; display: flex; align-items: flex-start; gap: 10px; }
  .confirm-card input[type=checkbox] { width: 18px; height: 18px; accent-color: #4f8ef7; flex-shrink: 0; margin-top: 1px; }
  .confirm-card label { font-size: 13px; line-height: 1.6; color: #cbd5e1; }
  .sign-board { background: #fff; border-radius: 12px; padding: 0; border: 2px dashed #f7c948; position: relative; margin-bottom: 12px; overflow: hidden; }
  .sign-board canvas { display: block; width: 100%; height: 220px; touch-action: none; }
  .sign-placeholder { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 14px; pointer-events: none; }
  .sign-actions { display: flex; gap: 10px; margin-bottom: 20px; }
  .btn-clear { flex: 1; padding: 12px; border-radius: 10px; border: 1px solid #1e2d4a; background: #1a2235; color: #94a3b8; font-size: 14px; font-weight: 600; }
  .btn-submit { flex: 2; padding: 14px; border-radius: 10px; border: none; background: linear-gradient(135deg, #34d399, #10b981); color: #fff; font-size: 15px; font-weight: 700; letter-spacing: 2px; }
  .btn-submit:disabled { opacity: .4; }
  .success-page { display: none; text-align: center; padding: 60px 20px; }
  .success-page.show { display: block; }
  .success-icon { width: 80px; height: 80px; border-radius: 50%; background: rgba(52,211,153,.15); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; }
  .success-icon svg { width: 44px; height: 44px; }
  .success-page h2 { font-size: 22px; color: #34d399; margin-bottom: 8px; }
  .success-page p { color: #94a3b8; font-size: 14px; line-height: 1.7; }
  .sign-time { color: #f7c948; margin-top: 12px; font-size: 13px; }
  .already-signed { background: #111827; border-radius: 12px; padding: 20px; text-align: center; }
  .already-signed img { max-width: 100%; border-radius: 8px; background: #fff; padding: 10px; margin-bottom: 12px; }
</style>
</head>
<body>
<div id="sign-page">
  <div class="header">
    <div style="font-size: 36px;">📋</div>
    <h1>员工手册签署</h1>
    <div class="sub">请仔细阅读后完成签署</div>
  </div>
  <div class="signee-card">
    <div class="signee-row"><span class="label">签署人</span><span class="value" id="signee-name">--</span></div>
    <div class="signee-row"><span class="label">部门</span><span class="value" id="signee-dept">--</span></div>
    <div class="signee-row"><span class="label">日期</span><span class="value" id="signee-date">--</span></div>
  </div>
  <div class="section-title">员工手册</div>
  <div class="handbook-content" id="handbook-content"><div style="text-align:center;color:#64748b;padding:30px">加载中...</div></div>
  <div class="section-title">手写签名</div>
  <div class="confirm-card">
    <input type="checkbox" id="agree" />
    <label for="agree">本人已阅读并完全理解《员工手册》全部内容，承诺遵守公司各项规章制度。</label>
  </div>
  <div class="sign-board">
    <canvas id="sign-canvas"></canvas>
    <div class="sign-placeholder" id="sign-placeholder">↑ 请在方框内手写您的签名 ↑</div>
  </div>
  <div class="sign-actions">
    <button class="btn-clear" onclick="clearSign()">清除重写</button>
    <button class="btn-submit" id="btn-submit" onclick="submitSign()" disabled>提交签署</button>
  </div>
</div>

<div id="already-signed" class="already-signed" style="display:none">
  <h3 style="color:#34d399;margin-bottom:12px">✓ 已完成签署</h3>
  <img id="prev-sign" />
  <div class="sign-time" id="prev-time"></div>
</div>

<div id="success-page" class="success-page">
  <div class="success-icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12" /></svg>
  </div>
  <h2>签署成功！</h2>
  <p>欢迎正式加入团队<br>祝您工作愉快 🚀</p>
  <div class="sign-time" id="sign-time"></div>
</div>

<script>
const API = location.origin;
const params = new URLSearchParams(location.search);
const employeeId = params.get('id') || '';

let canvas, ctx, placeholder, drawing = false, lastX = 0, lastY = 0, hasDrawn = false;
let dpr = window.devicePixelRatio || 1;

function initCanvas() {
  canvas = document.getElementById('sign-canvas');
  ctx = canvas.getContext('2d');
  placeholder = document.getElementById('sign-placeholder');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2.5;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, rect.width, rect.height);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing = true; const r = canvas.getBoundingClientRect(); const t = e.touches[0]; lastX = t.clientX - r.left; lastY = t.clientY - r.top; placeholder.style.display = 'none'; hasDrawn = true; checkSubmitable(); ctx.beginPath(); ctx.moveTo(lastX, lastY); }, { passive: false });
  canvas.addEventListener('touchmove', e => { if (!drawing) return; e.preventDefault(); const r = canvas.getBoundingClientRect(); const t = e.touches[0]; const x = t.clientX - r.left, y = t.clientY - r.top; ctx.lineTo(x, y); ctx.stroke(); lastX = x; lastY = y; }, { passive: false });
  canvas.addEventListener('touchend', e => { e.preventDefault(); drawing = false; ctx.beginPath(); });
  canvas.addEventListener('mousedown', e => { drawing = true; const r = canvas.getBoundingClientRect(); lastX = e.clientX - r.left; lastY = e.clientY - r.top; placeholder.style.display = 'none'; hasDrawn = true; checkSubmitable(); ctx.beginPath(); ctx.moveTo(lastX, lastY); });
  canvas.addEventListener('mousemove', e => { if (!drawing) return; const r = canvas.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; ctx.lineTo(x, y); ctx.stroke(); lastX = x; lastY = y; });
  canvas.addEventListener('mouseup', () => { drawing = false; ctx.beginPath(); });
  canvas.addEventListener('mouseleave', () => { drawing = false; ctx.beginPath(); });
}

function clearSign() {
  const rect = canvas.getBoundingClientRect();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, rect.width, rect.height);
  placeholder.style.display = 'flex';
  hasDrawn = false;
  checkSubmitable();
}

function checkSubmitable() {
  document.getElementById('btn-submit').disabled = !(document.getElementById('agree').checked && hasDrawn);
}

document.getElementById('agree').addEventListener('change', checkSubmitable);

async function submitSign() {
  if (!hasDrawn) { alert('请先签名'); return; }
  if (!document.getElementById('agree').checked) { alert('请先勾选确认'); return; }
  const signDataUrl = canvas.toDataURL('image/png');
  const res = await fetch(API + '/api/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: employeeId, signImage: signDataUrl })
  });
  if (res.ok) {
    document.getElementById('sign-page').style.display = 'none';
    document.getElementById('success-page').classList.add('show');
    document.getElementById('sign-time').textContent = '签署时间：' + formatDateTime(new Date());
    try { localStorage.setItem('sign_done_' + employeeId, '1'); } catch(e){}
  } else {
    alert('提交失败，请重试');
  }
}

function formatDate(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function formatDateTime(d) { return formatDate(d) + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); }

async function init() {
  if (!employeeId) { document.getElementById('sign-page').innerHTML = '<div style="text-align:center;padding:60px 20px;color:#f87171">缺少员工ID参数</div>'; return; }
  const res = await fetch(API + '/api/employees/' + employeeId);
  if (!res.ok) { document.getElementById('sign-page').innerHTML = '<div style="text-align:center;padding:60px 20px;color:#f87171">员工不存在</div>'; return; }
  const emp = await res.json();
  document.getElementById('signee-name').textContent = emp.name;
  document.getElementById('signee-dept').textContent = emp.dept;
  document.getElementById('signee-date').textContent = formatDate(new Date());

  const hbRes = await fetch(API + '/api/handbook');
  if (hbRes.ok) {
    const hb = await hbRes.json();
    document.getElementById('handbook-content').innerHTML = hb.content || '<div style="text-align:center;color:#64748b;padding:30px">暂无手册内容</div>';
  }

  if (emp.signed) {
    document.getElementById('sign-page').style.display = 'none';
    document.getElementById('already-signed').style.display = 'block';
    document.getElementById('prev-sign').src = emp.signImage;
    document.getElementById('prev-time').textContent = '签署时间：' + emp.signTime;
    return;
  }

  initCanvas();
}

window.addEventListener('load', init);
window.addEventListener('resize', () => { if (canvas) { canvas.width = canvas.getBoundingClientRect().width * dpr; canvas.height = canvas.getBoundingClientRect().height * dpr; } });
</script>
</body>
</html>`;
}

// 路由处理
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // OPTIONS 预检
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 管理后台
    if (path === '/' || path === '/admin' || path === '/admin.html') {
      return new Response(ADMIN_HTML, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 手机签名页
    if (path === '/m-sign' || path === '/m-sign.html') {
      return new Response(getMobileSignHtml(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // API 路由
    if (path.startsWith('/api/')) {
      return handleApi(request, env, path, method);
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};

async function handleApi(request, env, path, method) {
  try {
    // 保存/读取员工手册
    if (path === '/api/handbook' && method === 'GET') {
      const data = await env.ENTERPRISE_KV.get('handbook');
      return jsonResponse(data ? JSON.parse(data) : { title: '', content: '' });
    }
    if (path === '/api/handbook' && method === 'POST') {
      const body = await request.json();
      await env.ENTERPRISE_KV.put('handbook', JSON.stringify(body));
      return jsonResponse({ ok: true });
    }

    // 员工列表
    if (path === '/api/employees' && method === 'GET') {
      const list = await env.ENTERPRISE_KV.get('employees');
      const employees = list ? JSON.parse(list) : [];
      // 不返回签名图，减小载荷
      return jsonResponse(employees.map(e => ({
        id: e.id, name: e.name, dept: e.dept,
        signed: !!e.signed, signTime: e.signTime || null
      })));
    }
    if (path === '/api/employees' && method === 'POST') {
      const body = await request.json();
      const list = await env.ENTERPRISE_KV.get('employees');
      const employees = list ? JSON.parse(list) : [];
      const id = 'emp_' + Date.now();
      employees.push({
        id, name: body.name, dept: body.dept,
        signed: false, signTime: null, signImage: null
      });
      await env.ENTERPRISE_KV.put('employees', JSON.stringify(employees));
      return jsonResponse({ ok: true, id });
    }

    // 删除员工
    const delMatch = path.match(/^\/api\/employees\/(.+)$/);
    if (delMatch && method === 'DELETE') {
      const id = delMatch[1];
      const list = await env.ENTERPRISE_KV.get('employees');
      let employees = list ? JSON.parse(list) : [];
      employees = employees.filter(e => e.id !== id);
      await env.ENTERPRISE_KV.put('employees', JSON.stringify(employees));
      return jsonResponse({ ok: true });
    }

    // 查询单个员工
    const getMatch = path.match(/^\/api\/employees\/(.+)$/);
    if (getMatch && method === 'GET') {
      const id = getMatch[1];
      const list = await env.ENTERPRISE_KV.get('employees');
      const employees = list ? JSON.parse(list) : [];
      const emp = employees.find(e => e.id === id);
      if (!emp) return jsonResponse({ error: 'not found' }, 404);
      return jsonResponse(emp);
    }

    // 提交签名
    if (path === '/api/sign' && method === 'POST') {
      const body = await request.json();
      const list = await env.ENTERPRISE_KV.get('employees');
      let employees = list ? JSON.parse(list) : [];
      const idx = employees.findIndex(e => e.id === body.id);
      if (idx < 0) return jsonResponse({ error: 'employee not found' }, 404);
      employees[idx].signed = true;
      employees[idx].signTime = new Date().toISOString();
      employees[idx].signImage = body.signImage;
      await env.ENTERPRISE_KV.put('employees', JSON.stringify(employees));
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'not found' }, 404);
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}