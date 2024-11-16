"use client";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import Attestations from "./attestations.tsx";

import { Web3Provider } from "@ethersproject/providers";
import { BigNumber, Contract, ethers } from "ethers";

import { providers } from "ethers";
import { useMemo, useState } from "react";
import type { Account, Chain, Client, Transport } from "viem";
import { Config, useConnectorClient } from "wagmi";
import { queryAttestations } from "./attestation";

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

const schemaData = `[{"name": "address","type": "address"},{"name": "mbti","type": "string"},{"name": "name","type": "string"},{"name": "birthday","type": "string"}]`;

async function createNotaryAttestation(address: string) {
  const url = document.getElementById("urlInput").value;

  // Fetch the URL (Note: You'll need a proxy/backend to avoid CORS issues)
  const mbti = extractPersonalityType(url);

  const res = await client.createAttestation({
    schemaId: schemaId,
    data: {
      address: address.toLowerCase(),
      mbti: mbti.toLowerCase(),
      name: "name",
      birthday: "20241116",
    },
    indexingValue: address.toLowerCase(),
  });

  console.log(res);
}

function extractPersonalityType(url: string): string {
  const regex = /\/profiles\/([a-z]+-[a-z])\//i;
  const match = url.match(regex);

  if (!match) {
    throw new Error("Personality type not found in URL");
  }

  return match[1];
}

function App() {
  const [mbti, setMBTI] = useState("");
  const [targetMBTI, setTargetMBTI] = useState("");
  const [match, setMatch] = useState(false);

  const account = useAccount();
  const { connectors, connect, status, error } = useConnect();
  const { disconnect } = useDisconnect();

  async function fetchMBTI() {
    const address = document.getElementById("targetWallet").value;
    let attestations = await queryAttestations(address);
    let mbti = decodeOnChainData(
      attestations.attestations[1].data,
      DataLocationOnChain.ONCHAIN,
      JSON.parse(schemaData),
    ).mbti;

    setTargetMBTI(mbti);
    return mbti;
  }

  return (
    <>
      <div>
        <h2>Account</h2>
        <div>
          status: {account.status}
          <br />
          addresses: {JSON.stringify(account.addresses)}
          <br />
          chainId: {account.chainId}
        </div>

        {account.status === "connected" && (
          <button type="button" onClick={() => disconnect()}>
            Disconnect
          </button>
        )}
      </div>
      <div>
        <h2>Connect</h2>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            type="button"
          >
            {connector.name}
          </button>
        ))}
        <input
          id="urlInput"
          defaultValue="https://www.16personalities.com/profiles/infp-a/m/7tk2ptzxr"
        ></input>

        <button onClick={() => createNotaryAttestation(account.addresses[0])}>
          Attest
        </button>
        <div>
          {account.status === "connected" && (
            <div>
              <Attestations mbti={mbti} setMBTI={setMBTI} />
              {mbti !== "" && (
                <div>
                  <input id="targetWallet" />
                  <button
                    onClick={async () => {
                      let targetMBTI = await fetchMBTI();
                      console.log(mbti, targetMBTI);
                      setMatch(mbti === targetMBTI);
                    }}
                  >
                    Search
                  </button>
                </div>
              )}

              <div>
                {targetMBTI !== "" &&
                  (match
                    ? "You should be best friends"!
                    : "Seems like you should be enemies...")}
              </div>
            </div>
          )}
        </div>
        <div>{error?.message}</div>
      </div>
    </>
  );
}

export default App;
