import subprocess
import sys
import os
import pytest

def run_discoverability_check(env_value: str, endpoint: str) -> int:
    """
    Runs a test in an isolated subprocess to ensure the FastAPI app
    initialization respects the ENVIRONMENT variable without poisoning
    the module state for other tests.
    """
    script = f"""
import os
os.environ['ENVIRONMENT'] = '{env_value}'
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
response = client.get('{endpoint}')
print(response.status_code)
"""
    env = os.environ.copy()
    env["PYTHONPATH"] = "."
    result = subprocess.run(
        [sys.executable, "-c", script], 
        capture_output=True, 
        text=True, 
        env=env
    )
    # The last line of stdout should be the status code
    lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    if lines:
        try:
            return int(lines[-1])
        except ValueError:
            pass
    raise RuntimeError(f"Failed to get status code from subprocess. stderr: {result.stderr}, stdout: {result.stdout}")

@pytest.mark.parametrize("endpoint", [
    "/docs", 
    "/redoc", 
    "/openapi.json", 
    "/docs/oauth2-redirect"
])
@pytest.mark.parametrize("prod_env", ["production", "PRODUCTION"])
def test_production_discoverability_disabled(endpoint, prod_env):
    """
    Ensure API documentation and schema are disabled (404) in production environments.
    """
    status = run_discoverability_check(prod_env, endpoint)
    assert status == 404, f"Expected 404 for {endpoint} when ENVIRONMENT={prod_env}, got {status}"

@pytest.mark.parametrize("endpoint", [
    "/docs", 
    "/redoc", 
    "/openapi.json", 
    "/docs/oauth2-redirect"
])
@pytest.mark.parametrize("non_prod_env", ["", "staging", "development"])
def test_non_production_discoverability_enabled(endpoint, non_prod_env):
    """
    Ensure API documentation remains enabled (200) in staging/development.
    """
    status = run_discoverability_check(non_prod_env, endpoint)
    assert status == 200, f"Expected 200 for {endpoint} when ENVIRONMENT={non_prod_env}, got {status}"
