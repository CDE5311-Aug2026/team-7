# Fileo 发布验证 · 2026-10-14

在线原型：https://fileo-prototype.vercel.app

课程源码：https://github.com/CDE5311-Aug2026/team-7 （private，main 分支）

## 已确认

- 本地 TypeScript 检查、Vite 生产构建、8 项模型测试通过。
- Vercel 在干净环境中按锁文件安装并完成生产构建，状态 READY。
- 使用未携带登录 Cookie 的 HTTP 请求访问生产网址，返回 200。
- 在全新浏览器上下文执行 15 项完整交互检查，全部通过，报告见 `production-report.json`。
- 单按钮进入 → 分析 → 版本对比 → 暂存和刷新 → 确认 → 执行与失败重试 → 搜索新路径 → 恢复 → 重置。
- 检查 1920、1280、768、390 px 布局；手机导航与助手可操作，无页面横向溢出。
- 无浏览器控制台错误、JavaScript 异常或失败素材请求。
- GitHub 上传不含 node_modules、dist、.env*、.vercel 或本机设计提取参考。

完整线上测试基于提交 `902feeaabfa0a90dff58ab3633355bb2902db93c`、部署 `dpl_8XRammkpjoR3PeRoeNcX3xQthSua`；随后提交仅补充访问链接与本验证记录，网页源码和资源不变。

## 后续更新

Vercel 项目：`j-yo-s-h-i-k/fileo-prototype`。

当前 Hobby 计划不支持与组织私有仓库直接连接。因此 GitHub 源码与 Vercel 网站分别上传，GitHub push 不自动触发部署；更新命令见 README。课程仓库保持私有，无新增协作者、付费计划或应用密钥。

交互使用浏览器保存的演示记录；不操作真实磁盘文件。助手是规则式演示，没有接入真实 AI 或账号后端。
