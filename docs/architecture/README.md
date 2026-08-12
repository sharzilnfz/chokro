# Chokro Architecture Documentation

This directory contains the architecture review, system design analysis, visual flows, and beginner guides for the Chokro codebase.

---

## 📚 Documents in this Directory

| Document | Description | Format |
| :--- | :--- | :--- |
| **[architecture-visual-flows.md](./architecture-visual-flows.md)** | Step-by-step visual flows & diagrams (Before vs. After). | Markdown |
| **[architecture-explained.md](./architecture-explained.md)** | Beginner-friendly explanation of core concepts, problems, and solutions. | Markdown |
| **[architecture-review.md](./architecture-review.md)** | Detailed engineering review, 5 candidates, and phased execution plan. | Markdown |
| **[architecture-review.html](./architecture-review.html)** | Interactive visual dashboard with Mermaid graphs & depth meters. | HTML |

---

## 🎯 Quick Candidate Reference

1. **Candidate #1 (Strong)**: Eliminate dual-implementation repos (`databaseOrTestStore`) & deepen `@chokro/db` with pluggable `Drizzle` and `Memory` adapters.
2. **Candidate #2 (Strong)**: Deepen route handlers by absorbing shallow pass-through services into domain modules.
3. **Candidate #3 (Worth exploring)**: Encapsulate auth token handling inside mobile network client (`services/api.ts`).
4. **Candidate #4 (Worth exploring)**: Consolidate category/unit domain rules (`unitForCategory`) into `@chokro/shared`.
5. **Candidate #5 (Speculative)**: Clean up dead 1-line re-export files (`src/api.ts`).
