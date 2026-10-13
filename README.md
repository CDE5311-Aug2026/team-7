# Fileo 本地交互原型

基于现有 Figma 的莓紫色 Fileo 界面制作，使用 React、TypeScript 和 Vite。四个精修预览、背景和主要图标来自原 Figma；字体与素材已保存到本地。

## 现在打开

双击项目目录中的 **Start Fileo.cmd**。

它会启动本机服务并打开 **http://127.0.0.1:5173**。服务只监听本机地址。重复启动会复用已运行的 Fileo 服务，不会清空进度。

首次打开先显示欢迎／登录页，点击唯一的 **Enter workspace** 按钮即可进入，无需邮箱或密码。同一标签页刷新会保持已进入状态。要重新演示入口，打开 **http://127.0.0.1:5173/#/welcome**，或点击 **Settings → Back to welcome**；已有整理进度保留。

交付中包含已经构建好的 `dist`。这台电脑可以直接使用 Codex 附带的 Node.js，无需先安装依赖。不要双击 `dist/index.html`，请通过启动入口访问。

## 已实现的交互

- 42 个示例文件：Sources 14、Renders 12、Research 10、Motion 6。
- 文件范围、项目、子文件夹、整理目标和规则选择。
- 分析加载状态、建议列表、逐项决定、批量保留／归档、版本对比、文件详情。
- 输入搜索、Ctrl K、实时建议、类型／位置筛选、排序、列表／网格切换、分页、无结果恢复。
- 确认前预览目标路径；确认复选框控制执行；取消不会移动文件。
- 执行进度、结果、模拟文件占用失败、仅重试失败项。
- 任务记录、历史、恢复原位置、恢复前取消。
- 浏览器本地保存、刷新后继续、JSON 导出、一键重置。
- 有依据链接的规则式助手，以及支持格式／隐私说明。
- 桌面、平板和手机布局；弹窗焦点约束、Escape、可见键盘焦点。

## 3–5 分钟演示

先在欢迎页点击 **Enter workspace**。

1. 首页点击 **Analyze 42 files**。
2. 点击 **Compare orbit versions**，把 `orbit_v03.blend` 改为 **Archive**，保留 v07，点击 **Done comparing**。
3. 点击 **Review actions**，查看 17 个目标路径。勾选确认框，再点击 **Confirm 17 operations**。
4. 显示 16 项完成、1 项失败。点击 **Retry 1 failed file**，观察只重试失败项。
5. 按 **Ctrl K**，搜索 `orbit_v03`。打开详情，确认路径中出现 `_Archive/Sources`。
6. 打开 **History & recovery**，找到 v03，点击 **Restore → Restore file**。原路径恢复，历史保留记录。
7. 在 **Settings → Reset demo** 恢复最初状态。

## 实现边界

这是可运行的网页功能原型，操作对象是浏览器里的示例文件记录。归档、Trash、恢复会真实改变这些记录，所有页面读取同一份状态；不会移动或删除电脑上的实际文件。

AI 助手是预设规则与回答，搜索基于文件名、路径和标签，不是开放式语义 AI。缩略图是 Figma 演示插画，不读取 BLEND／TOE 等文件内容。没有真实账号、云同步、后端或外部 AI 调用。

模拟分析约 1.3 秒；文件操作每项约 0.2 秒。默认 `render_preview.bip` 首次移动会显示占用错误，重试成功。可在 Settings 关闭此演示情景。

## 修改与构建

使用 Node.js 24 LTS 和 pnpm 11.25.0。首次从 GitHub 克隆：

```sh
git clone https://github.com/william-Xu-cool/fileo-prototype.git
cd fileo-prototype
npx --yes pnpm@11.25.0 install --frozen-lockfile
npm run dev
npm run build
npm test
```

本机也可直接双击 **Rebuild Fileo.cmd** 重新构建，然后刷新网页；现有 `node_modules` 已准备好。构建会更新 `dist`，不会重置浏览器数据。

```sh
node scripts/serve.mjs
```

上面的命令运行已构建版本。其他端口可通过 `FILEO_PORT` 指定。原型状态绑定浏览器和访问源；`localhost` 与 `127.0.0.1` 会使用不同的保存空间。

## 文件结构

```text
src/App.tsx             页面、组件组合和交互
src/components.tsx      弹窗、图标、原设计预览
src/model.ts            数据、整理规则和状态更新
src/styles.css          样式与响应式布局
public/assets/          原设计素材与本地字体
vercel.json            Vercel 安装、构建与输出配置
tests/model.test.ts      核心操作与一致性测试
scripts/test-browser.mjs 浏览器完整流程检查
scripts/serve.mjs        无额外依赖的本地服务
verification/           验证报告
dist/                   可运行的构建结果
```

浏览器测试使用 Playwright 与本机 Chrome。脚本默认使用这台电脑 Codex 提供的 Playwright；其他机器可通过 `FILEO_PLAYWRIGHT`、`FILEO_BROWSER`、`FILEO_EVIDENCE_DIR` 指定位置。

## Vercel 部署

GitHub 仓库只包含源码、锁文件、素材与文档。`dist`、`node_modules`、`.env*`、`.vercel` 和本机 Figma 提取参考均不提交；从仓库首次启动前需要安装依赖并构建。

在 Vercel 导入这个 GitHub 仓库，选择 **Vite**，Root Directory 保持仓库根目录，Node.js 选择 **24.x**。`vercel.json` 固定 pnpm 版本并使用锁文件安装；Build Command 为 `npm run build`，Output Directory 为 `dist`。本项目不需要环境变量、API 密钥或数据库。

页面使用 `#/welcome` 等 hash 路由，刷新时服务器始终接收根路径，因此不需要额外 SPA 重写规则。生产分支为 `main`；连接 GitHub 后，后续 push 会触发新部署。

部署成功后，用未登录 Vercel 的浏览器打开生产网址，按上面的演示顺序验证。自动检查可设置 `FILEO_BASE_URL` 为生产网址，再执行 `node scripts/test-browser.mjs`。不同浏览器及本地／线上网址各自保存演示进度，不会互相同步。

课堂流程依据：Week 8 课件第 51–52 页（检查、README、私有 GitHub 仓库）及第 56–59 页（Vercel 配置、线上测试、分享原型网址）。

## 视觉来源

- Figma 文件：`qwkUqI0RDCDERydgaGs6Vx`，Digital Dark Data · Pixel Personas。
- 主工作台：`424:4753`，精修文件预览版。
- 欢迎／登录页：`396:4671`，保留原花卉玻璃插画，并按要求改为单按钮进入。
- 审查／确认／浏览／历史参考：`431:4879`、`431:6370`、`433:5060`、`433:5861`。
- 根据网页操作需要增加列表分页、表单控件和响应式布局，保留原界面的主要布局、颜色与素材。

设计截图未用作页面背景；界面由可交互 HTML/CSS 组件构成。临时 Figma URL 保留于本机 `design-reference` 参考目录，不提交到 GitHub，也不参与线上运行。
