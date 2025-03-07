// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import RLP decoding library (e.g., hamdiallam/Solidity-RLP)
import {RLPReader} from "../../lib/Solidity-RLP/contracts/RLPReader.sol";


/// @title Storage Slot Proof Verifier Library
/// @notice Library for verifying Merkle-Patricia trie proofs of Ethereum storage slots
/// @dev Implements verification of account and storage proofs against block headers
library StorageSlotProofVerifierLib {
    using RLPReader for bytes;
    using RLPReader for RLPReader.RLPItem;

    /// @notice Custom errors for better gas efficiency and clarity
    error InvalidHeaderRLP();
    error BlockHeaderHashMismatch();
    error AccountNotFound();
    error InvalidAccountRLP();
    error InvalidProofNodeHash();
    error InvalidNibbleRange();
    error InvalidProofNodeLength();
    error EmptyCompactValue();
    error KeyMismatchInExtensionOrLeaf();
    error LeafNodePathLengthMismatch();

    /**
     * @notice Verifies an account proof and returns the storage root
     * @param blockHeaderRLP RLP-encoded block header
     * @param blockHash The 32-byte block hash of the block
     * @param account The address whose storage is being proven
     * @param accountProof An array of RLP-encoded MPT nodes proving the account state
     * @return storageRoot The storage root for the account
     */
    function verifyStorageRoot(
        bytes memory blockHeaderRLP,
        bytes32 blockHash,
        address account,
        bytes[] memory accountProof
    ) internal pure returns (bytes32 storageRoot) {
        RLPReader.RLPItem[] memory headerFields = blockHeaderRLP.toRlpItem().toList();
        if (headerFields.length <= 3) {
            revert InvalidHeaderRLP();
        }

        bytes32 stateRoot = bytes32(headerFields[3].toUint());
        if (keccak256(blockHeaderRLP) != blockHash) {
            revert BlockHeaderHashMismatch();
        }

        bytes32 accountNodeHash = stateRoot;
        bytes memory accountKey = abi.encodePacked(keccak256(abi.encodePacked(account)));
        bytes memory accountRlp = _verifyTrieProof(accountKey, accountProof, accountNodeHash);

        if (accountRlp.length == 0) {
            revert AccountNotFound();
        }

        RLPReader.RLPItem[] memory accountFields = accountRlp.toRlpItem().toList();
        if (accountFields.length != 4) {
            revert InvalidAccountRLP();
        }

        return bytes32(accountFields[2].toUint());
    }

    /**
     * @notice Verifies a storage slot proof against a known storage root
     * @param storageRoot The known storage root to verify against
     * @param slot The storage slot (32-byte key) to prove
     * @param storageProof An array of RLP-encoded MPT nodes proving the slot's value
     * @return value The uint256 value contained in the storage slot (zero if not set)
     */
    function verifySlot(
        bytes32 storageRoot,
        bytes32 slot,
        bytes[] memory storageProof
    ) internal pure returns (uint256 value) {
        // Key for storage trie is keccak(slot)
        bytes memory slotKey = abi.encodePacked(keccak256(abi.encodePacked(slot)));
        bytes memory slotRlp = _verifyTrieProof(slotKey, storageProof, storageRoot);
        if (slotRlp.length == 0) {
            // No entry in trie => slot value is 0
            return uint256(0);
        }
        // Decode slot value (RLP) as uint256
        RLPReader.RLPItem memory valueItem = slotRlp.toRlpItem();
        return valueItem.toUint();
    }

    /**
     * @notice Verifies a storage slot proof against a known storage root
     * @param storageRoot The known storage root to verify against
     * @param slot The storage slot (32-byte key) to prove
     * @param storageProof An array of RLP-encoded MPT nodes proving the slot's value
     * @return value The uint256 value contained in the storage slot (zero if not set)
     */
    function verify(
        bytes memory blockHeaderRLP,
        bytes32 blockHash,
        address account,
        bytes[] memory accountProof,
        bytes32 slot,
        bytes[] memory storageProof
    ) internal pure returns (uint256 value, bytes32 storageRoot) {
        storageRoot = verifyStorageRoot(blockHeaderRLP, blockHash, account, accountProof);
        value = verifySlot(storageRoot, slot, storageProof);
    }

    /**
     * @dev Decodes hex-prefix encoding used in Ethereum's MPT
     * @param compact The compact hex-prefix encoded path
     * @return nibbles The decoded nibble array
     * @return isLeaf Whether this is a leaf node
     */
    function _decodeHexPrefix(
        bytes memory compact
    ) internal pure returns (bytes memory nibbles, bool isLeaf) {
        if (compact.length == 0) {
            revert EmptyCompactValue();
        }

        uint8 first = uint8(compact[0]);
        uint8 flag = first >> 4;
        isLeaf = flag >= 2;
        bool hasOddLen = (flag & 1) == 1;

        nibbles = new bytes((compact.length * 2) - (hasOddLen ? 1 : 2));
        uint256 offset = 0;

        if (hasOddLen) {
            nibbles[0] = bytes1(uint8(first & 0x0F));
            offset = 1;
        }

        for (uint256 i = 1; i < compact.length; i++) {
            nibbles[offset] = bytes1(uint8(compact[i] >> 4));
            nibbles[offset + 1] = bytes1(uint8(compact[i] & 0x0F));
            offset += 2;
        }
    }

    /**
     * @dev Verifies a Merkle-Patricia trie proof for a given key against the expected root hash
     * @param encodedKey The full key (as binary) for the trie lookup (already keccak-prefixed for state/storage tries)
     * @param proofNodes An array of RLP-encoded trie nodes forming the proof, starting from the root
     * @param expectedRoot The known trie root hash (stateRoot or storageRoot)
     * @return foundValueRlp The RLP-encoded value of the leaf node if the proof is valid (empty if not found)
     */
    function _verifyTrieProof(
        bytes memory encodedKey,
        bytes[] memory proofNodes,
        bytes32 expectedRoot
    ) internal pure returns (bytes memory foundValueRlp) {
        bytes memory path = _getNibbleArray(encodedKey);
        uint256 pathPtr = 0;
        bytes32 currentNodeHash = expectedRoot;
        bytes memory currentNode;

        for (uint256 i = 0; i < proofNodes.length; i++) {
            currentNode = proofNodes[i];
            if (keccak256(currentNode) != currentNodeHash) {
                revert InvalidProofNodeHash();
            }

            RLPReader.RLPItem[] memory nodeFields = currentNode.toRlpItem().toList();

            if (nodeFields.length == 17) {
                // Branch node handling
                if (pathPtr == path.length) {
                    return nodeFields[16].toBytes();
                }

                uint8 nibble = uint8(path[pathPtr]);
                if (nibble >= 16) {
                    revert InvalidNibbleRange();
                }
                pathPtr++;

                RLPReader.RLPItem memory childItem = nodeFields[nibble];
                if (childItem.len == 0) {
                    return ""; // Proof of absence
                }

                if (!_isInlineNode(childItem)) {
                    currentNodeHash = bytes32(childItem.toUint());
                } else {
                    bytes memory embeddedNode = childItem.toBytes();
                    nodeFields = embeddedNode.toRlpItem().toList();
                    currentNode = embeddedNode;
                }
            } else if (nodeFields.length == 2) {
                // Extension or Leaf node handling
                bytes memory compactPath = nodeFields[0].toBytes();
                (bytes memory nodePath, bool isLeaf) = _decodeHexPrefix(compactPath);

                uint256 sharedNibbleLength = _nibblesToTraverse(nodePath, path, pathPtr);
                if (sharedNibbleLength != nodePath.length) {
                    revert KeyMismatchInExtensionOrLeaf();
                }
                pathPtr += sharedNibbleLength;

                if (isLeaf) {
                    if (pathPtr != path.length) {
                        revert LeafNodePathLengthMismatch();
                    }
                    return nodeFields[1].toBytes();
                } else {
                    currentNodeHash = bytes32(nodeFields[1].toUint());
                }
            } else {
                revert InvalidProofNodeLength();
            }
        }

        return ""; // Key not found
    }

    /**
     * @dev Helper: Convert bytes to nibble array (2 nibbles per byte)
     * @param key The byte array to convert
     * @return A byte array where each byte represents a nibble
     */
    function _getNibbleArray(
        bytes memory key
    ) internal pure returns (bytes memory) {
        // Each byte of the key is split into two nibbles
        bytes memory nibbles = new bytes(key.length * 2);
        for (uint256 i = 0; i < key.length; i++) {
            nibbles[2 * i] = bytes1(uint8(key[i]) >> 4); // high nibble
            nibbles[2 * i + 1] = bytes1(uint8(key[i]) & 0x0F); // low nibble
        }
        return nibbles;
    }

    /**
     * @dev Helper: Determine if an RLP item represents an inline node
     * @param item The RLP item to check
     * @return True if the item represents an inline node
     */
    function _isInlineNode(
        RLPReader.RLPItem memory item
    ) internal pure returns (bool) {
        // In Ethereum's trie, if a child node's RLP < 32 bytes, it is stored inline instead of a 32-byte hash.
        // RLPReader doesn't expose item type directly, but we can infer:
        // If item is a list, or if it's a string shorter than 32 bytes, then it's inline.
        // We approximate by checking the length of the RLP-encoded item.
        return item.len < 32;
    }

    /**
     * @dev Count matching nibbles between partialPath and path at position pathPtr
     * @param partialPath The partial path to compare
     * @param fullPath The full path to compare against
     * @param pathPtr The current position in the full path
     * @return The number of matching nibbles
     */
    function _nibblesToTraverse(
        bytes memory partialPath,
        bytes memory fullPath,
        uint256 pathPtr
    ) internal pure returns (uint256) {
        uint256 len = 0;
        // Traverse while nibbles match
        while (len < partialPath.length && (pathPtr + len) < fullPath.length) {
            if (partialPath[len] != fullPath[pathPtr + len]) {
                break;
            }
            len++;
        }
        return len;
    }
}
