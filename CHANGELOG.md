# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.4] - 2025-03-09

### Fixed

- Remove superfluous catch tag
- Fix deprecated tool registrations

### Added

- Add bulk complete tool

## [0.1.3] - 2025-03-08

### Changed

- Add TypeScript type definitions to package

## [0.1.2] - 2025-03-08

### Fixed

- Fix type errors in tool handlers

## [0.1.1] - 2025-03-08

### Added

- Initial public release
- CI pipeline with GitHub Actions
- Release script with semver support
- 10 Taskwarrior tools: list, get, add, bulk add, complete, modify, delete, annotate, summary, start/stop
- MCP protocol support over stdio
- npm distribution via `npx questlog-mcp`

[Unreleased]: https://github.com/joeymckenzie/taskwarrior-mcp/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/joeymckenzie/taskwarrior-mcp/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/joeymckenzie/taskwarrior-mcp/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/joeymckenzie/taskwarrior-mcp/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/joeymckenzie/taskwarrior-mcp/releases/tag/v0.1.1
