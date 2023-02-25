import { parse, parse_vector, encode, encoding_length, encode_vector } from 'varint-vectors'
import { sha256 as hasher } from 'multiformats/hashes/sha2'
import { CID } from 'multiformats/cid'

const hash = bytes => hasher.digest(bytes)
const hashsize = 32
const mkcid = async (bytes, code) => CID.create(1, code, await hash(bytes))

const car_parser = (bytes, offset=0) => {
  // simple atomic CAR parser
  // returns a delta compressed encoding of the parse vector
  let header_length
  ;[ header_length, offset ] = parse(bytes, 0)
  offset += header_length // skip to first block

  const blocks = []

  let wm = offset

  while (offset < bytes.byteLength) {
    wm = offset
    let block_length, digest_size, digest_offset
    ;[ block_length, offset ] = parse(bytes, offset)
    const enc_len = offset - wm
    if (bytes[offset] === 0x12 && bytes[offset] === 0x20) {
      ;[ , digest_size, offset] = parse_vector(bytes, 2, offset)
      digest_offset = offset
    } else {
      if (bytes[offset] !== 1) throw new Error('unknown CID version')
      ;[ , , , digest_size, offset] = parse_vector(bytes, 4, offset)
      digest_offset = offset
    }
    const digest_delta = (offset - wm)
    const block_length_delta = block_length - digest_delta - digest_size + enc_len

    blocks.push([ digest_delta, digest_size, block_length_delta ])
    offset += digest_size
    offset += block_length_delta
  }

  return [ header_length, blocks ]
}

const digest_offset_iterator = function * (header_length, block_parse) {
  let offset = encoding_length(header_length) + header_length
  const digests = []
  for (const [ digest_offset_delta, digest_size, block_length ] of block_parse) {
    offset += digest_offset_delta
    yield [ offset, digest_size ]
  }
}
const digest_iterator = function * (iter, { carBytes, digestsBytes, unionBytes }) {
  if (digestsBytes && unionBytes) throw new Error('Pick one')
  let byteOffset
  if (digestsBytes) {
    byteOffset = 0
  }
  if (unionBytes) {
    byteOffset = parse(unionBytes, 0).reduce((x,y) => x + y)
  }
  for (let [ offset, length ] of iter) {
    if (carBytes) {
      yield carBytes.subarray(offset, offset + length)
    }
    if (digestsBytes) {
      yield digestsBytes.subarray(byteOffset, byteOffset + length)
      byteOffset += length
    }
    if (unionBytes) {
      yield unionBytes.subarray(byteOffset, byteOffset + length)
      byteOffset += length
    }
    offset += length
    // TODO: async interface for working with remote queries
  }
}

class CarCache {
  constructor ({ header_length, block_parse }) {
    this.header_length = header_length
    this.block_parse = block_parse
  }
  get block_count () {
    return this.block_parse.length
  }
  digests (input) {
    const iter = digest_offset_iterator(this.header_length, this.block_parse)
    return digest_iterator(iter, input)
  }
  digestsList (input) {
    return [...this.digests(input)]
  }
  async parsedBlock () {
    const bytes = this.parsedBlockBytes()
    const cid = await mkcid(bytes, 5040)
    return { bytes, cid }
  }
  async digestsBlock (input) {
    const bytes = this.digestsBlockBytes(input)
    const cid = await mkcid(bytes, 0x55 /* raw */)
    return { bytes, cid }
  }
  async unionBlock (input) {
    const bytes = this.unionBlockBytes(input)
    const cid = await mkcid(bytes, 5041)
    return { bytes, cid }
  }
  parsedBlockVector () {
    return encode_vector([this.header_length, ...this.block_parse.flat()])
  }
  parsedBlockBytes () {
    return new Uint8Array(this.parsedBlockVector())
  }
  digestsBlockBytes (input) {
    const digests = this.digestsList(input)
    return Buffer.concat(digests)
    // TODO: make browser friendly but keep Buffer.concat in Node.js because it's much faster
  }
  unionBlockBytes (input) {
    const parsed = this.parsedBlockBytes()
    const header = encode(parsed.byteLength)
    return Buffer.concat([ new Uint8Array(header), parsed, this.digestsBlockBytes(input) ])
  }
  static fromParsedBlock ({ bytes }) {
    let header_length, offset
    if (!bytes.byteLength) throw new Error("empty bytes")
    ;[ header_length, offset ] = parse(bytes, 0)
    const block_parse = []
    while (offset < bytes.byteLength) {
      let o, d, l
      ;[ o, d, l, offset ] = parse_vector(bytes, 3, offset)
      block_parse.push([ o, d, l ])
    }
    return new this({ header_length, block_parse })
  }
  static fromUnionBlock ({ bytes }) {
    let offset = [], length
    const r = parse(bytes, 0)
    ;[ length, offset ] = r
    return this.fromParsedBlock({ bytes: bytes.subarray(offset, offset + length) })
  }
  static fromParsed ([ header_length, blocks ]) {
    return new this({ header_length, block_parse })
  }
  static fromCarBytes (carBytes) {
    const [ header_length, block_parse ]  = car_parser(carBytes)
    return new this({ header_length, block_parse })
  }
}

export { CarCache }
