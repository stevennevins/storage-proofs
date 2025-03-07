import { Hex } from 'viem'
import { Buffer } from 'buffer'
import { hexToBytes } from '@ethereumjs/util'

export function hexToBuffer(hex: Hex): Buffer {
    return Buffer.from(hexToBytes(hex))
}

// Helper function to convert bigint to minimal hex representation
export function bigintToBuffer(value: bigint | string): Buffer {
    const bigIntValue = typeof value === 'string' ? BigInt(value) : value
    if (bigIntValue === 0n) return Buffer.alloc(0)
    const hex = bigIntValue.toString(16)
    const paddedHex = hex.length % 2 === 0 ? hex : '0' + hex
    return Buffer.from(hexToBytes(`0x${paddedHex}` as Hex))
}