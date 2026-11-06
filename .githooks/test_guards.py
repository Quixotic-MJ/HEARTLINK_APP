"""Run without network or commits: python .githooks/test_guards.py."""

from pathlib import Path
import os
import shutil
import subprocess
import tempfile
import unittest


HOOKS = Path(__file__).resolve().parent
GIT = shutil.which("git")
GIT_SH = Path(GIT).resolve().parents[1] / "bin" / "sh.exe" if GIT else None
SHELL = str(GIT_SH) if GIT_SH and GIT_SH.is_file() else shutil.which("sh")
OID = "1" * 40
ZERO = "0" * 40
# Ignore inherited Git context so the temporary repository cannot resolve to a real one.
TEST_ENV = {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}
TEST_ENV.update(GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull)


class GuardTests(unittest.TestCase):
    def run_hook(self, name, cwd=None, data=""):
        return subprocess.run(
            [SHELL, str(HOOKS / name)], cwd=cwd, input=data,
            text=True, capture_output=True, check=False, env=TEST_ENV,
        )

    def test_commit_branches(self):
        with tempfile.TemporaryDirectory(prefix="heartlink-guard-test-") as directory:
            subprocess.run([GIT, "init", "--quiet", directory], check=True, env=TEST_ENV)
            for branch in ("main", "master", "web_content"):
                with self.subTest(branch=branch):
                    subprocess.run(
                        [GIT, "symbolic-ref", "HEAD", f"refs/heads/{branch}"],
                        cwd=directory, check=True, env=TEST_ENV,
                    )
                    result = self.run_hook("pre-commit", cwd=directory)
                    self.assertEqual(result.returncode, 0 if branch == "web_content" else 1)
                    push = self.run_hook(
                        "pre-push", cwd=directory,
                        data=f"HEAD {OID} refs/heads/web_content {ZERO}\n",
                    )
                    self.assertEqual(push.returncode, 0 if branch == "web_content" else 1)
            subprocess.run(
                [GIT, "update-ref", "--no-deref", "HEAD", ZERO],
                cwd=directory, check=True, env=TEST_ENV,
            )
            self.assertNotEqual(self.run_hook("pre-commit", cwd=directory).returncode, 0)
            self.assertNotEqual(self.run_hook("pre-push", cwd=directory).returncode, 0)

    def test_push_refs(self):
        cases = (
            ("feature", f"refs/heads/web_content {OID} refs/heads/web_content {ZERO}\n", True),
            ("head_to_main", f"HEAD {OID} refs/heads/main {ZERO}\n", False),
            ("feature_to_main", f"refs/heads/web_content {OID} refs/heads/main {ZERO}\n", False),
            ("feature_to_master", f"refs/heads/web_content {OID} refs/heads/master {ZERO}\n", False),
            ("main_source", f"refs/heads/main {OID} refs/heads/other {ZERO}\n", False),
            ("master_source", f"refs/heads/master {OID} refs/heads/other {ZERO}\n", False),
            ("delete_main", f"(delete) {ZERO} refs/heads/main {OID}\n", False),
            ("delete_master", f"(delete) {ZERO} refs/heads/master {OID}\n", False),
            ("tag", f"refs/tags/checkpoint {OID} refs/tags/checkpoint {ZERO}\n", True),
            ("malformed", "refs/heads/web_content\n", False),
            ("no_updates", "", True),
            ("mixed", f"refs/heads/web_content {OID} refs/heads/web_content {ZERO}\nHEAD {OID} refs/heads/main {ZERO}\n", False),
        )
        with tempfile.TemporaryDirectory(prefix="heartlink-push-guard-test-") as directory:
            subprocess.run([GIT, "init", "--quiet", directory], check=True, env=TEST_ENV)
            subprocess.run(
                [GIT, "symbolic-ref", "HEAD", "refs/heads/web_content"],
                cwd=directory, check=True, env=TEST_ENV,
            )
            for name, data, allowed in cases:
                with self.subTest(case=name):
                    result = self.run_hook("pre-push", cwd=directory, data=data)
                    self.assertEqual(result.returncode, 0 if allowed else 1, result.stderr)


if __name__ == "__main__":
    if not GIT or not SHELL:
        raise SystemExit("Git and its POSIX shell are required; no test was run.")
    unittest.main()
