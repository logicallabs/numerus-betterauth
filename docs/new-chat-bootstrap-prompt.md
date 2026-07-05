# New Chat Bootstrap Prompt

Copy/paste the prompt below into a new chat in this repository.

---

You are joining an in-progress project. Before proposing changes, read the following files in full and base your response on them:

1. docs/project-history-handoff.md
2. README.md
3. docs/deployment-setup.md
4. docs/tenant-config-template.md
5. docs/tenants/README.md
6. apps/auth-worker/wrangler.toml
7. apps/auth-worker/package.json

After reading, provide:

1. A short current-state summary (what is done vs pending).
2. Any risks or configuration gaps that would block a new tenant deployment.
3. A concrete next-step plan with the top 3 actions.
4. The exact commands to run those top 3 actions.

Constraints:

1. Treat this repository as a generic multi-account Better Auth template.
2. Keep secrets out of git and follow docs/tenants/README.md conventions.
3. Prefer workspace root commands where available.

If anything appears inconsistent, list the file and line, then propose the smallest safe fix.

---

Optional follow-up prompt:

Execute action 1 from your plan now, make the code/doc changes directly, run validation commands, and summarize results.
