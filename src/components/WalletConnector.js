import { useState, useCallback } from 'react';
import { useWeb3React, UnsupportedChainIdError } from '@web3-react/core';
import { InjectedConnector, NoEthereumProviderError, UserRejectedRequestError as UserRejectedRequestErrorInjected } from '@web3-react/injected-connector';
import { UserRejectedRequestError as UserRejectedRequestErrorWalletConnect, WalletConnectConnector } from '@web3-react/walletconnect-connector';
import { BscConnector, NoBscProviderError } from '@binance-chain/bsc-connector';
import { ethers } from "ethers";

let netid = 0; // 0 ropsten, 1 bsc
let walletconnect, injected, bsc;
let provider = null;

const netlist = [
  {
    chaind: 3,
    rpcurl: "https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    blockurl: "https://ropsten.etherscan.io/",
    chainname: "Ropsten Test Network",
    chainnetname: "RPS",
    chainsymbol: "ETH",
    chaindecimals: 18
  },
  {
    chaind: 97,
    rpcurl: "https://data-seed-prebsc-1-s1.binance.org:8545",
    blockurl: "https://testnet.bscscan.com/",
    chainname: "Bnb Chain Test net",
    chainnetname: "RPS",
    chainsymbol: "BNB",
    chaindecimals: 18
  },
]

const defaultRopstenconfig = {
  testing: false,
  autoGasMultiplier: 1.5,
  defaultConfirmations: 1,
  defaultGas: "6000000",
  defaultGasPrice: "1000000000000",
  nodetimeout: 10000,
};

function web3ProviderFrom(endpoint, config) {
  const ethConfig = Object.assign(defaultRopstenconfig, config || {});
  const providerClass = endpoint.includes("wss")
    ? ethers.providers.WebSocketProvider
    : ethers.providers.JsonRpcProvider;

  return new providerClass(endpoint, {
    timeout: ethConfig.nodetimeout,
  });
}

export function getDefaultProvider() {
  if (!provider) {
    provider = new ethers.providers.Web3Provider(
      web3ProviderFrom(netlist[netid].rpcurl),
      netlist[netid].chaind
    );
  }

  return provider;
}

export function setNet(id) {
  netid = id;

  walletconnect = new WalletConnectConnector({
    rpc: { [netlist[netid].chaind]: netlist[netid].rpcurl },
    qrcode: true,
    pollingInterval: 12000,
  });

  injected = new InjectedConnector({
    supportedChainIds: [netlist[netid].chaind],
  });

  bsc = new BscConnector({
    supportedChainIds: [netlist[netid].chaind],
  });
}

export function useWalletConnector() {
  const { activate, deactivate } = useWeb3React();
  const [provider, setProvider] = useState(null);

  const setupNetwork = async () => {
    const { ethereum } = window;
    if (ethereum) {
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [
            {
              chainId: `0x${netlist[netid].chaind.toString(16)}`,
            },
          ],
        });

        setProvider(ethereum);
        return true;
      } catch (error) {
        console.error("Network setup error:", error);
        return false;
      }
    } else {
      console.error("Can't setup the Default Network on MetaMask because window.ethereum is undefined");
      return false;
    }
  }

  const loginMetamask = async () => {
    loginWallet(injected);
  }

  const loginWalletConnect = async () => {
    loginWallet(walletconnect);
  }

  const loginBSC = async () => {
    loginWallet(bsc);
  }

  const loginWallet = useCallback((connector) => {
    if (connector) {
      activate(connector, async (error) => {
        if (error instanceof UnsupportedChainIdError) {
          const hasSetup = await setupNetwork();
          if (hasSetup) {
            activate(connector);
          }
        } else {
          if (error instanceof NoEthereumProviderError || error instanceof NoBscProviderError) {
            alert("Network Provider Error");
          } else if (
            error instanceof UserRejectedRequestErrorInjected ||
            error instanceof UserRejectedRequestErrorWalletConnect
          ) {
            alert('Authorization Error: Please authorize to access your account');
          } else {
            alert(`${error.name}: ${error.message}`);
          }
        }
      });
    } else {
      alert('Unable to find connector: The connector config is wrong');
    }

    setProvider(connector);
  }, [activate]);

  const logoutWalletConnector = () => {
    deactivate(walletconnect);
    return true;
  }

  const logoutMetamask = () => {
    deactivate(injected);
    return true;
  }

  const logoutWalletConnect = () => {
    deactivate(walletconnect);
    return true;
  }

  const logoutBSC = () => {
    deactivate(bsc);
    return true;
  }

  return {
    loginMetamask,
    loginWalletConnect,
    loginBSC,
    logoutWalletConnector,
    logoutMetamask,
    logoutWalletConnect,
    logoutBSC
  }
}
