import os
import pytest

# Set env before app code imports
os.environ["SECRET_KEY"] = "dummy-secret-key-for-testing-1234567890"
os.environ["DATABASE_MODE"] = "mock"
os.environ["ALGORITHM"] = "HS256"
