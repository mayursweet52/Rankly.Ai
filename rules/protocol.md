# 🔴 ABSOLUTE MANDATORY SYSTEM INSTRUCTION 🔴

## 🛠️ CODING STYLE & QUALITY (STRICT)
1. **MANDATORY TYPESCRIPT:** You MUST write ALL code in TypeScript. JavaScript is strictly FORBIDDEN.
2. **STRICT MODE:** `tsconfig.json` MUST have `"strict": true`. If missing, you MUST add it immediately.
3. **NO `any` TYPE:** You are NEVER allowed to use the `any` type. ALWAYS use `unknown` and strictly narrow it down before use.
4. **ARROW FUNCTIONS ONLY:** All React components MUST be declared as `const MyComponent = () => { ... }`. `function` declarations are FORBIDDEN.
5. **NAMED EXPORTS ONLY:** You MUST use `export const` for components, utilities, and hooks. `export default` is STRICTLY PROHIBITED.
6. **COMPLETE TYPING:** Every function parameter and return value MUST have an explicit type annotation. Implicit `any` is a critical violation.
7. **RUFF LINTING:** You MUST format and lint all code using `ruff`. Code that fails `ruff` check is REJECTED.
8. **NO `var`:** `var` keyword is FORBIDDEN. Use `const` by default, and `let` only when reassignment is absolutely necessary.

## 🏗️ PROJECT ARCHITECTURE (STRICT)
9. **SHADCN/UI MANDATE:** For any new UI component, you MUST use `shadcn/ui`. Custom CSS-in-JS or raw Tailwind classes for complex components are FORBIDDEN unless explicitly approved.
10. **PATTERN ENFORCEMENT:** You MUST strictly follow the Container/Presentational (Smart/Dumb) component pattern. Business logic stays in containers; UI stays in presentationals.
11. **PLAN BEFORE CODE:** You are FORBIDDEN to write a single line of code without first creating a step-by-step plan in the `PLAN.md` file and getting implicit user consent.
12. **NO HARDCODING:** API keys, tokens, passwords, or any secrets are NEVER allowed in the codebase. They MUST be in `.env` files.

## 🧠 AGENT BEHAVIOR & EFFICIENCY (STRICT)
13. **ZERO DUPLICATION:** If your thinking logs are already in the Artifact, you are FORBIDDEN to repeat them in the chat response. Keep chat replies extremely concise.
14. **STRICT SCOPING:** If the user asks for a bug fix in one file, you are FORBIDDEN to refactor the entire repository. Stay EXACTLY within the task scope.
15. **CONCISE EXPLANATIONS:** You MUST keep all explanations under 3 sentences unless the user explicitly asks for detailed documentation.
16. **MANDATORY PROTOCOL:** Before solving any task, you MUST read `rules/protocol.md` (if it exists) and follow its instructions over your default training.
17. **AUTONOMOUS SKILL LOADING:** You MUST automatically scan and load relevant skills from the `skills/` folder based on the user's prompt. Do not ask the user which skill to use.
18. **DESIGN ADHERENCE:** For any frontend UI changes, you MUST open and read `DESIGN.md` from the project root first and strictly match the styles defined there.

## ⚙️ CONFIGURATION LIMITS (STRICT)
19. **FILE STORAGE:** All these rules MUST be stored as Markdown (`.md`) files inside the `.agents/rules/` folder. Individual rule file size MUST NOT exceed 12,000 characters.
20. **HIERARCHY:** Workspace-level rules (`.agents/rules/`) ALWAYS override Global rules (`~/.gemini/GEMINI.md`). If there is a conflict, workspace rules win.
