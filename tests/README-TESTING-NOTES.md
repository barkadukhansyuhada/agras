This repository's tests are written using Jest-style syntax (describe/test/expect).
These tests focus on the inline utility functions present in the project's HTML entry file,
by extracting and evaluating only that portion of the script (no JSX/React execution required).

If your project uses a different test runner, adjust your configuration to ensure the following:
- Node can execute tests in the tests/ directory
- CommonJS require statements are supported (or convert them to ESM imports)
- Jest-like globals are available (or import from your specific test framework).

No new dependencies are introduced by these tests.