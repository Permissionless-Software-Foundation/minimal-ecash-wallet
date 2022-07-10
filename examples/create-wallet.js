/*
  An example app for creating a wallet using this library.
*/

const ECashWallet = require('../index')

async function createWallet () {
  try {
    // Instantiate the wallet library.
    const eCashWallet = new ECashWallet()

    // Wait for the wallet to be created.
    await eCashWallet.walletInfoPromise

    // Print out the wallet information.
    console.log(
      `Wallet information: ${JSON.stringify(eCashWallet.walletInfo, null, 2)}`
    )
  } catch (err) {
    console.error('Error: ', err)
  }
}
createWallet()
