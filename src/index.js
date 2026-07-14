const snappy = require('snappyjs')

const XERIAL_HEADER = Buffer.from([130, 83, 78, 65, 80, 80, 89, 0])
const SIZE_BYTES = 4
const SIZE_OFFSET = 16
const DEFAULT_MAX_DECOMPRESSED_SIZE = 100 * 1024 * 1024

const isFrameFormat = buffer =>
  buffer.length >= XERIAL_HEADER.length &&
  buffer.subarray(0, XERIAL_HEADER.length).equals(XERIAL_HEADER)

const validateMaxDecompressedSize = maxDecompressedSize => {
  if (
    !Number.isSafeInteger(maxDecompressedSize) ||
    maxDecompressedSize <= 0
  ) {
    throw new RangeError('maxDecompressedSize must be a positive safe integer')
  }
}

const createCodec = (
  { maxDecompressedSize = DEFAULT_MAX_DECOMPRESSED_SIZE } = {}
) => {
  validateMaxDecompressedSize(maxDecompressedSize)

  return {
    async compress(encoder) {
      return snappy.compress(encoder.buffer)
    },

    // Based on the Xerial framing format used by Kafka's Snappy codec.
    async decompress(buffer) {
      if (!isFrameFormat(buffer)) {
        return snappy.uncompress(buffer, maxDecompressedSize)
      }

      if (buffer.length < SIZE_OFFSET) {
        throw new Error('Invalid Xerial Snappy frame: truncated header')
      }

      const decodedBuffers = []
      let decodedSize = 0
      let offset = SIZE_OFFSET

      while (offset < buffer.length) {
        if (buffer.length - offset < SIZE_BYTES) {
          throw new Error('Invalid Xerial Snappy frame: truncated chunk size')
        }

        const size = buffer.readUInt32BE(offset)
        offset += SIZE_BYTES

        if (size > buffer.length - offset) {
          throw new Error('Invalid Xerial Snappy frame: truncated chunk')
        }

        const remainingSize = maxDecompressedSize - decodedSize
        const decodedBuffer = snappy.uncompress(
          buffer.subarray(offset, offset + size),
          remainingSize
        )

        decodedSize += decodedBuffer.length
        decodedBuffers.push(decodedBuffer)
        offset += size
      }

      return Buffer.concat(decodedBuffers, decodedSize)
    },
  }
}

createCodec.DEFAULT_MAX_DECOMPRESSED_SIZE = DEFAULT_MAX_DECOMPRESSED_SIZE

module.exports = createCodec
