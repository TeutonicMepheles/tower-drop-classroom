function connection(a, b) {
  const bend = Math.min(80, (b.x - a.x) / 2);
  const p1 = { x: a.x + bend, y: a.y };
  const p2 = { x: b.x - bend, y: b.y };
  const mix = (p, q, t) => ({
    x: p.x + (q.x - p.x) * t,
    y: p.y + (q.y - p.y) * t,
  });
  const split = (t) => {
    const q0 = mix(a, p1, t),
      q1 = mix(p1, p2, t),
      q2 = mix(p2, b, t);
    const r0 = mix(q0, q1, t),
      r1 = mix(q1, q2, t);
    return { q0, r0, end: mix(r0, r1, t) };
  };
  let low = 0,
    high = 1;
  for (let i = 0; i < 24; i++) {
    const t = (low + high) / 2;
    const { end } = split(t);
    if (Math.hypot(end.x - b.x, end.y - b.y) > 20) low = t;
    else high = t;
  }
  const { q0, r0, end } = split((low + high) / 2);
  return `M${a.x} ${a.y} C${q0.x} ${q0.y},${r0.x} ${r0.y},${end.x} ${end.y}`;
}

import { layoutTimeline } from "./timeline.mjs";
import { assignLanes } from "./lanes.mjs";
const $ = (selector) => document.querySelector(selector);
let commits = [];
let pushes = [];
let pushClickTimer;
const selected = new Map();
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]
  );
async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || response.statusText);
  return data;
}
function renderTree() {
  renderPushes();
}
function showLatest() {
  $("#tree").scrollLeft = $("#tree").scrollWidth;
}
function updateSelection() {
  document
    .querySelectorAll("#tree .commit")
    .forEach((node) =>
      node.setAttribute(
        "aria-pressed",
        String(selected.has(node.dataset.previewSha))
      )
    );
}
function remove(sha) {
  selected.get(sha)?.observer?.disconnect();
  selected.get(sha)?.card.remove();
  selected.delete(sha);
  updateSelection();
  if (!selected.size) $("#previews").innerHTML = empty;
}
const empty = $("#previews").innerHTML;
async function loadPreview(c, item) {
  const area = item.card.querySelector(".game-area");
  area.innerHTML = '<div class="status">等待构建…</div>';
  try {
    let job = await api(`/api/preview/${c.sha}`, { method: "POST" });
    while (selected.get(c.sha) === item) {
      if (job.state === "ready") {
        area.innerHTML = `<iframe title="游戏版本 ${c.sha.slice(0, 7)}" src="${job.url}" allow="fullscreen" allowfullscreen></iframe>`;
        const frame = area.querySelector("iframe");
        const resize = () => {
          const visibleWidth = area.clientWidth;
          const width = Math.max(1280, visibleWidth);
          const scale = visibleWidth / width;
          frame.style.width = `${width}px`;
          frame.style.height = `${(width * 9) / 16}px`;
          frame.style.transform = `scale(${scale})`;
          frame.style.transformOrigin = "top left";
        };
        item.observer = new ResizeObserver(resize);
        item.observer.observe(area);
        resize();
        $("#restart").hidden = false;
        return;
      }
      if (job.state === "error") throw new Error(job.message);
      area.firstElementChild.textContent = job.message || "等待构建…";
      await new Promise((resolve) => setTimeout(resolve, 1200));
      job = await api(`/api/preview/${c.sha}`);
    }
  } catch (error) {
    if (selected.get(c.sha) !== item) return;
    area.innerHTML = '<div class="status error"></div>';
    area.firstElementChild.textContent = `加载失败：${error.message}`;
    const retryButton = document.createElement("button");
    retryButton.textContent = "重试";
    retryButton.onclick = () => loadPreview(c, item);
    area.firstElementChild.append(retryButton);
  }
}
function choose(sha) {
  $("#notice").textContent = "";
  if (selected.has(sha)) return;
  for (const previous of [...selected.keys()]) remove(previous);
  const c = commits.find((commit) => commit.sha === sha);
  if (!c) return;
  $("#current-version").innerHTML =
    `<code>${c.sha.slice(0, 7)}</code><span>${escape(c.subject)}</span>`;
  $("#restart").hidden = true;
  if (!selected.size) $("#previews").innerHTML = "";
  const card = document.createElement("article");
  card.className = "preview";
  card.innerHTML = '<div class="game-area"></div>';
  const item = { card };
  selected.set(sha, item);
  $("#previews").append(card);
  updateSelection();
  loadPreview(c, item);
}
async function refresh() {
  try {
    const data = await api("/api/history");
    commits = data.commits;
    pushes = await api("/pushes.json");
    renderTree();
    showLatest();
    const latest =
      commits.find((c) => c.refs.split(", ").includes("origin/main")) ||
      commits[0];
    if (latest) choose(latest.sha);
  } catch (error) {
    $("#notice").textContent = `加载失败：${error.message}`;
  }
}
$("#tree").onclick = (event) => {
  const push = event.target.closest("[data-push]");
  if (push) {
    clearTimeout(pushClickTimer);
    pushClickTimer = setTimeout(
      () => choose(pushes.find((p) => p.event_id === push.dataset.push).after),
      260
    );
    return;
  }
  const button = event.target.closest("[data-sha]");
  if (button) choose(button.dataset.sha);
};
let renderedZoom = 55;
function applyZoom(value, anchor) {
  const tree = $("#tree");
  const next = Math.max(35, Math.min(180, value));
  const position =
    (tree.scrollLeft + anchor - 40) / Math.max(90, (176 * renderedZoom) / 100);
  renderedZoom = next;
  renderTree();
  tree.scrollLeft =
    position * Math.max(90, (176 * renderedZoom) / 100) + 40 - anchor;
}
$("#tree-layout").addEventListener(
  "wheel",
  (event) => {
    if (
      (!event.ctrlKey && !event.metaKey && !event.shiftKey) ||
      $("#tree-layout").classList.contains("collapsed")
    )
      return;
    event.preventDefault();
    const tree = $("#tree");
    const unit =
      event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? tree.clientWidth : 1;
    const delta =
      (Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX) * unit;
    if (!delta) return;
    if (event.ctrlKey || event.metaKey) {
      tree.scrollLeft += delta / presentationScale;
      return;
    }
    const bounds = tree.getBoundingClientRect();
    const anchor = Math.max(
      0,
      Math.min(
        tree.clientWidth,
        (event.clientX - bounds.left) / presentationScale
      )
    );
    applyZoom(renderedZoom - Math.sign(delta) * 5, anchor);
  },
  { passive: false }
);
$("#toggle-tree").onclick = () => {
  const collapsed = $("#tree-layout").classList.toggle("collapsed");
  $("#toggle-tree").setAttribute("aria-expanded", String(!collapsed));
  $("#toggle-tree").setAttribute(
    "aria-label",
    collapsed ? "展开历史" : "收起历史"
  );
  $("#toggle-tree").title = collapsed ? "展开历史" : "收起历史";
  $("#toggle-tree").innerHTML =
    lessonIcons[collapsed ? "chevron-down" : "chevron-up"];
  $("#classroom").classList.toggle("history-collapsed", collapsed);
  $("#push-tip").hidePopover();
};

function renderPushes() {
  const { lanes, assigned } = assignLanes(commits);
  const baseline = commits.findIndex((c) => c.refs.includes("classroom-start"));
  const visible = baseline < 0 ? commits : commits.slice(0, baseline + 1);
  const allowed = new Set(visible.map((c) => c.sha));
  const owner = new Map();
  const groups = new Map();
  const branchLane = (branch) =>
    branch === "main"
      ? "主线"
      : branch === "feature/a-gameplay"
        ? "玩法"
        : branch === "feature/b-art"
          ? "美术"
          : branch === "feature/c-ui" || branch === "ui-反馈信息UI展示效果优化"
            ? "界面"
            : null;
  for (const push of [...pushes]
    .filter((p) => !p.error)
    .sort((a, b) => a.time.localeCompare(b.time))) {
    const name = branchLane(push.branch);
    const members = push.commits.filter(
      (c) =>
        allowed.has(c.sha) &&
        !owner.has(c.sha) &&
        lanes[assigned.get(c.sha)]?.name === name
    );
    if (!members.length) continue;
    const id = `push-${push.event_id}`;
    groups.set(id, { push, members });
    members.forEach((c) => owner.set(c.sha, id));
  }
  const rows = [];
  const added = new Set();
  for (const c of visible) {
    const id = owner.get(c.sha) || c.sha;
    if (added.has(id)) continue;
    added.add(id);
    const group = groups.get(id);
    const memberShas = group ? group.members.map((m) => m.sha) : [c.sha];
    rows.push({
      sha: id,
      date: group ? group.push.time : c.date,
      lane: assigned.get(c.sha),
      parents: [],
      memberShas,
      push: group?.push,
      subject: c.subject,
      preview: group?.push.after || c.sha,
    });
  }
  const bySha = new Map(commits.map((c) => [c.sha, c]));
  for (const row of rows) {
    const parents = new Set();
    const mergeParents = new Set();
    for (const sha of row.memberShas)
      for (const [parentIndex, parent] of bySha.get(sha).parents.entries()) {
        const id = owner.get(parent) || parent;
        if (id !== row.sha && added.has(id)) {
          parents.add(id);
          if (parentIndex > 0) mergeParents.add(id);
        }
      }
    row.parents = [...parents];
    row.mergeParents = mergeParents;
  }
  const squashFrom =
    owner.get("affec4b52af96f7222f5255119f01e606e011f12") ||
    "affec4b52af96f7222f5255119f01e606e011f12";
  const squashTo =
    owner.get("690829c52516d5f10b28194a8d5e3e537da85f05") ||
    "690829c52516d5f10b28194a8d5e3e537da85f05";
  const squashRow = rows.find((r) => r.sha === squashTo);
  if (squashRow && added.has(squashFrom))
    squashRow.layoutParents = [squashFrom];
  const active = lanes
    .map((lane, index) => ({ ...lane, index }))
    .filter((lane) => rows.some((r) => r.lane === lane.index));
  rows.forEach((r) => (r.lane = active.findIndex((l) => l.index === r.lane)));
  const colors = active.map((l) => l.color);
  const spacing = Math.max(90, (176 * renderedZoom) / 100);
  const layout = layoutTimeline(rows);
  const width = Math.max($("#tree").clientWidth, layout.columns * spacing + 80);
  const height = active.length * 88 + 40;
  const points = new Map(
    rows.map((r) => [
      r.sha,
      {
        x: 40 + (layout.positions.get(r.sha).column + 0.5) * spacing,
        y: r.lane * 88 + 84,
      },
    ])
  );
  const marker = (id, color) =>
    `<marker id="${id}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto" overflow="visible"><path d="M3 1 L10 6 L3 11" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></marker>`;
  // Place labels in nearby empty space, reserving nodes, IDs and arrowheads.
  const occupied = [...points.values()].flatMap((p) => [
    { x: p.x - 16, y: p.y - 16, w: 32, h: 32 },
    { x: p.x - 42, y: p.y + 12, w: 84, h: 22 },
  ]);
  const arrowBoxes = rows.flatMap((r) =>
    r.parents.map((id) => {
      const coords = connection(points.get(id), points.get(r.sha))
        .match(/-?\d+(?:\.\d+)?/g)
        .map(Number);
      return { x: coords[6] - 13, y: coords[7] - 13, w: 26, h: 26 };
    })
  );
  occupied.push(...arrowBoxes);
  const labels = [];
  const label = (a, b, text, color) => {
    const end = connection(a, b)
      .match(/-?\d+(?:\.\d+)?/g)
      .map(Number);
    occupied.push({ x: end[6] - 13, y: end[7] - 13, w: 26, h: 26 });
    // Horizontal zoom changes spacing only; label dimensions stay fixed.
    const w = text.length * 20 + 24,
      h = 32;
    const cx = (a.x + b.x) / 2,
      cy = (a.y + b.y) / 2;
    const candidates = [];
    const overlaps = (box, o) =>
      box.x < o.x + o.w + 6 &&
      box.x + box.w + 6 > o.x &&
      box.y < o.y + o.h + 6 &&
      box.y + box.h + 6 > o.y;
    const consider = (x, y) => {
      const box = { x, y, w, h };
      if (
        x < 4 ||
        x + w > width - 4 ||
        y < 42 ||
        y + h > height - 2 ||
        occupied.some((o) => overlaps(box, o))
      )
        return;
      const dx = x + w / 2 - cx,
        dy = y + h / 2 - cy;
      candidates.push({ box, score: dx * dx + dy * dy + (dy >= 0 ? 60 : 0) });
    };
    for (let dy = -144; dy <= 144; dy += 8)
      for (let dx = -176; dx <= 176; dx += 8)
        consider(cx + dx - w / 2, cy + dy - h / 2);
    // Dense zoom levels may need a wider search, never an overlapping fallback.
    if (!candidates.length)
      for (let y = 42; y + h < height; y += 8)
        for (let x = 4; x + w < width; x += 8) consider(x, y);
    candidates.sort((a, b) => a.score - b.score);
    if (!candidates.length) return;
    const box = candidates[0].box;
    occupied.push(box);
    labels.push(
      `<g class="relation-tag" transform="translate(${box.x} ${box.y})" style="--tag-color:${color}"><rect width="${w}" height="${h}" rx="6"/><text x="${w / 2}" y="${h / 2}" dominant-baseline="central" text-anchor="middle">${text}</text></g>`
    );
  };
  const edges = rows
    .flatMap((r) =>
      r.parents.map((id) => {
        const merge = r.mergeParents.has(id);
        if (merge)
          label(points.get(id), points.get(r.sha), "合并", colors[r.lane]);
        return `<path class="history-edge ${merge ? "merge-edge" : ""}" data-source="${id}" data-target="${r.sha}" d="${connection(points.get(id), points.get(r.sha))}" stroke="${colors[r.lane]}" marker-end="url(#hybrid-${r.lane})"/>`;
      })
    )
    .join("");
  const source = points.get(
    owner.get("affec4b52af96f7222f5255119f01e606e011f12") ||
      "affec4b52af96f7222f5255119f01e606e011f12"
  );
  const target = points.get(
    owner.get("690829c52516d5f10b28194a8d5e3e537da85f05") ||
      "690829c52516d5f10b28194a8d5e3e537da85f05"
  );
  if (source && target) label(source, target, "压缩合并", "#94610d");
  const squash =
    source && target
      ? `<path d="${connection(source, target)}" stroke="#94610d" stroke-dasharray="6 5" marker-end="url(#hybrid-squash)"/>`
      : "";
  $("#lane-legend").innerHTML =
    `<div class="lane-heading">分支</div>${active.map((l) => `<div class="lane-key" style="--color:${l.color}"><span class="lane-swatch"></span><strong>${escape(l.name)}</strong></div>`).join("")}`;
  $("#tree").innerHTML =
    `<div class="tree-inner compact" style="width:${width}px;height:${height}px">${active.map((lane, i) => `<div class="lane-tint" aria-hidden="true" style="top:${40 + i * 88}px;height:88px;--color:${lane.color}"></div>`).join("")}${layout.bands.map((b) => `<div class="date-column" style="left:${40 + b.start * spacing}px;width:${b.count * spacing}px;height:${height}px"><span>${b.day}</span></div>`).join("")}<svg class="graph" width="${width}" height="${height}"><defs>${colors.map((c, i) => marker(`hybrid-${i}`, c)).join("")}${marker("hybrid-squash", "#94610d")}</defs><g fill="none" stroke-width="2.5">${edges}${squash}</g>${labels.join("")}</svg>${rows
      .map((r) => {
        const point = points.get(r.sha),
          size = Math.min(156, spacing - 8);
        const title = r.push
          ? `${r.push.branch}   折叠 ${r.memberShas.length} 条本分支提交   双击查看完整推送列表`
          : `${r.subject}   无对应推送事件`;
        return `<button class="commit" ${r.push ? `data-push="${r.push.event_id}"` : `data-sha="${r.sha}"`} data-preview-sha="${r.preview}" data-members="${r.memberShas.join(",")}" data-lane="${escape(active[r.lane].name)}" aria-pressed="${selected.has(r.preview)}" title="${escape(title)}" style="left:${point.x - size / 2}px;top:${point.y - 16}px;width:${size}px;--color:${colors[r.lane]}"><span class="dot"></span>${r.push && r.memberShas.length > 1 ? `<span class="push-badge">${lessonIcons.layers} ${r.memberShas.length}</span>` : ""}<span class="sha">${r.preview.slice(0, 7)}</span><span class="subject">${r.push ? `推送   ${r.push.time.slice(11, 19)}` : escape(r.subject)}</span></button>`;
      })
      .join("")}</div>`;
}
function openPushTip(node) {
  const p = pushes.find((p) => p.event_id === node.dataset.push);
  const tip = $("#push-tip");
  const members = new Set(node.dataset.members.split(","));
  const folded = p.commits.filter((c) => members.has(c.sha));
  const elsewhere = p.commits.filter((c) => !members.has(c.sha));
  const list = (items) =>
    `<ul class="tip-commits">${items.map((c) => `<li><code>${c.sha.slice(0, 7)}</code><span>${escape(c.subject)}</span></li>`).join("")}</ul>`;
  tip.innerHTML = `<div class="tip-head"><strong>${escape(p.branch)}</strong><button class="tip-close" aria-label="关闭提交列表">${lessonIcons.x}</button></div><p>${p.time.slice(0, 19).replace("T", " ")}</p><h3>已折叠的提交   ${folded.length}</h3>${list(folded)}${elsewhere.length ? `<details class="tip-other"><summary>其他节点中保留的提交   ${elsewhere.length}</summary><p>也包含在此次推送中，未折叠到本节点，不计入角标。</p>${list(elsewhere)}</details>` : ""}`;
  tip.showPopover();
  const rect = node.getBoundingClientRect();
  tip.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - tip.offsetWidth - 12))}px`;
  tip.style.top = `${Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - tip.offsetHeight - 12))}px`;
  tip.querySelector(".tip-close").onclick = () => tip.hidePopover();
}
$("#tree").ondblclick = (event) => {
  const node = event.target.closest("[data-push]");
  if (node) {
    clearTimeout(pushClickTimer);
    openPushTip(node);
  }
};
$("#tree").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.matches("[data-push]")) {
    event.preventDefault();
    clearTimeout(pushClickTimer);
    openPushTip(event.target);
  }
});

let presentationScale = 1;
function fitPresentation() {
  presentationScale = Math.min(
    window.innerWidth / 1920,
    window.innerHeight / 1080
  );
  document.documentElement.style.setProperty(
    "--terms-scale",
    Math.min(
      (window.innerWidth - 24) / 1840,
      (window.innerHeight - 24) / 1000,
      1
    )
  );
  $("#classroom").style.transform =
    `translate(-50%, -50%) scale(${presentationScale})`;
}
window.addEventListener("resize", () => {
  fitPresentation();
  $("#push-tip").hidePopover();
});
$("#restart").onclick = () => {
  const frame = $(".game-area iframe");
  if (frame) frame.contentWindow.location.reload();
};
fitPresentation();
refresh();

$("#terms-button").onclick = () => $("#terms-dialog").showModal();

document.querySelectorAll('.terms-tabs [role="tab"]').forEach((tab) => {
  tab.onclick = () => {
    document.querySelectorAll('.terms-tabs [role="tab"]').forEach((item) => {
      const active = item === tab;
      item.setAttribute("aria-selected", String(active));
      document.getElementById(item.getAttribute("aria-controls")).hidden =
        !active;
    });
  };
});

// Classroom diagrams: reveal operations in order, with a shared transport.
const lessonSteps = {
  sync: [
    "两端状态",
    "复制缺少的提交",
    "更新远端分支记录",
    "完成推送 / 整合本地分支",
  ],
  fetch: [
    "远端新增 C，本地仍在 B",
    "下载提交 C",
    "origin/main 移到 C",
    "Fetch 停在这里；Pull 继续移动 main",
  ],
  diverged: [
    "本地 D、远端 C 从 B 分叉",
    "Fetch 下载 C",
    "origin/main 移到 C",
    "合并 C、D，创建 M",
    "本地 main 移到 M",
  ],
  pr: [
    "选择源分支和目标分支",
    "发起 Pull Request",
    "审查改动和检查结果",
    "需要修改：Commit 后再 Push",
    "通过审查后合并",
  ],
  merge: [
    "共同历史",
    "功能分支新增 A、B、C",
    "普通合并连接历史；压缩合并汇总改动",
  ],
  basics: [
    "修改代码",
    "暂存改动",
    "Commit：保存本地历史",
    "Push：上传到 GitHub",
  ],
  branch: [
    "主线已有 A、B、C",
    "从 B 创建分支，新增 D、E",
    "合并到 M，标记 v1.0",
    "main 继续前进，标签留在 M",
  ],
  conflict: [
    "共同提交：speed = 5",
    "两边分别修改为 6 和 8",
    "合并时出现冲突",
    "选择 8，完成合并提交 M",
  ],
  ci: [
    "本地提交 C1",
    "Push 触发自动检查",
    "测试失败，停止部署",
    "本地新增修复提交 C2",
    "再次 Push，检查与测试通过",
    "构建成功，部署网页 C2",
  ],
};

let lessonFrame = null;
let lessonState = null;
// Lucide icons, ISC license; see LUCIDE-LICENSE.txt. Bundled for offline use.
const lessonIcons = {
  "rotate-ccw":
    '<svg aria-hidden="true" focusable="false"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />\n  <path d="M3 3v5h5" />\n</svg>\n',
  "step-back":
    '<svg aria-hidden="true" focusable="false"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M13.971 4.285A2 2 0 0 1 17 6v12a2 2 0 0 1-3.029 1.715l-9.997-5.998a2 2 0 0 1-.003-3.432z" />\n  <path d="M21 20V4" />\n</svg>\n',
  play: '<svg aria-hidden="true" focusable="false"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />\n</svg>\n',
  pause:
    '<svg aria-hidden="true" focusable="false"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <rect x="14" y="3" width="5" height="18" rx="1" />\n  <rect x="5" y="3" width="5" height="18" rx="1" />\n</svg>\n',
  "step-forward":
    '<svg aria-hidden="true" focusable="false"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M10.029 4.285A2 2 0 0 0 7 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z" />\n  <path d="M3 4v16" />\n</svg>\n',
  repeat:
    '<svg aria-hidden="true" focusable="false"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="m17 2 4 4-4 4" />\n  <path d="M3 11v-1a4 4 0 0 1 4-4h14" />\n  <path d="m7 22-4-4 4-4" />\n  <path d="M21 13v1a4 4 0 0 1-4 4H3" />\n</svg>\n',
  x: '<svg aria-hidden="true" focusable="false"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M18 6 6 18" />\n  <path d="m6 6 12 12" />\n</svg>\n',
  layers:
    '<svg aria-hidden="true" focusable="false"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />\n  <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />\n  <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />\n</svg>\n',
  "book-open":
    '<svg aria-hidden="true" focusable="false"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12 5v16" />\n  <path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z" />\n</svg>\n',
  "chevron-up":
    '<svg aria-hidden="true" focusable="false"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="m18 15-6-6-6 6" />\n</svg>\n',
  "chevron-down":
    '<svg aria-hidden="true" focusable="false"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="m6 9 6 6 6-6" />\n</svg>\n',
};
const lessonBar = document.createElement("div");
lessonBar.className = "lesson-player";
lessonBar.innerHTML =
  [
    ["restart", "重播", "rotate-ccw"],
    ["previous", "上一步", "step-back"],
    ["play", "暂停", "pause"],
    ["next", "下一步", "step-forward"],
  ]
    .map(
      ([action, label, icon]) =>
        `<button type="button" data-action="${action}" aria-label="${label}" title="${label}">${lessonIcons[icon]}</button>`
    )
    .join("") +
  '<span class="lesson-step-count"></span><strong class="lesson-step-caption" aria-live="polite"></strong>';
document.querySelector(".terms-tabs").after(lessonBar);
function stageFor(key, el, box) {
  let x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const isPath = el.tagName.toLowerCase() === "path";
  if (isPath && ["ci", "conflict", "basics"].includes(key)) {
    const end = el.getPointAtLength(el.getTotalLength());
    x = end.x;
    y = end.y;
  }
  if (key === "sync") return y < 160 ? 0 : y < 225 ? 1 : 2;
  if (key === "fetch") return y < 245 ? 0 : y < 315 ? 1 : 2;
  if (key === "diverged") return x < 400 ? 0 : x < 490 ? 1 : 2;
  if (key === "merge") return x > 400 ? 2 : y > 110 ? 1 : 0;
  if (key === "basics") return y > 260 ? 3 : x > 340 ? 2 : x > 180 ? 1 : 0;
  if (key === "branch") return x > 850 ? 2 : y > 130 ? 1 : 0;
  if (key === "conflict") return x < 150 ? 0 : x < 450 ? 1 : x < 680 ? 2 : 3;
  if (key === "ci") {
    if (el.classList.contains("failure") || el.classList.contains("ci-error"))
      return 2;
    if (y > 465 && x > 250) return 5;
    if (y > 290) return x < 150 ? 3 : x > 740 ? 5 : 4;
    return x < 150 ? 0 : x < 580 ? 1 : 2;
  }
  return 0;
}
function prepareLesson(panel, key) {
  const items = [];
  panel.querySelectorAll("svg").forEach((svg) => {
    svg.querySelectorAll("path,rect,circle,text").forEach((el) => {
      if (el.closest("defs") || el.closest("marker")) return;
      const box = el.getBBox();
      // Keep panel backgrounds and location headings visible throughout.
      if (
        el.matches(".div-panel,.ci-zone,.ci-zone-title") ||
        (el.tagName === "rect" && box.width > 400 && box.height > 100)
      )
        return;
      const stage = stageFor(key, el, box);
      el.classList.add("lesson-piece");
      if (
        el.tagName === "path" &&
        !el.hasAttribute("stroke-dasharray") &&
        !el.matches(".squash-link")
      ) {
        el.style.setProperty("--lesson-length", el.getTotalLength());
        el.classList.add("lesson-draw");
      }
      items.push({ el, stage });
    });
  });
  const add = (selector, stage) =>
    panel.querySelectorAll(selector).forEach((el) => {
      el.classList.add("lesson-piece");
      items.push({ el, stage });
    });
  if (key === "pr") {
    add(".pr-route", 0);
    add(".review-flow article:nth-of-type(1)", 1);
    add(
      ".review-flow article:nth-of-type(2),.review-flow > .route-arrow:first-of-type",
      2
    );
    add(".review-loop", 3);
    add(
      ".review-flow article:nth-of-type(3),.review-flow > .route-arrow:last-of-type",
      4
    );
  }
  if (key === "branch") add(".tag-example", 3);
  return items;
}
function paintLesson() {
  const s = lessonState;
  if (!s) return;
  document
    .querySelector("#terms-dialog")
    .classList.toggle("lesson-paused", !s.playing);
  s.motion?.update(s.step, s.progress);
  s.items.forEach(({ el, stage }) => {
    el.classList.toggle("lesson-future", stage > s.step);
    el.classList.toggle("lesson-current", stage === s.step);
  });
  lessonBar.querySelector(".lesson-step-count").textContent =
    `${s.step + 1} / ${s.steps.length}`;
  lessonBar.querySelector(".lesson-step-caption").textContent = s.steps[s.step];
  lessonBar.querySelector('[data-action="previous"]').disabled = s.step === 0;
  lessonBar.querySelector('[data-action="next"]').disabled =
    s.step === s.steps.length - 1;
  const play = lessonBar.querySelector('[data-action="play"]');
  const active = s.playing || s.single;
  const icon = active ? "pause" : "play";
  if (play.dataset.icon !== icon) {
    play.innerHTML = lessonIcons[icon];
    play.dataset.icon = icon;
  }
  play.setAttribute("aria-label", active ? "暂停" : "播放");
  play.title = active ? "暂停" : "播放";
}

function scheduleLesson() {
  cancelAnimationFrame(lessonFrame);
  let previous = performance.now();
  const tick = (now) => {
    const s = lessonState;
    if (!s || (!s.playing && !s.single)) return;
    if (!document.querySelector("#terms-dialog").open || document.hidden) {
      pauseLesson();
      return;
    }
    s.progress = Math.min(1, s.progress + (now - previous) / 2000);
    previous = now;
    s.motion?.update(s.step, s.progress);
    if (s.progress === 1) {
      if (s.single) {
        s.single = false;
        paintLesson();
        return;
      }
      if (s.step === s.steps.length - 1) {
        s.playing = false;
        paintLesson();
        return;
      }
      s.step++;
      s.progress = 0;
      paintLesson();
    }
    lessonFrame = requestAnimationFrame(tick);
  };
  lessonFrame = requestAnimationFrame(tick);
}
function pauseLesson() {
  cancelAnimationFrame(lessonFrame);
  if (lessonState) {
    lessonState.playing = false;
    lessonState.single = false;
    paintLesson();
  }
}
function startLesson() {
  startIndependentLesson();
}
function _startLegacyLesson() {
  cancelAnimationFrame(lessonFrame);
  const panel = document.querySelector("#terms-dialog > section:not([hidden])");
  if (!panel) return;
  const key = panel.id.replace("terms-", "");
  const motion = ["sync", "fetch", "diverged"].includes(key)
    ? createGitMotion(panel, key)
    : createTopicMotion(panel, key);
  lessonState = {
    step: 0,
    progress: 0,
    steps: lessonSteps[key],
    motion,
    items: motion ? [] : prepareLesson(panel, key),
    playing: false,
  };
  paintLesson();
  scheduleLesson();
}
lessonBar.addEventListener("click", (event) => {
  const action = event.target.closest("button")?.dataset.action;
  if (!action || !lessonState) return;
  const wasPlaying = lessonState.playing || lessonState.single;
  pauseLesson();
  if (action === "restart") {
    lessonState.step = 0;
    lessonState.progress = 0;
    lessonState.playing = true;
  }
  if (action === "previous") {
    lessonState.step = Math.max(0, lessonState.step - 1);
    lessonState.progress = 1;
  }
  if (action === "next") {
    lessonState.step = Math.min(
      lessonState.steps.length - 1,
      lessonState.step + 1
    );
    lessonState.progress = 0;
    lessonState.single = true;
  }
  if (action === "play") {
    if (
      lessonState.step === lessonState.steps.length - 1 &&
      lessonState.progress === 1
    ) {
      lessonState.step = 0;
      lessonState.progress = 0;
    }
    lessonState.playing = !wasPlaying;
  }
  paintLesson();
  scheduleLesson();
});
document.querySelector("#terms-button").addEventListener("click", startLesson);
document.querySelector(".terms-tabs").addEventListener("click", (event) => {
  if (event.target.closest('[role="tab"]')) startLesson();
});
document.querySelector("#terms-dialog").addEventListener("close", pauseLesson);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseLesson();
});

// Each scene has persistent commit objects and movable refs. Transfers copy a
// commit: the source remains in place while the receiving copy travels.
function createGitMotion(panel, key, onlyType) {
  const visual = panel.querySelector(".term-visual");
  const notes = panel.querySelector(".term-notes");
  const types = onlyType
    ? [onlyType]
    : key === "sync"
      ? ["Push", "Pull"]
      : key === "fetch"
        ? ["Fetch", "Pull"]
        : ["Diverged"];
  const node = (id, x, y, label, remote = false) =>
    `<g data-part="${id}" transform="translate(${x} ${y})" class="gm-node">${remote ? '<circle r="22"/>' : '<rect x="-22" y="-22" width="44" height="44" rx="7"/>'}<text y="8">${label}</text></g>`;
  const ref = (id, label, y, color = "") =>
    `<g data-part="${id}" class="gm-ref ${color}" transform="translate(280 ${y})"><path d="M0 -12V-24"/><rect x="-64" y="-12" width="128" height="33" rx="6"/><text y="11">${label}</text></g>`;
  visual.innerHTML = `<div class="git-motion-scenes ${types.length === 1 ? "one" : ""}">${types
    .map((type) => {
      const diverged = type === "Diverged";
      return `<article>${diverged ? "" : `<h4>${type}</h4>`}<svg viewBox="0 0 640 550" class="git-motion" role="img" aria-label="${diverged ? "分叉后 Pull" : type} 提交传输与分支指针动画"><defs><marker id="gm-arrow-${key}-${type}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="#24754d" stroke-width="2"/></marker></defs>
    <rect class="gm-zone" x="12" y="18" width="616" height="184" rx="12"/><rect class="gm-zone local" x="12" y="224" width="616" height="310" rx="12"/>
    <text class="gm-area" x="32" y="52">GitHub</text><text class="gm-area" x="32" y="258">本地</text>
    <path class="gm-track" d="M160 105H280"/><path data-part="remoteEdge" class="gm-track" d="M280 105H400"/>
    ${node("remoteA", 160, 105, "A", true)}${node("remoteB", 280, 105, "B", true)}${node("remoteC", 400, 105, "C", true)}${ref("remoteRef", "main", 158, "tracking")}
    <path class="gm-track" d="M160 325H280"/><path data-part="localEdge" class="gm-track" d="M280 325H400"/>
    ${node("localA", 160, 325, "A")}${node("localB", 280, 325, "B")}${node("localC", 400, 325, diverged ? "D" : "C")}
    ${diverged ? `<path data-part="fetchedEdge" class="gm-track" d="M280 325Q320 430 400 430"/>${node("fetchedC", 400, 430, "C")}<path data-part="mergeTop" class="gm-merge" marker-end="url(#gm-arrow-${key}-${type})" d="M422 325H528"/><path data-part="mergeBottom" class="gm-merge" marker-end="url(#gm-arrow-${key}-${type})" d="M422 430Q510 430 550 350"/>${node("merge", 550, 325, "M")}` : ""}
    ${ref("mainRef", "main", 378, "main")}${ref("headRef", "HEAD → main", diverged ? 275 : 430, "head")}${ref("tagRef", "v1.0", diverged ? 483 : 430, "tag")}${ref("trackingRef", "origin/main", diverged ? 483 : 270, "tracking")}
    <path data-part="transferTrail" class="gm-transfer" d="M400 ${type === "Push" ? 325 : 105}C600 ${type === "Push" ? 325 : 105} 600 ${type === "Push" ? 105 : diverged ? 430 : 325} 400 ${type === "Push" ? 105 : diverged ? 430 : 325}"/>
    ${node("packet", 400, 105, "C")}
    <text data-part="status" class="gm-status" x="32" y="518"></text>
    </svg></article>`;
    })
    .join("")}</div>`;
  const scenes = [...visual.querySelectorAll("svg")].map((svg, i) => ({
    svg,
    type: types[i],
    parts: Object.fromEntries(
      [...svg.querySelectorAll("[data-part]")].map((el) => [
        el.dataset.part,
        el,
      ])
    ),
  }));
  const descriptions = {
    sync: [
      ["操作前", "Push：本地多了 C。", "Pull：GitHub 多了 C。"],
      [
        "复制提交",
        "C 传到另一端，源端的 C 保留。",
        "方形是本地，圆形是 GitHub。",
      ],
      [
        "分支指针前进",
        "Push：GitHub 的 main 指向 C。",
        "Pull：本地 origin/main 指向 C。",
      ],
      [
        "操作完成",
        "Push 后更新本地的远端跟踪记录。",
        "Pull 将本地 main 前移到 C，工作区更新。",
      ],
    ],
    fetch: [
      [
        "当前在 main",
        "两边都从 B 开始；GitHub 已新增 C。",
        "main 和 origin/main 目前都指向 B。",
      ],
      ["把 C 下载到本地", "两种操作都会获取提交 C。", "此时 main 还不移动。"],
      [
        "记录远端位置",
        "origin/main 从 B 移到 C。",
        "它是保存在本地的远端分支记录。",
      ],
      [
        "操作结果",
        "Fetch：main 仍在 B，工作区不变。",
        "Pull：main 移到 C，工作区同步更新。",
      ],
    ],
    diverged: [
      ["两条历史分叉", "本地新增 D，GitHub 新增 C。", "共同父提交都是 B。"],
      ["先 Fetch", "C 的副本进入本地。", "本地 D 保留，GitHub 的 C 也保留。"],
      ["更新 origin/main", "远端跟踪指针移到 C。", "main 仍指向 D。"],
      [
        "创建合并提交 M",
        "连接 D 和 C，保留两边历史。",
        "若有冲突，解决后才能完成 M。",
      ],
      [
        "main 从 D 移到 M",
        "工作区更新为合并结果。",
        "GitHub 仍在 C；这里没有执行 Push。",
      ],
    ],
  };
  if (onlyType) {
    descriptions[key] =
      onlyType === "Push"
        ? [
            ["本地新增 C", "本地 main 指向 C，GitHub 仍在 B。"],
            ["上传 C", "复制到 GitHub，本地 C 保留。"],
            ["更新 GitHub 的 main", "远端 main 从 B 移到 C。"],
            ["推送完成", "origin/main 跟到 C；main 和 HEAD 不动。"],
          ]
        : onlyType === "Fetch"
          ? [
              ["远端新增 C", "本地 main 和 origin/main 仍在 B。"],
              ["下载 C", "取回提交，本地 main 不动。"],
              ["更新 origin/main", "记录 GitHub 的最新位置 C。"],
              ["获取完成", "仅 origin/main 前移；main 和 HEAD 留在 B。"],
            ]
          : [
              ["远端新增 C", "本地 main 仍在 B。"],
              ["下载 C", "先获取 GitHub 上的新提交。"],
              ["更新 origin/main", "远端跟踪指针移到 C。"],
              ["更新 main", "main 与 HEAD 一起前移到 C。"],
            ];
  }
  let previous = -1;
  const ease = (t) => t * t * (3 - 2 * t);
  return {
    update(step, progress) {
      const t = ease(Math.min(1, progress / 0.68));
      const at = (n) => (step > n ? 1 : step === n ? t : 0);
      if (previous !== step) {
        const [title, ...lines] = descriptions[key][step];
        notes.innerHTML = `<div class="gm-note-step">${step + 1} / ${descriptions[key].length}</div><h3>${title}</h3>${lines.map((line) => `<p>${line}</p>`).join("")}<div class="ref-legend"><span class="ref-chip local">main</span><span>本地分支</span><span class="ref-chip remote">origin/main</span><span>远端跟踪</span><span class="ref-chip head">HEAD</span><span>当前检出</span><span class="ref-chip tag">v1.0</span><span>版本标签</span></div><div class="ref-note">HEAD 跟随 main<br>Tag 固定在 A<br>${key === "diverged" ? "本例：合并模式" : "本例：无分叉"}</div>`;
        previous = step;
      }
      scenes.forEach(({ parts: p, type }) => {
        const push = type === "Push",
          div = type === "Diverged";
        const transfer = at(1),
          track = at(2),
          finish = at(3);
        const show = (name, yes) => (p[name].style.opacity = yes ? 1 : 0);
        const move = (name, x, y) =>
          p[name].setAttribute("transform", `translate(${x} ${y})`);
        show("remoteC", !push || transfer === 1);
        show("remoteEdge", !push || transfer === 1);
        show("localC", push || div || transfer === 1);
        show("localEdge", push || div || transfer === 1);
        show("packet", step === 1 && transfer < 1);
        show("transferTrail", step === 1 && transfer < 1);
        const start = push ? 325 : 105,
          end = push ? 105 : div ? 430 : 325;
        move(
          "packet",
          400 + 600 * transfer * (1 - transfer),
          start +
            (end - start) *
              (3 * transfer * transfer - 2 * transfer * transfer * transfer)
        );
        move("remoteRef", push ? 280 + 120 * track : 400, 158);
        move(
          "mainRef",
          push
            ? 400
            : div
              ? 400 + 150 * at(4)
              : 280 + 120 * (type === "Fetch" ? 0 : finish),
          378
        );
        const trackingProgress = push ? finish : track;
        move("trackingRef", 280 + 120 * trackingProgress, div ? 483 : 270);
        const mainX = push
          ? 400
          : div
            ? 400 + 150 * at(4)
            : 280 + 120 * (type === "Fetch" ? 0 : finish);
        move("headRef", mainX, 430);
        p.headRef.querySelector("path").setAttribute("d", "M0 -12V-31");
        move("tagRef", 160, div ? 483 : 430);
        p.tagRef.querySelector("rect").setAttribute("x", "-45");
        p.tagRef.querySelector("rect").setAttribute("width", "90");
        p.tagRef
          .querySelector("path")
          .setAttribute("d", div ? "M0 -12V-136" : "M0 -12V-83");
        p.trackingRef.querySelector("path").style.opacity =
          div && trackingProgress > 0 && trackingProgress < 1 ? 0 : 1;
        p.trackingRef
          .querySelector("path")
          .setAttribute(
            "d",
            div
              ? `M0 -12V${325 + 105 * trackingProgress + 22 - 483}`
              : "M0 21V33"
          );
        if (div) {
          show("fetchedC", transfer === 1);
          show("fetchedEdge", transfer === 1);
          ["mergeTop", "mergeBottom"].forEach((name) => {
            const length = p[name].getTotalLength();
            p[name].style.strokeDasharray = length;
            p[name].style.strokeDashoffset = length * (1 - finish);
            show(name, finish > 0);
          });
          show("merge", finish > 0);
          p.merge.style.opacity = finish;
          move("merge", 550, 325 + 20 * (1 - finish));
        }
        p.status.textContent =
          step === descriptions[key].length - 1
            ? type === "Fetch"
              ? "工作区：仍为 B"
              : div
                ? "工作区：合并结果 M"
                : push
                  ? "GitHub：已收到 C"
                  : "工作区：更新为 C"
            : step === 1
              ? transfer < 1
                ? "正在复制提交 C…"
                : "C 已到达，接着更新指针"
              : "";
      });
    },
  };
}

function createTopicMotion(panel, key) {
  if (key === "basics") return null;
  const chapters = {
    merge: [
      ["两边已有提交", "主线到 B；功能分支到 E。"],
      ["普通合并：连接两个父提交", "D、E 保留。M 的父提交是 B 和 E。"],
      ["压缩合并：汇总改动", "D、E 的改动汇成 S；S 的父提交只有 B。"],
      ["移动主线指针", "main 指向 M 或 S；功能分支仍在 E。"],
    ],
    branch: [
      ["从 B 创建分支", "创建并切换到 feature，HEAD 跟随 feature。"],
      ["功能分支新增 D、E", "feature 指针随提交前进；main 留在 B。"],
      ["合并到主线", "先切回 main，再合并；main 与 HEAD 移到 M。"],
      ["给 M 添加 v1.0", "标签固定指向 M。"],
      ["主线继续提交 N", "main 前进到 N；v1.0 仍在 M。"],
    ],
    conflict: [
      ["共同版本 speed = 5", "两边都从 B 开始。"],
      ["两边修改同一行", "主线 C 改为 6；功能分支 D 改为 8。"],
      ["合并遇到冲突", "Git 不能自动决定保留哪个值。"],
      ["本例选择 speed = 8", "替换冲突内容，保存并暂存。"],
      ["完成合并提交 M", "M 连接 C、D；最终内容是 speed = 8。"],
    ],
    pr: [
      ["源分支与目标分支", "feature/ui 已有改动；目标是 main。"],
      ["发起 PR   Pull Request", "提交改动供审查；main 此时不变。"],
      ["审查要求修改", "查看差异、评论和自动检查。"],
      ["新增修复提交 D 并 Push", "同一个 PR 更新，重新审查。"],
      ["审查通过并合并", "GitHub main 移到 M；本地仍在 feature/ui。"],
      ["切回本地 main", "HEAD 从 feature/ui 切到 main，仍是 Y。"],
      ["Pull：获取 M", "下载合并提交，origin/main 从 Y 移到 M。"],
      ["Pull：前移 main", "main 与 HEAD 移到 M，feature/ui 留在 D。"],
    ],
    ci: [
      ["本地新增 C1", "增加难度选择。演示网页仍运行 C0。"],
      ["Push 后自动检查", "GitHub 收到 C1，启动检查任务。"],
      ["测试失败，停止部署", "困难模式速度错误；网页保持 C0。"],
      ["本地新增修复提交 C2", "修正速度参数，再次 Push。"],
      ["检查、测试、构建通过", "工作流按顺序处理 C2。"],
      ["部署到演示网页", "网页从 C0 更新为 C2。"],
    ],
    basics: [
      ["修改工作区", "新增难度选择代码。"],
      ["暂存这次改动", "将选中的修改放入暂存区。"],
      ["创建本地提交 C", "main 从 B 前进到 C。"],
      ["Push 到 GitHub", "提交副本上传，远端 main 移到 C。"],
    ],
  };
  chapters.branch = [
    ...chapters.branch.slice(0, 2),
    ["切回 main", "HEAD 切到 main；main 仍在 B。"],
    ["合并 feature", "生成 M，main 与 HEAD 从 B 前移到 M。"],
  ];
  chapters.tag = [
    ["准备发布 M", "main 与 HEAD 当前指向 M。"],
    ["创建 v1.0", "版本标签固定在 M。"],
    ["继续开发 N", "main 与 HEAD 前进，v1.0 保持在 M。"],
  ];
  chapters.head = [
    ["HEAD 跟随 main", "当前检出 main。"],
    ["检出旧提交 B：分离 HEAD", "HEAD 直接指向 B；main 留在 C。"],
    ["在分离 HEAD 下提交 D", "HEAD 前移到 D；main 不动。"],
    ["创建并切换到 experiment", "用分支保留 D；HEAD 跟随 experiment。"],
    ["切回 main", "HEAD 回到 main，experiment 保留 D。"],
  ];
  if (!chapters[key]) return null;
  lessonSteps[key] = chapters[key].map((row) => row[0]);
  const layout = panel.querySelector(".term-split,.ci-example-layout");
  layout.className = "term-split";
  layout.innerHTML =
    '<div class="term-visual topic-motion"></div><aside class="term-notes"></aside>';
  const visual = layout.firstElementChild,
    notes = layout.lastElementChild;
  const n = (id, x, y, label, color = "") =>
    `<g data-t="${id}" transform="translate(${x} ${y})" class="tm-node ${color}"><circle r="25"/><text y="8">${label}</text></g>`;
  const ref = (id, x, y, label) =>
    `<g data-t="${id}" transform="translate(${x} ${y})" class="tm-ref ${id === "tag" ? "tag" : id.startsWith("head") ? "head" : key === "pr" && ["sourceRef", "main", "tracking"].includes(id) ? "remote" : ""}"><path d="M0 -12V-28"/><rect x="-62" y="-12" width="124" height="34" rx="7"/><text y="11">${label}</text></g>`;
  const edge = (id, d, dashed = false) =>
    `<path data-t="${id}" class="tm-edge ${dashed ? "tm-dashed" : ""}" d="${d}"/>`;
  const txt = (x, y, t, cls = "") =>
    `<text x="${x}" y="${y}" class="tm-label ${cls}">${t}</text>`;
  const box = (id, x, y, w, h, title) =>
    `<g data-t="${id}" transform="translate(${x} ${y})" class="tm-box"><rect width="${w}" height="${h}" rx="12"/><text x="${w / 2}" y="${h / 2 + 8}">${title}</text></g>`;
  let body = "";
  if (key === "merge") {
    for (const [i, label, result] of [
      [0, "Merge", "M"],
      [1, "Squash Merge", "S"],
    ]) {
      const y = 80 + i * 245;
      body +=
        txt(28, y - 35, label, "tm-heading") +
        edge(`base${i}`, `M180 ${y}H340`) +
        edge(`feature${i}`, `M180 ${y}Q240 ${y + 95} 290 ${y + 95}H430`) +
        n(`a${i}`, 180, y, "A") +
        n(`b${i}`, 340, y, "B") +
        n(`d${i}`, 290, y + 95, "D", "purple") +
        n(`e${i}`, 430, y + 95, "E", "purple") +
        edge(
          `join${i}`,
          `M456 ${y + 95}Q485 ${y + 95} 520 ${y + 10}`,
          i === 1
        ) +
        edge(`parent${i}`, `M367 ${y}H520`) +
        n(`result${i}`, 550, y, result, "green") +
        ref(`head${i}`, 340, y - 45, "HEAD → main") +
        ref(`main${i}`, 340, y + 50, "main") +
        ref(`featureRef${i}`, 430, y + 147, "feature") +
        n(`copyD${i}`, 290, y + 95, "D", "gold") +
        n(`copyE${i}`, 430, y + 95, "E", "gold");
    }
  } else if (key === "head") {
    body =
      edge("base", "M150 150H700") +
      n("a", 150, 150, "A") +
      n("b", 350, 150, "B") +
      n("c", 700, 150, "C") +
      edge("detachedEdge", "M350 176Q350 330 500 330") +
      n("d", 500, 330, "D") +
      ref("main", 700, 205, "main") +
      ref("experiment", 500, 385, "experiment") +
      ref("head", 700, 255, "HEAD → main");
  } else if (key === "tag") {
    body =
      edge("base", "M200 230H500") +
      n("b", 200, 230, "B") +
      n("m", 500, 230, "M") +
      edge("next", "M526 230H795") +
      n("nextNode", 820, 230, "N") +
      ref("main", 500, 285, "main") +
      ref("head", 500, 335, "HEAD → main") +
      ref("tag", 500, 150, "v1.0");
  } else if (key === "branch") {
    body =
      edge("base", "M130 150H280") +
      n("a", 130, 150, "A") +
      n("b", 280, 150, "B") +
      edge("newbranch", "M280 175Q310 330 430 330") +
      edge("feature", "M456 330H605") +
      n("d", 430, 330, "D", "purple") +
      n("e", 630, 330, "E", "purple") +
      edge("merge1", "M306 150H735") +
      edge("merge2", "M656 330Q720 330 760 178") +
      n("m", 760, 150, "M", "green") +
      edge("next", "M786 150H895") +
      n("nextNode", 920, 150, "N") +
      ref("main", 280, 205, "main") +
      ref("featureRef", 280, 95, "feature") +
      ref("tag", 760, 95, "v1.0") +
      ref("head", 280, 255, "HEAD → main");
  } else if (key === "conflict") {
    body =
      edge("bc", "M140 250Q210 130 315 130") +
      edge("bd", "M140 250Q210 370 315 370") +
      n("b", 120, 250, "B") +
      n("c", 345, 130, "C") +
      n("d", 345, 370, "D", "purple") +
      txt(35, 470, "起点：speed = 5") +
      box("valueC", 395, 90, 200, 75, "speed = 6") +
      box("valueD", 395, 330, 200, 75, "speed = 8") +
      box("result", 700, 205, 230, 90, "等待合并") +
      edge("cm", "M345 156V185Q345 190 395 190H650Q730 190 785 220") +
      edge("dm", "M345 344V300Q345 290 395 290H650Q730 290 785 280") +
      n("m", 810, 250, "M", "green") +
      box("chosen", 395, 330, 200, 75, "speed = 8") +
      txt(700, 365, "合并结果：") +
      ref("main", 345, 75, "main") +
      ref("featureRef", 345, 425, "feature") +
      ref("head", 345, 30, "HEAD → main") +
      txt(700, 410, "");
  } else if (key === "pr") {
    body =
      txt(30, 40, "GitHub", "tm-heading") +
      txt(30, 100, "源分支") +
      edge("source", "M150 100H350") +
      n("a", 150, 100, "A", "purple") +
      n("b", 250, 100, "B", "purple") +
      n("c", 350, 100, "C", "purple") +
      edge("repair", "M376 100H475") +
      n("d", 500, 100, "D", "purple") +
      ref("sourceRef", 350, 145, "feature/ui") +
      txt(30, 210, "目标分支") +
      edge("target", "M150 210H220") +
      n("x", 150, 210, "X") +
      n("y", 220, 210, "Y") +
      ref("main", 220, 265, "main") +
      box("review", 650, 25, 310, 65, "等待 PR") +
      box("request", 370, 65, 140, 55, "改动差异") +
      edge("merge1", "M246 210H775") +
      edge("merge2", "M526 100Q700 100 780 185") +
      n("m", 800, 210, "M", "green") +
      txt(30, 365, "本地", "tm-heading") +
      n("localY", 220, 390, "Y") +
      n("localC", 350, 390, "C") +
      edge("localRepair", "M376 390H475") +
      n("localD", 500, 390, "D") +
      edge("localMerge", "M220 416V425H650Q680 425 680 390H774") +
      n("localM", 800, 390, "M", "green") +
      n("pullCopy", 800, 210, "M", "green") +
      ref("localFeature", 350, 345, "feature/ui") +
      ref("localMain", 220, 435, "main") +
      ref("tracking", 220, 310, "origin/main") +
      ref("head", 350, 480, "HEAD → feature");
  } else if (key === "ci") {
    body =
      txt(35, 45, "本地", "tm-heading") +
      txt(270, 45, "GitHub   自动工作流", "tm-heading") +
      n("c1", 110, 130, "C1") +
      n("c2", 110, 330, "C2", "green") +
      edge("push", "M137 130H300") +
      edge("flow", "M350 130H770") +
      n("check", 330, 130, "检查") +
      n("test", 550, 130, "测试") +
      n("build", 770, 130, "构建") +
      txt(275, 190, "格式检查") +
      txt(520, 190, "测试") +
      txt(740, 190, "构建") +
      edge("return", "M550 158V240H110V302") +
      edge("repush", "M138 330Q230 330 330 157") +
      edge("deploy", "M797 130Q930 130 930 350H797") +
      box("web", 520, 310, 280, 150, "网页   C0") +
      n("job", 110, 130, "C1", "green") +
      txt(35, 470, "");
  } else {
    body =
      box("work", 40, 90, 230, 120, "工作区") +
      box("stage", 375, 90, 230, 120, "暂存区") +
      box("patch", 70, 140, 170, 50, "难度选择") +
      edge("commitline", "M180 335H400") +
      n("b", 180, 335, "B") +
      n("c", 400, 335, "C", "green") +
      ref("main", 180, 390, "main") +
      txt(40, 285, "本地历史") +
      box("remote", 720, 285, 230, 160, "GitHub   B") +
      n("copy", 400, 335, "C", "green");
  }
  visual.innerHTML = `<svg viewBox="0 0 1000 530" class="topic-svg" role="img" aria-label="${chapters[key][0][0]}，可播放操作过程"><defs><marker id="topic-arrow-${key}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="#547695" stroke-width="2"/></marker></defs>${body}</svg>`;
  if (key === "branch")
    visual.querySelector("svg").setAttribute("viewBox", "0 0 900 500");
  visual.querySelectorAll(".tm-ref.head rect").forEach((el) => {
    el.setAttribute("x", "-78");
    el.setAttribute("width", "156");
  });
  if (key === "pr")
    visual
      .querySelectorAll(
        '[data-t="localC"] circle,[data-t="localD"] circle,[data-t="localY"] circle,[data-t="localM"] circle,[data-t="pullCopy"] circle'
      )
      .forEach((el) => {
        const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        [
          ["x", -25],
          ["y", -25],
          ["width", 50],
          ["height", 50],
          ["rx", 7],
        ].forEach(([k, v]) => rect.setAttribute(k, v));
        el.replaceWith(rect);
      });
  const parts = Object.fromEntries(
    [...visual.querySelectorAll("[data-t]")].map((el) => [el.dataset.t, el])
  );
  const show = (id, v) => {
    parts[id].style.opacity = v;
  };
  const move = (id, x, y) =>
    parts[id].setAttribute("transform", `translate(${x} ${y})`);
  const word = (id, text) => {
    parts[id].querySelector("text").textContent = text;
  };
  const trace = (id, v) => {
    const el = parts[id],
      len = el.getTotalLength();
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = len * (1 - v);
    el.style.opacity = v > 0 ? 1 : 0;
    if (!el.classList.contains("tm-dashed"))
      el.setAttribute(
        "marker-end",
        v === 1 ? `url(#topic-arrow-${key})` : "none"
      );
  };
  const pathMove = (id, path, t) => {
    const el = parts[path],
      pt = el.getPointAtLength(el.getTotalLength() * t);
    move(id, pt.x, pt.y);
  };
  visual
    .querySelectorAll(".tm-edge:not(.tm-dashed)")
    .forEach((el) => el.setAttribute("marker-end", `url(#topic-arrow-${key})`));
  let previous = -1;
  return {
    update(step, progress) {
      const raw = Math.min(1, progress / 0.75),
        t = raw * raw * (3 - 2 * raw),
        at = (n) => (step > n ? 1 : step === n ? t : 0);
      if (step !== previous) {
        notes.innerHTML = `<div class="gm-note-step">${step + 1} / ${chapters[key].length}</div><h3>${chapters[key][step][0]}</h3><p>${chapters[key][step][1]}</p><div class="side-key">${key === "merge" ? "当前分支：main<br>绿色：本地分支<br>黄色：HEAD<br>虚线：改动汇总" : key === "pr" ? "PR：Pull Request<br>origin/main：本地的远端记录<br>本例 Pull：快进合并" : key === "ci" ? "CI：自动检查、测试、构建<br>CD：通过后自动部署" : key === "conflict" ? "C、D：两边的提交<br>M：解决冲突后的合并提交" : "带名称的标签：分支或版本位置"}</div>`;
        previous = step;
      }
      if (key === "merge") {
        for (let i = 0; i < 2; i++) {
          const y = 80 + i * 245,
            v = at(i + 1);
          trace(`parent${i}`, v);
          show(`result${i}`, v);
          move(`main${i}`, 340 + 210 * at(3), y - 80);
          move(`head${i}`, 340 + 210 * at(3), y - 40);
          parts[`main${i}`].querySelector("path").setAttribute("d", "M0 22V28");
          parts[`head${i}`]
            .querySelector("path")
            .setAttribute("d", "M0 -12V-18");
          if (i === 0) trace("join0", v);
          else show("join1", v);
          for (const [name, x] of [
            ["D", 290],
            ["E", 430],
          ]) {
            show(`copy${name}${i}`, i === 1 && step === 2 && t < 1 ? 1 : 0);
            move(`copy${name}${i}`, x + (550 - x) * v, y + 95 - 95 * v);
          }
        }
      } else if (key === "head") {
        const detach = at(1),
          commit = at(2),
          branch = at(3),
          back = at(4);
        trace("detachedEdge", commit);
        show("d", commit);
        show("experiment", branch);
        const x = 700 - 350 * detach + 150 * commit,
          y = 255 - 50 * detach + 175 * commit + 55 * branch;
        move("head", x + (700 - x) * back, y + (255 - y) * back);
        word(
          "head",
          step === 0 || step === 4
            ? "HEAD → main"
            : step === 3
              ? "HEAD → experiment"
              : "HEAD（分离）"
        );
        parts.head.querySelector("text").style.fontSize =
          step === 3 ? "15px" : "17px";
        parts.head
          .querySelector("path")
          .setAttribute(
            "d",
            step === 1 || step === 2 ? "M0 -12V-28" : "M0 -12V-28"
          );
      } else if (key === "tag") {
        const release = at(1),
          next = at(2);
        show("tag", release);
        move("tag", 500, 150);
        parts.tag.querySelector("path").setAttribute("d", "M0 22V55");
        trace("next", next);
        show("nextNode", next);
        move("main", 500 + 320 * next, 285);
        move("head", 500 + 320 * next, 335);
        parts.head.querySelector("path").setAttribute("d", "M0 -12V-28");
      } else if (key === "branch") {
        const grow = at(1),
          merge = at(3),
          tag = 0,
          next = 0;
        const back = at(2);
        const hx = 280 + 350 * grow,
          hy = 255 + 180 * grow;
        move(
          "head",
          hx + (280 - hx) * back + 480 * merge + 160 * next,
          hy + (255 - hy) * back
        );
        word("head", step < 2 ? "HEAD → feature" : "HEAD → main");
        parts.head.querySelector("path").setAttribute("d", "M0 -12V-28");
        parts.head.querySelector("path").style.opacity =
          back > 0 && back < 1 ? 0 : 1;
        trace("newbranch", Math.min(1, grow * 2));
        trace("feature", Math.max(0, grow * 2 - 1));
        show("d", Math.min(1, grow * 2));
        show("e", Math.max(0, grow * 2 - 1));
        show("featureRef", at(0));
        move("featureRef", 280 + 350 * grow, 205 + 180 * grow);
        parts.featureRef.querySelector("path").style.opacity =
          grow > 0 && grow < 1 ? 0 : 1;
        parts.featureRef.querySelector("path").setAttribute("d", "M0 -12V-30");
        parts.tag.querySelector("path").setAttribute("d", "M0 21V30");
        trace("merge1", merge);
        trace("merge2", merge);
        show("m", merge);
        move("main", 280 + 480 * merge + 160 * next, 95 + 110 * back);
        parts.main
          .querySelector("path")
          .setAttribute("d", back === 0 ? "M0 21V30" : "M0 -12V-30");
        show("tag", tag);
        move("tag", 760, 65 + 30 * tag);
        trace("next", next);
        show("nextNode", next);
      } else if (key === "conflict") {
        const change = at(1),
          clash = at(2),
          choose = at(3),
          merge = at(4);
        ["bc", "bd"].forEach((id) => trace(id, change));
        ["c", "d", "valueC", "valueD"].forEach((id) => show(id, change));
        show("result", 1 - merge);
        word(
          "result",
          choose === 1
            ? "已保存   speed = 8"
            : clash > 0
              ? "冲突：6 还是 8？"
              : "等待合并"
        );
        parts.result.classList.toggle("tm-alert", clash > 0 && choose < 1);
        parts.result.classList.toggle("tm-good", choose === 1);
        show("chosen", step === 3 && choose < 1 ? 1 : 0);
        move("chosen", 395 + 320 * choose, 330 - 115 * choose);
        show("valueC", change * (1 - choose * 0.7));
        trace("cm", merge);
        trace("dm", merge);
        show("m", merge);
        move(
          "main",
          120 + 225 * change + 465 * merge,
          305 - 275 * change + 120 * merge
        );
        move(
          "head",
          120 + 225 * change + 465 * merge,
          350 - 275 * change + 120 * merge
        );
        parts.main.querySelector("path").setAttribute("d", "M0 22V33");
        parts.head.querySelector("path").setAttribute("d", "M0 -12V-23");
        show("featureRef", change);
        visual.querySelector("svg > text:last-child").textContent =
          choose === 1 ? "speed = 8" : "";
      } else if (key === "pr") {
        const request = at(1),
          review = at(2),
          repair = at(3),
          merge = at(4),
          checkout = at(5),
          fetch = at(6),
          pull = at(7);
        show("request", step === 1 && request < 1 ? 1 : 0);
        move("request", 370 + 330 * request, 65 - 20 * request);
        word(
          "review",
          merge > 0
            ? "审查通过，已合并"
            : repair === 1
              ? "修复已收到"
              : review > 0
                ? "需要修改"
                : request === 1
                  ? "审查中"
                  : "等待 PR"
        );
        parts.review.classList.toggle("tm-alert", review > 0 && repair < 1);
        parts.review.classList.toggle("tm-good", merge > 0);
        trace("repair", repair);
        show("d", repair);
        move("sourceRef", 350 + 150 * repair, 145);
        trace("merge1", merge);
        trace("merge2", merge);
        show("m", merge);
        move("main", 220 + 580 * merge, 265);
        trace("localRepair", repair);
        show("localD", repair);
        move("localFeature", 350 + 150 * repair, 435);
        parts.localFeature
          .querySelector("path")
          .setAttribute("d", "M0 -12V-20");
        const localX = 350 + 150 * repair;
        move("head", localX + (220 - localX) * checkout + 580 * pull, 480);
        word("head", checkout === 1 ? "HEAD → main" : "HEAD → feature");
        parts.head.querySelector("path").setAttribute("d", "M0 -12V-23");
        move("localMain", 220 + 580 * pull, 435);
        const received = Math.min(1, fetch * 2),
          tracking = Math.max(0, fetch * 2 - 1);
        show("pullCopy", step === 6 && received < 1 ? 1 : 0);
        move(
          "pullCopy",
          800 + 80 * Math.sin(Math.PI * received),
          210 + 180 * received
        );
        show("localM", received === 1 ? 1 : 0);
        trace("localMerge", received === 1 ? 1 : 0);
        move("tracking", 220 + 580 * tracking, 310);
        parts.tracking.querySelector("path").setAttribute("d", "M0 22V55");
      } else if (key === "ci") {
        const upload = at(1),
          fail = at(2),
          fix = at(3),
          pass = at(4),
          deploy = at(5);
        show("c2", fix);
        move("c2", 110, 330 + 30 * (1 - fix));
        trace("push", upload);
        trace("flow", pass > 0 ? pass : upload * 0.52);
        trace("return", fail);
        parts.return.style.opacity = fail * (1 - pass * 0.8);
        parts.return.style.stroke = "#b46449";
        trace("repush", fix);
        trace("deploy", deploy);
        word("check", upload === 1 ? "✓" : "检查");
        word("test", pass > 0.55 ? "✓" : fail > 0 ? "×" : "测试");
        word("build", pass === 1 ? "✓" : "构建");
        parts.test.classList.toggle("tm-bad", fail > 0 && pass <= 0.55);
        show("job", step > 0 && progress < 0.75 ? 1 : 0);
        word("job", step >= 3 ? "C2" : "C1");
        if (step === 1) move("job", 110 + 440 * upload, 130);
        if (step === 2) pathMove("job", "return", fail);
        if (step === 3) pathMove("job", "repush", fix);
        if (step === 4) move("job", 330 + 440 * pass, 130);
        if (step === 5) pathMove("job", "deploy", deploy);
        word("web", deploy === 1 ? "网页   C2" : "网页   C0");
        parts.web.classList.toggle("tm-good", deploy === 1);
      } else {
        const staged = at(1),
          committed = at(2),
          pushed = at(3);
        move("patch", 70 + 335 * staged, 140);
        show("patch", 1 - committed);
        show("c", committed);
        move("c", 400, 335 - 100 * (1 - committed));
        trace("commitline", committed);
        move("main", 180 + 220 * committed, 390);
        show("copy", step === 3 && pushed < 1 ? 1 : 0);
        move("copy", 400 + 435 * pushed, 335);
        word("remote", pushed === 1 ? "GitHub   C" : "GitHub   B");
      }
    },
  };
}

let independentPlayers = [];
function stopIndependent() {
  independentPlayers.forEach((p) => p.stop());
  independentPlayers = [];
}
function startIndependentLesson() {
  cancelAnimationFrame(lessonFrame);
  stopIndependent();
  lessonBar.hidden = true;
  const panel = document.querySelector("#terms-dialog > section:not([hidden])");
  const key = panel.id.replace("terms-", "");
  if (!panel.dataset.original) panel.dataset.original = panel.innerHTML;
  const variants =
    key === "sync"
      ? ["Push", "Pull"]
      : key === "fetch"
        ? ["Fetch", "Pull"]
        : key === "merge"
          ? ["Merge", "Squash Merge"]
          : [key];
  panel.innerHTML =
    '<div class="independent-layout"><div class="independent-scenes"></div><aside class="term-notes independent-notes"></aside></div>';
  const scenes = panel.querySelector(".independent-scenes"),
    shared = panel.querySelector(".independent-notes");
  scenes.classList.toggle("pair", variants.length > 1);
  const legend = document.createElement("div");
  legend.className = "terms-color-key";
  legend.innerHTML =
    '<span class="ref-chip local">main</span> 本地分支 <span class="ref-chip remote">origin/main</span> 远端 / 跟踪 <span class="ref-chip head">当前位置</span> HEAD <span class="ref-chip tag">v1.0</span> 版本标签';
  panel.append(legend);
  const tagIcon =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>';
  legend
    .querySelectorAll(".ref-chip")
    .forEach((label) => label.insertAdjacentHTML("afterbegin", tagIcon));
  legend.querySelector(".head svg").innerHTML =
    '<path d="M12 13v8"/><path d="M12 3v3"/><path d="M2.354 10.354a1.207 1.207 0 0 1 0-1.708l2.06-2.06A2 2 0 0 1 5.828 6h12.344a2 2 0 0 1 1.414.586l2.06 2.06a1.207 1.207 0 0 1 0 1.708l-2.06 2.06a2 2 0 0 1-1.414.586H5.828a2 2 0 0 1-1.414-.586z"/>';

  let selected = 0;
  variants.forEach((variant, index) => {
    const card = document.createElement("article");
    card.className = "independent-card";
    card.setAttribute("aria-label", variant + " 动画");
    scenes.append(card);
    const host = document.createElement("div");
    host.innerHTML =
      '<div class="term-split"><div class="term-visual"></div><aside class="term-notes"></aside></div>';
    // Render each simulation into its own DOM and timeline.
    card.append(host);
    let motion, steps, map;
    if (["sync", "fetch", "diverged"].includes(key)) {
      motion = createGitMotion(
        host,
        key,
        variants.length > 1 ? variant : undefined
      );
      steps =
        variant === "Push"
          ? ["本地新增 C", "上传 C", "更新 GitHub main", "推送完成"]
          : variant === "Fetch"
            ? ["远端新增 C", "下载 C", "更新 origin/main", "main 保持不变"]
            : variant === "Pull"
              ? ["远端新增 C", "下载 C", "更新 origin/main", "更新 main"]
              : [...lessonSteps[key]];
    } else if (key === "basics") {
      host.innerHTML = panel.dataset.original;
      const items = prepareLesson(host, key);
      steps = [...lessonSteps[key]];
      motion = {
        update(step) {
          items.forEach(({ el, stage }) => {
            el.classList.toggle("lesson-future", stage > step);
            el.classList.toggle("lesson-current", stage === step);
          });
        },
      };
    } else {
      motion = createTopicMotion(host, key);
      steps = [...lessonSteps[key]];
      if (key === "merge") {
        const keep = index;
        host.querySelectorAll("[data-t]").forEach((el) => {
          if (el.dataset.t.endsWith(String(1 - keep))) el.remove();
        });
        const svg = host.querySelector("svg");
        svg.setAttribute("viewBox", `130 ${index * 245 - 20} 530 285`);
        svg.querySelectorAll("svg > .tm-heading").forEach((el, i) => {
          if (i !== keep) el.remove();
        });
        map = index === 0 ? [0, 1, 3] : [0, 2, 3];
        steps = map.map((i) => steps[i]);
      }
    }
    // Rider-style reference markers: outline tag plus name, without pill backgrounds.
    host.querySelectorAll(".gm-ref,.tm-ref").forEach((label) => {
      label.insertAdjacentHTML(
        "beforeend",
        '<g class="ref-outline" transform="translate(-80 -7)"><path d="M3 10 13 0H25V12L15 22Z"/><circle cx="20" cy="5" r="1.5"/></g>'
      );
      label.querySelector("text").setAttribute("x", "12");
    });
    host
      .querySelectorAll(".gm-node")
      .forEach((node) =>
        node.classList.toggle(
          "remote-node",
          node.dataset.part.startsWith("remote")
        )
      );
    if (key === "pr")
      host
        .querySelectorAll(".tm-node")
        .forEach((node) =>
          node.classList.toggle(
            "remote-node",
            ["a", "b", "c", "d", "x", "y", "m"].includes(node.dataset.t)
          )
        );
    const localNotes = host.querySelector(".term-notes");
    host.querySelector(".term-split").style.display = "block";
    localNotes.hidden = true;
    const bar = document.createElement("div");
    bar.className = "lesson-player local-player";
    bar.innerHTML =
      [
        ["restart", "重播", "rotate-ccw"],
        ["previous", "上一步", "step-back"],
        ["play", "暂停", "pause"],
        ["next", "下一步", "step-forward"],
        ["loop", "循环播放", "repeat"],
      ]
        .map(
          ([action, label, icon]) =>
            `<button type="button" data-action="${action}" aria-label="${label}" title="${label}">${lessonIcons[icon]}</button>`
        )
        .join("") + '<span class="local-count"></span>';
    card.prepend(bar);
    const caption = document.createElement("p");
    caption.className = "local-caption";
    bar.append(caption);
    let step = 0,
      progress = 1,
      playing = false,
      single = false,
      loop = true,
      frame,
      last = performance.now();
    const select = () => {
      selected = index;
      scenes
        .querySelectorAll(".independent-card")
        .forEach((c, i) => c.classList.toggle("selected", i === index));
      syncNotes();
    };
    function syncNotes() {
      const count = localNotes.querySelector(".gm-note-step");
      if (count) count.textContent = `${step + 1} / ${steps.length}`;
      if (key === "merge") {
        const paragraph = localNotes.querySelector("p");
        if (paragraph)
          paragraph.textContent = paragraph.textContent.replace(
            "M 或 S",
            variant === "Merge" ? "M" : "S"
          );
      }
      if (selected === index) {
        const html = (
          localNotes.innerHTML || `<h3>${steps[step]}</h3>`
        ).replace(/<div class="ref-legend">[\s\S]*?<\/div>/, "");
        if (shared.innerHTML !== html) shared.innerHTML = html;
        shared.dataset.scene =
          {
            diverged: "分叉后 Pull",
            pr: "PR",
            branch: "Branch",
            tag: "Tag",
            head: "HEAD / 分离 HEAD",
            conflict: "Conflict",
            ci: "CI/CD",
            basics: "提交流程",
          }[variant] || variant;
      }
    }
    function paint() {
      motion.update(map ? map[step] : step, progress);
      host.querySelectorAll(".gm-ref.head,.tm-ref.head").forEach((label) => {
        const text = label.querySelector("text");
        text.textContent = text.textContent.includes("分离")
          ? "当前位置（分离 HEAD）"
          : "当前位置";
        text.style.fontSize = "19px";
        const icon = label.querySelector(".ref-outline");
        if (icon && !icon.dataset.signpost) {
          icon.innerHTML =
            '<path d="M12 13v8"/><path d="M12 3v3"/><path d="M2.354 10.354a1.207 1.207 0 0 1 0-1.708l2.06-2.06A2 2 0 0 1 5.828 6h12.344a2 2 0 0 1 1.414.586l2.06 2.06a1.207 1.207 0 0 1 0 1.708l-2.06 2.06a2 2 0 0 1-1.414.586H5.828a2 2 0 0 1-1.414-.586z"/>';
          icon.dataset.signpost = "true";
        }
      });
      host.querySelectorAll("svg.git-motion,svg.topic-svg").forEach((svg) => {
        const vb = svg.viewBox.baseVal,
          scale = Math.min(
            svg.clientWidth / vb.width,
            svg.clientHeight / vb.height
          );
        if (!scale) return;
        svg.style.setProperty("--scene-scale", scale);
        svg.querySelectorAll(".gm-node,.tm-node").forEach((node) => {
          const shape = node.querySelector("circle,rect"),
            r = 30 / scale;
          if (shape.tagName === "circle") shape.setAttribute("r", r);
          else
            [
              ["x", -r],
              ["y", -r],
              ["width", r * 2],
              ["height", r * 2],
            ].forEach(([k, v]) => shape.setAttribute(k, v));
          node.querySelector("text").setAttribute("y", 9 / scale);
        });
      });
      host.querySelectorAll(".gm-ref,.tm-ref").forEach((label) => {
        const icon = label.querySelector(".ref-outline"),
          text = label.querySelector("text");
        if (icon) {
          const scale =
            +label.closest("svg").style.getPropertyValue("--scene-scale") || 1;
          text.setAttribute("y", 10 / scale);
          icon.setAttribute(
            "transform",
            `translate(${12 - text.getComputedTextLength() / 2 - 34 / scale} ${-7 / scale}) scale(${1 / scale})`
          );
        }
      });
      caption.textContent = steps[step];
      bar.querySelector(".local-count").textContent =
        `${step + 1}/${steps.length}`;
      const play = bar.querySelector('[data-action="play"]'),
        active = playing || single,
        icon = active ? "pause" : "play";
      if (play.dataset.icon !== icon) {
        play.innerHTML = lessonIcons[icon];
        play.dataset.icon = icon;
      }
      play.setAttribute("aria-label", active ? "暂停" : "播放");
      play.title = active ? "暂停" : "播放";
      bar
        .querySelector('[data-action="loop"]')
        .setAttribute("aria-pressed", String(loop));
      bar.querySelector('[data-action="previous"]').disabled = step === 0;
      bar.querySelector('[data-action="next"]').disabled =
        step === steps.length - 1;
      syncNotes();
    }
    function tick(now) {
      if (!playing && !single) return;
      if (!document.querySelector("#terms-dialog").open || document.hidden) {
        playing = false;
        single = false;
        paint();
        return;
      }
      progress = Math.min(1, progress + (now - last) / 2000);
      last = now;
      paint();
      if (progress === 1) {
        if (single) {
          single = false;
          paint();
          return;
        }
        if (step === steps.length - 1) {
          if (loop) {
            step = 0;
            progress = 0;
          } else {
            playing = false;
            paint();
            return;
          }
        } else {
          step++;
          progress = 0;
        }
      }
      frame = requestAnimationFrame(tick);
    }
    function run() {
      cancelAnimationFrame(frame);
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
    bar.addEventListener("click", (event) => {
      const action = event.target.closest("button")?.dataset.action;
      if (!action) return;
      select();
      const active = playing || single;
      cancelAnimationFrame(frame);
      single = false;
      if (action === "play") {
        playing = !active;
        if (playing && step === steps.length - 1 && progress === 1) {
          step = 0;
          progress = 0;
        }
      }
      if (action === "loop") loop = !loop;
      if (action === "restart") {
        step = 0;
        progress = 0;
        playing = true;
      }
      if (action === "previous") {
        step = Math.max(0, step - 1);
        progress = 1;
        playing = false;
      }
      if (action === "next") {
        step = Math.min(steps.length - 1, step + 1);
        progress = 0;
        playing = false;
        single = true;
      }
      paint();
      if (playing || single) run();
    });
    card.addEventListener("pointerdown", select);
    card.addEventListener("focusin", select);
    independentPlayers.push({
      stop() {
        cancelAnimationFrame(frame);
        playing = false;
        single = false;
        paint();
      },
    });
    paint();
    if (playing) run();
    if (index === 0) select();
  });
}
document
  .querySelector("#terms-dialog")
  .addEventListener("close", stopIndependent);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopIndependent();
});
// Shared interface icons use the same bundled SVG set as the players.
document.querySelector("#terms-button").innerHTML = lessonIcons["book-open"];
document.querySelector("#terms-dialog .terms-head button").innerHTML =
  lessonIcons.x;
document.querySelector("#restart").innerHTML = lessonIcons["rotate-ccw"];

document.querySelector("#toggle-tree").innerHTML = lessonIcons["chevron-up"];
