export const REWARD_LABELS = {
  magnetSupply: {
    title: "技能补给 · 磁力对齐",
    description:
      "获得 1 次磁力对齐，靠近塔顶时吸附并完美放置。技能库存总上限 3 次。",
  },
  repairSupply: {
    title: "技能补给 · 紧急修复",
    description:
      "获得 1 次紧急修复，主动恢复塔顶和当前块的宽、深各 0.6。技能库存总上限 3 次。",
  },
  freezeSupply: {
    title: "技能补给 · 定格",
    description:
      "获得 1 次定格，让当前块停住 1 秒，需再次短按落块。技能库存总上限 3 次。",
  },
  repair: {
    title: "塔身修复",
    description: "塔顶宽、深各恢复 0.3，最多恢复至初始尺寸。",
  },
  precision: {
    title: "精准辅助",
    description:
      "完美判定范围增加基础值的 35%，本局最多选择 3 次；判定偏差不超过当前移动方向较小方块尺寸的 20%。",
  },
  shield: {
    title: "安全护盾",
    description: "获得一次落空救援，最多储存 2 次；救援后当前块重新移动。",
  },
  perfectRepair: {
    title: "完美修复",
    description: "每次完美拼接后宽、深各恢复 0.03，最多叠加 3 次。",
  },
  steady: {
    title: "稳固底座",
    description: "每次普通拼接恢复当次裁切损失的 15%，最多叠加至 45%。",
  },
} as const;
