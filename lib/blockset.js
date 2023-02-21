import { CIDSet } from './cidset.js'

const toString = cid => String.fromCharCode(...cid.bytes)

class BlockSet {
  constructor () {
    this.cids = new CIDSet()
    this.blocks = new Map()
  }
  append ({ cid, bytes, length, key }) {
    if (!key) key = toString(cid)
    if (!length) length = bytes.byteLength
    this.cids.append({ cid, length, key })
    this.blocks.set(key, bytes)
    return key
  }
}

class FileBackedBlockSet extends BlockSet {
  // TODO: Set that holds the blocks in their original
  // position ondisc rather than keeping the bytes in-memory
}
