# multiblock

Useful datat structures and libraries for working
with many IPLD blocks as larger Sets().

On some level, this is the "BGP Layer" of IPFS Data,
or at least one version of it.

## car-cache

This is a binary serialization of a CAR index that can be
hot loaded in and out of various data-structures.

There are two blocks types and an aggregate of both blocks
together that can be addressed as a block together, so
there are 3 multiformats in total.

* The first block is a delta compressed parse of the CAR file.
* The second block is a linear encoding of the multihashe
digests that appear in that CAR file, the parsing which can be determined from the previous block,
which is why
* The third block is just a varint for the size of the first block,
  proceeded by the first block, then the second.

It is very important that these are single blocks and not some kind of
open ended multiblock structure. The literal "cost" of indexing this
CAR file and the resulting cost of publishing provider records and making
the individual blocks available can be estimated very accurately from
the size of this block.

If the block is larger than one megabyte, that's an expensive CAR file, and
you'll need a system that has larger than one megabyte limits on the
indexing of that data.

You can easily map CAR CID, COMMP, and other verifiable identifiers you have
for transacting with the CAR data to records of these blocks. This allows
for cache providers and other intermediaries to more cheaply store and
hot-load indexes of data they don't actually maintain locally but know
how to get should the need arise.

```javascript
import Transaction from 'car-transaction'
import CarCache from 'multiblock/car-cache'

const run = async () => {
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

run()
```

# multi-hamt

Multi-hamt is a specialized HAMT implementation that maps
the indexed digest contents of `car-cache` blocks to user
provided values (typically the location of a CAR file or its
CAR CID).

Queries to Multi-hamt return not only the location, but also the byte
offsets in the CAR you want for any related parsing.

```javascript
const cache1 = getCarCacheUnionBlock()
const cache2 = getCarCacheUnionBlock()

const hamt = MultiHAMT.create({ memdepth: 2 })
hamt.load(cache1)
hamt.load(cache2)

const matches = hamt.match(HashDigestBytes)
[ [ value, parse ] ]
```


