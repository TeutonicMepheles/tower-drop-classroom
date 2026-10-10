# 模块解耦迁移记录

基线：de0c1bc。工作分支：codex/refactor-module-boundaries；不合并 main。

## M0 基线

- origin 为 TeutonicMepheles/tower-drop-classroom，upstream 为 DiegoLibonati/tower-drop。
- 三个工作区干净，main 与角色分支一致。
- lint、应用构建、测试类型检查通过；9 suites / 83 tests 通过。
- 原 type-check 仅调用 solution tsconfig；改为显式检查 app/test 两个项目。

## M1 公共契约

提取命令、状态、事件、纯数据块与存档接口，旧路径暂时兼容导出。
保留所有现有事件名、奖励 ID、难度参数和存储格式。

## M2 UI 单一更新入口

核心移除 DOM 查询和按钮/全局点击绑定；GameScreen 只接收命令与快照，app 负责组装，input 负责手势过滤。旧核心测试中的 UI 断言迁到独立屏幕及页面集成测试。10 suites / 71 tests、app/test 类型检查和构建通过。

## M3 纯玩法模型

GameSession 持有纯数据块、阶段、奖励和纪录副本，支持注入随机数；stacking 独立计算落块。Node 环境测试无需 DOM/WebGL。迁移对照测试在两档难度各执行 60 次落块，并对比旧引擎状态和尺寸；保存旧引擎输出快照供替换后回归。新模型先通过对照测试，再在 M4 接入场景。

## M4 场景与运行层

GameController 协调纯模型、ScenePort、PhysicsPort 与存档。TowerScene 持有 Mesh，TowerPhysics 持有 Body；稳定 ID 连接纯数据。FrameLoop 唯一推进时间。旧 TowerDrop 删除，旧回归快照不变且通过。13 suites / 56 tests / 2 snapshots、类型检查、构建通过。浏览器已确认真实 WebGL 渲染、简单难度开始、落空结算；完整流程在 M6 验收。

## M5 目录归位与依赖门禁

迁移源码、测试、教学归档、部署配置并修复引用；保留根目录工具配置。奖励显示文案归 UI、规则归玩法；删除旧目录兼容导出和无消费者的 DOM 事件声明。新增 UI 预览。lint、三项目类型检查、构建和 13 suites / 56 tests / 2 snapshots 通过；覆盖率：行 97.58%、分支 88.88%。别名及相对路径的越界导入均被门禁拒绝，本地文档链接检查通过。容器只校验路径，未构建或部署。
