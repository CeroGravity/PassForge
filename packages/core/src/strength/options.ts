import { zxcvbnOptions } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";

/**
 * Deterministic one-time init of zxcvbn-ts options.
 * Loads language-common (adjacency graphs, common words) and language-en
 * (English dictionaries + translations) so scoring is not crippled by
 * missing dictionaries. Called once at module load — idempotent by design
 * since zxcvbnOptions.setOptions overwrites the previous state.
 */

let initialized = false;

export function ensureOptionsLoaded(): void {
  if (initialized) return;

  zxcvbnOptions.setOptions({
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    translations: zxcvbnEnPackage.translations,
    dictionary: {
      ...zxcvbnCommonPackage.dictionary,
      ...zxcvbnEnPackage.dictionary,
    },
  });

  initialized = true;
}
