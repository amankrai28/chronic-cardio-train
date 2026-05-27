import { register } from "node:module";

// Install the "@/..." → src/ resolve hook before the harness module graph loads.
register("./alias-hooks.mjs", import.meta.url);
