// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/FireSparkNFT.sol";

contract DeployFireSparkNFT is Script {
    function run() external {
        vm.startBroadcast();
        FireSparkNFT nft = new FireSparkNFT(msg.sender);
        vm.stopBroadcast();
    }
}
