/*
  Unit tests for the send-bch.js library.
*/

// npm libraries
const assert = require('chai').assert
const sinon = require('sinon')
const BCHJS = require('@psf/bch-js')
const clone = require('lodash.clonedeep')

// Local libraries
const SendBCH = require('../../lib/send-bch')
const AdapterRouter = require('../../lib/adapters/router')
let uut // Unit Under Test

const mockDataLib = require('./mocks/send-bch-mocks')
let mockData

describe('#SendBCH', () => {
  let sandbox

  // Restore the sandbox before each test.
  beforeEach(() => {
    sandbox = sinon.createSandbox()

    const config = {
      restURL: 'https://free-main.fullstack.cash/v5/'
    }
    const bchjs = new BCHJS(config)
    config.bchjs = bchjs
    config.ar = new AdapterRouter(config)
    uut = new SendBCH(config)

    mockData = clone(mockDataLib)
  })

  afterEach(() => sandbox.restore())

  describe('#constructor', () => {
    it('should throw an error if instance of bch-js is not passed.', () => {
      try {
        uut = new SendBCH()

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'Must pass instance of bch-js when instantiating SendBCH.'
        )
      }
    })

    it('should throw an error if instance of adapter router is not passed.', () => {
      try {
        uut = new SendBCH({ bchjs: {} })

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Must pass instance of Adapter Router.')
      }
    })
  })

  describe('#calculateFee', () => {
    it('should accurately calculate a P2PKH with 1 input and 2 outputs', () => {
      const fee = uut.calculateFee(1, 2, 1)
      // console.log('fee: ', fee)

      assert.equal(fee, 260)
    })

    it('should accurately calculate a P2PKH with 2 input and 2 outputs', () => {
      const fee = uut.calculateFee(2, 2, 1)
      // console.log('fee: ', fee)

      assert.equal(fee, 408)
    })

    it('should accurately calculate a P2PKH with 2 input and 3 outputs', () => {
      const fee = uut.calculateFee(2, 3, 1)
      // console.log('fee: ', fee)

      assert.equal(fee, 442)
    })

    it('should throw an error for bad input', () => {
      try {
        const fee = uut.calculateFee('a', 'b', 'c')
        console.log('fee: ', fee)

        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        // console.log('err: ', err)
        assert.include(
          err.message,
          'Invalid input. Fee could not be calculated'
        )
      }
    })
  })

  describe('#sortUtxosBySize', () => {
    it('should sort UTXOs in ascending order', () => {
      const utxos = uut.sortUtxosBySize(mockData.exampleUtxos01.utxos)
      // console.log('utxos: ', utxos)

      const lastElem = utxos.length - 1

      assert.isAbove(utxos[lastElem].value, utxos[0].value)
    })

    it('should sort UTXOs in descending order', () => {
      const utxos = uut.sortUtxosBySize(
        mockData.exampleUtxos01.utxos,
        'DESCENDING'
      )
      // console.log('utxos: ', utxos)

      const lastElem = utxos.length - 1

      assert.isAbove(utxos[0].value, utxos[lastElem].value)
    })
  })

  describe('#getNecessaryUtxosAndChange', () => {
    it('should return UTXOs to achieve single output', () => {
      const outputs = [
        {
          address: 'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h',
          amountSat: 600
        }
      ]

      const { necessaryUtxos, change } = uut.getNecessaryUtxosAndChange(
        outputs,
        mockData.exampleUtxos01.utxos
      )
      // console.log('necessaryUtxos: ', necessaryUtxos)
      // console.log('change: ', change)

      assert.isArray(necessaryUtxos)
      assert.equal(necessaryUtxos.length, 3)
      assert.isNumber(change)
    })

    it('should return UTXOs to achieve multiple outputs', () => {
      const outputs = [
        {
          address: 'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h',
          amountSat: 12513803
        },
        {
          address: 'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h',
          amountSat: 2000
        }
      ]

      const { necessaryUtxos, change } = uut.getNecessaryUtxosAndChange(
        outputs,
        mockData.exampleUtxos01.utxos
      )
      // console.log('necessaryUtxos: ', necessaryUtxos)
      // console.log('change: ', change)

      assert.isArray(necessaryUtxos)
      assert.equal(necessaryUtxos.length, 3)
      assert.isNumber(change)
    })

    it('should throw an error if not enough BCH', () => {
      try {
        const outputs = [
          {
            address: 'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h',
            amountSat: 12525803
          },
          {
            address: 'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h',
            amountSat: 2000
          }
        ]

        uut.getNecessaryUtxosAndChange(outputs, mockData.exampleUtxos01.utxos)

        assert.equal(true, false, 'Unexpected result')
      } catch (err) {
        // console.log('err: ', err)

        assert.include(err.message, 'Insufficient balance')
      }
    })

    it('should use custom sorting function', () => {
      const outputs = [
        {
          address: 'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h',
          amountSat: 600
        }
      ]

      const sortingStub = sinon.stub().returnsArg(0)
      uut.getNecessaryUtxosAndChange(
        outputs,
        mockData.exampleUtxos01.utxos,
        1.0,
        { utxoSortingFn: sortingStub }
      )

      assert.ok(sortingStub.calledOnceWith(mockData.exampleUtxos01.utxos))
    })
  })

  describe('#getKeyPairFromMnemonic', () => {
    it('should generate a key pair from a wallet with a mnemonic', async () => {
      const keyPair = await uut.getKeyPairFromMnemonic(mockData.mockWallet)
      // console.log(`keyPair: ${JSON.stringify(keyPair, null, 2)}`)

      // Ensure the output has the expected properties.
      assert.property(keyPair, 'compressed')
      assert.property(keyPair, 'network')
    })

    it('should generate a key pair from a wallet without a mnemonic', async () => {
      // Force mnemonic to have a null value
      mockData.mockWallet.mnemonic = null

      const keyPair = await uut.getKeyPairFromMnemonic(mockData.mockWallet)
      // console.log(`keyPair: ${JSON.stringify(keyPair, null, 2)}`)

      // Ensure the output has the expected properties.
      assert.property(keyPair, 'compressed')
      assert.property(keyPair, 'network')
    })

    it('should throw error if wallet has neither mnemonic or private key', async () => {
      try {
        // Force desired code path
        mockData.mockWallet.mnemonic = null
        mockData.mockWallet.privateKey = null

        await uut.getKeyPairFromMnemonic(mockData.mockWallet)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Wallet has no mnemonic or private key!')
      }
    })
  })

  describe('#createTransaction', () => {
    it('should throw an error if UTXOs array is empty', async () => {
      try {
        const outputs = [
          {
            address: 'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h',
            amountSat: 1000
          }
        ]

        await uut.createTransaction(outputs, mockData.mockWallet, [])

        assert.equal(true, false, 'Unexpected result')
      } catch (err) {
        // console.log('err: ', err)
        assert.include(err.message, 'UTXO list is empty')
      }
    })

    it('should ignore change if below the dust limit', async () => {
      const outputs = [
        {
          address: 'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h',
          amountSat: 600
        }
      ]

      const { hex, txid } = await uut.createTransaction(
        outputs,
        mockData.mockWallet,
        mockData.exampleUtxos01.utxos
      )

      assert.isString(hex)
      assert.isString(txid)
    })

    it('should add change output if above the dust limit', async () => {
      const outputs = [
        {
          address: 'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h',
          amountSat: 625
        }
      ]

      const { hex, txid } = await uut.createTransaction(
        outputs,
        mockData.mockWallet,
        mockData.exampleUtxos01.utxos
      )
      // console.log('hex: ', hex)
      // console.log('txid: ', txid)

      assert.isString(hex)
      assert.isString(txid)
    })

    it('should create a tx for an eCash address', async () => {
      const outputs = [
        {
          address: 'ecash:qzngwl4k3hkl8hfem6fl3sp058tsgl8xp50ke8ykxc',
          amountSat: 625
        }
      ]

      const { hex, txid } = await uut.createTransaction(
        outputs,
        mockData.mockWallet,
        mockData.exampleUtxos01.utxos
      )
      console.log('hex: ', hex)
      console.log('txid: ', txid)

      assert.isString(hex)
      assert.isString(txid)
    })

    it('should create a tx for an eToken address', async () => {
      const outputs = [
        {
          address: 'etoken:qzngwl4k3hkl8hfem6fl3sp058tsgl8xp5pgs9j3z0',
          amountSat: 625
        }
      ]

      const { hex, txid } = await uut.createTransaction(
        outputs,
        mockData.mockWallet,
        mockData.exampleUtxos01.utxos
      )
      console.log('hex: ', hex)
      console.log('txid: ', txid)

      assert.isString(hex)
      assert.isString(txid)
    })
  })

  describe('#sendBch', () => {
    it('should broadcast a transaction and return a txid', async () => {
      const hex =
        '0200000002abdb671501c19d11c35473aa84547f7f3b301d6924d6c8f419a26616dc486ea3010000006b4830450221009833f7bbecd7ba4c193f1edd693e42b337cd295b7e530cab3b2210f46c6cebe102200b65bf9b9bc66992c09cb1a40a2c84b629ba48c066b9f3cc5fe713a898051b6d41210259da20750fbde4e48d48068aa93e02701554dc66b4fe83851a91023110093449ffffffffcc198a396570aebd10605cdde223356c0d8f92133560c52013ae5d43dccccf53010000006a47304402207bd190fce11a0cbf8dd8d0d987bcdd428168312f217ec61d018c3198014a786a02200b0ac3db775ea708eb9a76a9fa84fe9a68a0553408b143f52c220313cc2ecbd241210259da20750fbde4e48d48068aa93e02701554dc66b4fe83851a91023110093449ffffffff0271020000000000001976a914543dc8f7c91721da06da8c3941f79e26cfbce67288ac6c030000000000001976a9141d027f19f0e9c4e6bb4e0b5359b4d2e2f9e27d9888ac00000000'
      const txid =
        '66b7d1fced6df27feb7faf305de2e3d6470decb0276648411fd6a2f69fec8543'

      // Mock live network calls.
      sandbox.stub(uut, 'createTransaction').resolves(hex)
      sandbox.stub(uut.ar, 'sendTx').resolves(txid)

      const output = await uut.sendBch()

      assert.equal(output, txid)
    })

    it('should throw an error if there is an issue with broadcasting a tx', async () => {
      try {
        const hex =
          '0200000002abdb671501c19d11c35473aa84547f7f3b301d6924d6c8f419a26616dc486ea3010000006b4830450221009833f7bbecd7ba4c193f1edd693e42b337cd295b7e530cab3b2210f46c6cebe102200b65bf9b9bc66992c09cb1a40a2c84b629ba48c066b9f3cc5fe713a898051b6d41210259da20750fbde4e48d48068aa93e02701554dc66b4fe83851a91023110093449ffffffffcc198a396570aebd10605cdde223356c0d8f92133560c52013ae5d43dccccf53010000006a47304402207bd190fce11a0cbf8dd8d0d987bcdd428168312f217ec61d018c3198014a786a02200b0ac3db775ea708eb9a76a9fa84fe9a68a0553408b143f52c220313cc2ecbd241210259da20750fbde4e48d48068aa93e02701554dc66b4fe83851a91023110093449ffffffff0271020000000000001976a914543dc8f7c91721da06da8c3941f79e26cfbce67288ac6c030000000000001976a9141d027f19f0e9c4e6bb4e0b5359b4d2e2f9e27d9888ac00000000'

        // Mock live network calls.
        sandbox.stub(uut, 'createTransaction').resolves(hex)
        sandbox.stub(uut.ar, 'sendTx').throws(new Error('error message'))

        await uut.sendBch()

        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        // console.log('err: ', err)
        assert.include(err.message, 'error message')
      }
    })
  })

  describe('#createSendAllTx', () => {
    it('should throw an error if address is invalid type', async () => {
      try {
        const toAddress = 1

        await uut.createSendAllTx(toAddress, mockData.mockWallet, [])

        assert.equal(true, false, 'Unexpected result')
      } catch (err) {
        // console.log('err: ', err)
        assert.include(err.message, 'Address to send must be a bch address')
      }
    })

    it('should throw an error if UTXOs array is empty', async () => {
      try {
        const toAddress =
          'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h'

        await uut.createSendAllTx(toAddress, mockData.mockWallet, [])

        assert.equal(true, false, 'Unexpected result')
      } catch (err) {
        // console.log('err: ', err)
        assert.include(err.message, 'UTXO list is empty')
      }
    })

    it('should build transaction', async () => {
      const toAddress =
        'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h'

      const { hex, txid } = await uut.createSendAllTx(
        toAddress,
        mockData.mockWallet,
        mockData.exampleUtxos01.utxos
      )
      // console.log('hex: ', hex)
      // console.log('txid: ', txid)

      assert.isString(hex)
      assert.isString(txid)
    })

    it('should use default fee if fee is not specified.', async () => {
      const toAddress =
        'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h'

      mockData.mockWallet.fee = undefined

      const { hex, txid } = await uut.createSendAllTx(
        toAddress,
        mockData.mockWallet,
        mockData.exampleUtxos01.utxos
      )
      // console.log('hex: ', hex)
      // console.log('txid: ', txid)

      assert.isString(hex)
      assert.isString(txid)
    })
  })

  describe('#sendAllBch', () => {
    it('should broadcast a transaction and return a txid', async () => {
      const hex =
        '0200000002abdb671501c19d11c35473aa84547f7f3b301d6924d6c8f419a26616dc486ea3010000006b4830450221009833f7bbecd7ba4c193f1edd693e42b337cd295b7e530cab3b2210f46c6cebe102200b65bf9b9bc66992c09cb1a40a2c84b629ba48c066b9f3cc5fe713a898051b6d41210259da20750fbde4e48d48068aa93e02701554dc66b4fe83851a91023110093449ffffffffcc198a396570aebd10605cdde223356c0d8f92133560c52013ae5d43dccccf53010000006a47304402207bd190fce11a0cbf8dd8d0d987bcdd428168312f217ec61d018c3198014a786a02200b0ac3db775ea708eb9a76a9fa84fe9a68a0553408b143f52c220313cc2ecbd241210259da20750fbde4e48d48068aa93e02701554dc66b4fe83851a91023110093449ffffffff0271020000000000001976a914543dc8f7c91721da06da8c3941f79e26cfbce67288ac6c030000000000001976a9141d027f19f0e9c4e6bb4e0b5359b4d2e2f9e27d9888ac00000000'
      const txid =
        '66b7d1fced6df27feb7faf305de2e3d6470decb0276648411fd6a2f69fec8543'

      // Mock live network calls.
      sandbox.stub(uut, 'createSendAllTx').resolves(hex)
      sandbox.stub(uut.ar, 'sendTx').resolves(txid)

      const output = await uut.sendAllBch()

      assert.equal(output, txid)
    })

    it('should throw an error if there is an issue with broadcasting a tx', async () => {
      try {
        const hex =
          '0200000002abdb671501c19d11c35473aa84547f7f3b301d6924d6c8f419a26616dc486ea3010000006b4830450221009833f7bbecd7ba4c193f1edd693e42b337cd295b7e530cab3b2210f46c6cebe102200b65bf9b9bc66992c09cb1a40a2c84b629ba48c066b9f3cc5fe713a898051b6d41210259da20750fbde4e48d48068aa93e02701554dc66b4fe83851a91023110093449ffffffffcc198a396570aebd10605cdde223356c0d8f92133560c52013ae5d43dccccf53010000006a47304402207bd190fce11a0cbf8dd8d0d987bcdd428168312f217ec61d018c3198014a786a02200b0ac3db775ea708eb9a76a9fa84fe9a68a0553408b143f52c220313cc2ecbd241210259da20750fbde4e48d48068aa93e02701554dc66b4fe83851a91023110093449ffffffff0271020000000000001976a914543dc8f7c91721da06da8c3941f79e26cfbce67288ac6c030000000000001976a9141d027f19f0e9c4e6bb4e0b5359b4d2e2f9e27d9888ac00000000'

        // Mock live network calls.
        sandbox.stub(uut, 'createSendAllTx').resolves(hex)
        sandbox.stub(uut.ar, 'sendTx').throws(new Error('error message'))

        await uut.sendAllBch()

        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        // console.log('err: ', err)
        assert.include(err.message, 'error message')
      }
    })
  })
})
