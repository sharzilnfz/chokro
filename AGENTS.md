# AGENTS.md

<!-- codebase-memory-mcp:start -->
# Mandatory Codebase Knowledge Graph (codebase-memory-mcp)

This project uses `codebase-memory-mcp` as the primary and mandatory MCP tool for code discovery and architectural analysis.
**Project Name in Knowledge Graph:** `Users-sharzilnafis-Desktop-Project-chokro`

## 1. Zero-Grep Code Discovery Rule
You MUST NEVER use `grep_search`, `list_dir`, or `view_file` as your primary mechanism for finding code definitions, implementations, route handlers, or dependency paths.
You MUST ALWAYS use `codebase-memory-mcp` via `call_mcp_tool`.

## 2. Tool Selection Hierarchy
1. `list_projects` / `index_repository`: Verify the index is fresh before exploring.
2. `get_architecture`: Inspect high-level architecture, packages, and domain modules.
3. `search_graph`: Find functions, handlers, classes, routes, models by name pattern, query, or semantic keywords.
4. `trace_path`: Trace call graphs (inbound/outbound calls, callers, callees, data flows).
5. `get_code_snippet`: Retrieve full source of indexed functions/classes via qualified name.
6. `query_graph`: Execute Cypher queries for deep architectural dependencies and blast radius.
7. `detect_changes`: Evaluate impact before and after editing files.

## 3. Fallback to Grep/Glob
- Searching for raw string literals, environment variable names, error messages, or config files (`.json`, `.yaml`, `.env`).
- Inspecting unindexed non-code assets, docs, or scripts.
<!-- codebase-memory-mcp:end -->

<!-- subagents-protocol:start -->
# Mandatory Subagent Delegation Protocol

For ANY coding, debugging, refactoring, research, or multi-step work:

## 1. Subagent-First Execution
The main agent acts as the **Lead Architect & Orchestrator**. 
Do NOT perform heavy multi-step research, broad file exploration, large code reviews, or parallel investigations monolithically in the primary context.
You MUST delegate these tasks to subagents using `invoke_subagent`.

## 2. When to Delegate
- **Codebase Exploration & Research**: Launch a `research` or `self` subagent (`role: "Codebase Researcher"`) to investigate graph findings, files, or external docs.
- **Parallel Tasks & Multi-File Inspection**: When 2+ files, modules, or hypotheses need inspection, launch parallel subagents in a single `invoke_subagent` call.
- **Implementation Planning**: Launch a `self` subagent (`role: "Planner"`) for architectural breakdown.
- **Test-Driven Verification**: Launch a `self` subagent (`role: "TDD Guide"`) to write and run tests.
- **Code Review**: Before finishing any task or making commits, launch a `self` subagent (`role: "Code Reviewer"`) to audit the diff for standards and bugs.
<!-- subagents-protocol:end -->

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical 5-role triage label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` + `docs/adr/` at root). See `docs/agents/domain.md`.
