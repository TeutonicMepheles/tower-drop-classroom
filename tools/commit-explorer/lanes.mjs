// Historical branch tips are anchored by verified merge commits, not commit prose.
const branches = [
  { name: "主线", ref: "origin/main", color: "#326fc0" },
  {
    name: "玩法",
    merge: "219742d0a76ab4a86c8ff235015a04ce44eb7e4b",
    color: "#2e8157",
  },
  {
    name: "界面",
    merge: "de0c1bc8584d4817373bf23379123803de10ad5d",
    color: "#8055b4",
  },
  {
    name: "美术",
    merge: "37b875f175419816412cd4740cc949ac83cb8b36",
    color: "#ac6529",
  },
  {
    name: "模块重构",
    merge: "08aeeba1d96aa3721865aa183ab23d04b38964ac",
    color: "#b94f7b",
  },
  {
    name: "提交浏览工具",
    merge: "e001a9ec86328d2c6b5286db3ec8c9130950187d",
    color: "#25868e",
  },
  { name: "界面", ref: "origin/ui-反馈信息UI展示效果优化", color: "#8055b4" },
];
export function assignLanes(commits) {
  const bySha = new Map(commits.map((c) => [c.sha, c]));
  const assigned = new Map();
  const lanes = [];
  function trace(tip, lane) {
    let current = bySha.get(tip);
    while (current && !assigned.has(current.sha)) {
      assigned.set(current.sha, lane);
      current = bySha.get(current.parents[0]);
    }
  }
  for (const branch of branches) {
    const tip = branch.ref
      ? commits.find((c) => c.refs.split(", ").includes(branch.ref))?.sha
      : bySha.get(branch.merge)?.parents[1];
    if (!tip) continue;
    let lane = lanes.findIndex((existing) => existing.name === branch.name);
    if (lane < 0) {
      lane = lanes.length;
      lanes.push({ ...branch, tip });
    }
    trace(tip, lane);
  }
  // Every remaining tip gets its own first-parent lane. Deleted branch names
  // cannot be recovered from Git objects alone; keep an explicit neutral label.
  const parents = new Set(commits.flatMap((c) => c.parents));
  const candidates = [
    ...commits.filter((c) => !parents.has(c.sha)),
    ...commits,
  ];
  for (const c of candidates) {
    if (assigned.has(c.sha)) continue;
    const lane = lanes.length;
    lanes.push({
      name: `历史分支 · ${c.sha.slice(0, 7)}`,
      color: `hsl(${(lane * 137.5) % 360} 60% 72%)`,
      tip: c.sha,
    });
    trace(c.sha, lane);
  }
  return { lanes, assigned };
}
