import { readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/** @param {unknown} data */
function serialize(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

/** @param {string | URL} filePath */
function toPath(filePath) {
  return filePath instanceof URL ? fileURLToPath(filePath) : filePath;
}

/**
 * Writes `data` to `filePath` atomically, but only if the serialized content actually changed.
 * @param {string | URL} filePath
 * @param {unknown} data
 * @returns {Promise<boolean>} whether the file was written
 */
export async function writeIfChanged(filePath, data) {
  const path = toPath(filePath);
  const next = serialize(data);
  let current;
  try {
    current = await readFile(path, 'utf8');
  } catch {
    current = undefined;
  }
  if (current === next) return false;

  const tempPath = `${path}.tmp-${process.pid}`;
  await writeFile(tempPath, next, 'utf8');
  await rename(tempPath, path);
  return true;
}
