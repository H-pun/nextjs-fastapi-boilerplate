import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const python = join(
  process.cwd(),
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python"
);

if (!existsSync(python)) {
  console.error("Python virtual environment not found. Run: python -m venv .venv");
  process.exit(1);
}

const result = spawnSync(python, process.argv.slice(2), {
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
