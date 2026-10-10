# 工程目录与模块边界

本项目是单一 Vite 应用。三个 clone 都包含完整工程，通过同一仓库的角色分支协作。

| 目录             | 职责                                 | 主要维护者         |
| ---------------- | ------------------------------------ | ------------------ |
| src/app          | 启动、实现选择、连接与销毁           | 集成负责人         |
| src/contracts    | 跨模块纯数据与端口                   | 受影响角色共同评审 |
| src/gameplay     | 阶段、移动、裁切、奖励、纪录数据     | A                  |
| src/presentation | Three 场景、块显示、材质、背景、特效 | B                  |
| src/ui           | DOM、样式、按钮、奖励文案            | C                  |
| src/runtime      | 唯一帧循环、输入过滤、物理、命令协调 | 集成负责人         |
| src/storage      | 兼容现有 localStorage 数据           | 集成负责人         |
| src/dev          | 独立美术/UI 预览与验收工具           | 对应角色           |
| **tests**        | 按模块分类的单测、集成测试、共享支持 | 对应角色           |
| docs/teaching    | 当前教学入口、指南和历史归档         | 教师               |
| deploy           | 容器、Nginx 与继承示例               | 集成负责人         |

## 依赖方向

app 组装具体实现。gameplay、ui、presentation、storage 只允许访问自身和 contracts。
runtime 允许访问 gameplay 与 contracts；表现和存储通过端口传入。
contracts 不依赖其他模块。UI 不导入玩法实现；奖励文案通过 RewardId 对应玩法结果。

ESLint architecture/boundaries 同时检查别名、相对路径、导出和静态动态导入；gameplay/contracts 另用无 DOM 的 tsconfig.gameplay.json 编译。

## 开发与验证

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 3101
npm run lint
npm run type-check
npm test -- --runInBand
npm run build
```

A/B/C 各用 3101/3102/3103。`/art-lab.html` 是三维美术预览；`/ui-lab.html` 是不创建游戏引擎的状态预览。根目录保留工具配置和 HTML 入口。

- [接口与时序](contracts.md)
- [角色协作](collaboration.md)
- [迁移与验证记录](migration.md)
