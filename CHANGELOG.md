# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-07-15

### Security

- Upgraded `snappyjs` from 0.6.0 to 0.7.0 and enforce its pre-allocation
  decompression limit.
- Added a configurable 100 MiB aggregate decompression limit for raw and Xerial
  Snappy payloads.
- Reject malformed or truncated Xerial frames instead of silently accepting
  incomplete data.
- Removed the vulnerable Jest 23 dependency tree and replaced it with Node's
  built-in test runner.

### Changed

- Renamed the npm package to `kafkajs-snappy-patch`.
- Raised the minimum supported Node.js version to 22.
- Upgraded development compatibility coverage to KafkaJS 2.2.4.
- Replaced the legacy Travis and Docker test setup with GitHub Actions on Node.js
  22 and 24.

### Added

- Unit coverage for KafkaJS registration, raw and Xerial round trips,
  decompression bombs, aggregate limits, option validation, and malformed
  frames.

## [1.1.0] - 2018-11-12

### Changed

- Switched from the deprecated `kesla/snappy.js` package to
  `zhipeng-jia/snappyjs`.

## [1.0.0] - 2018-08-26

### Added

- Initial Snappy codec.
