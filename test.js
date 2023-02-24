import Transaction from 'car-transaction'
import { CarCache } from './index.js'
import { deepStrictEqual as same } from 'assert'

const test = async () => {
  const t = Transaction.create()

  const subCID = await t.write({ some: 'data' })
  const nxtCID = await t.write({ sub: subCID })
  const buffer = await t.commit()

  const cache = CarCache.fromCarBytes(buffer)
  console.log(subCID.multihash.bytes)
  console.log(nxtCID.multihash.bytes)

  // We can now serialize any of the blocks we want

  const compare = (c1, c2, input) => {
    same(c1.block_count, c2.block_count)
    same(c1.digestsList(input), c2.digestsList(input))
  }

  // Parser Serialization (first block type)
  let block, ctest
  block = await cache.parsedBlock()
  ctest = CarCache.fromParsedBlock(block)
  compare(cache, ctest, { carBytes: buffer })

  const digests = cache.digestsList({ carBytes: buffer })

  const dgblock = await cache.digestsBlock({ carBytes: buffer })
  compare(cache, ctest, { digestsBytes: dgblock.bytes })

  block = await cache.unionBlock({ digestsBytes: dgblock.bytes })
  ctest = CarCache.fromUnionBlock(block)
  compare(cache, ctest, { carBytes: buffer })
  compare(cache, ctest, { digestsBytes: dgblock.bytes })
  compare(cache, ctest, { unionBytes: ctest.bytes })
}

test()


