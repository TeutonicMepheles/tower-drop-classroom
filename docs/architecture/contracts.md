# 接口与时序

## 命令和状态

GameCommands 提供 start、drop、setDifficulty、chooseReward。start 同时承担重开，仅在 ready/ended 生效；playing/reward 时忽略开始和难度修改；奖励只接受当前给出的选项一次。

GameSession 是唯一玩法状态来源。getSnapshot、getBlocks、getRecords 返回隔离副本；调用方修改副本不影响游戏。奖励 ID、两档难度、奖励参数和 `tower-drop:records:v1` 存储格式保持不变。

有效塔块坐标和尺寸归玩法；Mesh 归 presentation；Body 归 runtime/physics。纯数据 BlockData 使用稳定 ID，重开后也不复用 ID。视觉和物理不得反向写入有效塔块数据。

## 事件和端口

GameEvent 为 landed、fragment、rescued、reward 的有类型联合。事件提供纯数据快照或稳定块 ID，不再借 DOM 容器传递内部状态。

- ScenePort：sync、feedback、follow、render、resize、reset、dispose。
- PhysicsPort：sync、addFragment、step、getFragments、reset、dispose。
- RecordStore：load、save；故障时保持本局纪录可用。
- AnimationDriver：提供唯一帧循环的调度能力。

## 命令处理顺序

1. GameSession 执行规则。
2. GameController 读取事件，创建掉落碎块物理对象。
3. 同步有效塔块的碰撞体和显示对象。
4. 场景播放视觉反馈，根据阶段暂停或恢复循环。
5. 将快照发送给 UI，绘制画面；有新纪录时存档。

帧循环以原始 60 Hz 速度为参考，时间差最多 50ms：推进玩法 → 相机跟随 → 物理更新 → 同步显示 → 渲染。奖励和结束阶段停止推进。

createGameApp 创建各模块并返回带 cleanup 的页面；cleanup 幂等，解除输入和 resize 监听，再销毁 UI、帧循环、物理和场景。每个模块只释放自己创建的资源。

## 接口变更

先说明字段含义、生产方、消费方、默认值及验证样例，再在同一可运行候选版本中完成双方调整。局部类型不放 contracts。不要通过读取别人的 DOM、Mesh、私有属性绕过接口。
