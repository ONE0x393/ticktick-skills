import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const scriptPath = path.resolve("scripts/ticktick-smoke.mjs");

function runSmokeCli(args: string[], env: NodeJS.ProcessEnv = {}): { code: number; stdout: string; stderr: string } {
  const result = spawnSync("node", [scriptPath, ...args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
      // keep tests deterministic by preventing unexpected output pollution from host locale
      TZ: "UTC",
    },
    encoding: "utf8",
  });

  return {
    code: result.status ?? 1,
    stdout: result.stdout ? String(result.stdout) : "",
    stderr: result.stderr ? String(result.stderr) : "",
  };
}

describe("ticktick-smoke CLI", () => {
  it("prints usage on --help", async () => {
    const output = runSmokeCli(["--help"]);
    expect(output.code).toBe(0);
    expect(output.stdout).toContain("ticktick-smoke");
    expect(output.stdout).toContain("--dryRun");
  });

  it("reports missing required env on dryRun with non-zero? zero exit code and guidance", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "ticktick-smoke-test-"));
    const envPath = path.join(tempDir, "missing.env");
    await writeFile(envPath, "");

    const output = runSmokeCli(["--dryRun", "--env", envPath]);

    expect(output.code).toBe(0);
    expect(output.stdout).toContain("[ticktick-smoke] dryRun: required env is missing.");
    expect(output.stdout).toContain("Missing:");
    expect(output.stderr).toBe("");
  });
});
