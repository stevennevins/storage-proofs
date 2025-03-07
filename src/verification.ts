import { Hex, keccak256, type GetProofReturnType } from 'viem'
import { RLP } from '@ethereumjs/rlp'
import { Trie } from '@ethereumjs/trie'
import { hexToBuffer, bigintToBuffer } from './utils'
import { StorageProof } from './types'

export async function verifyStorageProof(storageProof: StorageProof, storageRoot: Hex): Promise<boolean> {
    try {
        const trie = new Trie()
        const key = hexToBuffer(keccak256(storageProof.key))
        const proofNodes = storageProof.proof.map(hexToBuffer)
        const value = bigintToBuffer(storageProof.value)

        const result = await trie.verifyProof(hexToBuffer(storageRoot), key, proofNodes)
        if (!result) return false

        // Handle RLP encoded results
        const resultHex = Buffer.from(result).toString('hex')
        let processedResult: Buffer

        // If the result starts with 'a0', it's an RLP encoded string of length 32 bytes
        if (resultHex.startsWith('a0')) {
            processedResult = Buffer.from(resultHex.slice(2), 'hex')
        } else {
            processedResult = Buffer.from(result)
        }

        const processedResultHex = '0x' + processedResult.toString('hex')
        const resultValue = processedResultHex === '0x' ? 0n : BigInt(processedResultHex)

        // Ensure expectedValue is a BigInt
        const expectedValue = typeof storageProof.value === 'bigint'
            ? storageProof.value
            : BigInt(storageProof.value)

        return resultValue === expectedValue
    } catch (error) {
        console.error("Error in verifyStorageProof:", error);
        return false
    }
}

export async function verifyProof(proof: GetProofReturnType, stateRoot: Hex, address: Hex): Promise<boolean> {
    try {
        // Check if stateRoot is valid (32 bytes)
        if (hexToBuffer(stateRoot).length !== 32) {
            console.error(`Invalid root length. Roots are 32 bytes, got ${hexToBuffer(stateRoot).length} bytes`);
            return false;
        }

        const trie = new Trie()
        const key = hexToBuffer(keccak256(address))
        const proofNodes = proof.accountProof.map(hexToBuffer)

        const result = await trie.verifyProof(hexToBuffer(stateRoot), key, proofNodes)
        if (!result) return false

        const encodedAccount = RLP.encode([
            bigintToBuffer(BigInt(proof.nonce)),
            bigintToBuffer(proof.balance),
            hexToBuffer(proof.storageHash),
            hexToBuffer(proof.codeHash)
        ])

        if (Buffer.compare(result, encodedAccount) !== 0) {
            return false
        }

        const storageResults = await Promise.all(
            proof.storageProof.map(storageProof =>
                verifyStorageProof(storageProof, proof.storageHash)
            )
        )
        return storageResults.every(result => result)
    } catch (error) {
        console.error("Error in verifyProof:", error);
        return false
    }
}