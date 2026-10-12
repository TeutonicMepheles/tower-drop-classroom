export const REWARD_LABELS = {
  repair: {
    title: "塔顶修复",
    description: "塔顶宽、深各恢复 0.3，最多恢复至初始尺寸。",
  },
  slow: {
    title: "移动减速",
    description: "移动速度降低 8%，本局最多选择 3 次。",
  },
  precision: {
    title: "精准辅助",
    description: "完美判定范围增加基础值的 20%，本局最多选择 3 次。",
  },
  shield: {
    title: "护盾",
    description: "获得一次落空救援，最多储存 2 次；救援后当前块重新移动。",
  },
  perfectRepair: {
    title: "完美修复",
    description: "每次完美拼接后宽、深各恢复 0.03，最多叠加 3 次。",
  },
  steady: {
    title: "裁切修复",
    description: "每次普通拼接恢复当次裁切损失的 15%，最多叠加至 45%。",
  },
} as const;
