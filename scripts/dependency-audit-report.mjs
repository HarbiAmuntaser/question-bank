import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export function parseYarnAudit(output) {
  const records = output.split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
  const summary = records.find((record) => record.type === "auditSummary")?.data ?? null;
  const advisories = records
    .filter((record) => record.type === "auditAdvisory")
    .map((record) => record.data.advisory);
  const unique = [...new Map(advisories.map((advisory) => [advisory.id, advisory])).values()];
  const rank = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
  return {
    summary,
    uniqueAdvisoryCount: unique.length,
    advisories: unique.map((advisory) => ({
      id: advisory.id,
      module: advisory.module_name,
      severity: advisory.severity,
      installedVersions: [...new Set(advisory.findings.flatMap((finding) => finding.version))],
      patchedVersions: advisory.patched_versions,
      recommendation: advisory.recommendation,
      direct: advisory.findings.some((finding) => finding.paths.includes(advisory.module_name)),
    })).sort((left, right) => (rank[left.severity] ?? 9) - (rank[right.severity] ?? 9) || left.module.localeCompare(right.module)),
  };
}

export function compactYarnAuditReport(report) {
  const rank = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
  const groups = new Map();
  for (const advisory of report.advisories) {
    const key = `${advisory.severity}:${advisory.module}`;
    const group = groups.get(key) ?? {
      module: advisory.module,
      severity: advisory.severity,
      direct: false,
      advisoryIds: [],
      installedVersions: new Set(),
      patchedVersions: new Set(),
    };
    group.direct ||= advisory.direct;
    group.advisoryIds.push(advisory.id);
    advisory.installedVersions.forEach((version) => group.installedVersions.add(version));
    if (advisory.patchedVersions) group.patchedVersions.add(advisory.patchedVersions);
    groups.set(key, group);
  }

  return {
    summary: report.summary,
    uniqueAdvisoryCount: report.uniqueAdvisoryCount,
    affectedPackageGroups: [...groups.values()].map((group) => ({
      module: group.module,
      severity: group.severity,
      direct: group.direct,
      advisoryCount: group.advisoryIds.length,
      advisoryIds: group.advisoryIds.sort((left, right) => Number(left) - Number(right)),
      installedVersions: [...group.installedVersions].sort(),
      patchedVersions: [...group.patchedVersions].sort(),
    })).sort((left, right) => (rank[left.severity] ?? 9) - (rank[right.severity] ?? 9) || left.module.localeCompare(right.module)),
  };
}

export function runReadOnlyYarnAudit() {
  const command = process.platform === "win32" ? "yarn.cmd" : "yarn";
  const run = spawnSync(command, ["audit", "--groups", "dependencies", "--json", "--level", "low", "--non-interactive"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    shell: process.platform === "win32",
    windowsHide: true,
  });
  if (run.error) throw run.error;
  const report = parseYarnAudit(run.stdout);
  console.log(JSON.stringify({
    packageManager: "yarn-classic",
    scope: "production-dependencies",
    command: "yarn audit --groups dependencies --json --level low --non-interactive",
    readOnly: true,
    ...compactYarnAuditReport(report),
  }, null, 2));
  return run.status ?? 1;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exitCode = runReadOnlyYarnAudit();
