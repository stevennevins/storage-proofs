// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "../lib/forge-std/src/Test.sol";
import { Storage } from "../src/contracts/Storage.sol";

contract StorageTest is Test {
    Storage storage_;

    event ValueSet(uint256 indexed newValue);

    function setUp() public {
        storage_ = new Storage();
    }

    function test_SetAndGet() public {
        storage_.set(42);
        assertEq(storage_.get(), 42);
    }

    function test_EmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit ValueSet(42);
        storage_.set(42);
    }

    function testFail_SetZero() public {
        storage_.set(0);
    }
}
