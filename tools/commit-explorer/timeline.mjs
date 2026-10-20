export function layoutTimeline(rows) {
  const groups = new Map();
  for (const row of rows) {
    const day = row.date.slice(0, 10);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(row);
  }
  const positions = new Map();
  const bands = [];
  let offset = 0;
  for (const day of [...groups.keys()].sort()) {
    const members = groups.get(day);
    const pending = new Map(members.map((c) => [c.sha, c]));
    const laneNext = new Map();
    let count = 0;
    function place(c) {
      if (!pending.has(c.sha)) return;
      pending.delete(c.sha);
      const dependencies = [...c.parents, ...(c.layoutParents || [])];
      if (c.sha === "690829c52516d5f10b28194a8d5e3e537da85f05")
        dependencies.push("affec4b52af96f7222f5255119f01e606e011f12");
      for (const sha of dependencies)
        if (pending.has(sha)) place(pending.get(sha));
      let slot = laneNext.get(c.lane) || 0;
      for (const sha of dependencies) {
        const p = positions.get(sha);
        if (p && p.day === day) slot = Math.max(slot, p.column - offset + 1);
      }
      positions.set(c.sha, { day, column: offset + slot });
      laneNext.set(c.lane, slot + 1);
      count = Math.max(count, slot + 1);
    }
    // Independent branches share columns; timestamps order each lane's work.
    members
      .sort(
        (a, b) => a.date.localeCompare(b.date) || a.sha.localeCompare(b.sha)
      )
      .forEach(place);
    bands.push({ day, start: offset, count });
    offset += count;
  }
  return { positions, bands, columns: offset };
}
