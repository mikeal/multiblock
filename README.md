# multiblock

Multiblock is a collection of multiformat protocols that,
in aggregate, combine to provide an added layer of determinism
over existing IPFS protocols, **without breaking or modifying
any existing IPFS protocols.**

Multiblock offers:
* addresses and identifiers for CID Sets
* addresses and identifiers for Block Sets
* incremental verification of streamed block data
* "deterministic CAR files"
* "CAR indexing"
* and some other goodness :)

Since each of these protocols is a multiformat, the shortform identifier
is used in each header since it is too early to assign multiformat
identifiers to protocol

## lmh - Length Prefixed Multihash

It is often the case that a data provider does not wish to agree to
unbounded reads of any data, even at the block layer (which we are
expanding in some systems beyond the traditional 2mb limit).

lmh is a multihash that contains:
* a multihash
* the length of the corresponding block data

An lmh can be produced for any existing multihash if you know the
size of the block data it belongs to.

## ccs - Compressed CID Set

This is an IPLD codec and block format that represents a Set
of CIDs deterministically ordered and encoded such that each
one represents the only address (per mulithash) for a
group of CIDs.

Common digests and prefixes are compressed out of the format
and it is strictly encoded as a single block. A future format
may choose to tackle larger sets, but we have numerous use
cases in which we need a guarantee the set will fit in memory
so a single block format is ideal at this time.

Since the Set is compressed into a radix, there are a few
IPFS schemas to choose from for the IPFS Data Model representation,
but we should expect that a simple List of Links will be
the most common.

Lastly, **all** CID's must use the above lmh (length prefixed multihash)
for every CID. This is what allows ccs to be used for
incremental verfiication of a Block Set

## cbs - CAR Block Set

This is a set of blocks, ordered in the same stable sorting algorithm
as the above CID Set, all encoded with `raw` and a regular
multihash (no lmh since CAR block data already has the length).

Proceeding these blocks, is the block data for the CID Set.

Since there is only a single codec for the encoding of the blocks (`raw`)
the CID Set, which must occur first in the CAR Block Set,
provides a means of incremental verification and random access
indexing of the corresponding CAR block data.

Since the CID Set is addressed separately, it can easily be loaded
separately.

## vch - Verifiable CAR Header

It's tempting to skip striaght to deterministic CAR files, but we
have numerous use cases that use the CAR header root to signal
behavior that cannot be deterministically generated from the CID/Block Set.

A CAR header that:
* Must have single root.
* Must include a property `multiblock` that is a link to the CID Set.
  * This property signals to anyone reading the CAR protocol
    that the corresponding block data can and should be additionally
    verified.

Unlike `dch` described below, the root is advisory.

These properties and only these properties may appear such that there
is a deterministic encoding of the root and CID Set.

The `vch` codec is used for addressing and identifying CAR headers
stored outside the original CAR and MUST be a hash of *only* the CAR
header. This allows for decompossing and de-duplicating CAR data.

## dch - Deterministic CAR Header

A CAR header that:
* Must have a single root that MUST be a CID for the CID Set.
* Has a `multiblock` property set to `true`.

This, combine with the above multiformats, compose into a
fully determinsitic CAR encoding.


