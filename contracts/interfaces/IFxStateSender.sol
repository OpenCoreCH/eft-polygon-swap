interface IFxStateSender {
    function sendMessageToChild(address _receiver, bytes calldata _data) external;
}