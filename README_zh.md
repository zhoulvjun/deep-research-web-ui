# Deep Research Web

本项目是 https://github.com/dzhng/deep-research 的可视化版本，并做了一些改进。

特色：
- 🚀 **隐私安全**：所有配置和 API 请求均在浏览器端完成
- 🕙 **实时反馈**：流式传输 AI 响应并在界面实时展示
- 🌳 **搜索可视化**：使用树状结构展示研究过程，支持使用英文搜索词
- 📄 **支持导出 PDF**：将最终研究报告导出为 PDF 格式
- 🤖 **多模型支持**：底层使用纯提示词而非结构化输出等新特性，兼容更多大模型供应商

当前支持的供应商：

- AI 服务：任意兼容 OpenAPI 的供应商
- 网络搜索：Tavily（类似 Firecrawl，提供每月 1000 次免费搜索）

喜欢本项目请点 ⭐ 收藏！

<video width="500" src="https://github.com/user-attachments/assets/2f5a6f9c-18d1-4d40-9822-2de260d55dab" controls></video>

## 最近更新 

25/02/14

- 支持 DeepSeek R1 等思维链模型
- 改进了模型兼容性，改进异常处理

25/02/13

- 大幅缩减了网页体积
- 支持配置搜索时使用的语言
- 支持 Docker 部署
- 修复“导出 PDF”不可用的问题

25/02/12
- 添加中文支持。模型会自动使用用户的语言回答了。
- 修复一些 bug

## 使用指南

在线演示：<a href="https://deep-research.ataw.top" target="_blank">https://deep-research.ataw.top</a>

### 自托管部署

使用 [EdgeOne Pages](https://edgeone.ai/products/pages) 一键部署：

[![Deploy with EdgeOne Pages](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?from=github&template=https://github.com/AnotiaWang/deep-research-web-ui&from=github)

Docker 部署（使用现成镜像）：

```bash
docker run -p 3000:3000 --name deep-research-web -d anotia/deep-research-web:latest
```

Docker 部署（自行打包镜像）：

```bash
git clone https://github.com/AnotiaWang/deep-research-web-ui
cd deep-research-web-ui
docker build -t deep-research-web .
docker run -p 3000:3000 --name deep-research-web -d deep-research-web
```

---

## 开发指南

### 环境配置

安装依赖：

```bash
pnpm install
```

### 开发模式

启动本地开发服务器（访问 http://localhost:3000）：

```bash
pnpm dev
```

### 生产构建

SSR 模式：

```bash
pnpm build
```

SSG 模式（静态部署）：

```bash
pnpm generate
```

本地预览生产构建：

```bash
pnpm preview
```

详见 [部署文档](https://nuxt.com/docs/getting-started/deployment)。

## 许可协议

MIT 协议
