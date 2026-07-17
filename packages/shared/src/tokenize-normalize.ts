/**
 * Symbol-bearing term normalization.
 *
 * The bug this fixes: Meilisearch's (and most search engines') default
 * tokenizer treats '#', '+', '.' as word boundaries/punctuation. That means
 * "C#" and "C++" both tokenize down to the bare word "c", and a search for
 * "C# developer" will match C++ postings. Same failure mode for ".NET",
 * "Node.js" vs "Node", "C++"/"C" etc.
 *
 * Fix: rewrite known symbol-bearing tech terms into unambiguous single
 * tokens BEFORE they reach the tokenizer — for both indexed documents and
 * incoming search queries. Symmetry is the important part: if you only
 * normalize one side, they stop matching each other entirely.
 *
 * This list is intentionally small and explicit rather than a generic
 * symbol-stripper — a generic approach reintroduces ambiguity elsewhere.
 * Extend it as real query logs surface more collisions.
 */

const TERM_MAP: Record<string, string> = {
  'c#': 'csharp',
  'c++': 'cpp',
  '.net': 'dotnet',
  'asp.net': 'aspdotnet',
  'node.js': 'nodejs',
  'vue.js': 'vuejs',
  'next.js': 'nextjs',
  'f#': 'fsharp',
  'objective-c': 'objectivec',
  'c/c++': 'c cpp',
};

// Sort by length descending so multi-word terms (e.g. "asp.net") are matched
// before their substrings (e.g. ".net") get a chance to.
const SORTED_KEYS = Object.keys(TERM_MAP).sort((a, b) => b.length - a.length);

export function normalizeSymbolTerms(text: string): string {
  if (!text) return text;
  let result = text;
  for (const key of SORTED_KEYS) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match as a loose word boundary — allows "C#" at start/end of string
    // or surrounded by whitespace/punctuation, case-insensitive.
    const pattern = new RegExp(`(^|\\s)${escaped}(?=$|\\s|[.,;:!?)])`, 'gi');
    result = result.replace(pattern, (match, prefix) => `${prefix}${TERM_MAP[key]}`);
  }
  return result;
}

/**
 * Applied to job title/description/skills at INDEX time.
 */
export function normalizeDocumentText(text: string | null | undefined): string {
  if (!text) return '';
  return normalizeSymbolTerms(text);
}

/**
 * Applied to the user's raw query string at SEARCH time, before it's sent
 * to Meilisearch. Must use the exact same map as indexing or matches break.
 */
export function normalizeQueryText(query: string): string {
  return normalizeSymbolTerms(query);
}

// ---------------------------------------------------------------------------
// normalizeQueryText("C# developer")  -> "csharp developer"
// normalizeQueryText("C++ developer") -> "cpp developer"
// Indexed docs go through the same function, so "csharp" only ever matches
// "csharp" — the two tech stacks can no longer collide.
// ---------------------------------------------------------------------------
