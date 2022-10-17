//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import {CrossChainEnabledPolygonChild} from
    "@openzeppelin/contracts/crosschain/polygon/CrossChainEnabledPolygonChild.sol";
import {AccessControlCrossChain} from
    "@openzeppelin/contracts/access/AccessControlCrossChain.sol";
import {EFT} from "./EFT.sol";


contract Treasury is
    CrossChainEnabledPolygonChild,
    AccessControlCrossChain
{
    // Address that is allowed to perform privileged operations
    address owner;

    modifier onlyOwner {
      require(msg.sender == owner);
      _;
    }

    // TokenSwap on L1 will get data from this event
    event MessageSent(bytes message);
    
    // Address of the EFT token. The token is created and owned by the treasury.
    EFT public eft;


    /// @param rootParent The address of the TokenSwap contract on Ethereum. 
    ///                   The roles are configured such that only this contract (when sending cross chain messages) can call restricted functions.
    constructor(
        address rootParent,
        address fxChild,
        address _owner
    ) CrossChainEnabledPolygonChild(fxChild) {
        require(rootParent != address(0), "Must provide address of the parent");
        require(_owner != address(0), "Owner must be provided");
        owner = _owner;
        _grantRole(
            _crossChainRoleAlias(DEFAULT_ADMIN_ROLE),
            rootParent
        );
        eft = new EFT();
    }

    /// @notice Mint EFTs for a provided user.
    /// @dev Only callable via cross chain transfers, originating from the TokenSwap contract.
    /// @param user Address of the user that receives the EFT.
    /// @param amount Amount of EFT to mint for the user.
    function mintForUser(
        address user,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
      eft.mint(user, amount);
    }

    /// @notice Mint EFTs for a the treasury.
    /// @dev Only callable via cross chain transfers, originating from the TokenSwap contract.
    /// @param amount Amount of EFT to mint for treasury contract.
    function addToTreasury(
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
      eft.mint(address(this), amount);
    }

    /// @notice Withdraw EFTs for ETH. The ETH redemption happens on the Ethereum chain based on the receipt that is generated using this transaction.
    /// @param amount Amount of EFT to withdraw for ETH.
    function withdraw(
      uint256 amount
    ) external {
      require(eft.balanceOf(msg.sender) >= amount, "Insufficient funds");
      eft.burn(msg.sender, amount);
      _sendMessageToRoot(abi.encode(msg.sender, amount));
    }

    /// @notice Withdraw EFTs from the treasury for ETH. Only callable by the owner
    /// @param amount Amount of EFT to withdraw for ETH.
    function withdrawFromTreasury(
      uint256 amount
    ) external onlyOwner {
      require(eft.balanceOf(address(this)) >= amount, "Insufficient funds");
      eft.burn(address(this), amount);
      _sendMessageToRoot(abi.encode(address(0), amount));
    }

    /// @notice Emit a message that can be used to generate a receipt, which is the input of TokenSwap's receiveMessage on Ethereum.
    /// @dev These receipts are not automatically transmitted to Ethereum, a user or relayer bot has to generate the receipt and call receiveMessage with it.
    function _sendMessageToRoot(bytes memory message) internal {
      emit MessageSent(message);
    }
}