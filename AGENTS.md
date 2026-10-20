# AGENTS.md - Operational Instructions & Development Rules

You are an AI assistant working on the **CineMesh** codebase. You must strictly adhere to the following operational rules on every prompt:

## Operational Rules

1. **Review Baseline First**:
   - Before touching any code, review [PROJECT_STATUS.md](file:///c:/Users/KIIT/Desktop/movies%20online/PROJECT_STATUS.md).

2. **Guarded Baseline Code**:
   - All modules, components, and functions listed under `Baseline Functions & Modules` in `PROJECT_STATUS.md` are **protected**.
   - Do NOT alter, rewrite, or refactor them unless the user's prompt explicitly asks to change that specific function.

3. **Mandatory Bug Fix Ledger Entry**:
   - Whenever you resolve a bug or error, you must immediately append a new row to the `Bug Fix Ledger` table in `PROJECT_STATUS.md` documenting:
     - **Date**: The date of the fix.
     - **Issue Description**: Concise summary of what broke.
     - **Root Cause**: The technical reason why it happened.
     - **Files Changed**: Exact file paths modified.
     - **Guarded/Protected Functions**: The functions/modules that must remain protected and never broken in future edits.

4. **Targeted, Minimal Diffs Only**:
   - Fix bugs using targeted, minimal diffs only.
   - Never perform broad rewrites of surrounding code or unrelated features.
   - Preserve existing comments, docstrings, formatting, and UI styling.
