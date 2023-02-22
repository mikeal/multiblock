import Transaction from 'car-transaction'
import { parse, parse_vector } from 'varint-vectors'

const parser = (bytes, offset=0) => {
  // simple atomic CAR parser
  // returns a delta compressed encoding of the parse vector
  let header_length
  ;[ header_length, offset ] = parse(bytes)
  offset += (header_length + 1) // skip to first block

  const blocks = []

  const wm = offset
  while (offset < bytes.byteLength) {
    let block_length, multihash_offset, block_offset
    ;[ block_length, offset ] = parse(bytes, offset)
    if (bytes[offset] === 0x12 && bytes[offset + 1] === 0x20) {
      multihash_offset = offset
      ;[ , , offset] = parse_vector(bytes, 2, offset)
      block_offset = offset
    } else {
      ;[ , , offset] = parse_vector(bytes, 2, offset)
      multihash_offset = offset
      ;[ , , offset] = parse_vector(bytes, 2, offset)
      block_offset = offset
    }
    const mh = multihash_offset - wm
    const bo = block_offset - mh
    blocks.push([ mh, bo, block_length ])
    wm = offset
  }
  return [ header_length, blocks ]
}

class CarCache {
  static fromParsed ([ header_length, blocks ]) {
    const header_varint_size = encoding_length(header_length)
    const header_offsets = [ header_varint_size, header_varint_size + header_length ]
    const offset = header_offsets[1] + 1

  }
  static fromCarBytes () {

  }
}

const test = async test () => {
  const t = Transaction.create()

  const subCID = await t.write({ some: 'data' })
  await t.write({ sub: subCID })
  const buffer = await t.commit()

  const cache = CarCache.fromCarBytes(buffer)
  cache.block_count // 2

  // We can now serialize any of the blocks we want

  // Parser Serialization (first block type)
  const { cid, bytes } = await cache.parser()

  // Digest Serialization (second block type)
  const { cid, bytes } = await cache.digests()

  // Full Serialization (third block type)
  const { cid, bytes } = await cache.union()
}

test()
