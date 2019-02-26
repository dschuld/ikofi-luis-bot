
class WalletData {
    constructor(walletNumber, pin) {
        this.walletNumber = walletNumber || undefined;
        this.pin = pin || undefined;
    }
};

exports.WalletData = WalletData;
