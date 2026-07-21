#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const postDir = path.join(rootDir, 'blog-source', 'source', '_posts');
const assetRoot = path.join(rootDir, 'blog-source', 'source', 'img', 'posts');
const imageExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function safeDecode(value) {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

function hasImageExt(value) {
  return imageExts.has(path.extname(value.split(/[?#]/)[0]).toLowerCase());
}

function shortHash(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 8);
}

function safeAssetName(sourceFile, fallbackName) {
  const ext = path.extname(fallbackName).toLowerCase();
  const rawBase = path.basename(fallbackName, path.extname(fallbackName));
  const base = rawBase
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  if (base) return `${base}${ext}`;

  const hashSource = fs.existsSync(sourceFile)
    ? fs.readFileSync(sourceFile)
    : Buffer.from(fallbackName);
  return `image-${shortHash(hashSource)}${ext}`;
}

function isRemoteOrAbsolute(ref) {
  return /^(https?:)?\/\//i.test(ref) || ref.startsWith('/') || ref.startsWith('#') || ref.startsWith('mailto:');
}

function filesEqual(a, b) {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return false;
  const statA = fs.statSync(a);
  const statB = fs.statSync(b);
  if (statA.size !== statB.size) return false;
  return fs.readFileSync(a).equals(fs.readFileSync(b));
}

function uniqueDestination(dest) {
  if (!fs.existsSync(dest)) return dest;
  const dir = path.dirname(dest);
  const ext = path.extname(dest);
  const base = path.basename(dest, ext);
  let index = 1;
  while (true) {
    const next = path.join(dir, `${base}-${index}${ext}`);
    if (!fs.existsSync(next)) return next;
    index += 1;
  }
}

function assetDirForPost(postFile) {
  const relPostDir = path.dirname(path.relative(postDir, postFile));
  return relPostDir === '.' ? assetRoot : path.join(assetRoot, relPostDir);
}

function publicUrlForAsset(assetFile) {
  const rel = path.relative(path.join(rootDir, 'blog-source', 'source'), assetFile).split(path.sep).join('/');
  return encodeURI(`/${rel}`);
}

function resolveAndMoveAsset(postFile, ref) {
  let rawRef = ref.trim();
  if (rawRef.startsWith('<') && rawRef.endsWith('>')) {
    rawRef = rawRef.slice(1, -1).trim();
  }

  const cleanRef = safeDecode(rawRef.split(/[?#]/)[0]);
  if (!cleanRef || isRemoteOrAbsolute(cleanRef) || !hasImageExt(cleanRef)) {
    return null;
  }

  const postAssetDir = assetDirForPost(postFile);
  const sourceCandidate = path.resolve(path.dirname(postFile), cleanRef);
  const filename = safeAssetName(sourceCandidate, path.basename(cleanRef));
  const targetCandidate = path.join(postAssetDir, filename);

  if (!sourceCandidate.startsWith(postDir + path.sep) && sourceCandidate !== targetCandidate) {
    return null;
  }

  if (fs.existsSync(sourceCandidate)) {
    fs.mkdirSync(postAssetDir, { recursive: true });
    let target = targetCandidate;
    if (path.resolve(sourceCandidate) !== path.resolve(targetCandidate)) {
      if (fs.existsSync(targetCandidate)) {
        if (filesEqual(sourceCandidate, targetCandidate)) {
          fs.unlinkSync(sourceCandidate);
        } else {
          target = uniqueDestination(targetCandidate);
          fs.renameSync(sourceCandidate, target);
        }
      } else {
        fs.renameSync(sourceCandidate, targetCandidate);
      }
    }
    return publicUrlForAsset(target);
  }

  if (fs.existsSync(targetCandidate)) {
    return publicUrlForAsset(targetCandidate);
  }

  return null;
}

function normalizePost(postFile) {
  const original = fs.readFileSync(postFile, 'utf8');
  const lines = original.split(/(\r?\n)/);
  let inFence = false;
  let changed = false;

  for (let i = 0; i < lines.length; i += 2) {
    let line = lines[i];
    if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    line = line.replace(/!\[\[([^\]\n]+)\]\]/g, (match, inner) => {
      const [refPart, altPart] = inner.split('|');
      const ref = refPart.trim();
      const nextUrl = resolveAndMoveAsset(postFile, ref);
      if (!nextUrl) return match;
      changed = true;
      const alt = (altPart || path.basename(ref, path.extname(ref))).trim() || 'image';
      return `![${alt}](${nextUrl})`;
    });

    line = line.replace(/!\[([^\]\n]*)\]\(([^)\n]+)\)/g, (match, alt, ref) => {
      const nextUrl = resolveAndMoveAsset(postFile, ref);
      if (!nextUrl) return match;
      changed = true;
      const nextAlt = alt.trim() || path.basename(safeDecode(ref), path.extname(ref)).trim() || 'image';
      return `![${nextAlt}](${nextUrl})`;
    });

    lines[i] = line;
  }

  const next = lines.join('');
  if (changed && next !== original) {
    fs.writeFileSync(postFile, next);
    console.log(`Normalized assets: ${path.relative(rootDir, postFile)}`);
  }
}

const posts = walk(postDir).filter((file) => path.extname(file).toLowerCase() === '.md');
for (const post of posts) {
  normalizePost(post);
}
