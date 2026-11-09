"""Read-only ignore contract: check filenames, never credential/data contents."""
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class IgnoreRulesTests(unittest.TestCase):
    def test_local_private_and_generated_paths_are_ignored(self):
        paths = [
            ".env", "backend/.env.production", "HeartLink-web/.env.local",
            ".tmp/review.png", "HeartLink-web/.tmp/screenshot.png",
            "backend/.pytest_cache/result", "backend/__pycache__/module.pyc",
            "backend/.venv/pyvenv.cfg", "HeartLink-web/node_modules/example/index.js",
            "HeartLink-web/dist/index.html", "coverage/summary.json",
            "test-results/report.json", "playwright-report/index.html",
            "Vault/HeartLink/private-note.md", "AGENTS.md",
            ".agent/skills/local/SKILL.md", ".codex/local.json", ".gemini/local.json",
            ".mcp.json", "database-backups/synthetic.sql", "backup.dump",
            "backup.sql.gz", "local.sqlite3", ".secrets/local.json", "private.key",
            "HeartLink_Plan_Changes_and_Progress_Summary.docx",
        ]
        for path in paths:
            with self.subTest(path=path):
                result = subprocess.run(
                    ["git", "check-ignore", "--no-index", "-v", "--", path],
                    cwd=ROOT, capture_output=True, text=True, check=False,
                )
                self.assertEqual(result.returncode, 0, f"Not ignored: {path}")
                source = result.stdout.split(":", 1)[0].replace("\\", "/")
                self.assertTrue(source.endswith(".gitignore"), f"Only locally excluded, not portable: {path}")

    def test_application_sources_templates_and_required_assets_are_not_hidden(self):
        paths = [
            ".env.example", "backend/.env.example", "HeartLink-web/.env.example",
            ".gitignore", ".gitattributes", ".githooks/pre-push",
            ".githooks/test_ignore_rules.py", ".github/workflows/tests.yml",
            "HeartLink-web/package-lock.json", "HeartLink-mobile/package-lock.json",
            "HeartLink-web/src/features/auth/login.jsx",
            "HeartLink-web/src/features/auth/login.css", "backend/app/utils/security.py",
            "backend/requirements.txt", "backend/supabase/migrations/044_exercise_library_details.sql",
            "backend/app/ml/starting_score_model.json", "backend/scripts/train_starting_score.py",
            "HeartLink-mobile/AGENTS.md", "HeartLink-mobile/app/example.tsx",
            "HeartLink-web/src/assets/ingredients/rice.svg",
            "HeartLink-web/public/fonts/instrument-sans/InstrumentSans-Variable.woff2",
            "HeartLink-web/preview/syntheticFixtures.js", "HeartLink-web/tests/browser/loginRefinement.js",
            "HeartLink-web/README.md", "new-source-script.py", "new-legitimate-guide.docx",
        ]
        for path in paths:
            with self.subTest(path=path):
                result = subprocess.run(
                    ["git", "check-ignore", "--no-index", "--quiet", "--", path],
                    cwd=ROOT, capture_output=True, text=True, check=False,
                )
                self.assertEqual(result.returncode, 1, f"Application/template path hidden: {path}")


if __name__ == "__main__":
    unittest.main()
