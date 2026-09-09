import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { createRequire } from "node:module";
import { Script } from "node:vm";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);
const compiled = new Map();

// Execute the real TS modules with isolated session/database dependencies, never a live database.
export function moduleLoader(mocks = {}, globals = {}) {
  const modules = new Map();
  function load(filename) {
    const path = resolve(filename);
    if (modules.has(path)) return modules.get(path).exports;
    const compiledModule = { exports: {} };
    modules.set(path, compiledModule);
    let code = compiled.get(path);
    if (!code) {
      code = ts.transpileModule(readFileSync(path, "utf8"), {
        fileName: path,
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      }).outputText;
      compiled.set(path, code);
    }
    function localRequire(specifier) {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier === "server-only") return {};
      if (specifier.startsWith("@/components/") || specifier.startsWith("@/providers/")) return {};
      if (specifier.startsWith("@/") || specifier.startsWith(".")) {
        const base = specifier.startsWith("@/")
          ? resolve("src", specifier.slice(2))
          : resolve(dirname(path), specifier);
        const target = [base, base + ".ts", base + ".tsx", base + ".js", join(base, "index.ts")]
          .find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
        if (!target) throw new Error("Cannot resolve " + specifier);
        return load(target);
      }
      return nativeRequire(specifier);
    }
    const names = ["exports", "require", "module", "__filename", "__dirname", ...Object.keys(globals)];
    const evaluate = new Script("(function(" + names.join(",") + ") {" + code + "\n})", { filename: path }).runInThisContext();
    evaluate(compiledModule.exports, localRequire, compiledModule, path, dirname(path), ...Object.values(globals));
    return compiledModule.exports;
  }
  return load;
}

export function sourceFiles(root, basename) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? sourceFiles(path, basename) : entry.name === basename ? [path] : [];
  });
}

export function authHarness({ signedIn = true, role = "admin", active = true, missing = false, models = {} } = {}) {
  const state = { signedIn, role, active, missing, identityReads: 0, sideEffects: 0 };
  const forbiddenModel = new Proxy({}, {
    get: () => async () => { state.sideEffects += 1; throw new Error("UNEXPECTED_DATABASE_ACCESS"); },
  });
  const user = {
    ...forbiddenModel,
    async findUnique(query) {
      const expected = { id: true, role: true, isActive: true };
      if (query.where.id !== "actor" || JSON.stringify(query.select) !== JSON.stringify(expected)) {
        state.sideEffects += 1;
        throw new Error("UNEXPECTED_USER_DATA_ACCESS");
      }
      state.identityReads += 1;
      return state.missing ? null : { id: "actor", role: state.role, isActive: state.active };
    },
  };
  const prisma = new Proxy({ user, ...models }, {
    get: (target, key) => key in target ? target[key] : forbiddenModel,
  });
  const mocks = {
    "next-auth": { getServerSession: async () => state.signedIn ? { user: { id: "actor", role: "admin" } } : null },
    "@/lib/auth": { authOptions: {} },
    "@/lib/prisma": { prisma },
    "next/cache": {
      revalidatePath: () => { state.sideEffects += 1; },
      revalidateTag: () => { state.sideEffects += 1; },
      unstable_cache: () => { throw new Error("ADMIN_DATA_MUST_NOT_BE_SHARED_CACHED"); },
    },
    "next/navigation": { redirect: (path) => { throw new Error("REDIRECT:" + path); } },
    "@/lib/server/admin-api-fetch": {
      adminApiFetch: async () => { state.sideEffects += 1; throw new Error("UNEXPECTED_INTERNAL_FETCH"); },
    },
  };
  return { state, prisma, mocks, load: moduleLoader(mocks) };
}
