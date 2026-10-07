# 功能冲突：事件名称不一致

本分支是故障演示，不是正常功能版本。基于 feature/c-ui。

UI 在本地把监听名称改成 tower-drop:status，核心仍发送 tower-drop:state。Git 不会替我们检查这个运行时契约。点击开始后，核心在运行，但界面 phase / 层数 / 连击不更新；失败后也没有中文总结和重开文案。

复现：启动 3103，开始并落块，观察 HUD 与阶段信息。已有 UIFlow.test.ts 应失败：开始后难度控件未禁用（easy.disabled 仍为 false），page.dataset.phase 也仍是 ready。自动化检查能够阻止发布，这也是课堂演示的一部分。

修复：移除本地常量，恢复从 config/gameConfig 导入 STATE_EVENT。然后运行集成测试和真实游戏。三个正常角色 HEAD 不包含此故障。
