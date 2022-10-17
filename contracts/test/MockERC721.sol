//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {ERC721PresetMinterPauserAutoId} from "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

contract MockERC721 is ERC721PresetMinterPauserAutoId {
  constructor() ERC721PresetMinterPauserAutoId("Mock Token", "MOCK", "") {}
}