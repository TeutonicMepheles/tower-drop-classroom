import http from "node:http";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, stat, symlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const cache = path.join(repo, ".commit-explorer");
const port = Number(process.env.EXPLORER_PORT || 3210);
const jobs = new Map();
let queue = Promise.resolve();
function run(command, args, cwd = repo) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      shell: false,
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(output) : reject(new Error(output.slice(-6000)))
    );
  });
}
async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}
async function history() {
  const raw = await run("git", [
    "log",
    "--all",
    "--topo-order",
    "-n",
    "180",
    "--format=%H%x09%P%x09%an%x09%aI%x09%D%x09%s",
  ]);
  const commits = raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, parents, author, date, refs, ...subject] = line.split("\t");
      return {
        sha,
        parents: parents.split(" ").filter(Boolean),
        author,
        date,
        refs,
        subject: subject.join("\t"),
      };
    });
  return {
    commits,
    repo,
    branch: (await run("git", ["branch", "--show-current"])).trim(),
    limit: 180,
  };
}
async function build(sha, job) {
  const root = path.join(cache, sha);
  const dist = path.join(root, "dist");
  if (await exists(path.join(root, "ready"))) {
    job.state = "ready";
    return;
  }
  job.state = "building";
  job.message = "正在提取提交快照…";
  await mkdir(root, { recursive: true });
  const archive = path.join(root, "source.tar");
  await run("git", ["archive", "--format=tar", "-o", archive, sha]);
  await run("tar", ["-xf", archive, "-C", root]);
  const lock = await readFile(path.join(root, "package-lock.json"));
  const key = createHash("sha256").update(lock).digest("hex").slice(0, 20);
  const deps = path.join(cache, "dependencies", key);
  if (!(await exists(path.join(deps, "ready")))) {
    job.message = "首次准备这个版本的依赖…";
    await mkdir(deps, { recursive: true });
    await writeFile(path.join(deps, "package-lock.json"), lock);
    await writeFile(
      path.join(deps, "package.json"),
      await readFile(path.join(root, "package.json"))
    );
    // Invoke npm through Node, avoiding Windows shell interpolation.
    const npm = path.join(
      path.dirname(process.execPath),
      "node_modules/npm/bin/npm-cli.js"
    );
    await run(
      process.execPath,
      [npm, "ci", "--ignore-scripts", "--no-audit", "--no-fund"],
      deps
    );
    await writeFile(path.join(deps, "ready"), "ok");
  }
  if (!(await exists(path.join(root, "node_modules")))) {
    await symlink(
      path.join(deps, "node_modules"),
      path.join(root, "node_modules"),
      process.platform === "win32" ? "junction" : "dir"
    );
  }
  job.message = "正在构建游戏页面…";
  await run(
    process.execPath,
    [
      path.join(root, "node_modules/vite/bin/vite.js"),
      "build",
      "--base",
      `/versions/${sha}/`,
      "--outDir",
      dist,
    ],
    root
  );
  await writeFile(path.join(root, "ready"), "ok");
  job.state = "ready";
  job.message = "可以开始游戏";
}
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".woff2": "font/woff2",
};
const server = http.createServer(async (req, res) => {
  const json = (status, data) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  };
  try {
    if (
      req.headers.host !== `127.0.0.1:${port}` &&
      req.headers.host !== `localhost:${port}`
    )
      return json(403, { error: "仅允许本机访问" });
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === "/api/history" && req.method === "GET")
      return json(200, await history());
    const match = url.pathname.match(/^\/api\/preview\/([a-f0-9]{40})$/);
    if (match) {
      const sha = match[1];
      if (req.method === "POST") {
        if (req.headers.origin !== `http://${req.headers.host}`)
          return json(403, { error: "请求来源不匹配" });
        if (!(await history()).commits.some((c) => c.sha === sha))
          return json(404, { error: "提交不在当前历史列表中" });
        if (!jobs.has(sha) || jobs.get(sha).state === "error") {
          const job = {
            sha,
            state: "queued",
            message: "等待构建…",
            url: `/versions/${sha}/index.html`,
          };
          jobs.set(sha, job);
          queue = queue
            .then(() => build(sha, job))
            .catch((error) => {
              job.state = "error";
              job.message = error.message;
            });
        }
      } else if (req.method !== "GET")
        return json(405, { error: "不支持的方法" });
      return json(200, jobs.get(sha) || { state: "idle" });
    }
    if (req.method !== "GET") return json(405, { error: "不支持的方法" });
    const version = url.pathname.match(/^\/versions\/([a-f0-9]{40})\/(.*)$/);
    let file;
    if (version) {
      const base = path.join(cache, version[1], "dist");
      file = path.resolve(base, decodeURIComponent(version[2] || "index.html"));
      if (!file.startsWith(base + path.sep))
        return json(403, { error: "无效路径" });
    } else {
      const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      if (!["index.html", "app.js", "style.css"].includes(name))
        return json(404, { error: "页面不存在" });
      file = path.join(here, name);
    }
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(body);
  } catch (error) {
    json(error.code === "ENOENT" ? 404 : 500, { error: error.message });
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Commit Explorer: http://127.0.0.1:${port}`)
);
