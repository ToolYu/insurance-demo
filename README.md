# 保险计划书分析工具

一个用于分析保险计划书的线上应用原型。用户可以上传 PDF/TXT 文件，或直接粘贴计划书文字，并在网页中输入自己的 LLM API Key；后端提取文本并调用 LLM 结构化关键信息，前端展示保障、缴费、现金价值、IRR、回本期和用户可读总结。

## 功能

- 上传多个 PDF/TXT/Markdown/JSON 文件进行分析
- 直接粘贴计划书文本进行分析
- 提取产品名称、保障金额、保障期间、首年保费、缴费年限、利益演示表
- 计算现金流、回本期和 IRR 趋势
- 生成普通用户可理解的方案总结和风险提示
- 多方案核心指标与趋势图对比
- 用户自带 API Key，不需要部署方保存统一模型密钥

## 技术栈

- 前端：Next.js 15、React 19、TypeScript、Tailwind CSS、Recharts
- 后端：FastAPI、OpenAI SDK 兼容接口、pdfplumber、pytesseract、numpy-financial
- 推荐部署：前端 Vercel，后端 Render Docker

## 本地运行

### 1. 前端

```bash
npm install
cp .env.example .env.local
npm run dev
```

默认前端地址是 `http://localhost:3000`。

`.env.local`：

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### 2. 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

如果希望用户在网页输入自己的 API Key，`backend/.env` 不需要配置模型密钥。只需要配置 CORS：

```bash
CORS_ORIGINS=http://localhost:3000
```

也可以配置平台兜底 key，用户不输入 key 时后端会使用这个 key：

```bash
DEEPSEEK_API_KEY=你的 DeepSeek API Key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```

如果需要 OCR，系统还需要安装 Tesseract 和中文语言包。macOS 可使用：

```bash
brew install tesseract tesseract-lang
```

## 环境变量

前端：

- `NEXT_PUBLIC_API_BASE_URL`：后端 API 地址，例如 `https://your-api.onrender.com`

后端：

- `DEEPSEEK_API_KEY`：可选。平台兜底 DeepSeek API Key，也兼容 `OPENAI_API_KEY`
- `LLM_BASE_URL`：OpenAI 兼容接口地址，默认 `https://api.deepseek.com/v1`
- `LLM_MODEL`：模型名，默认 `deepseek-chat`
- `CORS_ORIGINS`：允许访问后端的前端域名，多个用英文逗号分隔
- `MAX_UPLOAD_SIZE_MB`：单文件上传大小限制，默认 20
- `ENABLE_OCR`：是否启用 OCR，默认 `true`

## 部署

### 是否适合 GitHub Pages

不适合完整部署到 GitHub Pages。原因是本项目包含 FastAPI 后端、文件上传、PDF/OCR 解析和 LLM API 调用。GitHub Pages 只能托管静态文件，不能安全保存 API Key，也不能运行后端解析任务。

### 推荐方案

推荐使用：

- 前端：Vercel
- 后端：Render Docker Web Service

这个组合适合当前架构：Vercel 负责 Next.js 静态/前端体验，Render 负责 Python 后端、系统依赖、文件上传解析和 LLM 调用。

### 后端部署到 Render

仓库已提供 `render.yaml` 和 `backend/Dockerfile`。在 Render 创建 Blueprint 或 Web Service 后配置：

- Root Directory：`backend`
- Environment：Docker
- Health Check Path：`/api/health`
- 环境变量：
  - `DEEPSEEK_API_KEY`：可选；如果希望所有用户自填 key，可以不配置
  - `LLM_BASE_URL`
  - `LLM_MODEL`
  - `CORS_ORIGINS=https://你的前端域名`
  - `MAX_UPLOAD_SIZE_MB=20`
  - `ENABLE_OCR=true`

### 前端部署到 Vercel

在 Vercel 导入仓库，配置：

- Framework Preset：Next.js
- Build Command：`npm run build`
- Output：默认
- 环境变量：
  - `NEXT_PUBLIC_API_BASE_URL=https://你的 Render 后端域名`

部署后，把 Vercel 域名追加到 Render 的 `CORS_ORIGINS`。

## 用户 API Key 模式

网页中的 API Key 输入框用于 DeepSeek/OpenAI 兼容接口。默认配置是：

- Base URL：`https://api.deepseek.com/v1`
- Model：`deepseek-chat`

用户输入的 key 只保存在当前页面内存里，并随 `/api/analyze` 或 `/api/analyze-text` 请求发送到后端。刷新页面后需要重新输入。生产环境必须使用 HTTPS，避免 API Key 在传输过程中暴露。

## 文件上传说明

当前实现直接把上传文件发送到后端内存处理，不落盘持久化，适合计划书解析这种短任务。生产环境建议：

- 限制文件大小和文件类型
- 对上传内容做病毒扫描或隔离处理
- 大文件或批量任务改为对象存储加异步队列
- 保留请求日志，但不要记录用户隐私原文

## 常见问题

- 后端返回“请输入你的 LLM API Key”：在页面 API 设置里输入自己的 key，或给后端配置 `DEEPSEEK_API_KEY`
- 前端请求失败：检查 `NEXT_PUBLIC_API_BASE_URL` 是否指向后端，且后端 `CORS_ORIGINS` 包含前端域名
- PDF 提取为空：可能是扫描件，需要启用 OCR 并安装 Tesseract 中文语言包
- PDF 表格提取不完整：当前实现不使用 Camelot，优先把 pdfplumber/OCR 提取出的正文交给大模型理解；复杂扫描件可能需要更高质量 OCR。

## 后续优化建议

- 增加用户登录、任务历史和分析报告导出
- 为 LLM 输出增加 JSON Schema 校验和重试
- 增加异步任务队列，避免大文件请求超时
- 引入对象存储，处理多页大 PDF
- 增加端到端测试和后端单元测试样例
