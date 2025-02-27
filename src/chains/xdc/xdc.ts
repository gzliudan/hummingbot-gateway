import abi from '../ethereum/ethereum.abi.json';
import { logger } from '../../services/logger';
import { Contract, Transaction, Wallet } from 'ethers';
import { EthereumBase } from '../ethereum/ethereum-base';
import { getEthereumConfig as getPolygonConfig } from '../ethereum/ethereum.config';
import { Provider } from '@ethersproject/abstract-provider';
import { XsswapConfig } from '../../connectors/xsswap/xsswap.config';
import { GlobianceConfig } from '../../connectors/globiance/globiance.config';
import { Ethereumish } from '../../services/common-interfaces';
import { ConfigManagerV2 } from '../../services/config-manager-v2';
import { convertXdcPublicKey } from '../../helpers';

export class Xdc extends EthereumBase implements Ethereumish {
  private static _instances: { [name: string]: Xdc };
  private _gasPrice: number;
  private _nativeTokenSymbol: string;
  private _chain: string;

  private constructor(network: string) {
    const config = getPolygonConfig('xdc', network);
    super(
      'xdc',
      config.network.chainID,
      config.network.nodeURL,
      config.network.tokenListSource,
      config.network.tokenListType,
      config.manualGasPrice,
      config.gasLimitTransaction,
      ConfigManagerV2.getInstance().get('server.nonceDbPath'),
      ConfigManagerV2.getInstance().get('server.transactionDbPath')
    );
    this._chain = config.network.name;
    this._nativeTokenSymbol = config.nativeCurrencySymbol;
    this._gasPrice = config.manualGasPrice;
  }

  public static getInstance(network: string): Xdc {
    if (Xdc._instances === undefined) {
      Xdc._instances = {};
    }
    if (!(network in Xdc._instances)) {
        Xdc._instances[network] = new Xdc(network);
    }

    return Xdc._instances[network];
  }

  public static getConnectedInstances(): { [name: string]: Xdc } {
    return Xdc._instances;
  }

  public get gasPrice(): number {
    return this._gasPrice;
  }

  public get nativeTokenSymbol(): string {
    return this._nativeTokenSymbol;
  }

  public get chain(): string {
    return this._chain;
  }

  getContract(tokenAddress: string, signerOrProvider?: Wallet | Provider) {
    return new Contract(tokenAddress, abi.ERC20Abi, signerOrProvider);
  }

  getSpender(reqSpender: string): string {
    let spender: string;
    if (reqSpender === 'xsswap') {
      spender = XsswapConfig.config.routerAddress(this._chain);
    } else if (reqSpender === 'globiance') {
      spender = GlobianceConfig.config.routerAddress(this._chain);
    } else {
      spender = convertXdcPublicKey(reqSpender);
    }
    return spender;
  }

  // cancel transaction
  async cancelTx(wallet: Wallet, nonce: number): Promise<Transaction> {
    logger.info(
      'Canceling any existing transaction(s) with nonce number ' + nonce + '.'
    );
    return super.cancelTxWithGasPrice(wallet, nonce, this._gasPrice * 2);
  }
}
