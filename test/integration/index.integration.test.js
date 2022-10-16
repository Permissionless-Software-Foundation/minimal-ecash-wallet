/*
  Integration tests for the top-level index.js library.
*/

// Public npm libraries.
const assert = require('chai').assert

// Local libraries
const BchWallet = require('../../index')

const restURL = 'https://free-bch.fullstack.cash'

describe('#BchWallet', () => {
  let uut

  beforeEach(() => {
    uut = new BchWallet()
  })

  describe('#constructor', () => {
    it('should create a wallet with no input variables', async () => {
      uut = new BchWallet()
      await uut.walletInfoPromise

      assert.include(uut.walletInfo.cashAddress, 'bitcoincash:')
    })

    it('should create a wallet with a prior mnemonic', async () => {
      const mnemonic =
        'van human plastic grain brick hill bus twist sister bachelor near fabric'

      uut = new BchWallet(mnemonic)
      await uut.walletInfoPromise

      assert.include(
        uut.walletInfo.cashAddress,
        'bitcoincash:qqxv68xtmlascjyehdy92gjph5xgxa00sq6gmttzrl'
      )
    })
  })

  describe('#create', () => {
    it('should create a wallet with a prior mnemonic', async () => {
      const mnemonic =
        'van human plastic grain brick hill bus twist sister bachelor near fabric'

      const walletPromise = await uut.create(mnemonic)
      // console.log(`walletPromise: ${JSON.stringify(walletPromise, null, 2)}`)

      assert.include(
        walletPromise.cashAddress,
        'bitcoincash:qqxv68xtmlascjyehdy92gjph5xgxa00sq6gmttzrl'
      )
    })

    it('should create a wallet with a private key', async () => {
      const wif = 'KyGrqLtG5PLf97Lu6RXDMGKg6YbcmRKCemgoiufFXPmvQWyvThvE'

      const walletPromise = await uut.create(wif)
      // console.log(`walletPromise: ${JSON.stringify(walletPromise, null, 2)}`)

      assert.include(
        walletPromise.cashAddress,
        'bitcoincash:qpkjakz70s2xrkjpfn6tyzcnuxkyjdsa3ug45pw27y'
      )
    })
  })

  describe('#getBalance', () => {
    it('should get the balance for an address', async () => {
      const addr = 'bitcoincash:qqh793x9au6ehvh7r2zflzguanlme760wuzehgzjh9'
      const result = await uut.getBalance(addr)
      // console.log(`result: ${JSON.stringify(result, null, 2)}`);

      assert.isAbove(result, 546)
    })
  })

  describe('#utxoIsValid', () => {
    it('should return true for valid UTXO using fullstack interface', async () => {
      const utxo = {
        txid: 'fab35b1365903a38f7f84bea3019cccf7ac7ff2683e8d9fc5cad42e784ddf995',
        vout: 1
      }

      const result = await uut.utxoIsValid(utxo)

      assert.equal(result, true)
    })

    it('should return true for valid UTXO using consumer-api interface', async () => {
      uut = new BchWallet(undefined, { interface: 'consumer-api', restURL })

      const utxo = {
        txid: 'b94e1ff82eb5781f98296f0af2488ff06202f12ee92b0175963b8dba688d1b40',
        vout: 0
      }

      const result = await uut.utxoIsValid(utxo)

      assert.equal(result, true)
    })

    it('should return false for invalid UTXO using fullstack interface', async () => {
      const utxo = {
        txid: '17754221b29f189532d4fc2ae89fb467ad2dede30fdec4854eb2129b3ba90d7a',
        vout: 0
      }

      const result = await uut.utxoIsValid(utxo)

      assert.equal(result, false)
    })

    it('should return true for valid UTXO using consumer-api interface', async () => {
      uut = new BchWallet(undefined, { interface: 'consumer-api', restURL, noUpdate: true })

      const utxo = {
        txid: '17754221b29f189532d4fc2ae89fb467ad2dede30fdec4854eb2129b3ba90d7a',
        vout: 0
      }

      const result = await uut.utxoIsValid(utxo)

      assert.equal(result, false)
    })
  })

  describe('#getTokenData', () => {
    // it('should get token data from fullstack.cash', async () => {
    //   const tokenId = 'fab35b1365903a38f7f84bea3019cccf7ac7ff2683e8d9fc5cad42e784ddf995'
    //
    //   const result = await uut.getTokenData(tokenId)
    //   // console.log('result: ', result)
    //
    //   assert.include(result.immutableData, 'ipfs')
    //   assert.include(result.mutableData, 'ipfs')
    // })

    it('should get token data from free-bch', async () => {
      uut = new BchWallet(undefined, { interface: 'consumer-api', restURL, noUpdate: true })

      const tokenId = 'eb93f05553ff088bffb0ec687519e83c59e5108c160f7c25a4b6c45109d7e40b'

      const result = await uut.getTokenData(tokenId)
      // console.log('result: ', result)

      assert.include(result.immutableData, 'ipfs')
      assert.include(result.mutableData, 'ipfs')
    })
  })

  describe('#getUtxos', () => {
    it('should get UTXOs for an ecash address', async () => {
      uut = new BchWallet(undefined, { interface: 'rest-api', restURL: 'https://abc.fullstack.cash/v5/', noUpdate: true })

      const addr = 'ecash:qr5c4hfy52zn87484cucvzle5pljz0gtr5vhtw9z09'

      const result = await uut.getUtxos(addr)
      // console.log('result: ', result)

      assert.isAbove(result.bchUtxos.length, 0)
      assert.isAbove(result.slpUtxos.type1.tokens.length, 0)
    })
  })

  describe('#getTokenData2', () => {
    it('should get token data from fullstack.cash', async () => {
      const tokenId = 'b93137050d6a6dcdba12432f018660541ffb4b457bf4020258272632c13e92d9'

      const result = await uut.getTokenData2(tokenId)
      console.log('result: ', result)

      assert.property(result, 'tokenIcon')
      assert.property(result, 'tokenStats')
      assert.property(result, 'optimizedTokenIcon')
      assert.property(result, 'iconRepoCompatible')
      assert.property(result, 'ps002Compatible')
    })

    // it('should get token data from free-bch', async () => {
    //   uut = new BchWallet(undefined, { interface: 'consumer-api', restURL, noUpdate: true })
    //
    //   const tokenId = 'eb93f05553ff088bffb0ec687519e83c59e5108c160f7c25a4b6c45109d7e40b'
    //
    //   const result = await uut.getTokenData(tokenId)
    //   // console.log('result: ', result)
    //
    //   assert.include(result.immutableData, 'ipfs')
    //   assert.include(result.mutableData, 'ipfs')
    // })
  })
})
