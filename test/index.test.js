'use strict'

const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
const snappy = require('snappyjs')
const { CompressionCodecs, CompressionTypes } = require('kafkajs')
const SnappyCodec = require('../src')

const XERIAL_HEADER = Buffer.from([
  130, 83, 78, 65, 80, 80, 89, 0,
  0, 0, 0, 1,
  0, 0, 0, 1,
])

const createXerialFrame = chunks =>
  Buffer.concat([
    XERIAL_HEADER,
    ...chunks.flatMap(chunk => {
      const compressed = snappy.compress(chunk)
      const size = Buffer.alloc(4)
      size.writeUInt32BE(compressed.length)
      return [size, compressed]
    }),
  ])

describe('KafkaJS Snappy codec', () => {
  it('registers as a KafkaJS compression codec', async () => {
    CompressionCodecs[CompressionTypes.Snappy] = SnappyCodec
    const codec = CompressionCodecs[CompressionTypes.Snappy]()
    const input = Buffer.from('KafkaJS compatibility check')

    const compressed = await codec.compress({ buffer: input })

    assert.deepEqual(await codec.decompress(compressed), input)
  })

  it('round-trips unframed Snappy data', async () => {
    const codec = SnappyCodec()
    const input = Buffer.from('snappy '.repeat(1_000))

    const compressed = await codec.compress({ buffer: input })

    assert.ok(compressed.length < input.length)
    assert.deepEqual(await codec.decompress(compressed), input)
  })

  it('decompresses multi-chunk Xerial frames', async () => {
    const codec = SnappyCodec()
    const chunks = [
      Buffer.from('first chunk '.repeat(100)),
      Buffer.from('second chunk '.repeat(100)),
    ]

    const result = await codec.decompress(createXerialFrame(chunks))

    assert.deepEqual(result, Buffer.concat(chunks))
  })

  it('rejects an unframed decompression bomb before allocation', async () => {
    const maxDecompressedSize = 1_024
    const codec = SnappyCodec({ maxDecompressedSize })
    const compressed = snappy.compress(Buffer.alloc(maxDecompressedSize + 1))

    await assert.rejects(
      codec.decompress(compressed),
      /uncompressed length.*too big/i
    )
  })

  it('enforces the aggregate limit across Xerial chunks', async () => {
    const codec = SnappyCodec({ maxDecompressedSize: 1_000 })
    const frame = createXerialFrame([Buffer.alloc(600), Buffer.alloc(600)])

    await assert.rejects(codec.decompress(frame), /uncompressed length.*too big/i)
  })

  it('rejects invalid decompression limits', () => {
    for (const maxDecompressedSize of [0, -1, 1.5, Infinity, Number.MAX_VALUE]) {
      assert.throws(
        () => SnappyCodec({ maxDecompressedSize }),
        /positive safe integer/
      )
    }
  })

  it('rejects a truncated Xerial header', async () => {
    const codec = SnappyCodec()

    await assert.rejects(
      codec.decompress(XERIAL_HEADER.subarray(0, 12)),
      /truncated header/
    )
  })

  it('rejects a truncated Xerial chunk size', async () => {
    const codec = SnappyCodec()
    const frame = Buffer.concat([XERIAL_HEADER, Buffer.from([0, 0, 0])])

    await assert.rejects(codec.decompress(frame), /truncated chunk size/)
  })

  it('rejects a chunk whose declared size exceeds the frame', async () => {
    const codec = SnappyCodec()
    const size = Buffer.alloc(4)
    size.writeUInt32BE(100)
    const frame = Buffer.concat([XERIAL_HEADER, size, Buffer.from([1, 2, 3])])

    await assert.rejects(codec.decompress(frame), /truncated chunk$/)
  })
})
