// Node ESM resolve hook: maps the project's "@/..." path alias (defined in
// tsconfig "paths") to the src/ directory and appends a .ts extension when the
// specifier has none. Lets the harness run the TypeScript engine directly under
// Node's native type stripping, without a bundler or installed deps.
import path from "node:path";
import { pathToFileURL } from "node:url";

const srcBase = pathToFileURL(path.resolve(process.cwd(), "src") + path.sep).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    let rewritten = srcBase + specifier.slice(2);
    if (!/\.[a-zA-Z0-9]+$/.test(rewritten)) rewritten += ".ts";
    return nextResolve(rewritten, context);
  }
  return nextResolve(specifier, context);
}
