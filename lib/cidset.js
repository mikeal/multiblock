import { encode_vector,
         parse,
         parse_vector as pv,
         encode as encode_varint
       } from 'varint-vectors'

const toString = cid => String.fromCharCode(...cid.bytes)

const sort = (a, b) => {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

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
  encodeVector () {
    const outs = {}
    for (const [ cid, length ] of this.map.values()) {
      const { multihash, code } = cid
      const base = [ code, multihash.code, multihash.digest.byteLength ]
      const key  = String.fromCharCode(...toString(base))
      if (!outs[key]) {
        outs[key] = [ base, [] ]
      }
      const [ , digests ] = outs[key]
      // TODO: optimize to a sorted insert instead of sorting later
      digests.push([ multihash.digest, length ])
    }
    const sortPrefixes = ([a], [b]) => {
      let i = 0
      let s = 0
      const l = a.length || a.byteLength
      while (s === 0 && i < l) {
        s = sort(a[i], b[i])
        if (s !== 0) return s
        i++
      }
      return s
    }
    const sorted = Object.values(outs).sort(sortPrefixes)
    const lengths = []
    const vector = sorted.flatMap(([ base, digests ]) => [
      encode_vector(base),
      encode_varint(digests.length),
      digests.sort(sortPrefixes).flatMap(([ digest, length ]) => {
        lengths.push(length)
        return Array.isArray(digest) ? digest : [...digest]
      })
    ])
    return [].concat(
      encode_varint(lengths.length),
      encode_vector(lengths),
      vector
    )
  }
  static decodeVector (vector) {
    let [ size, offset ] = parse(vector)
    const lengths = pv(vector, size, offset)
    offset = lengths.pop()
    const cidset = new CIDSet()
    while (cids.length !== size) {
      let code, mh_code, mh_len, digests_len
      ;[ code, mh_code, mh_len, digests_len, offset ] = pv(vector, 4, offset)
      const encoded_prefix = encode_vector([ 1, code, mh_code, mh_len ])
      let i = 0
      while (i < digests_len) {
        const c = [].concat(encoded_prefix, vector.slice(offset, offset + mh_len))
        const cid = CID.decode(new Uint8Array(c))
        cidset.append({ cid, length: lengths.shift() })
        offset += mh_len
        i++
      }
    }
    return cidset
  }
  encode () {
    return new Uint8Array(this.encodeVector())
  }
  static decode (bytes) {
    return this.fromVector([...bytes])
  }
}
