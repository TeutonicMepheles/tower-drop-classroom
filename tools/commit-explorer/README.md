# 项目演变与游戏预览

在仓库根目录执行 `npm run explorer`，打开 http://127.0.0.1:3210。
需要 Node.js 22+、Git、tar 和 npm。默认仅本机可访问，可用环境变量 `EXPLORER_PORT` 更换端口。

## 课堂展示

页面按 1920×1080 排版，随窗口等比缩放；其他比例留边。上方为提交树，下方为单个游戏版本。收起历史后保留泳道图例，游戏扩大显示，始终保持 16:9。

- 单击节点切换游戏版本；双击推送节点（或聚焦后按 Enter）查看提交气泡。
- Ctrl/Cmd + 滚轮横向滚动，Shift + 滚轮横向缩放。泳道图例固定在左侧。
- 推送角标仅统计实际折叠进当前节点的提交。其他泳道保留的提交在气泡内默认折叠，点击数量展开；提交条目仅作文本展示。
- 点击“重新开始”重新载入当前游戏。刷新网页重新读取本地历史和事件快照，默认选择 origin/main。

## 历史来源与连线

服务从本仓库 `git log --all --topo-order` 读取最近 180 个提交，页面展示教学基线 classroom-start 之后的历史。需要远端新提交时先执行 `git fetch origin --prune`；页面不会自动联网更新 Git 引用或推送事件。

泳道按分支第一父链和已核实的合并锚点固定分配，不按提交文案分类。主线、玩法、界面、美术、模块重构、提交浏览工具分别保留；初版界面和反馈优化共用界面泳道。规则在 `lanes.mjs`。缺少引用或已核实锚点时保留“历史分支”，不猜测原分支名。

`pushes.json` 保存已核对的 28 次 GitHub 推送事件。仅折叠同一次推送中与推送分支泳道相符、且未归入其他推送的提交；无事件的提交保留独立节点。同步但未引入可折叠提交的事件不会生成重复节点。实线根据原始提交的父 SHA 收缩生成，箭头指向后续提交。PR #10 的 affec4b → 690829c 用标注“压缩合并”的金色虚线说明成果归并关系，不作为真实 Git 父子关系。

日期按北京时间分组，每日只显示一个标题；独立泳道可共用横向列，同泳道与父子依赖保持间距。这不是按时长等比例绘制的时间轴。

## 游戏快照

通过 `git archive` 提取准确提交，按对应 package-lock 安装依赖（禁用安装脚本），再执行 Vite 构建。历史代码在本机执行，仅用于信任的本仓库。

缓存位于忽略目录 `.commit-explorer/`，不会切换分支，也不包含未提交文件。相同 lockfile 复用依赖，构建串行执行；失败时显示原因并可重试。首次安装依赖需要网络。切换版本时移除旧游戏，迟到的构建结果不会覆盖当前选择。

游戏以至少 1280×720 的内部视口等比显示。同源版本共享 localStorage，因此最高纪录等可能相互影响；此页面不是独立存档环境。

终端按 Ctrl+C 停止服务。缓存可在停止后手动删除。

## 辅助工作区快照

`node tools/commit-explorer/collect-workspaces.mjs` 可抓取配置工作区的远端并生成 `workspaces.json`。此操作不切换分支、不合并、不提交或推送。课堂页面不展示工作区状态卡片；辅助快照仍可单独读取。

## 换机接续编辑

完整克隆仓库以保留演变图需要的提交、分支和标签；不要使用 Download ZIP 或浅克隆。

```powershell
git clone https://github.com/TeutonicMepheles/tower-drop-classroom.git
cd tower-drop-classroom
git fetch origin --tags
npm ci
npm run explorer
```

打开 <http://127.0.0.1:3210>。已有 checkout 请先检查未提交改动，再在 main 执行 `git pull --ff-only`。首次预览历史版本时需要联网安装对应依赖。

编辑入口：`index.html`、`app.js`、`style.css`；历史分组和泳道分别在 `timeline.mjs`、`lanes.mjs`，推送事件在 `pushes.json`。提交这些源码即可，`.commit-explorer/` 缓存不必迁移。无需复制原机器的 member-a / member-b / member-c 工作区；`collect-workspaces.mjs` 只是旧课堂目录布局的辅助采集工具，不是启动前置步骤。

对应课件位于 [GolajahSlideArchive/Small-Team-Project-Management](https://github.com/TeutonicMepheles/GolajahSlideArchive/tree/main/Small-Team-Project-Management)，构建方法和工具版本由课件目录的 README、toolchain.json 管理。
