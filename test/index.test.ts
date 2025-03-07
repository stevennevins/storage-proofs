import { describe, it, expect } from 'vitest'
import { createPublicClient, http, Hex } from 'viem'
import { foundry } from 'viem/chains'
import { getContractProof, getContractProofMultiSlot } from '../src/proofs'
import { verifyProof } from '../src/verification'

const STORAGE_ADDRESS: Hex = '0x5fbdb2315678afecb367f032d93f642f64180aa3'
const STORAGE_SLOT: Hex = '0x0000000000000000000000000000000000000000000000000000000000000000'
const EXPECTED_VALUE = 42n

describe('Storage Proofs', () => {
    const client = createPublicClient({
        chain: foundry,
        transport: http()
    })

    describe('getContractProof', () => {
        it('should fetch proof for storage slot', async () => {
            const proof = await getContractProof(client, STORAGE_ADDRESS, STORAGE_SLOT)
            expect(proof.storageProof[0].value).toBe(EXPECTED_VALUE)
            expect(proof.storageProof[0].key).toBe(STORAGE_SLOT)
        })

        it('should handle non-existent storage slot', async () => {
            const nonExistentSlot: Hex = '0x1111111111111111111111111111111111111111111111111111111111111111'
            const proof = await getContractProof(client, STORAGE_ADDRESS, nonExistentSlot)
            expect(proof.storageProof[0].value).toBe(0n)
        })

        it('should fetch proof for multiple slots', async () => {
            const slots = [STORAGE_SLOT] as Hex[]
            const proof = await getContractProofMultiSlot(client, STORAGE_ADDRESS, slots)
            expect(proof.storageProof).toHaveLength(1)
            expect(proof.storageProof[0].value).toBe(EXPECTED_VALUE)
        })
    })

    describe('verifyProof', () => {
        it('should verify the storage proof', async () => {
            const proof = await getContractProof(client, STORAGE_ADDRESS, STORAGE_SLOT)
            const block = await client.getBlock()
            const isValid = await verifyProof(proof, block.stateRoot, STORAGE_ADDRESS)
            expect(isValid).toBe(true)
        })

        it('should fail verification with invalid state root', async () => {
            const proof = await getContractProof(client, STORAGE_ADDRESS, STORAGE_SLOT)
            const invalidStateRoot: Hex = '0x1111111111111111111111111111111111111111111111111111111111111111'
            const isValid = await verifyProof(proof, invalidStateRoot, STORAGE_ADDRESS)
            expect(isValid).toBe(false)
        })

        it('should fail verification with invalid address', async () => {
            const proof = await getContractProof(client, STORAGE_ADDRESS, STORAGE_SLOT)
            const block = await client.getBlock()
            const invalidAddress: Hex = '0x1111111111111111111111111111111111111111'
            const isValid = await verifyProof(proof, block.stateRoot, invalidAddress)
            expect(isValid).toBe(false)
        })
    })
})