//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import {FxBaseRootTunnel} from "@maticnetwork/fx-portal/contracts/tunnel/FxBaseRootTunnel.sol";
import {Treasury} from "./polygon/Treasury.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title Contract to swap ETH to Polygon EFT tokens and EFT tokens (that were burned on Polygon) back to ETH
contract TokenSwap is FxBaseRootTunnel {

  // Address where the ETH is sent to
  address payable governanceFund;

  // NFT with reduced withdrawal fees
  IERC721 memberNFT;

  // Address that is allowed to perform privileged operations
  address owner;

  // Withdrawal fees
  uint256 constant ONE_HUNDRED_PERCENT = 1000; // Scale for fees
  uint256 memberWithdrawalFee = 0;
  uint256 nonMemberWithdrawalFee = 30; // 3%

  modifier onlyOwner {
    require(msg.sender == owner);
    _;
  }

  /// @param _cpManager Checkpoint Manager address (on Ethereum) for Polygon
  /// @param _fxRoot fx-portal root address (https://github.com/fx-portal/contracts)
  /// @param _governanceFund Address of the governance fund where ETH will be sent to
  constructor(address _cpManager, address _fxRoot, address _governanceFund, address _memberNFT, address _owner) FxBaseRootTunnel(_cpManager, _fxRoot) {
    require(_governanceFund != address(0), "Must provide governance fund address");
    require(_memberNFT != address(0), "Must provide a member NFT address");
    require(_owner != address(0), "Must provide a member NFT address");
    owner = _owner;
    memberNFT = IERC721(_memberNFT);
    governanceFund = payable(_governanceFund);
  }

  /// @notice How many EFTs a user gets per ETH
  uint16 constant conversionFactor = 1000;

  /// @notice Converts the provided ETH to EFT tokens on Polygon. Balance of the calling user is updated on Polygon
  function convertETHtoEFT() external payable {
    require(msg.value > 0, "Must send ETH");
    uint256 eftAmount = msg.value * conversionFactor;
    bytes memory message = abi.encodeWithSelector(Treasury.mintForUser.selector, msg.sender, eftAmount);
    _sendMessageToChild(message);
    _transferETH(governanceFund, msg.value);
  }

  /// @notice Deposits to the EFT Treasury on Polygon
  function depositTreasury() external payable {
    require(msg.value > 0, "Must send ETH");
    uint256 eftAmount = msg.value * conversionFactor;
    bytes memory message = abi.encodeWithSelector(Treasury.addToTreasury.selector, eftAmount);
    _sendMessageToChild(message);
    _transferETH(governanceFund, msg.value);
  }

  function setMemberWithdrawalFee(uint256 _memberWithdrawalFee) public onlyOwner {
    require(_memberWithdrawalFee < ONE_HUNDRED_PERCENT, "Fee too high");
    memberWithdrawalFee = _memberWithdrawalFee;
  }

  function setNonMemberWithdrawalFee(uint256 _nonMemberWithdrawalFee) public onlyOwner {
    require(_nonMemberWithdrawalFee < ONE_HUNDRED_PERCENT, "Fee too high");
    nonMemberWithdrawalFee = _nonMemberWithdrawalFee;
  }

  function setMemberNFT(address _memberNFT) public onlyOwner {
    require(_memberNFT != address(0));
    memberNFT = IERC721(_memberNFT);
  }

  /// @notice Called with messages from the Polygon treasury when receiveMessage is called with a valid receipt
  /// @dev FxBaseRootTunnel validates that only messages from fxChildTunnel (i.e., the treasury) are passed to the function.
  function _processMessageFromChild(
      bytes memory data
  ) internal override {
    address user;
    uint256 amountEft;
    (user, amountEft) = abi.decode(data, (address, uint256));
    if (user == address(0)) {
      // withdrawFromTreasury on Polygon, i.e. EFTs from treasury were burned. No fees deducted
      _transferETH(governanceFund, amountEft / conversionFactor);
    } else {
      uint256 fee;
      if (memberNFT.balanceOf(user) > 0) {
        fee = memberWithdrawalFee;
      } else {
        fee = nonMemberWithdrawalFee;
      }
      uint256 feeAmount = fee * amountEft / ONE_HUNDRED_PERCENT;
      uint256 netAmount = amountEft - feeAmount;
      _transferETH(payable(user), netAmount / conversionFactor);
      if (feeAmount > 0) {
        _transferETH(governanceFund, feeAmount / conversionFactor);
      }
    }
  }

  function _transferETH(address payable recipient, uint256 amount) internal {
      (bool success, ) = recipient.call{value: amount}("");
      require(success, "Transfer failed.");
  }

  receive() external payable {
  }
}