# 团队任务与接口

共同目标：具有两档难度、统一三维主题和中文菜单的 Tower Drop。

## A：玩法设计

分支 feature/a-gameplay，PR 前缀 [A·玩法]，标签 role:gameplay。

编辑 src/core/TowerDrop.ts；建议新增 src/config/gameConfig.ts，定义 easy / normal 与对应速度。提供稳定的难度输入接口供 UI 调用，启动时选定难度，重开时重置状态。避免把难度按钮点击当成落块操作。

验收：两档速度有可见差异；每成功一层正确计分；失败、重开后分数和游戏状态正确；两个移动方向都正常。

## B：三维美术

分支 feature/b-art，PR 前缀 [B·美术]，标签 role:art。

建议新增 src/config/visualTheme.ts 管理颜色与光照参数，在 TowerDrop.ts 的 addLights / createBlock 中引用。设计冷暖渐变塔块及灯光主题，保留动态裁切与落块物理。当前任务使用程序化材质，无须导入复杂模型。

验收：正常块与掉落块风格一致；高塔和裁切后几何可见；重新开始正确；不同窗口尺寸可辨识。不修改速度、得分、碰撞尺寸。

## C：UI 设计

分支 feature/c-ui，PR 前缀 [C·UI]，标签 role:ui。

编辑 src/pages/TowerDropPage/TowerDropPage.ts、同目录 CSS 及必要的 Button 样式；中文化菜单，增加 easy / normal 难度入口，改善分数信息层级。遵守 A 约定的接口，避免触发全局点击落块。

验收：菜单、开始、失败、重开四种状态；分数正常更新；UI 点击不会误落块；窄窗口可操作。

## 接口和编辑边界

1. 难度值固定 easy / normal，先约定默认值与构造参数或 setter，再分别实现。
2. 初期保留 .tower-drop**score、.tower-drop**last-score、.tower-drop**menu、.tower-drop**button 与 playbtn；核心代码会查询这些元素。
3. 生产修复可统一采用 data-game-score 等稳定属性，样式类名单独演进。所有相关查询和测试应同步更新。
4. A / B 都需要接触 TowerDrop.ts：按方法分工，提交保持小而清楚，不对整个文件做无关格式化。
5. gitignore 中的 node_modules / dist / 本地 IDE 文件不提交；依赖变化要同时提交 lockfile。

## 两类冲突的预演

### 文本冲突：同一按钮文案

从课堂基线分出 A / C；A 将 children: "¡Play!" 改为 "Play · Normal"，C 将同一行改为 "开始游戏"。先合并 A，再让 C 在 Rider Fetch 并把 origin/main 合入当前分支。双方改同一行，产生文本冲突；讨论后改成 "开始游戏 · 普通"，提交解决，再推送 C。

该步骤是演示用小改动，A 分支本次明确允许修改此行。预演确认冲突后再上课，勿盲目 Accept Yours / Theirs。

### 功能冲突：选择器契约断裂

A 保持核心代码通过 .tower-drop**score 计分；C 在一个明确标记为“故障演示”的提交中，只把页面和 CSS 改为 .game-hud**score，不更新核心查询。这些修改可能没有文本冲突，但集成后计分元素找不到，分数不更新，分数显示状态也可能异常。

注意：C 分支自身可能已经坏了；“UI 布局验收通过”不是功能验收通过。不要宣称两分支各自完整通过测试，也不要保证现有自动化测试一定通过。先记录真实检查结果；若 CI 能拦住问题，就把它作为自动化发现接口破坏的教学成果。

课堂展示旧版得分正常 → C 改名后视觉正常但交互异常 → 搜索所有选择器 → fix/score-contract 修复 PR → 手工验证计分、失败与重开。可先恢复旧类名，再将所有查询统一到 data-game-score。故障只放角色演示分支，保持课堂起点可运行。
