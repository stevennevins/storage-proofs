// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {StorageSlotProofVerifierLib} from "./StorageProofVerifierLib.sol";

contract Storage {
    uint256 private _value;

    event ValueSet(uint256 indexed newValue);

    error InvalidValue();

    function set(uint256 newValue) external {
        if (newValue == 0) revert InvalidValue();
        _value = newValue;
        emit ValueSet(newValue);
    }

    function get() external view returns (uint256) {
        return _value;
    }

    function verify(
        bytes memory blockHeaderRLP,
        bytes32 blockHash,
        address account,
        bytes[] memory accountProof,
        bytes32 slot,
        bytes[] memory storageProof
    ) external pure returns (uint256 value, bytes32 storageRoot) {
        return StorageSlotProofVerifierLib.verify(
            blockHeaderRLP,
            blockHash,
            account,
            accountProof,
            slot,
            storageProof
        );
    }
}
