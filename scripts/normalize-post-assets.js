#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const sourceRoot = path.join(rootDir, 'blog-source', 'source');
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

function slugifyAscii(value, fallback = 'post') {
  const base = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return base || fallback;
}

function postSlug(postFile) {
  const rel = path.relative(postDir, postFile);
  return slugifyAscii(path.basename(postFile, path.extname(postFile)), `post-${shortHash(rel)}`);
}

function postTitle(postFile) {
  const content = fs.readFileSync(postFile, 'utf8');
  const match = content.match(/^title:\s*(.+)$/m);
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : path.basename(postFile, path.extname(postFile));
}

function postDateParts(postFile) {
  const content = fs.readFileSync(postFile, 'utf8');
  const match = content.match(/^date:\s*(\d{4})-(\d{2})-(\d{2})/m);
  return match ? [match[1], match[2], match[3]] : null;
}

function publicUrlForPost(postFile) {
  const dateParts = postDateParts(postFile);
  if (!dateParts) return null;
  return `/${dateParts.join('/')}/${encodeURI(path.basename(postFile, path.extname(postFile)))}/`;
}

function figAssetName(postFile, fallbackName, index) {
  const ext = path.extname(fallbackName).toLowerCase();
  return `${postSlug(postFile)}-fig-${String(index).padStart(2, '0')}${ext}`;
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

function isExternalRef(ref) {
  return /^(https?:)?\/\//i.test(ref) || ref.startsWith('#') || ref.startsWith('mailto:');
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
  const rel = path.relative(sourceRoot, assetFile).split(path.sep).join('/');
  return encodeURI(`/${rel}`);
}

function resolveAndMoveAsset(postFile, ref, imageIndex) {
  let rawRef = ref.trim();
  if (rawRef.startsWith('<') && rawRef.endsWith('>')) {
    rawRef = rawRef.slice(1, -1).trim();
  }

  const cleanRef = safeDecode(rawRef.split(/[?#]/)[0]);
  if (!cleanRef || isExternalRef(cleanRef) || !hasImageExt(cleanRef)) {
    return null;
  }

  const postAssetDir = assetDirForPost(postFile);
  const sourceCandidate = cleanRef.startsWith('/')
    ? path.resolve(sourceRoot, cleanRef.slice(1))
    : path.resolve(path.dirname(postFile), cleanRef);
  const filename = figAssetName(postFile, path.basename(cleanRef), imageIndex);
  const targetCandidate = path.join(postAssetDir, filename);

  const sourceIsAllowed = sourceCandidate.startsWith(postDir + path.sep)
    || sourceCandidate.startsWith(assetRoot + path.sep)
    || sourceCandidate === targetCandidate;
  if (!sourceIsAllowed) {
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

function normalizeMarkdownLink(postFile, ref) {
  let rawRef = ref.trim();
  if (rawRef.startsWith('<') && rawRef.endsWith('>')) {
    rawRef = rawRef.slice(1, -1).trim();
  }

  const hashIndex = rawRef.indexOf('#');
  const hash = hashIndex >= 0 ? rawRef.slice(hashIndex) : '';
  const pathPart = safeDecode((hashIndex >= 0 ? rawRef.slice(0, hashIndex) : rawRef).split(/[?#]/)[0]);

  if (!pathPart || isRemoteOrAbsolute(pathPart) || path.extname(pathPart).toLowerCase() !== '.md') {
    return null;
  }

  const target = path.resolve(path.dirname(postFile), pathPart);
  if (!target.startsWith(postDir + path.sep) || !fs.existsSync(target)) {
    return null;
  }

  const url = publicUrlForPost(target);
  if (!url) return null;
  return {
    url: `${url}${hash}`,
    title: postTitle(target),
  };
}

function findPostByWikiRef(postFile, ref) {
  const normalizedRef = safeDecode(ref.trim());
  if (!normalizedRef || normalizedRef.includes('/') || normalizedRef.includes('\\')) {
    return null;
  }

  const basename = normalizedRef.endsWith('.md') ? normalizedRef.slice(0, -3) : normalizedRef;
  const candidates = walk(postDir).filter((file) => path.extname(file).toLowerCase() === '.md'
    && path.basename(file, '.md') === basename);
  if (candidates.length === 1) return candidates[0];

  const sibling = path.join(path.dirname(postFile), `${basename}.md`);
  return fs.existsSync(sibling) ? sibling : null;
}

function isWeakAlt(alt, ref) {
  const value = alt.trim();
  if (!value) return true;

  const normalized = value.toLowerCase();
  if (['image', 'img', 'alt', 'alt text', 'screenshot', 'paste image', 'pasted image'].includes(normalized)) {
    return true;
  }

  const refBase = path.basename(safeDecode(ref).split(/[?#]/)[0], path.extname(ref)).trim().toLowerCase();
  return normalized === refBase || /^pasted image\s*\d*$/i.test(value) || /^image\s*\d*$/i.test(value);
}

function figureAlt(title, imageIndex) {
  return `图 ${imageIndex}：${title}`;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function figureHtml(alt, url) {
  const escapedAlt = escapeHtml(alt);
  const escapedUrl = escapeHtml(url);
  return `<figure class="post-figure">\n  <img src="${escapedUrl}" alt="${escapedAlt}">\n  <figcaption>${escapedAlt}</figcaption>\n</figure>`;
}

function normalizePost(postFile) {
  const original = fs.readFileSync(postFile, 'utf8');
  const lines = original.split(/(\r?\n)/);
  let inFence = false;
  let changed = false;
  let imageIndex = 0;
  const title = postTitle(postFile);

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
      imageIndex += 1;
      const nextUrl = resolveAndMoveAsset(postFile, ref, imageIndex);
      if (!nextUrl) return match;
      changed = true;
      const providedAlt = (altPart || '').trim();
      const alt = isWeakAlt(providedAlt, ref) ? figureAlt(title, imageIndex) : providedAlt;
      return figureHtml(alt, nextUrl);
    });

    line = line.replace(/!\[([^\]\n]*)\]\(([^)\n]+)\)/g, (match, alt, ref) => {
      imageIndex += 1;
      const nextUrl = resolveAndMoveAsset(postFile, ref, imageIndex);
      if (!nextUrl) return match;
      changed = true;
      const nextAlt = isWeakAlt(alt, ref) ? figureAlt(title, imageIndex) : alt.trim();
      return figureHtml(nextAlt, nextUrl);
    });

    line = line.replace(/(?<!!)\[([^\]\n]+)\]\(([^)\n]+\.md(?:#[^)\n]+)?)\)/g, (match, text, ref) => {
      const link = normalizeMarkdownLink(postFile, ref);
      if (!link) return match;
      changed = true;
      return `[${link.title}](${link.url})`;
    });

    line = line.replace(/(?<!!)\[\[([^\]\n]+)\]\]/g, (match, inner) => {
      const [refPart, textPart] = inner.split('|');
      const target = findPostByWikiRef(postFile, refPart.trim());
      if (!target) return match;
      const nextUrl = publicUrlForPost(target);
      if (!nextUrl) return match;
      changed = true;
      return `[${postTitle(target)}](${nextUrl})`;
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
