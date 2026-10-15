import { createConfig, http } from "wagmi";
import { injected, mock, walletConnect } from "wagmi/connectors";
import {
  CHAIN,
  RPC_URL,
  USE_MOCKS,
  WALLETCONNECT_PROJECT_ID,
} from "@/lib/contracts/config";

const connectors = [
  injected({ shimDisconnect: true }),
  ...(USE_MOCKS
    ? [
        mock({
          accounts: [
            "0xa11ce00000000000000000000000000000000001",
            "0xb0b0000000000000000000000000000000000002",
          ],
        }),
      ]
    : []),
  ...(WALLETCONNECT_PROJECT_ID
    ? [walletConnect({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: true })]
    : []),
];

export const wagmiConfig = createConfig({
  chains: [CHAIN],
  connectors,
  transports: {
    [CHAIN.id]: http(RPC_URL),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
