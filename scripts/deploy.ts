import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { artifacts } from "hardhat";

dotenvConfig({ path: resolve(__dirname, "../.env") });

async function main() {
  if (!process.env.PRIVATE_KEY || !process.env.ALCHEMY_API_KEY) {
    throw new Error('Please set your PRIVATE_KEY and ALCHEMY_API_KEY in a .env file');
  }

  // Configure clients
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`)
  });

  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
  
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`)
  });

  console.log("Deploying contracts with account:", account.address);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Account balance:", formatEther(balance), "ETH");

  // Get contract artifacts
  const WeakHands = await artifacts.readArtifact("WeakHands");

  // Chainlink ETH/USD Price Feed address for Sepolia
  const CHAINLINK_PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

  // Deploy contract
  console.log("Deploying WeakHands...");
  
  const hash = await walletClient.deployContract({
    abi: WeakHands.abi,
    bytecode: WeakHands.bytecode as `0x${string}`,
    args: [CHAINLINK_PRICE_FEED],
  });

  // Wait for deployment and get contract address
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;

  if (!contractAddress) {
    throw new Error('Contract address is undefined');
  }

  console.log("WeakHands deployed to:", contractAddress);

  // Wait for additional block confirmations
  console.log("Waiting for additional block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds

  // Verify contract on Etherscan
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Verifying contract on Etherscan...");
    try {
      const { execSync } = require('child_process');
      execSync(`npx hardhat verify --network sepolia ${contractAddress} ${CHAINLINK_PRICE_FEED}`);
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.error("Error verifying contract:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });