import { Hex, type GetProofReturnType } from 'viem';
import { Hardfork, Chain, Common } from '@ethereumjs/common';

export interface Submission {
    hash: `0x${string}`;
    signature: `0x${string}`;
    signer: `0x${string}`;
}

export interface MessageMetadata {
    id: string;
    timestamp: number;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    submission: Submission;
}

export interface BridgeResponse {
    signature: Hex;
    size: number;
    root: Hex;
    status: "queued" | "processing" | "completed";
}

export interface APIResponse<T = BridgeResponse> {
    success: boolean;
    data?: T;
    error?: string;
    status?: string;
    signature: `0x${string}`;
}

export type StorageProof = GetProofReturnType['storageProof'][number];

export interface BlockHeaderOptions {
    chain?: Chain;
    hardfork?: Hardfork;
    common?: Common;
}