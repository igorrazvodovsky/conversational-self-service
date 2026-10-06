# End to end

`ledger-flow.cjs` runs one person's task through the page on two builds side
by side and compares what the page lets them see. The task is slice 1's:
answer a requirement, check what the answer is for and what it forced, find
what is still unanswered and what answers nothing, and see where an
assistant's reading of a document lands.

It needs both builds running against one agent with a throwaway journal,
because it strikes every clause and discards the specification first:

```bash
git worktree add ../before main                  # the build to compare against
AGENT_JOURNAL=/tmp/e2e.jsonl npx @langchain/langgraph-cli dev --port 8124 --no-browser   # in agent/
AGENT_URL=http://localhost:8124 npx next dev -p 3101   # in ../before
AGENT_URL=http://localhost:8124 npx next dev -p 3102   # here
BEFORE=http://localhost:3101 AFTER=http://localhost:3102 node e2e/ledger-flow.cjs
```

A worktree needs `node_modules`, `.env` and `agent/.venv` of its own;
`cp -cR` clones them on APFS without copying. Chrome is driven by
`puppeteer-core`, from the project if it is installed and otherwise from the
chrome-devtools plugin's cache; `CHROME` overrides the browser's path.

The table goes to standard output and `e2e/out/comparison.md`, with
`results.json` and a screenshot per build at each stage. The script fails when
the newer build lacks one of the properties it checks, or when either build
cannot complete the task; the older build lacking one is the comparison, and
is reported rather than failed.
