# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0](https://github.com/voxcape/nestjs-notifications/compare/v0.2.2...v0.3.0) (2026-03-20)


### Features

* **module:** accept adapter instances and support in-memory retry ([#27](https://github.com/voxcape/nestjs-notifications/issues/27)) ([6616cf9](https://github.com/voxcape/nestjs-notifications/commit/6616cf9ccb309f97452610fcc52fed208f036ba4))

## [0.2.2](https://github.com/voxcape/nestjs-notifications/compare/v0.2.1...v0.2.2) (2026-03-17)


### Bug Fixes

* **module:** resolve channels and adapters via DI in forRootAsync() ([#24](https://github.com/voxcape/nestjs-notifications/issues/24)) ([519cce3](https://github.com/voxcape/nestjs-notifications/commit/519cce3350a0a8c893f3f93fa4ebde082f062982))

## [0.2.1](https://github.com/voxcape/nestjs-notifications/compare/v0.2.0...v0.2.1) (2026-03-11)


### Bug Fixes

* added previous npm release workflow to release-please ([#22](https://github.com/voxcape/nestjs-notifications/issues/22)) ([06dbd18](https://github.com/voxcape/nestjs-notifications/commit/06dbd1842f0efdec02052c8da627fe6e81c28380))

## [0.2.0](https://github.com/voxcape/nestjs-notifications/compare/v0.1.2...v0.2.0) (2026-03-08)


### Features

* **playground:** add example NestJS app showcasing notification channels ([#13](https://github.com/voxcape/nestjs-notifications/issues/13)) ([49b5748](https://github.com/voxcape/nestjs-notifications/commit/49b57480b7cd016d4ed02670281a8089f1109a6a))


### Bug Fixes

* make broadcast and queue adapters opt-in ([#12](https://github.com/voxcape/nestjs-notifications/issues/12)) ([4dd95ad](https://github.com/voxcape/nestjs-notifications/commit/4dd95adda46d707b42540c1221819b71928cd10c))

## [Unreleased]

- Planned enhancements and fixes will be documented here before each release.

## [0.1.2] - 2025-11-06

### Changed
- Relax `nest-commander` dependency range to `^3.17.1` for broader compatibility.

## [0.1.1] - 2025-11-06

### Changed
- Expand `reflect-metadata` peer dependency range to include `^0.2.0`.

### Fixed
- Replace deprecated `husky install` prepare script with the new `husky` command.

## [0.1.0] - 2025-11-06

- Initial release of `@voxcape/nestjs-notifications`.

<!--
Guidelines:
- Group changes under Added, Changed, Deprecated, Removed, Fixed, Security when relevant.
- List upcoming changes in Unreleased and move them under a dated heading when publishing a release.
- Reference pull requests or issues to provide additional context.
-->
