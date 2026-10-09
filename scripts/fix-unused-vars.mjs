#!/usr/bin/env node
/**
 * Task 63 codemod — bulk-fix @typescript-eslint/no-unused-vars violations so the
 * root tsconfig can flip `noUnusedLocals` / `noUnusedParameters` to true.
 *
 * Strategy (safe by construction):
 *   - unused import specifier  → remove specifier (value-only imports degrade to
 *     `import "mod";` so side effects are preserved; type-only imports are deleted)
 *   - unused parameter         → rename to `_name` (tsc exempts `_` params)
 *   - unused local, pure init  → delete the statement
 *   - unused local, impure init → keep the initializer as an expression statement
 *     (paren-guarded for `{` / `class` / `function` starts)
 *   - unused pattern element   → remove element + adjacent comma (array → hole)
 *   - anything unsafe          → recorded in .temp/unused-manual.json for hand fix
 *
 * Reads  : .temp/unused-eslint.json  (eslint --format json, rule forced to error)
 * Writes : edited sources + .temp/unused-manual.json + summary
 * Run    : node scripts/fix-unused-vars.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const ROOT = process.cwd();
const REPORT = path.join(ROOT, ".temp", "unused-eslint.json");
const MANUAL = path.join(ROOT, ".temp", "unused-manual.json");

// ---------------------------------------------------------------------------
// tsconfig include/exclude mirror (root tsconfig.json)
// ---------------------------------------------------------------------------
const INCLUDES = [/^client\//, /^server\//, /^shared\//, /^vite\.config\.ts$/, /^vite\.config\.server\.ts$/];
const EXCLUDES = [
  /(^|\/)node_modules\//,
  /(^|\/)dist\//,
  /^server\/archive\//,
  /^client\/vite\.config\.ts$/,
  /^client\/components\/devops\//,
  /\.test\.tsx?$/,
  /\.spec\.ts$/,
  /(^|\/)__tests__\//,
  /(^|\/)test\//,
];
const included = (rel) =>
  INCLUDES.some((r) => r.test(rel)) && !EXCLUDES.some((r) => r.test(rel));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const isTypeOnlyImport = (decl) =>
  decl.importClause !== undefined && decl.importClause.isTypeOnly;

const specIsTypeOnly = (spec) =>
  spec.isTypeOnly || (spec.parent && spec.parent.isTypeOnly);

/** A statement span extended to swallow the trailing newline + leading indent. */
function lineSpan(sf, node) {
  const text = sf.getFullText();
  const lineStart = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
  const start = ts.getPositionOfLineAndCharacter(sf, lineStart, 0);
  const afterText = text.slice(node.getEnd());
  const nl = /^\r?\n/.exec(afterText);
  const end = node.getEnd() + (nl ? nl[0].length : 0);
  // only consume the line if nothing but whitespace precedes the node
  const before = text.slice(start, node.getStart(sf)).trim();
  return before === "" ? { start, end, nl: nl ? nl[0] : "" } : { start: node.getStart(sf), end: node.getEnd(), nl: "" };
}

function statementSpan(sf, stmt) {
  const text = sf.getFullText();
  const after = text.slice(stmt.getEnd());
  const nl = /^\r?\n/.exec(after);
  const lineStart = ts.getPositionOfLineAndCharacter(
    sf,
    sf.getLineAndCharacterOfPosition(stmt.getStart(sf)).line,
    0
  );
  const leading = text.slice(lineStart, stmt.getStart(sf));
  const start = leading.trim() === "" ? lineStart : stmt.getStart(sf);
  const end = stmt.getEnd() + (nl ? nl[0].length : 0);
  return { start, end, nl: nl ? nl[0] : "" };
}

/** Conservatively classify initializer purity (conservative = expression-stmt path). */
function isPure(node) {
  if (!node) return true; // no initializer
  switch (node.kind) {
    case ts.SyntaxKind.Identifier:
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NumericLiteral:
    case ts.SyntaxKind.BigIntLiteral:
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
    case ts.SyntaxKind.NullKeyword:
    case ts.SyntaxKind.RegularExpressionLiteral:
    case ts.SyntaxKind.ThisKeyword:
    case ts.SyntaxKind.ArrowFunction:
    case ts.SyntaxKind.FunctionExpression:
      return true;
    case ts.SyntaxKind.ParenthesizedExpression:
    case ts.SyntaxKind.AsExpression:
    case ts.SyntaxKind.SatisfiesExpression:
    case ts.SyntaxKind.NonNullExpression:
    case ts.SyntaxKind.TypeAssertionExpression:
      return isPure(node.expression);
    case ts.SyntaxKind.PrefixUnaryExpression:
      return node.operator !== ts.SyntaxKind.DeleteKeyword && isPure(node.operand);
    case ts.SyntaxKind.BinaryExpression:
      return (
        node.operatorToken.kind !== ts.SyntaxKind.EqualsToken &&
        !ts.isAssignmentOperator(node.operatorToken.kind) &&
        isPure(node.left) &&
        isPure(node.right)
      );
    case ts.SyntaxKind.TemplateExpression:
      return node.templateSpans.every((s) => isPure(s.expression));
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      return true;
    case ts.SyntaxKind.ArrayLiteralExpression:
      return node.elements.every(
        (e) => e.kind === ts.SyntaxKind.OmittedExpression || isPure(e)
      );
    case ts.SyntaxKind.ObjectLiteralExpression:
      return node.properties.every((p) => {
        if (p.kind === ts.SyntaxKind.PropertyAssignment) return isPure(p.initializer);
        if (p.kind === ts.SyntaxKind.ShorthandPropertyAssignment) return true;
        if (p.kind === ts.SyntaxKind.SpreadAssignment) return isPure(p.expression);
        if (p.kind === ts.SyntaxKind.MethodDeclaration) return true;
        return false; // accessors / computed unknown
      });
    default:
      return false;
  }
}

/** Wrap expression-statement text when it could be parsed as a declaration. */
function asExpressionStatement(exprText) {
  const t = exprText.trim();
  const needsParens =
    t.startsWith("{") || /^class\b/.test(t) || /^function\b/.test(t);
  return needsParens ? `(${t});` : `${t};`;
}

// ---------------------------------------------------------------------------
// AST lookup & classification
// ---------------------------------------------------------------------------
function findIdentifierAt(sf, pos) {
  let found = null;
  const visit = (node) => {
    if (found) return;
    if (node.getStart(sf) <= pos && pos < node.getEnd()) {
      if (ts.isIdentifier(node)) {
        found = node;
        return;
      }
      ts.forEachChild(node, visit);
    }
  };
  ts.forEachChild(sf, visit);
  return found;
}

/**
 * Fallback: locate an identifier by NAME on the reported line. tsc positions can
 * point at keywords or punctuation (e.g. `import * as React` reports col 1, rest
 * elements report the `...`), so the quoted name in the diagnostic is authoritative.
 */
function findIdentifierByNameOnLine(sf, line, col, name) {
  const lineCount = sf.getLineAndCharacterOfPosition(sf.end).line + 1;
  if (line < 1 || line > lineCount) return null;
  const lineStart = ts.getPositionOfLineAndCharacter(sf, line - 1, 0);
  const lineEnd =
    line < lineCount
      ? ts.getPositionOfLineAndCharacter(sf, line, 0)
      : sf.end;
  const text = sf.getFullText().slice(lineStart, lineEnd);
  const re = new RegExp(`(?<![\\w$])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w$])`, "g");
  let m;
  let best = null;
  while ((m = re.exec(text)) !== null) {
    const abs = lineStart + m.index;
    if (abs < col - 1 && best === null) {
      // prefer matches at/after the reported column, but accept earlier ones
      // as a last resort below
    }
    const id = findIdentifierAt(sf, abs);
    if (id && id.text === name) {
      if (abs >= col - 1) return id;
      best = id;
    }
  }
  return best;
}

/**
 * Names referenced from `typeof X` type queries. ESLint (non-type-aware) can
 * miss these as usages, but tsc counts them — so removal would break the file.
 */
function collectTypeQueryNames(sf) {
  const names = new Set();
  const visit = (n) => {
    if (n.kind === ts.SyntaxKind.TypeQuery && n.exprName && ts.isIdentifier(n.exprName)) {
      names.add(n.exprName.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return names;
}

function owningFunction(node) {
  let p = node.parent;
  while (p) {
    if (ts.isFunctionLike(p)) return p;
    p = p.parent;
  }
  return null;
}

/** Rename an identifier (used for parameters — tsc exempts `_`-prefixed params). */
function renameEdit(id, sf, siblings) {
  const base = `_${id.text}`;
  let name = base;
  let i = 2;
  const taken = (n) =>
    (siblings || []).some((s) => s.name && s.name.getText(sf) === n);
  while (taken(name)) name = `${base}${i++}`;
  const p = id.parent;
  if (ts.isBindingElement(p) && !p.propertyName && p.name === id) {
    // shorthand `{ a }` → `{ a: _a }`
    return { start: id.getStart(sf), end: id.getEnd(), replacement: `${id.text}: ${name}` };
  }
  return { start: id.getStart(sf), end: id.getEnd(), replacement: name };
}

/** Remove one element from a binding pattern, preserving array slot positions. */
function removeElementEdit(el, sf) {
  const pattern = el.parent; // ObjectBindingPattern | ArrayBindingPattern
  const isObject = ts.isObjectBindingPattern(pattern);
  const idx = pattern.elements.indexOf(el);
  const text = sf.getFullText();
  const elStart = el.getStart(sf);
  const elEnd = el.getEnd();
  const next = pattern.elements[idx + 1];
  if (next) {
    const between = text.slice(elEnd, next.getStart(sf));
    const comma = between.indexOf(",");
    if (comma >= 0) {
      if (isObject) {
        // object: drop element + trailing comma (order-independent)
        return { start: elStart, end: elEnd + comma + 1 };
      }
      // array: keep the comma as an elision so later slots stay aligned
      return { start: elStart, end: elEnd };
    }
  }
  const prev = pattern.elements[idx - 1];
  if (prev) {
    const between = text.slice(prev.getEnd(), elStart);
    const comma = between.lastIndexOf(",");
    if (comma >= 0) {
      const prevEnd = prev.getEnd();
      return { start: prevEnd + comma, end: elEnd };
    }
  }
  // sole element: drop it entirely (pattern becomes empty — still valid)
  return { start: elStart, end: elEnd };
}

/** Remove one declarator from a multi-declarator statement/for-head. */
function removeDeclaratorEdit(decl, sf) {
  const list = decl.parent;
  const text = sf.getFullText();
  const dStart = decl.getStart(sf);
  const dEnd = decl.getEnd();
  const idx = list.declarations.indexOf(decl);
  const next = list.declarations[idx + 1];
  if (next) {
    const between = text.slice(dEnd, next.getStart(sf));
    const comma = between.indexOf(",");
    if (comma >= 0) return { start: dStart, end: dEnd + comma + 1 };
  }
  const prev = list.declarations[idx - 1];
  if (prev) {
    const between = text.slice(prev.getEnd(), dStart);
    const comma = between.lastIndexOf(",");
    if (comma >= 0) return { start: prev.getEnd() + comma, end: dEnd };
  }
  return null; // sole declarator — caller decides statement-level handling
}

// ---------------------------------------------------------------------------
// Classification entry point
// ---------------------------------------------------------------------------
function collectBindingNames(pattern) {
  const out = [];
  const walk = (n) => {
    if (!n) return;
    if (ts.isIdentifier(n)) {
      out.push({ name: n });
      return;
    }
    if (ts.isObjectBindingPattern(n) || ts.isArrayBindingPattern(n)) {
      n.elements.forEach((el) => walk(el.name));
    }
  };
  walk(pattern);
  return out;
}

function classifyViolation(id, sf) {
  const p = id.parent;

  // --- imports -------------------------------------------------------------
  if (
    (ts.isImportSpecifier(p) && p.name === id) ||
    (ts.isNamespaceImport(p) && p.name === id) ||
    (ts.isImportClause(p) && p.name === id)
  ) {
    let node = p;
    while (node && !ts.isImportDeclaration(node)) node = node.parent;
    if (node) return { kind: "import", decl: node, binding: p };
  }

  // --- parameters ----------------------------------------------------------
  if (ts.isParameter(p) && p.name === id) {
    if (p.modifiers && p.modifiers.length > 0) {
      return { kind: "manual", why: "parameter property" };
    }
    const fn = owningFunction(p);
    return { kind: "rename", siblings: fn ? [...fn.parameters] : [] };
  }

  // --- binding elements (destructuring) ------------------------------------
  if (ts.isBindingElement(p) && p.name === id) {
    let owner = p;
    while (
      owner &&
      !ts.isVariableDeclaration(owner) &&
      !ts.isParameter(owner) &&
      !ts.isForStatement(owner) &&
      !ts.isForInStatement(owner) &&
      !ts.isForOfStatement(owner)
    ) {
      owner = owner.parent;
    }
    if (owner && ts.isParameter(owner)) {
      // tsc does NOT reliably exempt `_`-prefixed bindings inside destructured
      // parameters (and rest elements cannot be renamed at all) — remove the
      // element instead; empty patterns `({})` / `([])` remain valid and the
      // function's arity is unchanged.
      if (p.initializer && !isPure(p.initializer)) {
        return { kind: "manual", why: "impure default value in param pattern" };
      }
      return { kind: "remove-element", el: p };
    }
    if (owner && ts.isVariableDeclaration(owner)) {
      if (p.initializer && !isPure(p.initializer)) {
        return { kind: "manual", why: "impure default value in pattern" };
      }
      if (
        p.propertyName &&
        p.propertyName.kind === ts.SyntaxKind.ComputedPropertyName
      ) {
        return { kind: "manual", why: "computed property key in pattern" };
      }
      return { kind: "remove-element", el: p };
    }
    return { kind: "manual", why: "binding element in unsupported context" };
  }

  // --- variable declarations ----------------------------------------------
  if (ts.isVariableDeclaration(p) && p.name === id) {
    const list = p.parent;
    const stmt = list.parent;
    if (ts.isForInStatement(stmt) || ts.isForOfStatement(stmt)) {
      return { kind: "manual", why: "for-in/of head binding" };
    }
    if (list.declarations.length > 1) {
      if (p.initializer && !isPure(p.initializer)) {
        return { kind: "manual", why: "impure init in multi-declarator" };
      }
      const e = removeDeclaratorEdit(p, sf);
      if (e) return { kind: "replace", span: e, replacement: "" };
      return { kind: "manual", why: "declarator removal failed" };
    }
    if (ts.isForStatement(stmt)) {
      const span = { start: p.getStart(sf), end: p.getEnd() };
      if (p.initializer && !isPure(p.initializer)) {
        return { kind: "replace", span, replacement: p.initializer.getText(sf) };
      }
      return { kind: "replace", span, replacement: "" };
    }
    if (ts.isVariableStatement(stmt)) {
      if (!p.initializer || isPure(p.initializer)) {
        return { kind: "remove-statement", stmt };
      }
      const span = statementSpan(sf, stmt);
      return {
        kind: "replace",
        span,
        replacement: asExpressionStatement(p.initializer.getText(sf)) + span.nl,
      };
    }
    return { kind: "manual", why: "variable in unsupported statement" };
  }

  // --- declarations --------------------------------------------------------
  if (ts.isFunctionDeclaration(p) && p.name === id) {
    if (p.decorators && p.decorators.length) {
      return { kind: "manual", why: "decorated function" };
    }
    return { kind: "remove-statement", stmt: p };
  }
  if (ts.isClassDeclaration(p) && p.name === id) {
    if (p.decorators && p.decorators.length) {
      return { kind: "manual", why: "decorated class" };
    }
    for (const hc of p.heritageClauses || []) {
      for (const t of hc.types) {
        const k = t.expression.kind;
        if (
          k !== ts.SyntaxKind.Identifier &&
          k !== ts.SyntaxKind.PropertyAccessExpression
        ) {
          return { kind: "manual", why: "class heritage with possible side effects" };
        }
      }
    }
    return { kind: "remove-statement", stmt: p };
  }
  if (
    (ts.isTypeAliasDeclaration(p) || ts.isInterfaceDeclaration(p)) &&
    p.name === id
  ) {
    return { kind: "remove-statement", stmt: p };
  }
  if (ts.isEnumDeclaration(p)) return { kind: "manual", why: "enum emits runtime IIFE" };
  if (ts.isModuleDeclaration(p)) return { kind: "manual", why: "namespace/module declaration" };

  return { kind: "manual", why: `unclassified parent kind: ${ts.SyntaxKind[p.kind]}` };
}

/** Rebuild an import declaration without the removed bindings. */
function rebuildImport(decl, removed, sf) {
  const clause = decl.importClause;
  if (!clause) return null;
  const moduleText = decl.moduleSpecifier.getText(sf);
  const attrs = decl.attributes ? ` ${decl.attributes.getText(sf)}` : "";
  const typePrefix = clause.isTypeOnly ? "type " : "";

  const keepDefault = clause.name ? !removed.has(clause) : false;
  const defaultRemoved = clause.name ? removed.has(clause) : false;

  let namedSurvivors = [];
  let namespaceSurvivor = null;
  const nb = clause.namedBindings;
  if (nb) {
    if (ts.isNamespaceImport(nb)) {
      if (!removed.has(nb)) namespaceSurvivor = nb;
    } else {
      namedSurvivors = nb.elements.filter((e) => !removed.has(e));
    }
  }

  const removedRuntime =
    (defaultRemoved && !clause.isTypeOnly) ||
    [...removed].some(
      (b) => ts.isImportSpecifier(b) && !b.isTypeOnly && !clause.isTypeOnly
    );

  const parts = [];
  if (keepDefault) parts.push(clause.name.getText(sf));
  if (namespaceSurvivor) parts.push(namespaceSurvivor.getText(sf));
  if (namedSurvivors.length) {
    parts.push(`{ ${namedSurvivors.map((s) => s.getText(sf)).join(", ")} }`);
  }
  if (parts.length) {
    return `import ${typePrefix}${parts.join(", ")} from ${moduleText}${attrs};`;
  }
  if (removedRuntime) return `import ${moduleText}${attrs};`; // keep side effects
  return ""; // type-only removal — delete the statement
}

// ---------------------------------------------------------------------------
// Per-file processing
// ---------------------------------------------------------------------------
function processFile(filePath, violations) {
  const text = fs.readFileSync(filePath, "utf8");
  const sf = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const edits = [];
  const manual = [];
  const importGroups = new Map();
  const seen = new Set();
  const typeQueryNames = collectTypeQueryNames(sf);

  for (const v of violations) {
    const key = `${v.line}:${v.column}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let pos;
    try {
      pos = sf.getPositionOfLineAndCharacter(v.line - 1, v.column - 1);
    } catch {
      manual.push({ ...v, why: "position out of range" });
      continue;
    }
    const quoted = /'([^']+)'/.exec(v.message || "")?.[1];
    let id = findIdentifierAt(sf, pos);
    if (quoted && id && id.text !== quoted) id = null;
    if (!id && quoted) id = findIdentifierByNameOnLine(sf, v.line, v.column, quoted);
    if (!id) {
      manual.push({ ...v, why: "identifier not found at position" });
      continue;
    }
    // ESLint false positive: name IS used via `typeof X` (tsc counts it).
    if (typeQueryNames.has(id.text)) continue;

    const c = classifyViolation(id, sf);
    switch (c.kind) {
      case "import": {
        if (!importGroups.has(c.decl)) importGroups.set(c.decl, new Set());
        importGroups.get(c.decl).add(c.binding);
        break;
      }
      case "rename":
        edits.push(renameEdit(id, sf, c.siblings));
        break;
      case "remove-element":
        edits.push(removeElementEdit(c.el, sf));
        break;
      case "remove-statement":
        edits.push({ ...statementSpan(sf, c.stmt), replacement: "" });
        break;
      case "replace":
        edits.push({ ...c.span, replacement: c.replacement });
        break;
      default:
        manual.push({ ...v, why: c.why });
    }
  }

  for (const [decl, bindings] of importGroups) {
    const replacement = rebuildImport(decl, bindings, sf);
    if (replacement === null) {
      manual.push({ line: 0, column: 0, message: "import without clause", why: "unhandled import" });
      continue;
    }
    const span = statementSpan(sf, decl);
    // Restore the consumed newline for non-empty replacements so the next
    // statement does not collapse onto the same line.
    edits.push({ ...span, replacement: replacement === "" ? "" : replacement + span.nl });
  }

  // Dedupe identical spans, then drop edits nested inside a larger edit
  // (the outer removal wins; a nested edit inside a *replacement* is lost —
  // record it so it gets manual verification).
  const uniqueSpans = new Map();
  const deduped = [];
  for (const e of edits) {
    const k = `${e.start}:${e.end}`;
    if (uniqueSpans.has(k)) continue;
    uniqueSpans.set(k, true);
    deduped.push(e);
  }
  const kept = [];
  for (const e of deduped) {
    const container = deduped.find(
      (o) =>
        o !== e &&
        o.start <= e.start &&
        e.end <= o.end &&
        o.end - o.start > e.end - e.start
    );
    if (container) {
      if ((container.replacement ?? "") !== "") {
        manual.push({
          line: 0,
          column: 0,
          message: `edit nested inside replaced statement (offset ${e.start}) — verify manually`,
          why: "nested-in-replacement",
        });
      }
      continue;
    }
    kept.push(e);
  }

  // Apply edits back-to-front with a partial-overlap guard.
  kept.sort((a, b) => b.start - a.start);
  let out = text;
  let boundary = Infinity;
  for (const e of kept) {
    if (e.end > boundary) {
      manual.push({
        line: 0,
        column: 0,
        message: `partial overlap at offset ${e.start} skipped`,
        why: "overlap",
      });
      continue;
    }
    boundary = e.start;
    out = out.slice(0, e.start) + (e.replacement ?? "") + out.slice(e.end);
  }
  if (out !== text) fs.writeFileSync(filePath, out, "utf8");
  return { manual };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function loadTscReport() {
  // Parse `tsc --pretty false` output: `path(line,col): error TSxxxx: message`
  const file = path.join(ROOT, ".temp", "tc-strict.txt");
  const lines = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/);
  const byFile = new Map();
  const re = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
  let unmatched = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = re.exec(line);
    if (!m) {
      unmatched++;
      continue;
    }
    const abs = path.resolve(ROOT, m[1]);
    if (!byFile.has(abs)) byFile.set(abs, []);
    byFile.get(abs).push({
      line: Number(m[2]),
      column: Number(m[3]),
      message: `[${m[4]}] ${m[5]}`,
    });
  }
  if (unmatched > 0) console.log(`[codemod] tsc lines not parsed: ${unmatched}`);
  return byFile;
}

function loadEslintReport() {
  const raw = JSON.parse(fs.readFileSync(REPORT, "utf8"));
  const byFile = new Map();
  let total = 0;
  for (const fr of raw) {
    const rel = path.relative(ROOT, fr.filePath).replace(/\\/g, "/");
    if (!included(rel)) continue;
    const msgs = (fr.messages || []).filter(
      (m) => m.ruleId === "@typescript-eslint/no-unused-vars"
    );
    if (!msgs.length) continue;
    byFile.set(path.join(ROOT, rel), msgs);
    total += msgs.length;
  }
  console.log(`[codemod] target files: ${byFile.size}, violations: ${total}`);
  return byFile;
}

function main() {
  const tscMode = process.argv.includes("--tsc");
  const byFile = tscMode ? loadTscReport() : loadEslintReport();
  if (tscMode) {
    let total = 0;
    for (const msgs of byFile.values()) total += msgs.length;
    console.log(`[codemod] tsc mode — target files: ${byFile.size}, errors: ${total}`);
  }

  const allManual = [];
  let touched = 0;
  for (const [file, msgs] of byFile) {
    try {
      const rel = path.relative(ROOT, file);
      const r = processFile(
        file,
        msgs.map((m) => ({ line: m.line, column: m.column, message: m.message }))
      );
      if (r.manual.length === 0) touched++;
      for (const m of r.manual) allManual.push({ file: rel, ...m });
    } catch (err) {
      for (const m of msgs) {
        allManual.push({
          file: path.relative(ROOT, file),
          line: m.line,
          column: m.column,
          message: m.message,
          why: `codemod error: ${err.message}`,
        });
      }
    }
  }

  fs.writeFileSync(MANUAL, JSON.stringify(allManual, null, 2));
  console.log(
    `[codemod] files fully auto-fixed: ${touched}/${byFile.size}; manual entries: ${allManual.length}`
  );
  if (allManual.length) {
    const reasons = {};
    for (const m of allManual) reasons[m.why] = (reasons[m.why] || 0) + 1;
    console.log("[codemod] manual reasons:", reasons);
  }
}

main();


