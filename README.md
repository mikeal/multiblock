# `multiblock`

Multiblock is a collection of multiformat protocols that,
in aggregate, combine to provide an added layer of determinism
over existing IPFS protocols, **without breaking or modifying
any existing IPFS protocols.**

As we are well within the multihash protocol, the following protocols
only ensure determinism per multihash and the same block data addressed
with another hashing algorithm will of course produce differentiated
determinism per multihash algorithm.

Multiblock offers:
* addresses and format for CID Sets
* addresses and format for Block Sets
* incremental verification of streamed block data
* "deterministic CAR files"
* "CAR indexing"
* and some other goodness :)

Since each of these protocols is a multiformat, and it's too early to
assign identifiers, the shortform string identifier
is used in each README header.

<img width="492" alt="Screen Shot 2022-10-07 at 6 55 23 PM" src="https://user-images.githubusercontent.com/579/194682288-1e3a4f19-b703-4921-9c05-311ff67e883b.png">

All the protocols are designed to fit into the existing CAR format **AND**
can be independently addressed by CID's w/ new codecs such that the
CAR itself can be split into each of these parts.

## `lmh` - Length Prefixed Multihash

It is often the case that a data provider does not wish to agree to
unbounded reads, and this even applies to the block layer as we are
expanding in some systems beyond the traditional 2mb limit. It's time 
for a multihash address that can include the size of the block
data as part of its multihash verification such that it provides a good
contract between the reader and the provider.

`lmh` is a multihash that contains:
* a multihash
* the length of the corresponding block data

An `lmh` can be produced for any existing multihash if you know the
size of the block data it belongs to.

## `ccs` - Compressed CID Set

This is an IPLD codec and block format that represents a Set
of CIDs deterministically ordered and encoded such that each
one represents the only address (per mulithash) for a
group of CIDs.

Common digests and prefixes are compressed out of the format
and it is strictly encoded as a single block. A future format
may choose to tackle larger sets, but we have numerous use
cases in which we need a guarantee the Set will fit in memory
so a single block format is ideal at this time.

Since the Set is compressed into a radix, there are a few
IPLD schemas to choose from for the IPLD Data Model representation,
but we should expect that a simple List of Links will be
the most common.

Lastly, **all** CID's MUST use the above `lmh` (length prefixed multihash)
for every CID. This is what allows `ccs` to be used for
incremental verfiication of a Block Set, and as an index for random
access into the block data.

## `cbs` - CAR Block Set

This is a set of blocks in CAR block format, ordered in the same stable sorting algorithm
as the above CID Set, all encoded with `raw` and a regular
multihash (no `lmh` since CAR block data already has the length).

Preceeding these blocks, is the block data for the CID Set.

Since there is only a single codec for the encoding of the blocks (`raw`)
the CID Set, which must occur first in the CAR Block Set,
provides a means of incremental verification and random access
indexing of the corresponding CAR block data.

Since the CID Set is addressed separately, it can easily be loaded
separately.

## `multiblock` - multiformat identifier for this protocol

Used for CID's that are the multihash of the CID Set + Block Set.

These can be used as a secure means of one-to-one mapping of
this data structure to inclusion proofs. As an example,
if this data were zero-filled to meet the minimum size for a
Piece CID in Filecoin, the corresponding Piece CID would
map one-to-one with a `multiblock` CID and this fact is
cryptographically secure.

## `vch` - Verifiable CAR Header

It's tempting to skip striaght to deterministic CAR files, but we
have numerous use cases that use the CAR header root to signal
behavior that cannot be deterministically generated from the CID/Block Set.

A CAR header that:
* Must have single root.
* Must include a property `multiblock` that is a List of three entries
  * CID of the CID Set.
    * This CID MUST use `lmh`.
  * CID of the Block Set.
    * This CID MUST use `lmh`.
  * CID of the `multiblock` codec, which is a multihash of the CAR body
    without the header (obviously).
  
The "multiblock" property signals to anyone reading the CAR protocol
that the corresponding block data can and should be additionally
verified, but will obviously be ignored by anyone implementing the CAR
protocol without these `multiblock` additions. 

Unlike `dch` described below, the root is advisory and will not be
verified as being part of the Block Set.

These properties and **only these properties** may appear to ensure a
deterministic encoding of the root and CID Set together.

The `vch` codec is used for addressing and identifying CAR headers
stored outside the original CAR and MUST be a hash of *only* the CAR
header. This allows for decompossing and de-duplicating CAR data.

Since the header can be arrived at deterministically, its size can be
predicted and skipped in the CAR it is written to.

## `dch` - Deterministic CAR Header

A CAR header that:
* Must have a single root that MUST be a `multiblock` CID.
   * CID of the CID Set.
    * This CID MUST use `lmh`.
Must include a property `multiblock` that is a List of two entries
  * CID of the Block Set.
    * This CID MUST use `lmh`.
  * CID of the `multiblock` codec, which is a multihash of the CAR body
   without the header (obviously).
    * This CID MUST use `lmh`.

This, combined with the above multiformats, compose into a
fully determinsitic CAR encoding.

The CID Set CID is used as a root because it appears in the CAR and
the block refers to all other blocks in the CAR which allows the
CAR file to interop with any system expecting the block data to
be linked from the root.

Since the header can be arrived at deterministically, its size can be
predicted and skipped in the CAR it is written to.
