import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../..");
const names = [
  "tower-drop",
  "GolajahSlide",
  "tower-drop-classroom/member-a-gameplay",
  "tower-drop-classroom/member-b-art",
  "tower-drop-classroom/member-c-ui",
];
const workspaces = names.map((name) => {
  const cwd = path.join(root, name);
  const git = (...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      windowsHide: true,
    }).trim();
  try {
    git("fetch", "--all", "--prune");
    const branch = git("branch", "--show-current");
    const head = git("rev-parse", "HEAD");
    const main = git("rev-parse", "origin/main");
    const [ahead, behind] = git(
      "rev-list",
      "--left-right",
      "--count",
      "HEAD...origin/main"
    )
      .split(/\s+/)
      .map(Number);
    let upstream = null;
    try {
      upstream = git("rev-parse", "--abbrev-ref", "@{upstream}");
    } catch {
      /* Deleted or unconfigured upstream. */
    }
    const commits = git(
      "log",
      "--remotes=origin",
      "--topo-order",
      "-12",
      "--format=%H%x09%aI%x09%s"
    )
      .split("\n")
      .map((line) => {
        const [sha, date, ...subject] = line.split("\t");
        return { sha, date, subject: subject.join("\t") };
      });
    return {
      name,
      path: cwd,
      branch,
      head,
      main,
      ahead,
      behind,
      upstream,
      dirty: Boolean(git("status", "--porcelain")),
      remote: git("remote", "get-url", "origin"),
      commits,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return { name, path: cwd, error: error.message };
  }
});
writeFileSync(
  path.join(here, "workspaces.json"),
  JSON.stringify({ checkedAt: new Date().toISOString(), workspaces }, null, 2) +
    "\n"
);
console.log(
  JSON.stringify(
    workspaces.map(({ name, head, ahead, behind, error }) => ({
      name,
      head,
      ahead,
      behind,
      error,
    })),
    null,
    2
  )
);
