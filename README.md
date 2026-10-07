# Tower Drop：Rider + GitHub 三人协作教学

本仓库用于大三数字媒体本科生的游戏开发课程，约 45 分钟演示 Rider + GitHub 的多人协作与版本管理。教师用一个真实 GitHub 账号扮演三名成员；PR 作者相同，通过角色分支、标题和标签区分。实际学生作业每人使用自己的账号。

基于 [DiegoLibonati/tower-drop](https://github.com/DiegoLibonati/tower-drop)（Three.js、TypeScript、Vite、Cannon.js）。保留原作者 MIT LICENSE；原项目说明见 [README.upstream.md](README.upstream.md)。这是教学 Fork，不是独立原创游戏。

## 当前状态

本分支为 A·玩法 已实现版本：实现简单 / 普通难度、完美拼接与连击、每五层随机奖励、六种基础/续航加成、护盾救援、成长展示和分难度本地纪录。移动不自动加速，以持续堆叠和冲纪录为主。保留 A 分支原视觉，尚未整合 B/C。

详细状态和验证见 [分支成果](docs/teaching/a-gameplay-status.md)。main 仍保留课堂起点。完整肉鸽玩法与验收见 [玩法深化说明](docs/teaching/gameplay-complete.md)。

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

各副本打开独立 Rider 窗口。详见 [教学操作脚本](docs/teaching/lesson-plan.md) 和 [团队任务与接口](docs/teaching/tasks.md)。

## PR 约定

标题使用 `[A·玩法] ...` / `[B·美术] ...` / `[C·UI] ...`，标签使用 role:gameplay / role:art / role:ui。描述注明模拟角色、关联任务、改动和验收证据。Git 提交作者使用真实身份，不伪造三名作者；Assignee 和 Reviewer 仍是真实 GitHub 用户。

单账号不能批准自己的 PR，本演示使用 Diff、评论和修改来讲解审查，不要求另一人批准。真实小组由同伴审查。

## CI 与课堂存档

GitHub Actions 只检查 lint、类型、测试、build，不发布 Docker 镜像、不连接原作者服务器。`classroom-start` 保存教学基线；完成并实际验收后再创建 `classroom-finished`，目前不宣称最终版本已完成。
