// src/server.ts
import { FastMCP } from "fastmcp";

// src/tools/flowBalance/schema.ts
import { z } from "zod";

// src/utils/config.ts
var networks = ["mainnet", "testnet"];
var networkName = process.env.NETWORK || "testnet";

// src/tools/flowBalance/schema.ts
var flowBalanceSchema = z.object({
  address: z.string().describe("Flow address to check balance for"),
  network: z.enum(networks).default("mainnet").describe("Flow network to use")
});

// src/utils/flow/pure.signer.ts
import elliptic from "elliptic";
import { SHA3 } from "sha3";
function signWithKey(privateKeyHex, msg) {
  const ec = new elliptic.ec("p256");
  const key = ec.keyFromPrivate(Buffer.from(privateKeyHex, "hex"));
  const sig = key.sign(_hashMsg(msg));
  const n = 32;
  const r = sig.r.toArrayLike(Buffer, "be", n);
  const s = sig.s.toArrayLike(Buffer, "be", n);
  return Buffer.concat([r.valueOf(), s.valueOf()]).toString("hex");
}
function _hashMsg(msg) {
  const sha = new SHA3(256);
  sha.update(Buffer.from(msg, "hex"));
  return sha.digest();
}

// src/utils/flow/flow.connector.ts
import * as fcl from "@onflow/fcl";
var FlowConnector = class {
  /**
   * Initialize the Flow SDK
   */
  constructor(flowJSON, network, defaultRpcEndpoint = void 0) {
    this.flowJSON = flowJSON;
    this.network = network;
    this.defaultRpcEndpoint = defaultRpcEndpoint;
    this.isInited = false;
    this.locallyInitedPromise = null;
  }
  /**
   * Get the RPC endpoint
   */
  get rpcEndpoint() {
    switch (this.network) {
      case "mainnet":
        return this.defaultRpcEndpoint ?? "https://mainnet.onflow.org";
      case "testnet":
        return this.defaultRpcEndpoint ?? "https://testnet.onflow.org";
      default:
        throw new Error(`Network type ${this.network} is not supported`);
    }
  }
  get fcl() {
    return fcl;
  }
  /**
   * Initialize the Flow SDK
   */
  async onModuleInit() {
    if (this.isInited) return;
    const cfg = fcl.config();
    cfg.put("flow.network", this.network);
    cfg.put("fcl.experimental.softFinality", true);
    cfg.put("fcl.limit", 9999);
    cfg.put("accessNode.api", this.rpcEndpoint);
    await cfg.load({ flowJSON: this.flowJSON }, { ignoreConflicts: true });
    this.isInited = true;
  }
  /**
   * Ensure the Flow SDK is initialized
   */
  async ensureInited() {
    if (this.isInited) return;
    if (!this.locallyInitedPromise) {
      this.locallyInitedPromise = this.onModuleInit();
    }
    return await this.locallyInitedPromise;
  }
  /**
   * Get account information
   */
  async getAccount(addr) {
    await this.ensureInited();
    return await fcl.send([fcl.getAccount(addr)]).then(fcl.decode);
  }
  /**
   * General method of sending transaction
   */
  async sendTransaction(code, args2, mainAuthz) {
    await this.ensureInited();
    if (typeof mainAuthz !== "undefined") {
      return await fcl.mutate({
        cadence: code,
        args: args2,
        proposer: mainAuthz,
        payer: mainAuthz,
        authorizations: [mainAuthz]
      });
    }
    return await fcl.mutate({
      cadence: code,
      args: args2
    });
  }
  /**
   * Get chain id
   */
  async getChainId() {
    await this.ensureInited();
    return await fcl.getChainId();
  }
  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId) {
    await this.ensureInited();
    return await fcl.tx(transactionId).onceExecuted();
  }
  async onceTransactionSealed(transactionId) {
    await this.ensureInited();
    return fcl.tx(transactionId).onceSealed();
  }
  async onceTransactionExecuted(transactionId) {
    await this.ensureInited();
    return fcl.tx(transactionId).onceExecuted();
  }
  /**
   * Get block object
   * @param blockId
   */
  async getBlockHeaderObject(blockId) {
    await this.ensureInited();
    return await fcl.send([fcl.getBlockHeader(), fcl.atBlockId(blockId)]).then(fcl.decode);
  }
  /**
   * Send script
   */
  async executeScript(code, args2, defaultValue) {
    await this.ensureInited();
    try {
      const queryResult = await fcl.query({
        cadence: code,
        args: args2
      });
      return queryResult ?? defaultValue;
    } catch (e) {
      console.error(e);
      return defaultValue;
    }
  }
};

// src/utils/flow/flow.wallet.ts
import * as fcl2 from "@onflow/fcl";
var FlowWallet = class {
  constructor(connector) {
    this.connector = connector;
    // Runtime data
    this.account = null;
    this.maxKeyIndex = 0;
    const signerAddr = process.env[`${connector.network.toUpperCase()}_FLOW_ADDRESS`] || process.env.FLOW_ADDRESS;
    if (!signerAddr) {
      throw new Error("No signer info");
    }
    this.address = signerAddr;
    const privateKey = process.env[`${connector.network.toUpperCase()}_FLOW_PRIVATE_KEY`] || process.env.FLOW_PRIVATE_KEY;
    if (!privateKey) {
      console.warn(
        `The default Flow wallet ${this.address} has no private key`
      );
    } else {
      this.privateKeyHex = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
    }
  }
  /**
   * Get the network type
   */
  get network() {
    return this.connector.network;
  }
  /**
   * Send a transaction
   * @param code Cadence code
   * @param args Cadence arguments
   */
  async sendTransaction(code, args2, authz) {
    return await this.connector.sendTransaction(
      code,
      args2,
      authz ?? this.buildAuthorization()
    );
  }
  /**
   * Execute a script
   * @param code Cadence code
   * @param args Cadence arguments
   */
  async executeScript(code, args2, defaultValue) {
    return await this.connector.executeScript(code, args2, defaultValue);
  }
  /**
   * Build authorization
   */
  buildAuthorization(accountIndex = 0, privateKey = this.privateKeyHex) {
    if (this.account) {
      if (accountIndex > this.maxKeyIndex) {
        throw new Error("Invalid account index");
      }
    }
    const address = this.address;
    if (!privateKey) {
      throw new Error("No private key provided");
    }
    return async (account) => {
      return {
        ...account,
        addr: fcl2.sansPrefix(address),
        keyId: Number(accountIndex),
        signingFunction: (signable) => {
          return Promise.resolve({
            f_type: "CompositeSignature",
            f_vsn: "1.0.0",
            addr: fcl2.withPrefix(address),
            keyId: Number(accountIndex),
            signature: this.signMessage(signable.message, privateKey)
          });
        }
      };
    };
  }
  /**
   * Sign a message
   * @param message Message to sign
   */
  signMessage(message, privateKey = this.privateKeyHex) {
    if (!privateKey) {
      throw new Error("No private key provided");
    }
    return signWithKey(privateKey, message);
  }
};

// flow.json
var flow_default = {
  dependencies: {
    ArrayUtils: {
      source: "mainnet://a340dc0a4ec828ab.ArrayUtils",
      hash: "9e8f2d3e35be82da42b685045af834e16d23bcef1f322603ff91cedd1c9bbad9",
      aliases: {
        mainnet: "a340dc0a4ec828ab",
        testnet: "31ad40c07a2a9788"
      }
    },
    Burner: {
      source: "mainnet://f233dcee88fe0abe.Burner",
      hash: "71af18e227984cd434a3ad00bb2f3618b76482842bae920ee55662c37c8bf331",
      aliases: {
        emulator: "f8d6e0586b0a20c7",
        mainnet: "f233dcee88fe0abe",
        testnet: "9a0766d93b6608b7"
      }
    },
    CrossVMNFT: {
      source: "mainnet://1e4aa0b87d10b141.CrossVMNFT",
      hash: "a9e2ba34ecffda196c58f5c1439bc257d48d0c81457597eb58eb5f879dd95e5a",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    CrossVMToken: {
      source: "mainnet://1e4aa0b87d10b141.CrossVMToken",
      hash: "6d5c16804247ab9f1234b06383fa1bed42845211dba22582748abd434296650c",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    Crypto: {
      source: "mainnet://e467b9dd11fa00df.Crypto",
      hash: "610692c2092bd29d8f49aefc10b6e8ff3d4b3909331fece98f6966fbdcb4cdd4",
      aliases: {
        emulator: "f8d6e0586b0a20c7",
        mainnet: "e467b9dd11fa00df",
        testnet: "8c5303eaa26202d6"
      }
    },
    EVM: {
      source: "mainnet://e467b9dd11fa00df.EVM",
      hash: "68e203784a1fde2a491ddcf522417bf43403efe1795f3b88e76a8ee961e5940b",
      aliases: {
        emulator: "f8d6e0586b0a20c7",
        mainnet: "e467b9dd11fa00df",
        testnet: "8c5303eaa26202d6"
      }
    },
    EVMTokenList: {
      source: "mainnet://15a918087ab12d86.EVMTokenList",
      hash: "d94f029ca11147e7d37f2d76ebb71a0c3f5e6c49a04df13a5717631a1d4be2d9",
      aliases: {
        mainnet: "15a918087ab12d86",
        testnet: "b86f928a1fa7798e"
      }
    },
    FTViewUtils: {
      source: "mainnet://15a918087ab12d86.FTViewUtils",
      hash: "ef8343697ebcb455a835bc9f87b8060f574c3d968644de47f6613cebf05d7749",
      aliases: {
        mainnet: "15a918087ab12d86",
        testnet: "b86f928a1fa7798e"
      }
    },
    FlowEVMBridge: {
      source: "mainnet://1e4aa0b87d10b141.FlowEVMBridge",
      hash: "343f27c27af6c75b2c541fee46339c857f2b8a9f1f37bdda0ffd01716d6f7f22",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    FlowEVMBridgeConfig: {
      source: "mainnet://1e4aa0b87d10b141.FlowEVMBridgeConfig",
      hash: "46bed1800c572ea9e4d9335fab73511fd7039889355da0f96b16f63bfc77f6f6",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    FlowEVMBridgeHandlerInterfaces: {
      source: "mainnet://1e4aa0b87d10b141.FlowEVMBridgeHandlerInterfaces",
      hash: "7e0e28eb8fb30595249384cb8c7a44eae3884700d0a6c3139240c0d19e4dc173",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    FlowEVMBridgeNFTEscrow: {
      source: "mainnet://1e4aa0b87d10b141.FlowEVMBridgeNFTEscrow",
      hash: "ea7054bd06f978d09672ab2d6a1e7ad04df4b46410943088d555dd9ca6e64240",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    FlowEVMBridgeTemplates: {
      source: "mainnet://1e4aa0b87d10b141.FlowEVMBridgeTemplates",
      hash: "8f27b22450f57522d93d3045038ac9b1935476f4216f57fe3bb82929c71d7aa6",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    FlowEVMBridgeTokenEscrow: {
      source: "mainnet://1e4aa0b87d10b141.FlowEVMBridgeTokenEscrow",
      hash: "b5ec7c0a16e1c49004b2ed072c5eadc8c382e43351982b4a3050422f116b8f46",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    FlowEVMBridgeUtils: {
      source: "mainnet://1e4aa0b87d10b141.FlowEVMBridgeUtils",
      hash: "fd6f9ae5e6754a060f7eee8a59e7394d3c9a785ea3eb4cc1a415830c518274db",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    FlowStorageFees: {
      source: "mainnet://e467b9dd11fa00df.FlowStorageFees",
      hash: "e38d8a95f6518b8ff46ce57dfa37b4b850b3638f33d16333096bc625b6d9b51a",
      aliases: {
        emulator: "f8d6e0586b0a20c7",
        mainnet: "e467b9dd11fa00df",
        testnet: "8c5303eaa26202d6"
      }
    },
    FlowToken: {
      source: "mainnet://1654653399040a61.FlowToken",
      hash: "cefb25fd19d9fc80ce02896267eb6157a6b0df7b1935caa8641421fe34c0e67a",
      aliases: {
        emulator: "0ae53cb6e3f42a79",
        mainnet: "1654653399040a61",
        testnet: "7e60df042a9c0868"
      }
    },
    FungibleToken: {
      source: "mainnet://f233dcee88fe0abe.FungibleToken",
      hash: "050328d01c6cde307fbe14960632666848d9b7ea4fef03ca8c0bbfb0f2884068",
      aliases: {
        emulator: "ee82856bf20e2aa6",
        mainnet: "f233dcee88fe0abe",
        testnet: "9a0766d93b6608b7"
      }
    },
    FungibleTokenMetadataViews: {
      source: "mainnet://f233dcee88fe0abe.FungibleTokenMetadataViews",
      hash: "dff704a6e3da83997ed48bcd244aaa3eac0733156759a37c76a58ab08863016a",
      aliases: {
        emulator: "ee82856bf20e2aa6",
        mainnet: "f233dcee88fe0abe",
        testnet: "9a0766d93b6608b7"
      }
    },
    IBridgePermissions: {
      source: "mainnet://1e4aa0b87d10b141.IBridgePermissions",
      hash: "431a51a6cca87773596f79832520b19499fe614297eaef347e49383f2ae809af",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    ICrossVM: {
      source: "mainnet://1e4aa0b87d10b141.ICrossVM",
      hash: "e14dcb25f974e216fd83afdc0d0f576ae7014988755a4777b06562ffb06537bc",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    ICrossVMAsset: {
      source: "mainnet://1e4aa0b87d10b141.ICrossVMAsset",
      hash: "aa1fbd979c9d7806ea8ea66311e2a4257c5a4051eef020524a0bda4d8048ed57",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    IEVMBridgeNFTMinter: {
      source: "mainnet://1e4aa0b87d10b141.IEVMBridgeNFTMinter",
      hash: "65ec734429c12b70cd97ad8ea2c2bc4986fab286744921ed139d9b45da92e77e",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    IEVMBridgeTokenMinter: {
      source: "mainnet://1e4aa0b87d10b141.IEVMBridgeTokenMinter",
      hash: "223adb675415984e9c163d15c5922b5c77dc5036bf6548d0b87afa27f4f0a9d9",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    IFlowEVMNFTBridge: {
      source: "mainnet://1e4aa0b87d10b141.IFlowEVMNFTBridge",
      hash: "3d5bfa663a7059edee8c51d95bc454adf37f17c6d32be18eb42134b550e537b3",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    IFlowEVMTokenBridge: {
      source: "mainnet://1e4aa0b87d10b141.IFlowEVMTokenBridge",
      hash: "573a038b1e9c26504f6aa32a091e88168591b7f93feeff9ac0343285488a8eb3",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    MetadataViews: {
      source: "mainnet://1d7e57aa55817448.MetadataViews",
      hash: "10a239cc26e825077de6c8b424409ae173e78e8391df62750b6ba19ffd048f51",
      aliases: {
        emulator: "f8d6e0586b0a20c7",
        mainnet: "1d7e57aa55817448",
        testnet: "631e88ae7f1d7c20"
      }
    },
    NFTList: {
      source: "mainnet://15a918087ab12d86.NFTList",
      hash: "30bcd96975d4b175873fd516ebf58f64bfbf09e83c29c907abf98296e0347626",
      aliases: {
        mainnet: "15a918087ab12d86",
        testnet: "b86f928a1fa7798e"
      }
    },
    NFTViewUtils: {
      source: "mainnet://15a918087ab12d86.NFTViewUtils",
      hash: "9c0fe5d7ec4da744c1f7a2f2e5ce098879e86cd77e7e3c90ffb1b3974d797e1b",
      aliases: {
        mainnet: "15a918087ab12d86",
        testnet: "b86f928a1fa7798e"
      }
    },
    NonFungibleToken: {
      source: "mainnet://1d7e57aa55817448.NonFungibleToken",
      hash: "b63f10e00d1a814492822652dac7c0574428a200e4c26cb3c832c4829e2778f0",
      aliases: {
        emulator: "f8d6e0586b0a20c7",
        mainnet: "1d7e57aa55817448",
        testnet: "631e88ae7f1d7c20"
      }
    },
    ScopedFTProviders: {
      source: "mainnet://a340dc0a4ec828ab.ScopedFTProviders",
      hash: "9a143138f5a5f51a5402715f7d84dbe363b5744be153ee09343aed71cf241c42",
      aliases: {
        mainnet: "a340dc0a4ec828ab",
        testnet: "31ad40c07a2a9788"
      }
    },
    Serialize: {
      source: "mainnet://1e4aa0b87d10b141.Serialize",
      hash: "50bf2599bac68e3fb0e426a262e7db2eed91b90c0a5ad57e70688cbf93282b4f",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    SerializeMetadata: {
      source: "mainnet://1e4aa0b87d10b141.SerializeMetadata",
      hash: "7be42ac4e42fd3019ab6771f205abeb80ded5a461649a010b1a0668533909012",
      aliases: {
        mainnet: "1e4aa0b87d10b141",
        testnet: "dfc20aee650fcbdf"
      }
    },
    StringUtils: {
      source: "mainnet://a340dc0a4ec828ab.StringUtils",
      hash: "b401c4b0f711344ed9cd02ff77c91e026f5dfbca6045f140b9ca9d4966707e83",
      aliases: {
        mainnet: "a340dc0a4ec828ab",
        testnet: "31ad40c07a2a9788"
      }
    },
    TokenList: {
      source: "mainnet://15a918087ab12d86.TokenList",
      hash: "ac9298cfdf02e785e92334858fab0f388e5a72136c3bc4d4ed7f2039ac152bd5",
      aliases: {
        mainnet: "15a918087ab12d86",
        testnet: "b86f928a1fa7798e"
      }
    },
    TokenListHelper: {
      source: "mainnet://15a918087ab12d86.TokenListHelper",
      hash: "2bf02ca6b8e4499b6f7c81e2576e70108bea86a16e258a60a536946a728d5007",
      aliases: {
        mainnet: "15a918087ab12d86",
        testnet: "b86f928a1fa7798e"
      }
    },
    ViewResolver: {
      source: "mainnet://1d7e57aa55817448.ViewResolver",
      hash: "374a1994046bac9f6228b4843cb32393ef40554df9bd9907a702d098a2987bde",
      aliases: {
        emulator: "f8d6e0586b0a20c7",
        mainnet: "1d7e57aa55817448",
        testnet: "631e88ae7f1d7c20"
      }
    },
    ViewResolvers: {
      source: "mainnet://15a918087ab12d86.ViewResolvers",
      hash: "37ef9b2a71c1b0daa031c261f731466fcbefad998590177c798b56b61a95489a",
      aliases: {
        mainnet: "15a918087ab12d86",
        testnet: "b86f928a1fa7798e"
      }
    },
    HybridCustody: {
      source: "mainnet://d8a7e05a7ac670c0.HybridCustody",
      hash: "c8a129eec11c57ee25487fcce38efc54c3b12eb539ba61a52f4ee620173bb67b",
      aliases: {
        mainnet: "d8a7e05a7ac670c0",
        testnet: "294e44e1ec6993c6"
      }
    }
  },
  networks: {
    emulator: "127.0.0.1:3569",
    mainnet: "access.mainnet.nodes.onflow.org:9000",
    testing: "127.0.0.1:3569",
    testnet: "access.devnet.nodes.onflow.org:9000"
  },
  accounts: {}
};

// src/utils/context.ts
async function buildBlockchainContext(network = networkName) {
  if (!networks.includes(network)) {
    throw new Error(`Unsupported network: ${network}`);
  }
  const connector = new FlowConnector(flow_default, network);
  let wallet = void 0;
  try {
    wallet = new FlowWallet(connector);
  } catch (_e) {
  }
  return { connector, wallet };
}

// src/cadence/scripts/standard/get-balance.cdc?raw
var get_balance_default = 'import "FungibleToken"\nimport "FlowToken"\n\naccess(all) fun checkFlowTokenBalance(address: Address) : UFix64 {\n    let account = getAccount(address)\n    let vaultRef = account.capabilities\n      .borrow<&{FungibleToken.Balance}>(/public/flowTokenBalance)\n        ?? nil\n\n    if vaultRef != nil {\n        return vaultRef!.balance\n    }\n\n    return 0.0\n}\n\naccess(all) fun main(address: Address): UFix64 {\n    return checkFlowTokenBalance(address: address)\n}';

// src/tools/flowBalance/index.ts
var getFlowBalance = async (args2) => {
  const { address, network = "mainnet" } = args2;
  const ctx = await buildBlockchainContext(network);
  const result = await ctx.connector.executeScript(
    get_balance_default,
    (arg, t) => [arg(address, t.Address)],
    void 0
  );
  if (!result) {
    throw new Error("Failed to get FLOW balance");
  }
  return result;
};
var flowBalanceTool = {
  name: "get_flow_balance",
  description: "Get the FLOW balance for a Flow address",
  inputSchema: flowBalanceSchema,
  handler: async (args2) => {
    try {
      const parsedArgs = flowBalanceSchema.parse(args2);
      const result = await getFlowBalance(parsedArgs);
      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      console.error("Error in flowBalanceTool handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
};

// src/tools/tokenBalance/schema.ts
import { z as z2 } from "zod";
var tokenBalanceSchema = z2.object({
  address: z2.string().describe("Flow address to check balance for"),
  network: z2.enum(networks).default("mainnet").describe("Flow network to use")
});

// src/cadence/scripts/standard/get-ft-balances.cdc?raw
var get_ft_balances_default = `import "FungibleToken"

/// Queries for FT.Vault balance of all FT.Vaults in the specified account.
///
access(all)
fun main(address: Address): {String: UFix64} {
    // Get the account
    let account = getAuthAccount<auth(BorrowValue) &Account>(address)
    // Init for return value
    let balances: {String: UFix64} = {}
    // Track seen Types in array
    let seen: [String] = []
    // Assign the type we'll need
    let vaultType: Type = Type<@{FungibleToken.Vault}>()
    // Iterate over all stored items & get the path if the type is what we're looking for
    account.storage.forEachStored(fun (path: StoragePath, type: Type): Bool {
        if !type.isRecovered && (type.isInstance(vaultType) || type.isSubtype(of: vaultType)) {
            // Get a reference to the resource & its balance
            let vaultRef = account.storage.borrow<&{FungibleToken.Balance}>(from: path)!
            // Insert a new values if it's the first time we've seen the type
            if !seen.contains(type.identifier) {
                balances.insert(key: type.identifier, vaultRef.balance)
            } else {
                // Otherwise just update the balance of the vault (unlikely we'll see the same type twice in
                // the same account, but we want to cover the case)
                balances[type.identifier] = balances[type.identifier]! + vaultRef.balance
            }
        }
        return true
    })

    // Add available Flow Token Balance
    balances.insert(key: "availableFlowToken", account.availableBalance)

    return balances
}`;

// src/tools/tokenBalance/index.ts
var getTokenBalances = async (args2) => {
  const { address, network = "mainnet" } = args2;
  const ctx = await buildBlockchainContext(network);
  const result = await ctx.connector.executeScript(
    get_ft_balances_default,
    (arg, t) => [arg(address, t.Address)],
    void 0
  );
  if (!result) {
    throw new Error("Failed to get token balances");
  }
  return {
    balances: result,
    address
  };
};
var tokenBalanceTool = {
  name: "get_token_balances",
  description: "Get the balances of all fungible tokens for a Flow address",
  inputSchema: tokenBalanceSchema,
  handler: async (args2) => {
    try {
      const parsedArgs = tokenBalanceSchema.parse(args2);
      const result = await getTokenBalances(parsedArgs);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error("Error in tokenBalanceTool handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
};

// src/tools/coaAccount/schema.ts
import { z as z3 } from "zod";
var coaAccountSchema = z3.object({
  address: z3.string().describe("Flow address to check COA account for"),
  network: z3.enum(networks).default("mainnet").describe("Flow network to use")
});

// src/cadence/scripts/standard/get-coa-account.cdc?raw
var get_coa_account_default = 'import "EVM"\n\naccess(all) fun main(address: Address): String {\n  let account = getAuthAccount<auth(Storage) &Account>(address)\n\n  let coa = account.storage.borrow<&EVM.CadenceOwnedAccount>(\n    from: /storage/evm\n  )\n\n  if coa == nil { \n    return ""\n  } else {\n    let coaAddr = coa?.address() \n\n    let addrByte: [UInt8] = []\n\n    for byte in coaAddr?.bytes! {\n      addrByte.append(byte)\n    }\n\n    return String.encodeHex(addrByte)\n  }\n}';

// src/tools/coaAccount/index.ts
var getCoaAccount = async (args2) => {
  const { address, network = "mainnet" } = args2;
  const ctx = await buildBlockchainContext(network);
  const result = await ctx.connector.executeScript(
    get_coa_account_default,
    (arg, t) => [arg(address, t.Address)],
    void 0
  );
  if (!result) {
    throw new Error("COA account not found");
  }
  return result;
};
var coaAccountTool = {
  name: "get_coa_account",
  description: "Get the COA account information for a Flow address",
  inputSchema: coaAccountSchema,
  handler: async (args2) => {
    try {
      const parsedArgs = coaAccountSchema.parse(args2);
      const result = await getCoaAccount(parsedArgs);
      return {
        content: [
          {
            type: "text",
            text: `0x${result}`
          }
        ]
      };
    } catch (error) {
      console.error("Error in coaAccountTool handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
};

// src/tools/getContract/schema.ts
import { z as z4 } from "zod";
var getContractSchema = z4.object({
  address: z4.string().min(1, "Address is required").describe("Flow address where the contract is deployed"),
  contractName: z4.string().min(1, "Contract name is required").describe("Name of the contract to fetch"),
  network: z4.enum(networks).default("mainnet").describe("Flow network to use")
});

// src/tools/getContract/index.ts
var getContract = async (args2) => {
  const { address, contractName, network = "mainnet" } = args2;
  const ctx = await buildBlockchainContext(network);
  await ctx.connector.onModuleInit();
  const fcl3 = ctx.connector.fcl;
  try {
    const formattedAddress = address.replace("0x", "");
    const account = await fcl3.send([fcl3.getAccount(formattedAddress)]).then(fcl3.decode);
    const contract = account.contracts[contractName];
    if (!contract) {
      throw new Error(`Contract '${contractName}' not found at address ${address}`);
    }
    return contract;
  } catch (error) {
    throw new Error(`Error fetching contract: ${error instanceof Error ? error.message : String(error)}`);
  }
};
var getContractTool = {
  name: "get_contract",
  description: "Get the source code of a contract deployed at a specific address",
  inputSchema: getContractSchema,
  handler: async (args2) => {
    try {
      const parsedArgs = getContractSchema.parse(args2);
      const result = await getContract(parsedArgs);
      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      console.error("Error in getContractTool handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
};

// src/tools/accountInfo/schema.ts
import { z as z5 } from "zod";
var accountInfoSchema = z5.object({
  address: z5.string().min(1, "Address is required").describe("Flow address to check account information for"),
  network: z5.enum(networks).default("mainnet").describe("Flow network to use")
});
var accountInfoResultSchema = z5.object({
  address: z5.string().describe("Account address"),
  balance: z5.string().describe("Total account balance in FLOW"),
  availableBalance: z5.string().describe("Available balance in FLOW"),
  storageUsed: z5.string().describe("Storage used in bytes"),
  storageCapacity: z5.string().describe("Storage capacity in bytes"),
  storageFlow: z5.string().describe("FLOW tokens used for storage")
});

// src/cadence/scripts/standard/get-account-info.cdc?raw
var get_account_info_default = "\naccess(all) struct Result {\n  access(all) let address: Address\n  access(all) let balance: UFix64\n  access(all) let availableBalance: UFix64\n  access(all) let storageUsed: UInt64\n  access(all) let storageCapacity: UInt64\n  access(all) let storageFlow: UFix64\n\n  init(\n    address: Address,\n    balance: UFix64,\n    availableBalance: UFix64,\n    storageUsed: UInt64,\n    storageCapacity: UInt64,\n    storageFlow: UFix64,\n  ) {\n    self.address = address\n    self.balance = balance\n    self.availableBalance = availableBalance\n    self.storageUsed = storageUsed\n    self.storageCapacity = storageCapacity\n    self.storageFlow = storageFlow\n  }\n}\n\naccess(all) fun main(address: Address): Result {\n  let account = getAccount(address)\n  return Result(\n    address: account.address,\n    balance: account.balance,\n    availableBalance: account.availableBalance,\n    storageUsed: account.storage.used,\n    storageCapacity: account.storage.capacity,\n    storageFlow: account.balance - account.availableBalance\n  )\n}";

// src/tools/accountInfo/index.ts
var getAccountInfo = async (args2) => {
  const { address, network = "mainnet" } = args2;
  const ctx = await buildBlockchainContext(network);
  try {
    const response = await ctx.connector.executeScript(
      get_account_info_default,
      (arg, t) => [arg(address, t.Address)],
      void 0
    );
    if (!response) {
      throw new Error("Not found");
    }
    return {
      address: response.address,
      balance: response.balance,
      availableBalance: response.availableBalance,
      storageUsed: response.storageUsed,
      storageCapacity: response.storageCapacity,
      storageFlow: response.storageFlow
    };
  } catch (error) {
    throw new Error(`Error fetching account info: ${error instanceof Error ? error.message : String(error)}`);
  }
};
var accountInfoTool = {
  name: "get_account_info",
  description: "Get detailed account information including balance and storage stats for a Flow address",
  inputSchema: accountInfoSchema,
  handler: async (args2) => {
    try {
      const parsedArgs = accountInfoSchema.parse(args2);
      const result = await getAccountInfo(parsedArgs);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error("Error in accountInfoTool handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
};

// src/tools/childAccount/schema.ts
import { z as z6 } from "zod";
var childAccountSchema = z6.object({
  address: z6.string().min(1, "Address is required").describe("Flow address to check child accounts for"),
  network: z6.enum(networks).default("mainnet").describe("Flow network to use")
});
var childAccountResultSchema = z6.record(
  z6.string(),
  // address as key
  z6.object({
    name: z6.string(),
    description: z6.string(),
    thumbnail: z6.object({
      url: z6.string()
    })
  })
);

// src/cadence/scripts/standard/get-child-account.cdc?raw
var get_child_account_default = 'import "HybridCustody"\nimport "MetadataViews"\n\naccess(all) fun main(parent: Address): {Address: AnyStruct} {\n    let acct = getAuthAccount<auth(Storage) &Account>(parent)\n    let m = acct.storage.borrow<&HybridCustody.Manager>(from: HybridCustody.ManagerStoragePath)\n\n    if m == nil {\n        return {}\n    } else {\n        var data: {Address: AnyStruct} = {}\n        for address in m?.getChildAddresses()! {\n            let c = m?.getChildAccountDisplay(address: address) \n            data.insert(key: address, c)\n        }\n        return data\n    }\n}';

// src/tools/childAccount/index.ts
var getChildAccount = async (args2) => {
  const { address, network = "mainnet" } = args2;
  const ctx = await buildBlockchainContext(network);
  try {
    const response = await ctx.connector.executeScript(
      get_child_account_default,
      (arg, t) => [arg(address, t.Address)],
      {}
    );
    return response;
  } catch (error) {
    throw new Error(`Error fetching child accounts: ${error instanceof Error ? error.message : String(error)}`);
  }
};
var childAccountTool = {
  name: "get_child_account",
  description: "Get child accounts for a Flow address",
  inputSchema: childAccountSchema,
  handler: async (args2) => {
    try {
      const parsedArgs = childAccountSchema.parse(args2);
      const result = await getChildAccount(parsedArgs);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error("Error in childAccountTool handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
};

// src/tools/query/schema.ts
import { z as z7 } from "zod";
var querySchema = z7.object({
  script: z7.string().describe("Cadence script to execute"),
  args: z7.array(z7.any()).optional().describe("Arguments to pass to the script"),
  network: z7.enum(networks).default("mainnet").describe("Flow network to use")
});

// src/tools/query/index.ts
var executeQuery = async (args2) => {
  const { script, args: scriptArgs = [], network = "mainnet" } = args2;
  const ctx = await buildBlockchainContext(network);
  const result = await ctx.connector.executeScript(
    script,
    (arg, t) => scriptArgs.map((value, index) => {
      if (typeof value === "string" && value.startsWith("0x")) {
        return arg(value, t.Address);
      }
      if (typeof value === "number") {
        return arg(value.toString(), t.UFix64);
      }
      return arg(value, t.String);
    }),
    void 0
  );
  if (result === void 0) {
    throw new Error("Script execution failed");
  }
  return result;
};
var queryTool = {
  name: "execute_query",
  description: "Execute a custom Cadence script on the Flow blockchain",
  inputSchema: querySchema,
  handler: async (args2) => {
    try {
      const parsedArgs = querySchema.parse(args2);
      const result = await executeQuery(parsedArgs);
      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      console.error("Error in queryTool handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
};

// src/tools/getTokenPrice/schema.ts
import { z as z8 } from "zod";
var getTokenPriceSchema = z8.object({
  addresses: z8.string().min(1, "Addresses is required").describe("Token addresses where the contract is deployed")
});
var getTrendingPoolsSchema = z8.object({});

// src/tools/getTokenPrice/index.ts
import axios from "axios";
var getTokenPrice = async (args2) => {
  const { addresses } = args2;
  try {
    let url = `https://api.geckoterminal.com/api/v2/simple/networks/flow-evm/token_price/${addresses}`;
    const res = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json;version=20230302"
      }
    });
    const { data = {} } = res && res.data ? res.data : {};
    const { attributes = {} } = data;
    const { token_prices = {} } = attributes;
    return token_prices;
  } catch (error) {
    throw new Error(`Error fetching contract: ${error instanceof Error ? error.message : String(error)}`);
  }
};
var getTokenPriceTool = {
  name: "get_token_price",
  description: "Get token price on Flow evm chain with token contract addresses",
  inputSchema: getTokenPriceSchema,
  handler: async (args2) => {
    try {
      const parsedArgs = getTokenPriceSchema.parse(args2);
      const result = await getTokenPrice(parsedArgs);
      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      console.error("Error in getTokenPriceTool handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
};

// src/tools/getTrendingPools/schema.ts
import { z as z9 } from "zod";
var getTrendingPoolsSchema2 = z9.object({});

// src/tools/getTrendingPools/index.ts
import axios2 from "axios";
var getTrendingPools = async () => {
  try {
    let url = `https://api.geckoterminal.com/api/v2/networks/flow-evm/trending_pools`;
    const res = await axios2.get(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json;version=20230302"
      }
    });
    const { data = {} } = res && res.data ? res.data : {};
    return data;
  } catch (error) {
    throw new Error(`Error fetching contract: ${error instanceof Error ? error.message : String(error)}`);
  }
};
var getTrendingPoolsTool = {
  name: "get_trending_pools",
  description: "Get trenidng pools info on kittypunch dex",
  inputSchema: getTrendingPoolsSchema2,
  handler: async () => {
    try {
      const result = await getTrendingPools();
      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      console.error("Error in getTokenPriceTool handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
};

// src/tools/getPoolsByToken/schema.ts
import { z as z10 } from "zod";
var getPoolsByTokenSchema = z10.object({
  address: z10.string().min(1, "Token Address is required").describe("Token address where the contract is deployed")
});

// src/tools/getPoolsByToken/index.ts
import axios3 from "axios";
var getPoolsByToken = async (args2) => {
  try {
    const { address } = args2;
    let url = `https://api.geckoterminal.com/api/v2/networks/flow-evm/tokens/${address}/pools?`;
    const res = await axios3.get(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json;version=20230302"
      }
    });
    const { data = {} } = res && res.data ? res.data : {};
    return data;
  } catch (error) {
    throw new Error(`Error fetching contract: ${error instanceof Error ? error.message : String(error)}`);
  }
};
var getPoolsByTokenTool = {
  name: "get_pools_by_token",
  description: "Get pools list info by token contrac address on kittypunch dex",
  inputSchema: getPoolsByTokenSchema,
  handler: async (args2) => {
    try {
      const parsedArgs = getPoolsByTokenSchema.parse(args2);
      const result = await getPoolsByToken(parsedArgs);
      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      console.error("Error in getTokenPriceTool handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
};

// src/tools/getTokenInfo/schema.ts
import { z as z11 } from "zod";
var getTokenInfoSchema = z11.object({
  address: z11.string().min(1, "Addresses is required").describe("Token addresses where the contract is deployed")
});
var getTrendingPoolsSchema3 = z11.object({});

// src/tools/getTokenInfo/index.ts
import axios4 from "axios";
var getTokenInfo = async (args2) => {
  const { address } = args2;
  try {
    let url = `https://api.geckoterminal.com/api/v2/networks/flow-evm/tokens/${address}/info`;
    const res = await axios4.get(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json;version=20230302"
      }
    });
    const { data = {} } = res && res.data ? res.data : {};
    return data;
  } catch (error) {
    throw new Error(`Error fetching contract: ${error instanceof Error ? error.message : String(error)}`);
  }
};
var getTokenInfoTool = {
  name: "get_token_info",
  description: "Get token info on Flow evm chain with token contract address",
  inputSchema: getTokenInfoSchema,
  handler: async (args2) => {
    try {
      const parsedArgs = getTokenInfoSchema.parse(args2);
      const result = await getTokenInfo(parsedArgs);
      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      console.error("Error in getTokenInfoTool handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
};

// src/tools/getTokenPriceHistory/schema.ts
import { z as z12 } from "zod";
var getTokenPriceHistorySchema = z12.object({
  poolAddress: z12.string().min(1, "address is required").describe("Pool address where the contract is deployed"),
  timeFrame: z12.string().min(1, "timeFrame is required").describe("timeFrame is one of day, hour, minute")
});

// src/tools/getTokenPriceHistory/index.ts
import axios5 from "axios";
var getTokenPriceHistory = async (args2) => {
  const { poolAddress, timeFrame } = args2;
  try {
    let url = `https://api.geckoterminal.com/api/v2/networks/flow-evm/pools/${poolAddress}/priceHistory/${timeFrame}`;
    const res = await axios5.get(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json;version=20230302"
      }
    });
    const { data = {} } = res && res.data ? res.data : {};
    return data;
  } catch (error) {
    throw new Error(`Error fetching contract: ${error instanceof Error ? error.message : String(error)}`);
  }
};
var getTokenPriceHistoryTool = {
  name: "get_token_price_history",
  description: "Get token price history on Flow evm chain with pool address and time frame",
  inputSchema: getTokenPriceHistorySchema,
  handler: async (args2) => {
    try {
      const parsedArgs = getTokenPriceHistorySchema.parse(args2);
      const result = await getTokenPriceHistory(parsedArgs);
      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      console.error("Error in getTokenPriceHistoryTool handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
};

// src/tools/swap/index.ts
import { isAddress, encodeFunctionData } from "viem";
import { z as z14 } from "zod";

// node_modules/@modelcontextprotocol/sdk/dist/esm/types.js
import { z as z13 } from "zod";
var JSONRPC_VERSION = "2.0";
var ProgressTokenSchema = z13.union([z13.string(), z13.number().int()]);
var CursorSchema = z13.string();
var BaseRequestParamsSchema = z13.object({
  _meta: z13.optional(z13.object({
    /**
     * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
     */
    progressToken: z13.optional(ProgressTokenSchema)
  }).passthrough())
}).passthrough();
var RequestSchema = z13.object({
  method: z13.string(),
  params: z13.optional(BaseRequestParamsSchema)
});
var BaseNotificationParamsSchema = z13.object({
  /**
   * This parameter name is reserved by MCP to allow clients and servers to attach additional metadata to their notifications.
   */
  _meta: z13.optional(z13.object({}).passthrough())
}).passthrough();
var NotificationSchema = z13.object({
  method: z13.string(),
  params: z13.optional(BaseNotificationParamsSchema)
});
var ResultSchema = z13.object({
  /**
   * This result property is reserved by the protocol to allow clients and servers to attach additional metadata to their responses.
   */
  _meta: z13.optional(z13.object({}).passthrough())
}).passthrough();
var RequestIdSchema = z13.union([z13.string(), z13.number().int()]);
var JSONRPCRequestSchema = z13.object({
  jsonrpc: z13.literal(JSONRPC_VERSION),
  id: RequestIdSchema
}).merge(RequestSchema).strict();
var JSONRPCNotificationSchema = z13.object({
  jsonrpc: z13.literal(JSONRPC_VERSION)
}).merge(NotificationSchema).strict();
var JSONRPCResponseSchema = z13.object({
  jsonrpc: z13.literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  result: ResultSchema
}).strict();
var ErrorCode;
(function(ErrorCode2) {
  ErrorCode2[ErrorCode2["ConnectionClosed"] = -32e3] = "ConnectionClosed";
  ErrorCode2[ErrorCode2["RequestTimeout"] = -32001] = "RequestTimeout";
  ErrorCode2[ErrorCode2["ParseError"] = -32700] = "ParseError";
  ErrorCode2[ErrorCode2["InvalidRequest"] = -32600] = "InvalidRequest";
  ErrorCode2[ErrorCode2["MethodNotFound"] = -32601] = "MethodNotFound";
  ErrorCode2[ErrorCode2["InvalidParams"] = -32602] = "InvalidParams";
  ErrorCode2[ErrorCode2["InternalError"] = -32603] = "InternalError";
})(ErrorCode || (ErrorCode = {}));
var JSONRPCErrorSchema = z13.object({
  jsonrpc: z13.literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  error: z13.object({
    /**
     * The error type that occurred.
     */
    code: z13.number().int(),
    /**
     * A short description of the error. The message SHOULD be limited to a concise single sentence.
     */
    message: z13.string(),
    /**
     * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
     */
    data: z13.optional(z13.unknown())
  })
}).strict();
var JSONRPCMessageSchema = z13.union([
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  JSONRPCResponseSchema,
  JSONRPCErrorSchema
]);
var EmptyResultSchema = ResultSchema.strict();
var CancelledNotificationSchema = NotificationSchema.extend({
  method: z13.literal("notifications/cancelled"),
  params: BaseNotificationParamsSchema.extend({
    /**
     * The ID of the request to cancel.
     *
     * This MUST correspond to the ID of a request previously issued in the same direction.
     */
    requestId: RequestIdSchema,
    /**
     * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
     */
    reason: z13.string().optional()
  })
});
var ImplementationSchema = z13.object({
  name: z13.string(),
  version: z13.string()
}).passthrough();
var ClientCapabilitiesSchema = z13.object({
  /**
   * Experimental, non-standard capabilities that the client supports.
   */
  experimental: z13.optional(z13.object({}).passthrough()),
  /**
   * Present if the client supports sampling from an LLM.
   */
  sampling: z13.optional(z13.object({}).passthrough()),
  /**
   * Present if the client supports listing roots.
   */
  roots: z13.optional(z13.object({
    /**
     * Whether the client supports issuing notifications for changes to the roots list.
     */
    listChanged: z13.optional(z13.boolean())
  }).passthrough())
}).passthrough();
var InitializeRequestSchema = RequestSchema.extend({
  method: z13.literal("initialize"),
  params: BaseRequestParamsSchema.extend({
    /**
     * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
     */
    protocolVersion: z13.string(),
    capabilities: ClientCapabilitiesSchema,
    clientInfo: ImplementationSchema
  })
});
var ServerCapabilitiesSchema = z13.object({
  /**
   * Experimental, non-standard capabilities that the server supports.
   */
  experimental: z13.optional(z13.object({}).passthrough()),
  /**
   * Present if the server supports sending log messages to the client.
   */
  logging: z13.optional(z13.object({}).passthrough()),
  /**
   * Present if the server supports sending completions to the client.
   */
  completions: z13.optional(z13.object({}).passthrough()),
  /**
   * Present if the server offers any prompt templates.
   */
  prompts: z13.optional(z13.object({
    /**
     * Whether this server supports issuing notifications for changes to the prompt list.
     */
    listChanged: z13.optional(z13.boolean())
  }).passthrough()),
  /**
   * Present if the server offers any resources to read.
   */
  resources: z13.optional(z13.object({
    /**
     * Whether this server supports clients subscribing to resource updates.
     */
    subscribe: z13.optional(z13.boolean()),
    /**
     * Whether this server supports issuing notifications for changes to the resource list.
     */
    listChanged: z13.optional(z13.boolean())
  }).passthrough()),
  /**
   * Present if the server offers any tools to call.
   */
  tools: z13.optional(z13.object({
    /**
     * Whether this server supports issuing notifications for changes to the tool list.
     */
    listChanged: z13.optional(z13.boolean())
  }).passthrough())
}).passthrough();
var InitializeResultSchema = ResultSchema.extend({
  /**
   * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
   */
  protocolVersion: z13.string(),
  capabilities: ServerCapabilitiesSchema,
  serverInfo: ImplementationSchema,
  /**
   * Instructions describing how to use the server and its features.
   *
   * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
   */
  instructions: z13.optional(z13.string())
});
var InitializedNotificationSchema = NotificationSchema.extend({
  method: z13.literal("notifications/initialized")
});
var PingRequestSchema = RequestSchema.extend({
  method: z13.literal("ping")
});
var ProgressSchema = z13.object({
  /**
   * The progress thus far. This should increase every time progress is made, even if the total is unknown.
   */
  progress: z13.number(),
  /**
   * Total number of items to process (or total progress required), if known.
   */
  total: z13.optional(z13.number())
}).passthrough();
var ProgressNotificationSchema = NotificationSchema.extend({
  method: z13.literal("notifications/progress"),
  params: BaseNotificationParamsSchema.merge(ProgressSchema).extend({
    /**
     * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
     */
    progressToken: ProgressTokenSchema
  })
});
var PaginatedRequestSchema = RequestSchema.extend({
  params: BaseRequestParamsSchema.extend({
    /**
     * An opaque token representing the current pagination position.
     * If provided, the server should return results starting after this cursor.
     */
    cursor: z13.optional(CursorSchema)
  }).optional()
});
var PaginatedResultSchema = ResultSchema.extend({
  /**
   * An opaque token representing the pagination position after the last returned result.
   * If present, there may be more results available.
   */
  nextCursor: z13.optional(CursorSchema)
});
var ResourceContentsSchema = z13.object({
  /**
   * The URI of this resource.
   */
  uri: z13.string(),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: z13.optional(z13.string())
}).passthrough();
var TextResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
   */
  text: z13.string()
});
var BlobResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * A base64-encoded string representing the binary data of the item.
   */
  blob: z13.string().base64()
});
var ResourceSchema = z13.object({
  /**
   * The URI of this resource.
   */
  uri: z13.string(),
  /**
   * A human-readable name for this resource.
   *
   * This can be used by clients to populate UI elements.
   */
  name: z13.string(),
  /**
   * A description of what this resource represents.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: z13.optional(z13.string()),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: z13.optional(z13.string())
}).passthrough();
var ResourceTemplateSchema = z13.object({
  /**
   * A URI template (according to RFC 6570) that can be used to construct resource URIs.
   */
  uriTemplate: z13.string(),
  /**
   * A human-readable name for the type of resource this template refers to.
   *
   * This can be used by clients to populate UI elements.
   */
  name: z13.string(),
  /**
   * A description of what this template is for.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: z13.optional(z13.string()),
  /**
   * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
   */
  mimeType: z13.optional(z13.string())
}).passthrough();
var ListResourcesRequestSchema = PaginatedRequestSchema.extend({
  method: z13.literal("resources/list")
});
var ListResourcesResultSchema = PaginatedResultSchema.extend({
  resources: z13.array(ResourceSchema)
});
var ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({
  method: z13.literal("resources/templates/list")
});
var ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({
  resourceTemplates: z13.array(ResourceTemplateSchema)
});
var ReadResourceRequestSchema = RequestSchema.extend({
  method: z13.literal("resources/read"),
  params: BaseRequestParamsSchema.extend({
    /**
     * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
     */
    uri: z13.string()
  })
});
var ReadResourceResultSchema = ResultSchema.extend({
  contents: z13.array(z13.union([TextResourceContentsSchema, BlobResourceContentsSchema]))
});
var ResourceListChangedNotificationSchema = NotificationSchema.extend({
  method: z13.literal("notifications/resources/list_changed")
});
var SubscribeRequestSchema = RequestSchema.extend({
  method: z13.literal("resources/subscribe"),
  params: BaseRequestParamsSchema.extend({
    /**
     * The URI of the resource to subscribe to. The URI can use any protocol; it is up to the server how to interpret it.
     */
    uri: z13.string()
  })
});
var UnsubscribeRequestSchema = RequestSchema.extend({
  method: z13.literal("resources/unsubscribe"),
  params: BaseRequestParamsSchema.extend({
    /**
     * The URI of the resource to unsubscribe from.
     */
    uri: z13.string()
  })
});
var ResourceUpdatedNotificationSchema = NotificationSchema.extend({
  method: z13.literal("notifications/resources/updated"),
  params: BaseNotificationParamsSchema.extend({
    /**
     * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
     */
    uri: z13.string()
  })
});
var PromptArgumentSchema = z13.object({
  /**
   * The name of the argument.
   */
  name: z13.string(),
  /**
   * A human-readable description of the argument.
   */
  description: z13.optional(z13.string()),
  /**
   * Whether this argument must be provided.
   */
  required: z13.optional(z13.boolean())
}).passthrough();
var PromptSchema = z13.object({
  /**
   * The name of the prompt or prompt template.
   */
  name: z13.string(),
  /**
   * An optional description of what this prompt provides
   */
  description: z13.optional(z13.string()),
  /**
   * A list of arguments to use for templating the prompt.
   */
  arguments: z13.optional(z13.array(PromptArgumentSchema))
}).passthrough();
var ListPromptsRequestSchema = PaginatedRequestSchema.extend({
  method: z13.literal("prompts/list")
});
var ListPromptsResultSchema = PaginatedResultSchema.extend({
  prompts: z13.array(PromptSchema)
});
var GetPromptRequestSchema = RequestSchema.extend({
  method: z13.literal("prompts/get"),
  params: BaseRequestParamsSchema.extend({
    /**
     * The name of the prompt or prompt template.
     */
    name: z13.string(),
    /**
     * Arguments to use for templating the prompt.
     */
    arguments: z13.optional(z13.record(z13.string()))
  })
});
var TextContentSchema = z13.object({
  type: z13.literal("text"),
  /**
   * The text content of the message.
   */
  text: z13.string()
}).passthrough();
var ImageContentSchema = z13.object({
  type: z13.literal("image"),
  /**
   * The base64-encoded image data.
   */
  data: z13.string().base64(),
  /**
   * The MIME type of the image. Different providers may support different image types.
   */
  mimeType: z13.string()
}).passthrough();
var AudioContentSchema = z13.object({
  type: z13.literal("audio"),
  /**
   * The base64-encoded audio data.
   */
  data: z13.string().base64(),
  /**
   * The MIME type of the audio. Different providers may support different audio types.
   */
  mimeType: z13.string()
}).passthrough();
var EmbeddedResourceSchema = z13.object({
  type: z13.literal("resource"),
  resource: z13.union([TextResourceContentsSchema, BlobResourceContentsSchema])
}).passthrough();
var PromptMessageSchema = z13.object({
  role: z13.enum(["user", "assistant"]),
  content: z13.union([
    TextContentSchema,
    ImageContentSchema,
    AudioContentSchema,
    EmbeddedResourceSchema
  ])
}).passthrough();
var GetPromptResultSchema = ResultSchema.extend({
  /**
   * An optional description for the prompt.
   */
  description: z13.optional(z13.string()),
  messages: z13.array(PromptMessageSchema)
});
var PromptListChangedNotificationSchema = NotificationSchema.extend({
  method: z13.literal("notifications/prompts/list_changed")
});
var ToolSchema = z13.object({
  /**
   * The name of the tool.
   */
  name: z13.string(),
  /**
   * A human-readable description of the tool.
   */
  description: z13.optional(z13.string()),
  /**
   * A JSON Schema object defining the expected parameters for the tool.
   */
  inputSchema: z13.object({
    type: z13.literal("object"),
    properties: z13.optional(z13.object({}).passthrough())
  }).passthrough()
}).passthrough();
var ListToolsRequestSchema = PaginatedRequestSchema.extend({
  method: z13.literal("tools/list")
});
var ListToolsResultSchema = PaginatedResultSchema.extend({
  tools: z13.array(ToolSchema)
});
var CallToolResultSchema = ResultSchema.extend({
  content: z13.array(z13.union([TextContentSchema, ImageContentSchema, AudioContentSchema, EmbeddedResourceSchema])),
  isError: z13.boolean().default(false).optional()
});
var CompatibilityCallToolResultSchema = CallToolResultSchema.or(ResultSchema.extend({
  toolResult: z13.unknown()
}));
var CallToolRequestSchema = RequestSchema.extend({
  method: z13.literal("tools/call"),
  params: BaseRequestParamsSchema.extend({
    name: z13.string(),
    arguments: z13.optional(z13.record(z13.unknown()))
  })
});
var ToolListChangedNotificationSchema = NotificationSchema.extend({
  method: z13.literal("notifications/tools/list_changed")
});
var LoggingLevelSchema = z13.enum([
  "debug",
  "info",
  "notice",
  "warning",
  "error",
  "critical",
  "alert",
  "emergency"
]);
var SetLevelRequestSchema = RequestSchema.extend({
  method: z13.literal("logging/setLevel"),
  params: BaseRequestParamsSchema.extend({
    /**
     * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
     */
    level: LoggingLevelSchema
  })
});
var LoggingMessageNotificationSchema = NotificationSchema.extend({
  method: z13.literal("notifications/message"),
  params: BaseNotificationParamsSchema.extend({
    /**
     * The severity of this log message.
     */
    level: LoggingLevelSchema,
    /**
     * An optional name of the logger issuing this message.
     */
    logger: z13.optional(z13.string()),
    /**
     * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
     */
    data: z13.unknown()
  })
});
var ModelHintSchema = z13.object({
  /**
   * A hint for a model name.
   */
  name: z13.string().optional()
}).passthrough();
var ModelPreferencesSchema = z13.object({
  /**
   * Optional hints to use for model selection.
   */
  hints: z13.optional(z13.array(ModelHintSchema)),
  /**
   * How much to prioritize cost when selecting a model.
   */
  costPriority: z13.optional(z13.number().min(0).max(1)),
  /**
   * How much to prioritize sampling speed (latency) when selecting a model.
   */
  speedPriority: z13.optional(z13.number().min(0).max(1)),
  /**
   * How much to prioritize intelligence and capabilities when selecting a model.
   */
  intelligencePriority: z13.optional(z13.number().min(0).max(1))
}).passthrough();
var SamplingMessageSchema = z13.object({
  role: z13.enum(["user", "assistant"]),
  content: z13.union([TextContentSchema, ImageContentSchema, AudioContentSchema])
}).passthrough();
var CreateMessageRequestSchema = RequestSchema.extend({
  method: z13.literal("sampling/createMessage"),
  params: BaseRequestParamsSchema.extend({
    messages: z13.array(SamplingMessageSchema),
    /**
     * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
     */
    systemPrompt: z13.optional(z13.string()),
    /**
     * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt. The client MAY ignore this request.
     */
    includeContext: z13.optional(z13.enum(["none", "thisServer", "allServers"])),
    temperature: z13.optional(z13.number()),
    /**
     * The maximum number of tokens to sample, as requested by the server. The client MAY choose to sample fewer tokens than requested.
     */
    maxTokens: z13.number().int(),
    stopSequences: z13.optional(z13.array(z13.string())),
    /**
     * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
     */
    metadata: z13.optional(z13.object({}).passthrough()),
    /**
     * The server's preferences for which model to select.
     */
    modelPreferences: z13.optional(ModelPreferencesSchema)
  })
});
var CreateMessageResultSchema = ResultSchema.extend({
  /**
   * The name of the model that generated the message.
   */
  model: z13.string(),
  /**
   * The reason why sampling stopped.
   */
  stopReason: z13.optional(z13.enum(["endTurn", "stopSequence", "maxTokens"]).or(z13.string())),
  role: z13.enum(["user", "assistant"]),
  content: z13.discriminatedUnion("type", [
    TextContentSchema,
    ImageContentSchema,
    AudioContentSchema
  ])
});
var ResourceReferenceSchema = z13.object({
  type: z13.literal("ref/resource"),
  /**
   * The URI or URI template of the resource.
   */
  uri: z13.string()
}).passthrough();
var PromptReferenceSchema = z13.object({
  type: z13.literal("ref/prompt"),
  /**
   * The name of the prompt or prompt template
   */
  name: z13.string()
}).passthrough();
var CompleteRequestSchema = RequestSchema.extend({
  method: z13.literal("completion/complete"),
  params: BaseRequestParamsSchema.extend({
    ref: z13.union([PromptReferenceSchema, ResourceReferenceSchema]),
    /**
     * The argument's information
     */
    argument: z13.object({
      /**
       * The name of the argument
       */
      name: z13.string(),
      /**
       * The value of the argument to use for completion matching.
       */
      value: z13.string()
    }).passthrough()
  })
});
var CompleteResultSchema = ResultSchema.extend({
  completion: z13.object({
    /**
     * An array of completion values. Must not exceed 100 items.
     */
    values: z13.array(z13.string()).max(100),
    /**
     * The total number of completion options available. This can exceed the number of values actually sent in the response.
     */
    total: z13.optional(z13.number().int()),
    /**
     * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
     */
    hasMore: z13.optional(z13.boolean())
  }).passthrough()
});
var RootSchema = z13.object({
  /**
   * The URI identifying the root. This *must* start with file:// for now.
   */
  uri: z13.string().startsWith("file://"),
  /**
   * An optional name for the root.
   */
  name: z13.optional(z13.string())
}).passthrough();
var ListRootsRequestSchema = RequestSchema.extend({
  method: z13.literal("roots/list")
});
var ListRootsResultSchema = ResultSchema.extend({
  roots: z13.array(RootSchema)
});
var RootsListChangedNotificationSchema = NotificationSchema.extend({
  method: z13.literal("notifications/roots/list_changed")
});
var ClientRequestSchema = z13.union([
  PingRequestSchema,
  InitializeRequestSchema,
  CompleteRequestSchema,
  SetLevelRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  CallToolRequestSchema,
  ListToolsRequestSchema
]);
var ClientNotificationSchema = z13.union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  InitializedNotificationSchema,
  RootsListChangedNotificationSchema
]);
var ClientResultSchema = z13.union([
  EmptyResultSchema,
  CreateMessageResultSchema,
  ListRootsResultSchema
]);
var ServerRequestSchema = z13.union([
  PingRequestSchema,
  CreateMessageRequestSchema,
  ListRootsRequestSchema
]);
var ServerNotificationSchema = z13.union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema
]);
var ServerResultSchema = z13.union([
  EmptyResultSchema,
  InitializeResultSchema,
  CompleteResultSchema,
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ReadResourceResultSchema,
  CallToolResultSchema,
  ListToolsResultSchema
]);

// src/types/tools.ts
var ToolInputSchema = ToolSchema.shape.inputSchema;
function createTextResponse(text) {
  return {
    content: [{
      type: "text",
      text
    }]
  };
}

// src/utils/evm/viem.ts
import { createPublicClient, http } from "viem";
var networks2 = {
  monadTestnet: {
    id: 747,
    name: "Flow EVM mainnet",
    nativeCurrency: { name: "Flow token", symbol: "FLOW", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://mainnet.evm.nodes.onflow.org"] }
    }
  }
};
function getPublicClient(networkName2 = "monadTestnet") {
  const network = networks2[networkName2];
  if (!network) {
    throw new Error(`Network ${networkName2} not found in configuration`);
  }
  return createPublicClient({
    chain: network,
    transport: http(network.rpcUrls.default.http[0])
  });
}

// src/utils/evm/supportedErc20Tokens.ts
var ERC20_TOKENS = {
  "Wrapped Flow": {
    contractAddress: "0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e",
    symbol: "WFLOW",
    name: "Wrapped Flow",
    decimals: 18
  },
  "Trump": {
    contractAddress: "0xd3378b419feae4e3a4bb4f3349dba43a1b511760",
    symbol: "TRUMP",
    name: "OFFICIAL TRUMP",
    decimals: 18
  },
  "HotCocoa": {
    contractAddress: "0x6A64E027E3F6A94AcBDCf39CF0cBb4BeaD5f5ecb",
    symbol: "HotCocoa",
    name: "HotCocoa",
    decimals: 18
  },
  "Gwendolion": {
    contractAddress: "0xf45CBE30bD953590C9917799142Edb05Be3F293F",
    symbol: "Gwendolion",
    name: "Gwendolion",
    decimals: 18
  },
  "Pawderick": {
    contractAddress: "0x10448481630fb6d20B597e5B3d7e42DCb1247C8A",
    symbol: "Pawderick",
    name: "Pawderick",
    decimals: 18
  },
  "Catseye": {
    contractAddress: "0x9b565507858812e8B5FfbFBDE9B200A3bc2e8F76",
    symbol: "Catseye",
    name: "Catseye",
    decimals: 18
  }
};

// src/tools/swap/index.ts
var UniswapV2FactoryABI = [
  {
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" }
    ],
    name: "getPair",
    outputs: [{ name: "pair", type: "address" }],
    stateMutability: "view",
    type: "function"
  }
];
var UniswapV2PairABI = [
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  }
];
var UNISWAP_V2_FACTORY_ADDRESS = "0x29372c22459a4e373851798bFd6808e71EA34A71";
var quoteSchema = z14.object({
  tokenIn: z14.string().refine((input) => {
    return Object.entries(ERC20_TOKENS).some(
      ([key, token]) => key === input || token.symbol === input || token.name === input || token.contractAddress === input
    );
  }, {
    message: "Invalid tokenIn. Please provide a valid token name, symbol, or contract address",
    path: ["tokenIn"]
  }).describe("The input token (name, symbol, or contract address)"),
  tokenOut: z14.string().refine((input) => {
    return Object.entries(ERC20_TOKENS).some(
      ([key, token]) => key === input || token.symbol === input || token.name === input || token.contractAddress === input
    );
  }, {
    message: "Invalid tokenOut. Please provide a valid token name, symbol, or contract address",
    path: ["tokenOut"]
  }).describe("The output token (name, symbol, or contract address)"),
  amountIn: z14.string().describe("The amount of input tokens to swap")
});
var swapSchema = z14.object({
  tokenIn: z14.string().refine((input) => {
    if (input === "MON") return true;
    return Object.entries(ERC20_TOKENS).some(
      ([key, token]) => key === input || token.symbol === input || token.name === input || token.contractAddress === input
    );
  }, {
    message: "Invalid tokenIn. Please provide a valid token name, symbol, or contract address",
    path: ["tokenIn"]
  }).describe("The input token (name, symbol, or contract address)"),
  tokenOut: z14.string().refine((input) => {
    if (input === "MON") return true;
    return Object.entries(ERC20_TOKENS).some(
      ([key, token]) => key === input || token.symbol === input || token.name === input || token.contractAddress === input
    );
  }, {
    message: "Invalid tokenOut. Please provide a valid token name, symbol, or contract address",
    path: ["tokenOut"]
  }).describe("The output token (name, symbol, or contract address)"),
  amountIn: z14.string().describe("The amount of input tokens to swap"),
  slippageTolerance: z14.number().min(0.1).max(50).default(2).describe("Slippage tolerance in percentage (default: 2%)"),
  allNadsAccount: z14.string().refine((addr) => isAddress(addr), {
    message: "Invalid allnads account address format",
    path: ["allNadsAccount"]
  }).describe("The allnads account that will execute the swap"),
  deadline: z14.number().default(Math.floor(Date.now() / 1e3) + 60 * 20).describe("Transaction deadline in seconds (default: 20 minutes from now)")
});
function formatTokenAmount(amount, decimals) {
  if (amount === 0n) return "0";
  const amountStr = amount.toString();
  if (amountStr.length <= decimals) {
    const paddedAmount = amountStr.padStart(decimals + 1, "0");
    const integerPart = paddedAmount.slice(0, -decimals) || "0";
    const fractionalPart = paddedAmount.slice(-decimals).replace(/0+$/, "");
    return fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
  } else {
    const integerPart = amountStr.slice(0, amountStr.length - decimals);
    const fractionalPart = amountStr.slice(amountStr.length - decimals).replace(/0+$/, "");
    return fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
  }
}
function getAmountOut(amountIn, reserveIn, reserveOut) {
  if (amountIn === 0n) return 0n;
  if (reserveIn === 0n || reserveOut === 0n) return 0n;
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  return numerator / denominator;
}
var punchswapQuoteTool = {
  name: "punchswap_quote",
  description: `
  Get a price quote from Punchswap V2 for swapping between two tokens.
  Supported tokens: Wrapped Monad(WMON), Moyaki(YAKI), Chog(CHOG), Molandak(DAK), USDT, USDC, WBTC.
  You can specify tokens by name, symbol, or contract address.
  The tool will check if a liquidity pair exists and return the current exchange rate.`,
  inputSchema: quoteSchema,
  handler: async (params) => {
    try {
      const { tokenIn, tokenOut, amountIn } = params;
      const publicClient = getPublicClient();
      let tokenInInfo;
      for (const [key, info] of Object.entries(ERC20_TOKENS)) {
        if (key === tokenIn || info.symbol === tokenIn || info.name === tokenIn || info.contractAddress === tokenIn) {
          tokenInInfo = info;
          break;
        }
      }
      if (!tokenInInfo) {
        return createTextResponse("Invalid input token");
      }
      let tokenOutInfo;
      if (tokenOut === "MON") {
        tokenOutInfo = {
          symbol: "MON",
          name: "Monad",
          decimals: 18
        };
      } else {
        for (const [key, info] of Object.entries(ERC20_TOKENS)) {
          if (key === tokenOut || info.symbol === tokenOut || info.name === tokenOut || info.contractAddress === tokenOut) {
            tokenOutInfo = info;
            break;
          }
        }
      }
      if (!tokenOutInfo) {
        return createTextResponse("Invalid output token");
      }
      const amountInParsed = parseFloat(amountIn);
      if (isNaN(amountInParsed)) {
        return createTextResponse("Invalid amount");
      }
      const amountInWei = BigInt(Math.floor(amountInParsed * 10 ** tokenInInfo.decimals));
      const isETHIn = tokenIn === "FLOW";
      const isETHOut = tokenOut === "FLOW";
      const WMON_ADDRESS = ERC20_TOKENS["Wrapped Flow"].contractAddress;
      const tokenInAddressForPair = isETHIn ? WMON_ADDRESS : tokenInInfo.contractAddress;
      const tokenOutAddressForPair = isETHOut ? WMON_ADDRESS : tokenOutInfo.contractAddress;
      const pairAddress = await publicClient.readContract({
        address: UNISWAP_V2_FACTORY_ADDRESS,
        abi: UniswapV2FactoryABI,
        functionName: "getPair",
        args: [tokenInAddressForPair, tokenOutAddressForPair]
      });
      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        return createTextResponse(`No liquidity pair found for ${tokenInInfo.symbol} and ${tokenOutInfo.symbol}`);
      }
      const token0 = await publicClient.readContract({
        address: pairAddress,
        abi: UniswapV2PairABI,
        functionName: "token0"
      });
      const [reserve0, reserve1] = await publicClient.readContract({
        address: pairAddress,
        abi: UniswapV2PairABI,
        functionName: "getReserves"
      });
      const isToken0 = tokenInAddressForPair.toLowerCase() === token0.toLowerCase();
      const reserveIn = isToken0 ? reserve0 : reserve1;
      const reserveOut = isToken0 ? reserve1 : reserve0;
      const amountOut = getAmountOut(amountInWei, reserveIn, reserveOut);
      const formattedAmountOut = formatTokenAmount(amountOut, tokenOutInfo.decimals);
      const exchangeRate = Number(amountOut) / Number(amountInWei) * 10 ** (tokenInInfo.decimals - tokenOutInfo.decimals);
      const priceImpact = calculatePriceImpact(amountInWei, reserveIn);
      const result = {
        tokenIn: {
          symbol: tokenInInfo.symbol,
          name: tokenInInfo.name,
          address: tokenInInfo.contractAddress,
          amount: amountIn
        },
        tokenOut: {
          symbol: tokenOutInfo.symbol,
          name: tokenOutInfo.name,
          address: tokenOutInfo.contractAddress,
          amount: formattedAmountOut
        },
        exchangeRate: `1 ${tokenInInfo.symbol} = ${exchangeRate.toFixed(6)} ${tokenOutInfo.symbol}`,
        swapDetails: {
          pairAddress,
          reserveIn: reserveIn.toString(),
          reserveOut: reserveOut.toString(),
          priceImpact
        }
      };
      return createTextResponse(JSON.stringify(result, null, 2));
    } catch (error) {
      return createTextResponse(`Error getting Punchswap quote: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
function calculatePriceImpact(amountIn, reserveIn) {
  if (reserveIn === 0n) return "Unknown";
  const impact = Number(amountIn * 10000n / reserveIn) / 100;
  if (impact < 0.1) return "Very Low (<0.1%)";
  if (impact < 0.5) return "Low (0.1-0.5%)";
  if (impact < 1) return "Medium (0.5-1.0%)";
  if (impact < 3) return "High (1.0-3.0%)";
  return `Very High (${impact.toFixed(2)}%)`;
}
var UniswapV2RouterABI = [
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    name: "swapExactTokensForTokens",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    name: "swapExactTokensForETH",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    name: "swapExactETHForTokens",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "payable",
    type: "function"
  }
];
var ERC20ApproveABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
];
var UNISWAP_V2_ROUTER_ADDRESS = "0xfb8e1c3b833f9e67a71c859a132cf783b645e436";
var ERC20AllowanceABI = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
];
var MAX_ALLOWANCE = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn;
var punchswapSwapTool = {
  name: "punchswap_swap",
  description: `
  Create a transaction to swap tokens on Punchswap V2.
  Supported tokens: Monad(MON, the native token), Wrapped Monad(WMON), Moyaki(YAKI), Chog(CHOG), Molandak(DAK), USDT, USDC, WBTC.
  You can specify tokens by name, symbol, or contract address.
  The tool will check if a liquidity pair exists and create the appropriate transaction.
  If approval is needed, it will return the approval transaction first.`,
  inputSchema: swapSchema,
  handler: async (params) => {
    try {
      const { allNadsAccount, tokenIn, tokenOut, amountIn, slippageTolerance, deadline } = params;
      const publicClient = getPublicClient();
      let tokenInInfo;
      if (tokenIn === "MON") {
        tokenInInfo = {
          symbol: "MON",
          name: "Monad",
          decimals: 18
        };
      } else {
        for (const [key, info] of Object.entries(ERC20_TOKENS)) {
          if (key === tokenIn || info.symbol === tokenIn || info.name === tokenIn || info.contractAddress === tokenIn) {
            tokenInInfo = info;
            break;
          }
        }
      }
      if (!tokenInInfo) {
        return createTextResponse("Invalid input token");
      }
      let tokenOutInfo;
      if (tokenOut === "MON") {
        tokenOutInfo = {
          symbol: "MON",
          name: "Monad",
          decimals: 18
        };
      } else {
        for (const [key, info] of Object.entries(ERC20_TOKENS)) {
          if (key === tokenOut || info.symbol === tokenOut || info.name === tokenOut || info.contractAddress === tokenOut) {
            tokenOutInfo = info;
            break;
          }
        }
      }
      if (!tokenOutInfo) {
        return createTextResponse("Invalid output token");
      }
      const amountInParsed = parseFloat(amountIn);
      if (isNaN(amountInParsed)) {
        return createTextResponse("Invalid amount");
      }
      const amountInWei = BigInt(Math.floor(amountInParsed * 10 ** tokenInInfo.decimals));
      const isETHIn = tokenIn === "FLOW";
      const isETHOut = tokenOut === "FLOW";
      const WFLOW_ADDRESS = ERC20_TOKENS["Wrapped Flow"].contractAddress;
      const tokenInAddressForPair = isETHIn ? WFLOW_ADDRESS : tokenInInfo.contractAddress;
      const tokenOutAddressForPair = isETHOut ? WFLOW_ADDRESS : tokenOutInfo.contractAddress;
      const pairAddress = await publicClient.readContract({
        address: UNISWAP_V2_FACTORY_ADDRESS,
        abi: UniswapV2FactoryABI,
        functionName: "getPair",
        args: [tokenInAddressForPair, tokenOutAddressForPair]
      });
      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        return createTextResponse(`No liquidity pair found for ${tokenInInfo.symbol} and ${tokenOutInfo.symbol}`);
      }
      const token0 = await publicClient.readContract({
        address: pairAddress,
        abi: UniswapV2PairABI,
        functionName: "token0"
      });
      const [reserve0, reserve1] = await publicClient.readContract({
        address: pairAddress,
        abi: UniswapV2PairABI,
        functionName: "getReserves"
      });
      const isToken0 = tokenInAddressForPair.toLowerCase() === token0.toLowerCase();
      const reserveIn = isToken0 ? reserve0 : reserve1;
      const reserveOut = isToken0 ? reserve1 : reserve0;
      const amountOut = getAmountOut(amountInWei, reserveIn, reserveOut);
      const slippageFactor = 1000n - BigInt(Math.floor(slippageTolerance * 10));
      const amountOutMin = amountOut * slippageFactor / 1000n;
      const path = [tokenInAddressForPair, tokenOutAddressForPair];
      if (isETHIn) {
        const swapData = encodeFunctionData({
          abi: UniswapV2RouterABI,
          functionName: "swapExactETHForTokens",
          args: [
            amountOutMin,
            path,
            allNadsAccount,
            BigInt(deadline)
          ]
        });
        const transactionRequest = {
          to: UNISWAP_V2_ROUTER_ADDRESS,
          data: swapData,
          value: "0"
        };
        return createTextResponse(
          `<<TransactionRequest>>
${JSON.stringify(transactionRequest, null, 2)}`
        );
      }
      try {
        const currentAllowance = await publicClient.readContract({
          address: tokenInAddressForPair,
          abi: ERC20AllowanceABI,
          functionName: "allowance",
          args: [allNadsAccount, UNISWAP_V2_ROUTER_ADDRESS]
        });
        if (currentAllowance < amountInWei) {
          const approveData = encodeFunctionData({
            abi: ERC20ApproveABI,
            functionName: "approve",
            args: [UNISWAP_V2_ROUTER_ADDRESS, MAX_ALLOWANCE]
          });
          const approveTransaction = {
            to: tokenInAddressForPair,
            data: approveData,
            value: "0"
          };
          return createTextResponse(
            `<<TransactionRequest>>
${JSON.stringify(approveTransaction, null, 2)}

`
          );
        }
      } catch (error) {
        return createTextResponse(`Error checking token allowance: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (isETHOut) {
        const swapData = encodeFunctionData({
          abi: UniswapV2RouterABI,
          functionName: "swapExactTokensForETH",
          args: [
            amountInWei,
            amountOutMin,
            path,
            allNadsAccount,
            BigInt(deadline)
          ]
        });
        const swapTransaction = {
          to: UNISWAP_V2_ROUTER_ADDRESS,
          data: swapData,
          value: "0"
        };
        return createTextResponse(
          `<<TransactionRequest>>
${JSON.stringify(swapTransaction, null, 2)}`
        );
      } else {
        const swapData = encodeFunctionData({
          abi: UniswapV2RouterABI,
          functionName: "swapExactTokensForTokens",
          args: [
            amountInWei,
            amountOutMin,
            path,
            allNadsAccount,
            BigInt(deadline)
          ]
        });
        const swapTransaction = {
          to: UNISWAP_V2_ROUTER_ADDRESS,
          data: swapData,
          value: "0"
        };
        return createTextResponse(
          `<<TransactionRequest>>
${JSON.stringify(swapTransaction, null, 2)}`
        );
      }
    } catch (error) {
      return createTextResponse(`Error creating swap transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

// src/tools/erc20/index.ts
import { isAddress as isAddress2, encodeFunctionData as encodeFunctionData2, erc20Abi } from "viem";
import { z as z15 } from "zod";
function formatTokenBalance(balance, decimals) {
  if (balance === 0n) return "0";
  const balanceStr = balance.toString();
  if (balanceStr.length <= decimals) {
    const paddedBalance = balanceStr.padStart(decimals + 1, "0");
    const integerPart = paddedBalance.slice(0, -decimals) || "0";
    const fractionalPart = paddedBalance.slice(-decimals).replace(/0+$/, "");
    return fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
  } else {
    const integerPart = balanceStr.slice(0, balanceStr.length - decimals);
    const fractionalPart = balanceStr.slice(balanceStr.length - decimals).replace(/0+$/, "");
    return fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
  }
}
var getErc20TokenSchema = z15.object({
  address: z15.string().refine((addr) => isAddress2(addr), {
    message: "Invalid address format",
    path: ["address"]
  }).describe("The address to get the erc20 tokens for")
});
var getErc20TokensTool = {
  name: "get_erc20_tokens",
  description: `
  Get all erc20 tokens for an address, the information includes the token name, symbol, contract address, decimals and balance.
  Only Wrapped Flow(WFLOW), Trump(TRUMP), HotCocoa, Gwendolion, Pawderick, Catseye are supported.
  Note: MON is not ERC20 token, you should use evm_tool to get the balance of MON`,
  inputSchema: getErc20TokenSchema,
  handler: async (params) => {
    try {
      const { address } = params;
      const publicClient = getPublicClient();
      const tokenResults = await Promise.all(
        Object.entries(ERC20_TOKENS).map(async ([name, tokenInfo]) => {
          try {
            const balance = await publicClient.readContract({
              address: tokenInfo.contractAddress,
              abi: [
                {
                  name: "balanceOf",
                  type: "function",
                  inputs: [{ name: "owner", type: "address" }],
                  outputs: [{ name: "balance", type: "uint256" }],
                  stateMutability: "view"
                }
              ],
              functionName: "balanceOf",
              args: [address]
            });
            const formattedBalance = formatTokenBalance(balance, tokenInfo.decimals);
            return {
              ...tokenInfo,
              name,
              rawBalance: balance.toString(),
              balance: formattedBalance
            };
          } catch (error) {
            console.error(`Error fetching balance for ${name}:`, error);
            return {
              ...tokenInfo,
              name,
              rawBalance: "0",
              balance: "0",
              error: error instanceof Error ? error.message : String(error)
            };
          }
        })
      );
      return createTextResponse(JSON.stringify(tokenResults, null, 2));
    } catch (error) {
      return createTextResponse(`Error fetching ERC20 tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
var transferErc20TokenTool = {
  name: "transfer_erc20_token",
  description: "Transfer an erc20 token to an address. You can query the address book to get the recipient address.",
  inputSchema: z15.object({
    token: z15.string().refine((input) => {
      return Object.entries(ERC20_TOKENS).some(
        ([key, token]) => key === input || token.symbol === input || token.name === input || token.contractAddress === input
      );
    }, {
      message: "Invalid token. Please provide a valid token name, symbol, or contract address",
      path: ["token"]
    }).describe("The token to send (name, symbol, or contract address)"),
    to: z15.string().refine((addr) => isAddress2(addr), {
      message: "Invalid address format",
      path: ["to"]
    }).describe("The address to send the token to"),
    amount: z15.string().describe("The amount of tokens to send")
  }),
  handler: async (params) => {
    try {
      const { token, to, amount } = params;
      let tokenInfo;
      for (const [key, info] of Object.entries(ERC20_TOKENS)) {
        if (key === token || info.symbol === token || info.name === token || info.contractAddress === token) {
          tokenInfo = info;
          break;
        }
      }
      if (!tokenInfo) {
        return createTextResponse("Invalid token");
      }
      const transactionRequest = {
        to: tokenInfo.contractAddress,
        data: encodeFunctionData2({
          abi: erc20Abi,
          functionName: "transfer",
          args: [to, BigInt(amount)]
        })
      };
      return createTextResponse(`<<TransactionRequest>>
${JSON.stringify(transactionRequest, null, 2)}`);
    } catch (error) {
      return createTextResponse(`Error sending erc20 token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

// src/tools/index.ts
var createTools = () => {
  return [
    flowBalanceTool,
    tokenBalanceTool,
    coaAccountTool,
    getContractTool,
    accountInfoTool,
    childAccountTool,
    queryTool,
    getTokenPriceTool,
    getTrendingPoolsTool,
    getPoolsByTokenTool,
    getTokenInfoTool,
    getTokenPriceHistoryTool,
    punchswapQuoteTool,
    punchswapSwapTool,
    getErc20TokensTool,
    transferErc20TokenTool
  ];
};

// src/prompts/index.ts
import { z as z16 } from "zod";

// src/prompts/flow/index.ts
var getFlowBalancePrompt = {
  name: "flow.getBalance",
  description: "Get the balance of a Flow account",
  schema: flowBalanceSchema,
  handler: ({ address, network = "mainnet" }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please get the balance for Flow account ${address} on the ${network} network.`
      }
    }]
  })
};
var getAccountInfoPrompt = {
  name: "flow.getAccountInfo",
  description: "Get information about a Flow account",
  schema: accountInfoSchema,
  handler: ({ address, network = "mainnet" }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please get account information for Flow account ${address} on the ${network} network.`
      }
    }]
  })
};
var getCoaAccountPrompt = {
  name: "flow.findCoaAccounts",
  description: "Find COA accounts associated with an address",
  schema: coaAccountSchema,
  handler: ({ address, network = "mainnet" }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please find COA accounts associated with Flow account ${address} on the ${network} network.`
      }
    }]
  })
};
var getChildAccountPrompt = {
  name: "flow.getChildAccount",
  description: "Get child accounts associated with a Flow address",
  schema: childAccountSchema,
  handler: ({ address, network = "mainnet" }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please get child accounts for Flow account ${address} on the ${network} network.`
      }
    }]
  })
};
var getContractPrompt = {
  name: "flow.getContract",
  description: "Get the source code of a contract deployed at a specific address",
  schema: getContractSchema,
  handler: ({ address, contractName, network = "mainnet" }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please get the source code for contract ${contractName} deployed at Flow account ${address} on the ${network} network.`
      }
    }]
  })
};
var getTokenBalancePrompt = {
  name: "flow.getTokenBalance",
  description: "Get the balances of all fungible tokens for a Flow address",
  schema: tokenBalanceSchema,
  handler: ({ address, network = "mainnet" }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please get all fungible token balances for Flow account ${address} on the ${network} network.`
      }
    }]
  })
};

// src/prompts/index.ts
var promptSchema = z16.object({
  name: z16.string().min(1, "Name is required"),
  description: z16.string().optional(),
  arguments: z16.array(z16.object({
    name: z16.string(),
    description: z16.string().optional(),
    required: z16.boolean().optional()
  })).optional(),
  handler: z16.function().args(z16.any()).returns(z16.any())
});
var createPrompts = () => {
  return [
    getFlowBalancePrompt,
    getAccountInfoPrompt,
    getCoaAccountPrompt,
    getChildAccountPrompt,
    getContractPrompt,
    getTokenBalancePrompt
  ];
};

// src/server.ts
function createServer() {
  const server2 = new FastMCP({
    name: "flow-mcp",
    version: "0.1.0"
  });
  const tools = createTools();
  for (const tool of tools) {
    server2.addTool({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
      execute: async (args2, context) => {
        const result = await tool.handler(args2);
        if (typeof result.content[0].text === "string") {
          return result.content[0].text;
        }
        return JSON.stringify(result.content[0].text);
      }
    });
  }
  const prompts = createPrompts();
  for (const prompt of prompts) {
    server2.addPrompt({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments,
      load: async (args2) => {
        const result = await prompt.handler(args2);
        return result.messages[0].content.text;
      }
    });
  }
  return server2;
}
function startServer(server2, useSSE2) {
  if (useSSE2) {
    server2.start({
      transportType: "sse",
      sse: {
        endpoint: "/sse",
        port: 8080
      }
    });
  } else {
    server2.start({
      transportType: "stdio"
    });
  }
}

// src/index.ts
var args = process.argv.slice(2);
var useSSE = args.includes("--sse");
var server = createServer();
startServer(server, useSSE);
var index_default = server;
export {
  index_default as default
};
