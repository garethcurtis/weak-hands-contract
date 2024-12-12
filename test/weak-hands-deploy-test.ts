import { expect } from "chai";
import { createPublicClient, createWalletClient, http, parseEther, formatUnits, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { artifacts } from "hardhat";

dotenvConfig({ path: resolve(__dirname, "../.env") });

describe("WeakHands Integration Tests", function() {
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
  let publicClient: any;
  let walletClient: any;
  let account: any;
  let contractABI: any;

  before(async function() {
    if (!process.env.PRIVATE_KEY || !process.env.ALCHEMY_API_KEY || !CONTRACT_ADDRESS) {
      throw new Error('Please set your PRIVATE_KEY, ALCHEMY_API_KEY, and CONTRACT_ADDRESS in the .env file');
    }

    // Get contract ABI
    const WeakHands = await artifacts.readArtifact("WeakHands");
    contractABI = WeakHands.abi;

    // Configure clients
    publicClient = createPublicClient({
      chain: sepolia,
      transport: http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`)
    });

    account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
    
    walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`)
    });
  });

  it("should be able to get the latest ETH price", async function() {
    const currentPrice = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: contractABI,
      functionName: 'getLatestPrice'
    });
    
    const priceInUSD = Number(formatUnits(currentPrice, 8));
    console.log("Current ETH price: $" + priceInUSD.toLocaleString());
    expect(Number(currentPrice)).to.be.greaterThan(0);
  });

  it("should be able to make a deposit", async function() {
    const depositAmount = parseEther('0.00001');
    console.log("Attempting to deposit:", formatEther(depositAmount), "ETH");
    
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: contractABI,
        functionName: 'deposit',
        value: depositAmount
      });
      console.log("Deposit transaction hash:", hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("Deposit confirmed in block:", receipt.blockNumber);
      expect(receipt.status).to.equal('success');
    } catch (error: any) {
      console.log("Deposit failed:", error.message);
      throw error;
    }
  });

  it("should be able to set parameters", async function() {
    const targetDate = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24 hours from now
    const targetPriceUSD = 2500n; // $2500 USD
    
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: contractABI,
        functionName: 'setParameters',
        args: [targetDate, targetPriceUSD]
      });
      console.log("SetParameters transaction hash:", hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("Parameters set in block:", receipt.blockNumber);
      expect(receipt.status).to.equal('success');
    } catch (error: any) {
      console.log("Setting parameters failed:", error.message);
      throw error;
    }
  });

  it("should be able to check lock info", async function() {
    const lockInfo = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: contractABI,
      functionName: 'getLockInfo',
      args: [account.address]
    });
    
    console.log("Lock info for account:", {
      amount: formatEther(lockInfo[0]) + " ETH",
      targetDate: new Date(Number(lockInfo[1]) * 1000).toLocaleString(),
      targetPrice: "$" + Number(formatUnits(lockInfo[2], 8)).toLocaleString(),
      parametersSet: lockInfo[3],
      withdrawn: lockInfo[4]
    });
    
    expect(lockInfo[3]).to.be.true; // parametersSet should be true
    expect(lockInfo[4]).to.be.false; // withdrawn should be false
  });

  it("should analyze withdrawal conditions", async function() {
    // Get current price
    const currentPrice = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: contractABI,
      functionName: 'getLatestPrice'
    });
    
    const priceInUSD = Number(formatUnits(currentPrice, 8));
    console.log("Current ETH price: $" + priceInUSD.toLocaleString());

    // Get lock info
    const lockInfo = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: contractABI,
      functionName: 'getLockInfo',
      args: [account.address]
    });

    const targetDate = Number(lockInfo[1]) * 1000; // Convert to milliseconds
    const targetPrice = Number(formatUnits(lockInfo[2], 8));
    
    console.log("\nWithdrawal Conditions Analysis:");
    console.log("--------------------------------");
    console.log("Account address:", account.address);
    console.log("Current time:", new Date().toLocaleString());
    console.log("Target date:", new Date(targetDate).toLocaleString());
    console.log("Time until target:", Math.floor((targetDate - Date.now()) / (1000 * 60 * 60)), "hours");
    console.log("\nCurrent price: $" + priceInUSD.toLocaleString());
    console.log("Target price: $" + targetPrice.toLocaleString());
    console.log("Price difference: $" + (targetPrice - priceInUSD).toLocaleString());
    
    console.log("\nConditions met:");
    console.log("✓ Has deposit:", Number(lockInfo[0]) > 0);
    console.log("✓ Parameters set:", lockInfo[3]);
    console.log("✓ Not withdrawn:", !lockInfo[4]);
    console.log("✓ Target date reached:", Date.now() >= targetDate);
    console.log("✓ Target price reached:", priceInUSD >= targetPrice);

    try {
        // Simulate the canWithdraw function call
        const result = await publicClient.simulateContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: contractABI,
            functionName: 'canWithdraw',
            account: account.address
        });
        
        console.log("\nCan withdraw:", result.result);

        if (result.result) {
            console.log("\nAttempting withdrawal...");
            const hash = await walletClient.writeContract({
                address: CONTRACT_ADDRESS as `0x${string}`,
                abi: contractABI,
                functionName: 'withdraw'
            });
            console.log("Withdrawal transaction hash:", hash);
            await publicClient.waitForTransactionReceipt({ hash });
            console.log("Withdrawal successful!");
        }
    } catch (error: any) {
        console.log("\nOperation failed:", error.message);
    }
  });
});