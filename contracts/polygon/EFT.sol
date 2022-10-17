// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EFT is ERC20, Ownable {
    constructor() ERC20("EFT", "EFT") {}

    /// @dev Only the Treasury (owner) is allowed to mint new tokens
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /// @dev Only the Treasury (owner) is allowed to burn tokens
    function burn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }
}