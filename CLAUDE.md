# HeartLink — notes for Claude Code

## graphify (code map)

This project has a local graphify knowledge graph in `graphify-out/` (git-ignored, so it exists only on this PC).

- For questions about the codebase or how parts connect, when `graphify-out/graph.json` exists, start with
  `graphify query "<question>"`, `graphify explain "<name>"` or `graphify path "<A>" "<B>"`. They return a small,
  focused slice of the code map instead of a whole report or long search output.
- Read `graphify-out/GRAPH_REPORT.md` only for a broad architecture review, or when the commands above don't find enough.
- The graph is a map, not the source of truth: read the actual file before editing it.
- SQL migrations are not in the graph. Search `backend/supabase/migrations/` directly for database functions and tables.
- After changing code files, run `graphify update .` to keep the graph current. It runs locally with no API cost.
