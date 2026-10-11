const $ = (selector) => document.querySelector(selector);
let commits = [];
const selected = new Map();
const colors = [
  "#8cb8ff",
  "#a2edbd",
  "#c1adff",
  "#ffbf8d",
  "#ee9bbb",
  "#67d8e0",
];
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
  const query = $("#search").value.trim().toLowerCase();
  const baseline = commits.findIndex((c) =>
    c.subject.includes("建立三人协作教学基线")
  );
  const visible =
    $("#all").checked || baseline < 0
      ? commits
      : commits.slice(0, baseline + 1);
  // Keep the DAG intact when searching; dim non-matches instead of inventing edges.
  const lanes = [];
  const rows = [];
  for (const c of visible) {
    let lane = lanes.indexOf(c.sha);
    if (lane < 0) {
      lane = lanes.indexOf(null);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = c.sha;
    }
    rows.push({ ...c, lane });
    lanes[lane] = null;
    c.parents.forEach((parent, i) => {
      if (lanes.includes(parent)) return;
      let slot = i === 0 ? lane : lanes.indexOf(null);
      if (slot < 0) slot = lanes.length;
      lanes[slot] = parent;
    });
  }
  const width = 26 + (Math.max(0, ...rows.map((c) => c.lane)) + 1) * 19;
  const lookup = new Map(rows.map((c, i) => [c.sha, { ...c, y: i * 76 + 37 }]));
  const paths = rows
    .flatMap((c, i) =>
      c.parents.map((parent) => {
        const p = lookup.get(parent);
        const x = 22 + c.lane * 19;
        const y = i * 76 + 37;
        if (!p)
          return `<path d="M${x} ${y}v30" stroke="${colors[c.lane % colors.length]}" stroke-dasharray="3 4"/>`;
        const px = 22 + p.lane * 19;
        return `<path d="M${x} ${y} C${x} ${y + 38},${px} ${p.y - 38},${px} ${p.y}" stroke="${colors[c.lane % colors.length]}"/>`;
      })
    )
    .join("");
  $("#tree").innerHTML =
    `<div class="tree-inner"><svg class="graph" width="${width}" height="${rows.length * 76}" aria-hidden="true"><g fill="none" stroke-width="2" opacity=".65">${paths}</g></svg>${rows
      .map((c) => {
        const matches =
          !query ||
          `${c.subject} ${c.author} ${c.sha} ${c.refs}`
            .toLowerCase()
            .includes(query);
        return `<button class="commit" data-sha="${c.sha}" aria-pressed="${selected.has(c.sha)}" style="padding-left:${width}px;opacity:${matches ? 1 : 0.25}" title="${escape(c.subject + "\n" + c.refs + "\n" + c.sha)}"><span class="dot" style="left:${16 + c.lane * 19}px;--color:${colors[c.lane % colors.length]}"></span><span><span class="subject">${escape(c.subject)}</span><span class="meta"><span class="sha">${c.sha.slice(0, 7)}</span> · ${escape(c.author)} · ${c.date.slice(0, 10)}${c.refs ? ` <span class="refs">⌁ ${escape(c.refs)}</span>` : ""}</span></span></button>`;
      })
      .join("")}</div>`;
}
function updateSelection() {
  $("#count").textContent = `${selected.size} / 3`;
  $("#previews").style.setProperty("--columns", Math.max(1, selected.size));
  renderTree();
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
          const visibleWidth = area.getBoundingClientRect().width;
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
        item.card.querySelector(".preview-tools a").hidden = false;
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
    retryButton.textContent = "重试构建";
    retryButton.onclick = () => loadPreview(c, item);
    area.firstElementChild.append(retryButton);
  }
}
function choose(sha) {
  $("#notice").textContent = "";
  if (selected.has(sha)) return remove(sha);
  if (selected.size >= 3) {
    $("#notice").textContent = "已选择 3 个版本，请先移除一个再添加。";
    return;
  }
  const c = commits.find((commit) => commit.sha === sha);
  if (!selected.size) $("#previews").innerHTML = "";
  const card = document.createElement("article");
  card.className = "preview";
  card.innerHTML = `<div class="preview-head"><span class="sha">${c.sha.slice(0, 7)}</span><p class="preview-title">${escape(c.subject)}</p><div class="preview-tools"><a href="/versions/${c.sha}/index.html" target="_blank" rel="noopener" hidden>独立窗口 ↗</a><span><button class="reload" title="重新开始此版本游戏">重载</button> <button class="remove" aria-label="移除 ${c.sha.slice(0, 7)}">移除 ×</button></span></div></div><div class="game-area"></div>`;
  const item = { card };
  selected.set(sha, item);
  $("#previews").append(card);
  card.querySelector(".remove").onclick = () => remove(sha);
  card.querySelector(".reload").onclick = () => {
    const frame = card.querySelector("iframe");
    if (frame) frame.contentWindow.location.reload();
  };
  updateSelection();
  loadPreview(c, item);
}
async function refresh() {
  $("#refresh").disabled = true;
  try {
    const data = await api("/api/history");
    commits = data.commits;
    $("#repository").textContent =
      `${data.repo} · ${data.branch} · 最近 ${commits.length} 个提交（上限 ${data.limit}）`;
    renderTree();
    $("#notice").textContent = "";
  } catch (error) {
    $("#notice").textContent = `读取失败：${error.message}`;
  } finally {
    $("#refresh").disabled = false;
  }
}
$("#tree").onclick = (event) => {
  const button = event.target.closest("[data-sha]");
  if (button) choose(button.dataset.sha);
};
$("#search").oninput = renderTree;
$("#all").onchange = renderTree;
$("#refresh").onclick = refresh;
$("#clear").onclick = () => {
  for (const sha of [...selected.keys()]) remove(sha);
  $("#notice").textContent = "";
};
refresh();
