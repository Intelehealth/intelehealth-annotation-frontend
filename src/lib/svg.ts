/**
 * Empty-state *detector only* — it never creates, modifies, reconstructs or
 * substitutes SVG content. It inspects the actual uploaded SVG text and returns
 * a boolean so the UI can decide whether to show the real empty state.
 *
 * A "renderable" SVG is one that contains at least one drawable element
 * outside of definition/descriptive containers (defs/metadata/style/script/
 * title/desc) and XML comments/prolog/doctype.
 *
 * This is intentionally conservative and deterministic (no DOM required), so
 * it can run in unit tests and never depends on how the browser parses SVG.
 */
const NON_RENDERABLE_CONTAINERS = [
  'defs',
  'metadata',
  'style',
  'script',
  'title',
  'desc',
];

export function hasRenderableContent(svgText: string | undefined | null): boolean {
  if (typeof svgText !== 'string' || svgText.trim().length === 0) return false;

  let src = svgText;

  // XML comments, processing instructions and doctype deliver no renderable content.
  src = src.replace(/<!--[\s\S]*?-->/g, '');
  src = src.replace(/<\?[\s\S]*?\?>/g, '');
  src = src.replace(/<!DOCTYPE[\s\S]*?>/gi, '');

  // Drop non-renderable container subtrees (block + self-closing forms).
  for (const tag of NON_RENDERABLE_CONTAINERS) {
    src = src.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), '');
    src = src.replace(new RegExp(`<${tag}\\b[^>]*\\/>`, 'gi'), '');
    src = src.replace(new RegExp(`<${tag}\\b[^>]*>`, 'gi'), '');
  }

  // The root <svg> wrapper itself is not content.
  src = src.replace(/<\/?svg\b[^>]*>/gi, '');

  // Any remaining element tag means there is real drawable content.
  return /<[a-zA-Z][a-zA-Z0-9]*(\s|\/?>)/.test(src);
}