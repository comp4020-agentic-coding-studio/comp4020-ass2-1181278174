import { it, expect } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { unzipSync } from 'fflate';

it('the downloaded pack runs offline and cannot label missing student code as success', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slop-practice-'));
  try {
    const files = unzipSync(readFileSync('.generated/lab-practice.zip'));
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['student-runner.mjs','reference.mjs','wiring.test.mjs']));
    for (const [name, data] of Object.entries(files)) writeFileSync(join(dir, name), data);
    const output = execFileSync(process.execPath, ['--test', 'strategies.test.mjs', 'wiring.test.mjs'], { cwd: dir, encoding: 'utf8', timeout: 60000 });
    expect(output).toContain('fail 0');
    expect(output).toContain('A2 calls neighbours');
    for (const assignment of ['a1', 'a2']) {
      const missing = spawnSync(process.execPath, ['run.mjs', assignment], { cwd: dir, encoding: 'utf8' });
      expect(missing.status).not.toBe(0);
      expect(missing.stderr).toContain('Implement');
      const reference = execFileSync(process.execPath, ['reference.mjs', assignment], { cwd: dir, encoding: 'utf8' });
      expect(reference).toContain('TEACHER REFERENCE');
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}, 60000);
