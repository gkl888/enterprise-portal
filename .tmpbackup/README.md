# 企业门户 - 部署指南

## 📁 项目文件

```
enterprise-portal/
├── index.html      ← 员工登录+入职+导航主页
├── m-sign.html    ← 手机扫码手签页面
├── worker.js      ← Cloudflare Worker 后端
├── wrangler.toml  ← 部署配置
└── README.md      ← 本文件
```

---

## 🚀 部署步骤

### 第一步：安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 第二步：登录 Cloudflare

```bash
npx wrangler login
```
（浏览器会自动弹出，点击授权即可）

### 第三步：创建 KV 命名空间

在 Cloudflare Dashboard 创建：

1. 打开 https://dash.cloudflare.com
2. 进入 **Workers & Pages** → **KV**
3. 点击 **Create a namespace**
4. 名称填：`ENTERPRISE_KV`
5. 复制 Namespace ID

### 第四步：更新 wrangler.toml

把 `YOUR_KV_NAMESPACE_ID` 替换为第三步复制的 ID：

```toml
kv_namespaces = [
  { binding = "ENTERPRISE_KV", id = "你的真实Namespace ID" }
]
```

### 第五步：部署 Worker

```bash
cd C:\Users\Administrator\enterprise-portal
npx wrangler deploy
```

部署成功后会输出类似：
```
https://enterprise-portal-api.你的账户.workers.dev
```

### 第六步：更新 index.html

把第六步输出的地址填入 `index.html` 的 `API_BASE`：

```javascript
// 找到这一行
const API_BASE = '';

// 改成你的 Worker 地址，例如：
const API_BASE = 'https://enterprise-portal-api.你的账户.workers.dev';
```

### 第七步：部署前端页面（Cloudflare Pages）

```bash
npx wrangler pages deploy . --project-name=enterprise-portal
```

或用其他平台（Vercel、Netlify 等）把 `index.html` 和 `m-sign.html` 上传即可。

---

## 🎯 日常使用流程

### 作为管理员：

1. 打开 `https://你的域名/admin.html` 或 `https://你的Worker地址/`
2. **手册设置**：编辑员工手册内容（HTML格式）→ 保存
3. **员工管理**：添加员工姓名 → 生成二维码 → 打印/发送给员工

### 作为员工：

1. 微信扫码二维码
2. 在手机浏览器中阅读手册
3. 在签名板上手写签名
4. 提交后自动通知门户

### 门户自动判断：

- **未注册** → 欢迎页
- **未认证** → 认证页
- **未签手册** → 扫码签署页（自动轮询状态）
- **已完成** → 直接进入三大系统导航

---

## 🔧 本地测试（不部署后端）

`API_BASE` 留空时使用本地 localStorage 演示，适合开发调试。

---

## ❓ 常见问题

**Q: 二维码扫描后打不开？**
A: 确保 Worker 已正确部署，且 `m-sign.html` 文件存在于同一域名下

**Q: 签名提交失败？**
A: 检查 KV 命名空间 ID 是否正确，Worker 日志可在 Cloudflare Dashboard 查看

**Q: 想修改员工手册内容？**
A: 访问 `/admin.html` → 手册设置 → 修改 → 保存
