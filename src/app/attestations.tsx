import { useAccount, useConnect, useDisconnect } from "wagmi";

import { Web3Provider } from "@ethersproject/providers";
import { BigNumber, Contract, ethers } from "ethers";
import { queryAttestations } from "./attestation";

import { providers } from "ethers";
import { useMemo, useState, useEffect } from "react";
import type {
  Account,
  Chain,
  Client,
  Transport,
  decodeAbiParameters,
} from "viem";
import { Config, useConnectorClient } from "wagmi";

const {
  SignProtocolClient,
  SpMode,
  EvmChains,
  decodeOnChainData,
  DataLocationOnChain,
} = require("@ethsign/sp-sdk");
const { privateKeyToAccount } = require("viem/accounts");

const privateKey =
  "0xa5b12d353fa12ce33a0a23e3765f01ea96f5ca079dd71b18633e7d26dfdf2e74";
const client = new SignProtocolClient(SpMode.OnChain, {
  chain: EvmChains.baseSepolia,
  account: privateKeyToAccount(privateKey), // Optional, depending on environment
});

const schemaId = "0x4a9";

export function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new Web3Provider(transport, network);
  const signer = provider.getSigner(account.address);
  return signer;
}

/** Hook to convert a Viem Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useConnectorClient<Config>({ chainId });
  return useMemo(() => (client ? clientToSigner(client) : undefined), [client]);
}

function extractPersonalityType(url: string): string {
  const regex = /\/profiles\/([a-z]+-[a-z])\//i;
  const match = url.match(regex);

  if (!match) {
    throw new Error("Personality type not found in URL");
  }

  return match[1];
}

// Method 2: Using web APIs (browser environment)
function decodeHexStringBrowser(hexString: string): string {
  // Remove '0x' prefix if present
  const cleanHex = hexString.startsWith("0x") ? hexString.slice(2) : hexString;

  // Convert hex to bytes
  const bytes = new Uint8Array(
    cleanHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [],
  );

  // Decode bytes to string
  return new TextDecoder().decode(bytes);
}

const schemaData = `[{"name": "address","type": "address"},{"name": "mbti","type": "string"},{"name": "name","type": "string"},{"name": "birthday","type": "string"}]`;

function Attestations({ mbti, setMBTI }) {
  const account = useAccount();
  const { connectors, connect, status, error } = useConnect();
  const { disconnect } = useDisconnect();
  const signer = useEthersSigner();

  useEffect(() => {
    if (account.status === "connected") {
      const loadAttestations = async () => {
        let attestations = await queryAttestations(account.addresses[0]);
        if (attestations.length > 0) {
          let mbti = decodeOnChainData(
            attestations.attestations[0].data,
            DataLocationOnChain.ONCHAIN,
            JSON.parse(schemaData),
          ).mbti;

          setMBTI(mbti);
        }
      };
      loadAttestations();
    }
  }, [account.status]);

  return (
    <>
      <div id="mbtiResult">
        {mbti !== "" ? <div>{mbti}</div> : <div>No MBTI results.</div>}
      </div>

      <div>
        <img src="https://noun-api.com/beta/pfp" />
      </div>
    </>
  );
}

export default Attestations;
