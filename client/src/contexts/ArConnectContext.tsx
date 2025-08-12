// Compatibility layer - redirects to new ArweaveWalletProvider
// This file maintains backward compatibility with existing code
export { 
  ArweaveWalletProvider as ArConnectProvider,
  useArweaveWallet as useArConnect,
  withArweaveAuth as withArConnectAuth
} from './ArweaveWalletProvider';