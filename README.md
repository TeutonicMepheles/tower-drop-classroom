# Tower Drop：Rider + GitHub 三人协作教学

本仓库用于大三数字媒体本科生的游戏开发课程，约 45 分钟演示 Rider + GitHub 的多人协作与版本管理。教师用一个真实 GitHub 账号扮演三名成员；PR 作者相同，通过角色分支、标题和标签区分。实际学生作业每人使用自己的账号。

基于 [DiegoLibonati/tower-drop](https://github.com/DiegoLibonati/tower-drop)（Three.js、TypeScript、Vite、Cannon.js）。保留原作者 MIT LICENSE；原项目说明见 [README.upstream.md](README.upstream.md)。这是教学 Fork，不是独立原创游戏。

## 当前状态

最终整合版包含 A·玩法的简单 / 普通难度、完美拼接与连击、每五层随机奖励、五种基础/续航加成与三种主动技能、护盾救援和分难度本地纪录；B·美术的动态背景、雾效、差异材质、成功粒子与完美光环；C·UI 的中文菜单、难度选择、状态展示与重开流程。移动速度随已完成层数增加：普通每层增加初始速度的 3.5%，最高 2.2 倍；简单每层增加 2.5%，最高 1.8 倍。速度只在换层时变化。

短按游戏区域落块；长按移动方块约 0.3 秒进入子弹时间，拖向技能卡松手释放，卡外松手取消，也可点击固定技能按钮。每层共用 2 秒子弹时间（20% 速度），每层最多使用一个技能。开局磁力对齐、紧急修复、定格各 1 次，库存合计最多 3 次。紧急修复恢复塔顶和当前块宽、深各 0.6（不超过 3）；定格停止当前块 1 秒，仍需手动落块。每五层的三选一奖励在库存有空位时保证一张随机技能补给，其余位置用于原有加成，补给一次增加对应技能 1 次，库存满时隐藏补给；窄塔仍保证修复选项。

合并结果和验证见 [最终整合说明](docs/teaching/archive/integration-status.md)。各角色的阶段文档保留备课过程，涉及“尚未整合”的描述为当时状态。课堂起点仍可通过 `classroom-start` 查看；完整肉鸽玩法见 [玩法深化说明](docs/teaching/archive/gameplay-complete.md)。

## 工程结构

当前分支已按玩法、三维表现、界面和运行协调拆分。目录职责见 [架构说明](docs/architecture/README.md)，阶段验证见 [迁移记录](docs/architecture/migration.md)。独立预览：`/art-lab.html`（美术）、`/ui-lab.html`（UI）。

## 启动

需要 Node.js >=22（版本见 .nvmrc）。每个 clone 独立安装依赖：

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 3101
```

A / B / C 分别使用 3101 / 3102 / 3103；访问对应 localhost 端口。Vite 使用 strictPort，端口占用时不会自动换端口。

验证：`npm run lint`、`npm run type-check`、`npm test -- --runInBand`、`npm run build`。自动化检查不代替 WebGL 实机交互验收。

## 三个工作区

三个本地 clone 共用本仓库作为 origin；并不是三个 GitHub Fork。

| 角色       | 分支               | 编辑目标                     | 本地目录          |
| ---------- | ------------------ | ---------------------------- | ----------------- |
| A 玩法     | feature/a-gameplay | 难度、移动速度、得分与重开   | member-a-gameplay |
| B 三维美术 | feature/b-art      | 塔块配色、材质、灯光         | member-b-art      |
| C UI       | feature/c-ui       | 中文菜单、难度入口、分数排版 | member-c-ui       |

各副本打开独立 Rider 窗口。详见 [教学操作脚本](docs/teaching/guides/lesson-plan.md) 和 [团队任务与接口](docs/architecture/collaboration.md)。

## PR 约定

标题使用 `[A·玩法] ...` / `[B·美术] ...` / `[C·UI] ...`，标签使用 role:gameplay / role:art / role:ui。描述注明模拟角色、关联任务、改动和验收证据。Git 提交作者使用真实身份，不伪造三名作者；Assignee 和 Reviewer 仍是真实 GitHub 用户。

单账号不能批准自己的 PR，本演示使用 Diff、评论和修改来讲解审查，不要求另一人批准。真实小组由同伴审查。

## CI 与课堂存档

GitHub Actions 只检查 lint、类型、测试、build，不发布 Docker 镜像、不连接原作者服务器。`classroom-start` 保存教学基线；main 保存三个 PR 合并后的完整版本。课堂可在 Git Log 对比基线、角色提交和合并提交。
