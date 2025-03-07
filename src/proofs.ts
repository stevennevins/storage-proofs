import { Hex, PublicClient, GetProofReturnType } from 'viem'

/**
 * Fetches proof data for a contract's storage at a specific slot
 *
 * @param client - The viem public client to use for the request
 * @param contractAddress - The address of the contract
 * @param storageSlot - The storage slot to get proof for
 * @param blockNumber - Optional block number to get proof at (defaults to latest)
 * @returns Promise with the proof data
 */
export async function getContractProof(
    client: PublicClient,
    contractAddress: Hex,
    storageSlot: Hex,
    blockNumber?: bigint
): Promise<GetProofReturnType> {
    return client.getProof({
        address: contractAddress,
        storageKeys: [storageSlot],
        ...(blockNumber !== undefined ? { blockNumber } : {})
    })
}

/**
 * Fetches proof data for multiple storage slots of a contract
 *
 * @param client - The viem public client to use for the request
 * @param contractAddress - The address of the contract
 * @param storageSlots - Array of storage slots to get proofs for
 * @param blockNumber - Optional block number to get proof at (defaults to latest)
 * @returns Promise with the proof data
 */
export async function getContractProofMultiSlot(
    client: PublicClient,
    contractAddress: Hex,
    storageSlots: Hex[],
    blockNumber?: bigint
): Promise<GetProofReturnType> {
    return client.getProof({
        address: contractAddress,
        storageKeys: storageSlots,
        ...(blockNumber !== undefined ? { blockNumber } : {})
    })
}