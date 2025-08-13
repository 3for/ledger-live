export default class TransferMenuDrawer {
  swapMenuButtonId = "swap-transfer-button";
  stakeMenuButtonId = "stake-transfer-button";
  transferButtonId = "transfer-button";

  async open() {
    await tapById(this.transferButtonId);
  }

  async navigateToSwap() {
    await tapById(this.swapMenuButtonId);
  }

  async navigateToStake() {
    await tapById(this.stakeMenuButtonId);
  }
}
