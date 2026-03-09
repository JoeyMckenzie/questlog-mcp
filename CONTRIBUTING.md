# Contributing to questlog-mcp

Thanks for your interest in contributing! This guide will help you get started.

## Prerequisites

- [Bun](https://bun.sh/) v1.0 or later
- [Taskwarrior](https://taskwarrior.org/download/) v3.x (v2 is not supported)

## Development Setup

1. Fork and clone the repository:

```sh
git clone https://github.com/<your-username>/github-mcp.git
cd taskwarrior-mcp
```

1. Install dependencies:

```sh
bun install
```

1. Run the test suite to verify everything works:

```sh
bun test
```

1. Run the linter, formatter, and type checker:

```sh
bun run check
```

## Code Style

This project uses [Oxlint](https://oxc.rs/docs/guide/usage/linter) for linting and [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) for formatting. Pre-commit hooks via Husky and lint-staged will automatically lint and format staged files.

Before submitting a PR, make sure all checks pass:

```sh
bun run check
bun test
```

## Submitting Changes

1. Create a feature branch from `main`:

```sh
git checkout -b my-feature
```

1. Make your changes and add tests if applicable.
2. Run `bun run check` and `bun test` to verify everything passes.
3. Commit your changes with a descriptive message.
4. Push your branch and open a pull request against `main`.

## Reporting Issues

When reporting a bug, please include:

- Your operating system and version
- Taskwarrior version (`task --version`)
- Bun or Node.js version
- Steps to reproduce the issue
- Expected vs. actual behavior

For feature requests, describe the use case and your proposed solution.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
