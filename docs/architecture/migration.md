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

## M6 最终验收（2026-10-10）

### 自动化

- lint、应用/测试/无 DOM 玩法三个 TypeScript 项目、生产构建通过。
- 14 suites / 58 tests / 2 baseline snapshots 通过。
- 行覆盖率 98.30%，分支覆盖率 90.15%；覆盖率排除启动入口、纯类型契约和开发预览，不包含浏览器/WebGL 真实渲染质量。
- 两个基线快照来自 M3 对旧引擎每档 60 次指令的直接对照，不在后续替换时更新。
- 原来绑在旧大类内部和 Three Mock 调用顺序上的测试，已重新分配到纯玩法、场景、物理、运行协调和真实 UI 集成层；测试数量不可直接与原来的 83 项比较。
- 新增重复创建/销毁无残留输入、旧帧回调失效、奖励键盘焦点、快照驱动难度选项检查。
- 旧目录活跃引用清零；本地文档链接、git diff --check 通过；越界导入负例检查通过。

### 真实浏览器（127.0.0.1:3111）

普通游戏页：普通难度实际时钟移动后成功堆叠 3 层；刷新后简单难度实际时钟移动并完成完美拼接。检查窗口切换为 390×844、刷新纪录、页面导航返回、重新挂载。导航返回检查发现浏览器恢复单选框可能与新本局默认值不一致，已让选项由快照驱动并关闭该字段自动恢复，复测一致。

开发专用集成夹具：固定落块位置，通过真实 DOM 点击依次完成五层奖励、选择护盾、护盾救援、不加层、不加分、第二次失误结算、重开清空加成、双轴普通裁切、刷新保留纪录。夹具只控制移动位置和随机输入，不替换规则、UI、Three 或 Cannon；不能将该流程冒充为手动计时的完整游戏通关。

独立预览：美术页实际点击完美拼接，确认粒子/光环/材质；UI 页 390px 窄屏奖励布局与奖励按钮点击通过。浏览器检查未见 error/warn。

证据：

- [普通游戏真实运行](evidence/game-live.jpg)
- [夹具结算与护盾统计](evidence/integration-summary.jpg)
- [夹具双轴裁切](evidence/integration-cuts.jpg)
- [美术独立预览](evidence/art-lab.jpg)
- [UI 窄屏奖励](evidence/ui-mobile-rewards.jpg)

### 交付边界

所有阶段提交留在 A 工作区的 codex/refactor-module-boundaries。没有合并 main，没有推送远端，没有修改 B/C 工作区或故障演示分支；角色工作区的同步留待后续集成决定。

没有执行容器构建、部署或跨机器验收。主游戏和两个预览入口通过 Vite 生产构建；集成夹具不进入 dist。
