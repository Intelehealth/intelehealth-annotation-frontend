import { spawn } from 'child_process';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const specFiles = readdirSync(__dirname)
  .filter(f => f.endsWith('.spec.ts'))
  .sort();

const cliPath = join(rootDir, 'node_modules', '@playwright', 'test', 'cli.js');

function runSpec(file) {
  const name = file.replace('.spec.ts', '');
  const reportFolder = `playwright-report/${name}-tests`;
  const specPath = `e2e/${file}`;

  return new Promise((resolve, reject) => {
    const proc = spawn('node', [
      cliPath,
      'test',
      specPath,
      '--reporter=list,html',
    ], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_HTML_REPORT: reportFolder,
      },
    });

    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Exit code ${code}`));
    });
  });
}

async function main() {
  console.log(`Found ${specFiles.length} spec files to run\n`);

  let passed = 0;
  let failed = 0;

  for (const file of specFiles) {
    const name = file.replace('.spec.ts', '');
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${file}`);
    console.log(`Report: playwright-report/${name}-tests/`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      await runSpec(file);
      console.log(`\n  ✓ ${file} PASSED\n`);
      passed++;
    } catch (e) {
      console.error(`\n  ✗ ${file} FAILED (${e.message})\n`);
      failed++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${specFiles.length} total`);
  console.log(`${'='.repeat(60)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
