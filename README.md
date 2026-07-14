# KafkaJS Snappy Patch

[![CI](https://github.com/MrMarciaOng/kafkajs-snappy-patch/actions/workflows/ci.yml/badge.svg)](https://github.com/MrMarciaOng/kafkajs-snappy-patch/actions/workflows/ci.yml)

A security-hardened Snappy compression codec for
[KafkaJS](https://kafka.js.org/), forked from
[`tulios/kafkajs-snappy`](https://github.com/tulios/kafkajs-snappy).

## Requirements

- Node.js 22 or newer
- KafkaJS 2.x

## Installation

```sh
npm install kafkajs-snappy-patch@2.0.0
```

## Configuration

Register the codec before creating a KafkaJS producer or consumer:

```javascript
const { CompressionTypes, CompressionCodecs } = require('kafkajs')
const SnappyCodec = require('kafkajs-snappy-patch')

CompressionCodecs[CompressionTypes.Snappy] = SnappyCodec
```

The codec limits each decompressed Kafka record batch to 100 MiB by default.
To use a different limit, register a configured factory:

```javascript
const maxDecompressedSize = 25 * 1024 * 1024

CompressionCodecs[CompressionTypes.Snappy] = () =>
  SnappyCodec({ maxDecompressedSize })
```

Choose a limit that is at least as large as the biggest valid record batch your
Kafka clients accept.

## Security hardening

- Uses `snappyjs@0.7.0`, which checks the declared uncompressed size before
  allocating the output buffer.
- Applies a configurable aggregate output limit to both raw Snappy streams and
  multi-chunk Xerial frames.
- Decompresses Xerial chunks sequentially so several chunks cannot allocate in
  parallel before the aggregate limit is enforced.
- Rejects truncated Xerial headers, chunk sizes, and chunk payloads.
- Uses one runtime dependency with no transitive dependencies.
- Pins npm dependencies to exact versions with SHA-512 integrity in
  `package-lock.json` and pins CI actions to immutable commit SHAs.
- Runs an exact OSV-Scanner binary, verified against its published SHA-256, for
  every push and pull request.
- Tests the pinning policy so floating dependency ranges and action tags fail CI.

See [SECURITY.md](SECURITY.md) to report a vulnerability.

## Development

```sh
npm ci
npm test
npm audit --audit-level=low
osv-scanner scan source --lockfile package-lock.json
npm run test:package
```

## Publishing

The package name is configured as `kafkajs-snappy-patch` and public access is
set in `package.json`. After the development checks pass:

```sh
npm publish
```

`npm publish` runs the test suite again through `prepublishOnly`.

## License

MIT. See [LICENSE](LICENSE).
