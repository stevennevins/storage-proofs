import { Hex, toBytes, toHex } from 'viem'
import { BlockHeader } from '@ethereumjs/block'
import { Common, Chain, Hardfork } from '@ethereumjs/common'
import type { PublicClient } from 'viem'
import { BlockHeaderOptions } from './types'

/**
 * Block header fields and their Ethereum upgrade associations:
 *
 * Base Fields (Pre-London):
 * - parentHash: Hash of the parent block
 * - uncleHash/sha3Uncles: Hash of the uncle blocks
 * - coinbase/miner: Address of the miner
 * - stateRoot: Root of the state trie
 * - transactionsTrie/transactionsRoot: Root of the transactions trie
 * - receiptTrie/receiptsRoot: Root of the receipts trie
 * - logsBloom: Bloom filter of logs
 * - difficulty: Block difficulty (0 post-merge)
 * - number: Block number
 * - gasLimit: Maximum gas allowed
 * - gasUsed: Gas used in the block
 * - timestamp: Block timestamp
 * - extraData: Extra data field
 * - mixHash: Mix hash for PoW (repurposed post-merge)
 * - nonce: Nonce for PoW (repurposed post-merge)
 *
 * London Upgrade (EIP-1559):
 * - baseFeePerGas: Base fee per gas unit
 *
 * Shanghai Upgrade:
 * - withdrawalsRoot: Root hash of withdrawals
 *
 * Cancun Upgrade:
 * - blobGasUsed: Gas used by blobs
 * - excessBlobGas: Excess blob gas
 * - parentBeaconBlockRoot: Parent beacon block root
 */

/**
 * Creates a BlockHeader instance from block data
 * @param block The block data retrieved from a client
 * @param options Options for creating the BlockHeader
 * @returns BlockHeader instance
 */
export function createBlockHeader(
    block: any,
    options: BlockHeaderOptions = {}
): BlockHeader {
    // Use provided common or create a new Common instance
    const common = options.common ||
        new Common({
            chain: options.chain || Chain.Sepolia,
            hardfork: options.hardfork || Hardfork.Cancun
        })

    const headerData = {
        parentHash: toBytes(block.parentHash),
        uncleHash: toBytes(block.sha3Uncles),
        coinbase: toBytes(block.miner),
        stateRoot: toBytes(block.stateRoot as Hex),
        transactionsTrie: toBytes(block.transactionsRoot),
        receiptTrie: toBytes(block.receiptsRoot),
        logsBloom: toBytes(block.logsBloom),
        difficulty: block.difficulty ? BigInt(block.difficulty) : BigInt(0),
        number: BigInt(block.number),
        gasLimit: BigInt(block.gasLimit),
        gasUsed: BigInt(block.gasUsed),
        timestamp: BigInt(block.timestamp),
        extraData: toBytes(block.extraData || '0x'),
        mixHash: toBytes(block.mixHash || '0x'),
        nonce: toBytes(block.nonce || '0x0000000000000000'),
        baseFeePerGas: block.baseFeePerGas ? BigInt(block.baseFeePerGas) : undefined,
        withdrawalsRoot: block.withdrawalsRoot ? toBytes(block.withdrawalsRoot) : undefined,
        blobGasUsed: block.blobGasUsed ? BigInt(block.blobGasUsed) : undefined,
        excessBlobGas: block.excessBlobGas ? BigInt(block.excessBlobGas) : undefined,
        parentBeaconBlockRoot: block.parentBeaconBlockRoot ? toBytes(block.parentBeaconBlockRoot) : undefined
    }

    return BlockHeader.fromHeaderData(headerData, { common })
}

/**
 * Creates a custom Common instance for non-standard chains like Anvil
 * @param chainId The chain ID
 * @param networkId The network ID (defaults to chainId)
 * @param hardfork The hardfork (default: London)
 * @param block Optional block data to extract genesis parameters
 * @returns Custom Common instance
 */
export function createCustomCommon(
    chainId: number,
    networkId: number = chainId,
    hardfork: Hardfork = Hardfork.London,
    block?: any
): Common {
    return Common.custom({
        chainId,
        networkId,
        defaultHardfork: hardfork,
        genesis: block ? {
            timestamp: String(block.timestamp),
            gasLimit: Number(block.gasLimit),
            difficulty: Number(block.difficulty || 0),
            nonce: '0x0000000000000000',
            extraData: '0x'
        } : undefined
    })
}

/**
 * Fetches a block and creates a BlockHeader instance
 * @param client The viem public client
 * @param blockNumber The block number
 * @param options Options for creating the BlockHeader
 * @returns BlockHeader instance
 */
export async function getRlpEncodedHeader(
    client: PublicClient,
    blockNumber: bigint,
    options: BlockHeaderOptions = {}
): Promise<Hex> {
    const block = await client.getBlock({ blockNumber })
    const blockHeader = createBlockHeader(block, options);
    return toRlpEncodedHeader(blockHeader);
}

/**
 * Generates RLP encoded block header
 * @param blockHeader The BlockHeader instance
 * @returns RLP encoded block header as a hex string
 */
export function toRlpEncodedHeader(blockHeader: BlockHeader): Hex {
    const rlpHeader = blockHeader.serialize()
    return toHex(rlpHeader)
}

/**
 * Calculates the hash of a block header
 * @param blockHeader The BlockHeader instance
 * @returns Block hash as a hex string
 */
export function calculateBlockHeaderHash(blockHeader: BlockHeader): Hex {
    return '0x' + Buffer.from(blockHeader.hash()).toString('hex') as Hex
}

/**
 * Fetches a block and creates a BlockHeader instance
 * @param client The viem public client
 * @param blockNumber The block number
 * @param options Options for creating the BlockHeader
 * @returns BlockHeader instance
 */
export async function getBlockHeader(
    client: PublicClient,
    blockNumber: bigint,
    options: BlockHeaderOptions = {}
): Promise<BlockHeader> {
    const block = await client.getBlock({ blockNumber })
    return createBlockHeader(block, options)
}