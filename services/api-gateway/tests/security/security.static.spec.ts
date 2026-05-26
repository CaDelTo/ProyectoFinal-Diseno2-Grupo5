import { describe, it, expect } from '@jest/globals';
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { resolve, join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../../../../');

function walkFiles(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === 'dist' || entry === 'generated') continue;
    if (statSync(full).isDirectory()) {
      results.push(...walkFiles(full, exts));
    } else if (exts.includes(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

describe('spec 012 — Análisis estático de seguridad', () => {
  it('no hay dangerouslySetInnerHTML en frontend/src/', () => {
    const frontendSrc = resolve(ROOT, 'frontend/src');
    const files = walkFiles(frontendSrc, ['.ts', '.tsx', '.js', '.jsx']);
    const matches = files.filter(f => readFileSync(f, 'utf8').includes('dangerouslySetInnerHTML'));
    expect(matches).toHaveLength(0);
  });

  it('no hay secretos hardcodeados en services/', () => {
    const servicesDir = resolve(ROOT, 'services');
    // Detecta patrones tipo ALGO_SECRET = "valor" fuera de archivos de test
    const SECRET_PATTERN = /\b(SECRET|PASSWORD|API_KEY|TOKEN)\b\s*=\s*["'][^${}'"]/;
    const files = walkFiles(servicesDir, ['.ts', '.js']).filter(
      f => !f.includes('.spec.') && !f.includes('.test.'),
    );
    const matches = files.filter(f => SECRET_PATTERN.test(readFileSync(f, 'utf8')));
    expect(matches).toHaveLength(0);
  });
});
