const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const { ethers } = require('ethers');
const MEVBlockerEngine = require('../src/mev-blocker-engine');

describe('MEVBlockerEngine', () => {
  let mevBlockerEngine;
  let axiosPostStub;
  let getFeeDataStub;
  let estimateGasStub;
  let signTransactionStub;

  beforeEach(() => {
    // Set up required environment variables for testing
    process.env.PRIVATE_KEY = '0x' + '1'.repeat(64);
    process.env.ETHEREUM_RPC_URL = 'https://fake-rpc.com';

    mevBlockerEngine = new MEVBlockerEngine();

    // Stub external dependencies
    axiosPostStub = sinon.stub(axios, 'post');
    getFeeDataStub = sinon.stub(mevBlockerEngine.publicProvider, 'getFeeData').resolves({ gasPrice: ethers.parseUnits('10', 'gwei') });
    estimateGasStub = sinon.stub(mevBlockerEngine.publicProvider, 'estimateGas').resolves(21000n);
    signTransactionStub = sinon.stub(mevBlockerEngine.wallet, 'signTransaction').resolves('0xSignedTransaction');
  });

  afterEach(() => {
    sinon.restore();
    delete process.env.PRIVATE_KEY;
    delete process.env.ETHEREUM_RPC_URL;
  });

  it('should throw an error if PRIVATE_KEY is not set', () => {
    delete process.env.PRIVATE_KEY;
    expect(() => new MEVBlockerEngine()).to.throw('PRIVATE_KEY and ETHEREUM_RPC_URL must be set in environment variables.');
  });

  it('should throw an error if ETHEREUM_RPC_URL is not set', () => {
    delete process.env.ETHEREUM_RPC_URL;
    expect(() => new MEVBlockerEngine()).to.throw('PRIVATE_KEY and ETHEREUM_RPC_URL must be set in environment variables.');
  });

  describe('sendPrivateTransaction', () => {
    it('should send a private transaction successfully via MEV-Blocker', async () => {
      const transaction = {
        to: '0xRecipientAddress',
        data: '0xTransactionData',
        value: ethers.parseEther('1'),
      };

      const mockResponse = {
        data: {
          jsonrpc: '2.0',
          result: '0xTxHash',
          id: 1,
        },
      };
      axiosPostStub.resolves(mockResponse);

      const result = await mevBlockerEngine.sendPrivateTransaction(transaction);

      expect(result).to.deep.equal({
        txHash: '0xTxHash',
        method: 'mev-blocker',
        mevProtected: true,
      });

      // Verify that axios was called correctly
      expect(axiosPostStub.calledOnce).to.be.true;
      const axiosArgs = axiosPostStub.firstCall.args;
      expect(axiosArgs[0]).to.equal(mevBlockerEngine.mevBlockerRpc);
      expect(axiosArgs[1].method).to.equal('eth_sendPrivateTransaction');
      expect(axiosArgs[1].params[0].tx).to.equal('0xSignedTransaction');

      // Verify other methods were called
      expect(getFeeDataStub.calledOnce).to.be.true;
      expect(estimateGasStub.calledOnce).to.be.true;
      expect(signTransactionStub.calledOnce).to.be.true;
    });

    it('should throw an error if the MEV-Blocker RPC returns an error', async () => {
      const transaction = { to: '0xRecipientAddress', data: '0x' };
      const mockErrorResponse = {
        data: {
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Invalid transaction' },
          id: 1,
        },
      };
      axiosPostStub.resolves(mockErrorResponse);

      try {
        await mevBlockerEngine.sendPrivateTransaction(transaction);
        // Should not reach here
        expect.fail('Expected sendPrivateTransaction to throw');
      } catch (error) {
        expect(error.message).to.include('[MEV-Blocker] RPC Error: Invalid transaction');
      }
    });
  });
});