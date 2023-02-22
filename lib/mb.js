/* this is not working yet, just jotting down ideas */


// fastest string representation of binary
// https://dev.doctorevidence.com/building-the-fastest-js-de-serializer-a413a2b4fb72
const toString = cid => String.fromCharCode(...cid.bytes)

const CIDSet {
  constructor () {
    this.map = new Map()
  }
  has (key) {
    if (typeof key !== 'string') key = toString(key)
    return this.cids.has(key)
  }
  get (key) {
    if (typeof key !== 'string') key = toString(key)
    const result = this.map.get(key)
    if (!result) return null
    const [ cid, length ] = result
    return { cid, length, key }
  }
  append({ cid, length, key }) {
    if (!key) key = toString(cid)
    this.map.set(key, [ cid, length ])
    return key
  }
}

class BlockSet {
  constructor () {
    this.cids = new CIDSet()
    this.blocks = new Map()
  }
  append ({ cid, bytes, key }) {
    if (!key) key = toString(cid)
    const length = bytes.byteLength
    this.cids.append({ cid, length, key })
    this.blocks.set(key, bytes)
    return key
  }
}

const toraw = ({ multihash }) => {
  return [ [ 1, 82 ], multihash.bytes ]
}

class Slab {
  constructor (target_size=Infinity) {
    this.blocks = new BlockSet()
    this.size = { cids: 0, blocks: 0 }
    this.target_size = target_size
  }
  append ({ cid, bytes }) {
    const key = toString(cid)
    if (this.cids.has(key)) {
      // noop
      return this.oversize
    }
    this.blocks.append({ cid, bytes, key })
    this.size.cids += cid.bytes.byteLength
    this.size.blocks += bytes.byteLenghth
    return this.oversize
  }
  get oversize () {
    if (this.target_size === Infinity) return false
    return this.size > this.target_size
  }
  get size () {
    // does not account for CAR encoding overhead
    return this.size.cids + this.size.blocks
  }
  hashVector () {
  }
  headerVector (cidsetHash, bodyHash, multiblockHash, root) {
    const header = {}
    if (root) {
      header.root = root
      header.multiblock = [ cidset_cid, body_cid, multiblock_cid ]
    } else {
      header.root = cidset_cid
      header.multiblock = [ body_cid, multiblock_cid ]
    }
    // todo: encode CBOR vector
  }
  bodyVector (sorted_cids) {
  }
  hashVector (vector) {
    const hasher = createHasher()
    vector.forEach(vector => hasher.append(vector))
    const digest = hasher.digest()
    return digest
  }
  toVector (root=false) {
    const cids = this.blocks.cids.cids.values()
    const sorted_cids = cids.map(({ bytes }) => bytes).sort(Buffer.compare)
    const body = this.bodyVector(sorted_cids)
    const bodyHash = this.hashVector(body)
    const cidset = this.cidsetVector(sorted_cids)
    const cidsetHash = this.hashVector(cidset)
    const multiblockHash = this.hashVector([...body, ...cidset])
    const header = this.headerVector(cidsetHash, bodyHash, multiblockHash, root)
  }
  headVector () {

  }
  writeVector (writev, offset=0) {
    const vector = this.toVector()
    return writev(vector, offset)
  }
  export (root=false) {
    return Buffer.concat(this.toVector(root))
  }
}

class SlabImporter extends Slab {
  static fromFile (filename) {
  }
}

// Streaming version leaves the block bodies
// where they are until it needs to export.
class LazySlabImporter extends SlabImporter {
  static fromStream (stream) {
  }
  async exportAsync (root=false) {
    return Buffer.concat(await Promise.all(this.toVector(root).map(v => {
      if (typeof v === 'function') return v()
      return v
    }))
  }
}
