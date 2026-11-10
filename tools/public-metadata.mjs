// Keep donor provenance portable without publishing machine-specific root directories.
export function publicMetadata(value, roots) {
  if (typeof value === 'string') {
    for (const [root, alias] of [...roots].sort((a, b) => b[0].length - a[0].length)) {
      value = value.split(root).join(alias).split(root.toLowerCase()).join(alias);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(item => publicMetadata(item, roots));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, publicMetadata(item, roots)]));
  }
  return value;
}
