/**
 * Asset Resolution System
 * 
 * Priority: theme/ → default/ → procedural placeholder
 * 
 * Usage in Kaboom:
 *   const path = resolveAsset('tiles/ground.png');
 *   k.loadSprite('ground', path);
 */

const THEME_BASE = '/assets/theme/';
const DEFAULT_BASE = '/assets/default/';

// Cache resolved paths to avoid repeated checks
const resolvedCache = new Map<string, string>();

/**
 * Resolve an asset path with theme override support.
 * For now, returns the default path since we use procedural sprites.
 * When real assets are added, this will check theme/ first.
 */
export function resolveAsset(relativePath: string): string {
  if (resolvedCache.has(relativePath)) {
    return resolvedCache.get(relativePath)!;
  }
  
  // For MVP, we return the default path
  // The game engine will handle missing assets with procedural fallbacks
  const resolved = DEFAULT_BASE + relativePath;
  resolvedCache.set(relativePath, resolved);
  return resolved;
}

/**
 * Check if an asset exists at the given URL.
 * Used during load phase to determine fallback strategy.
 */
export async function assetExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get both possible paths for an asset (theme and default).
 */
export function getAssetPaths(relativePath: string): { theme: string; default: string } {
  return {
    theme: THEME_BASE + relativePath,
    default: DEFAULT_BASE + relativePath,
  };
}
