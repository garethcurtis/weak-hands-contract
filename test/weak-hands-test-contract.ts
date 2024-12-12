import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
import { parseEther } from 'viem';
import type { Address, WalletClient, PublicClient } from 'viem';

describe("WeakHands", function () {
    let contractAddress: Address;
    let mockPriceFeedAddress: Address;
    let accounts: WalletClient[];
    let publicClient: PublicClient;

    beforeEach(async function () {
        accounts = await hre.viem.getWalletClients();
        publicClient = await hre.viem.getPublicClient();

        // Deploy mock price feed
        const mockPriceFeedArtifact = await hre.artifacts.readArtifact("MockV3Aggregator");
        const mockPriceFeedDeployHash = await accounts[0].deployContract({
            abi: mockPriceFeedArtifact.abi,
            bytecode: mockPriceFeedArtifact.bytecode as `0x${string}`,
            args: [8n, 200000000000n], // 2000 USD with 8 decimals
        });

        const mockPriceFeedReceipt = await publicClient.waitForTransactionReceipt({ 
            hash: mockPriceFeedDeployHash 
        });
        if (!mockPriceFeedReceipt.contractAddress) throw new Error("Mock price feed deployment failed");
        mockPriceFeedAddress = mockPriceFeedReceipt.contractAddress;

        // Deploy WeakHands
        const weakHandsArtifact = await hre.artifacts.readArtifact("WeakHands");
        const weakHandsDeployHash = await accounts[0].deployContract({
            abi: weakHandsArtifact.abi,
            bytecode: weakHandsArtifact.bytecode as `0x${string}`,
            args: [mockPriceFeedAddress],
        });

        const weakHandsReceipt = await publicClient.waitForTransactionReceipt({ 
            hash: weakHandsDeployHash 
        });
        if (!weakHandsReceipt.contractAddress) throw new Error("WeakHands deployment failed");
        contractAddress = weakHandsReceipt.contractAddress;
    });

    describe("Deposits", function () {
        it("Should allow a user to make an initial deposit", async function () {
            const depositAmount = parseEther("1.0");
            
            const hash = await accounts[1].writeContract({
                address: contractAddress,
                abi: (await hre.artifacts.readArtifact("WeakHands")).abi,
                functionName: "deposit",
                value: depositAmount,
            });

            await publicClient.waitForTransactionReceipt({ hash });

            const lockInfo = await publicClient.readContract({
                address: contractAddress,
                abi: (await hre.artifacts.readArtifact("WeakHands")).abi,
                functionName: "getLockInfo",
                args: [accounts[1].account.address as Address],
            });
            
            expect(lockInfo[0]).to.equal(depositAmount);
        });

        it("Should allow multiple deposits from the same user", async function () {
            const firstDeposit = parseEther("1.0");
            const secondDeposit = parseEther("0.5");

            const hash1 = await accounts[1].writeContract({
                address: contractAddress,
                abi: (await hre.artifacts.readArtifact("WeakHands")).abi,
                functionName: "deposit",
                value: firstDeposit,
            });
            await publicClient.waitForTransactionReceipt({ hash: hash1 });

            const hash2 = await accounts[1].writeContract({
                address: contractAddress,
                abi: (await hre.artifacts.readArtifact("WeakHands")).abi,
                functionName: "deposit",
                value: secondDeposit,
            });
            await publicClient.waitForTransactionReceipt({ hash: hash2 });

            const lockInfo = await publicClient.readContract({
                address: contractAddress,
                abi: (await hre.artifacts.readArtifact("WeakHands")).abi,
                functionName: "getLockInfo",
                args: [accounts[1].account.address as Address],
            });

            expect(lockInfo[0]).to.equal(firstDeposit + secondDeposit);
        });

        it("Should not allow deposits after withdrawal", async function () {
            const depositAmount = parseEther("1.0");
            const block = await publicClient.getBlock({ blockTag: 'latest' });
            const oneYearFromNow = BigInt(Number(block.timestamp) + 365 * 24 * 60 * 60);

            const depositHash = await accounts[1].writeContract({
                address: contractAddress,
                abi: (await hre.artifacts.readArtifact("WeakHands")).abi,
                functionName: "deposit",
                value: depositAmount,
            });
            await publicClient.waitForTransactionReceipt({ hash: depositHash });

            const setParamsHash = await accounts[1].writeContract({
                address: contractAddress,
                abi: (await hre.artifacts.readArtifact("WeakHands")).abi,
                functionName: "setParameters",
                args: [oneYearFromNow, 2000n],
            });
            await publicClient.waitForTransactionReceipt({ hash: setParamsHash });

            await time.increase(366 * 24 * 60 * 60);

            const withdrawHash = await accounts[1].writeContract({
                address: contractAddress,
                abi: (await hre.artifacts.readArtifact("WeakHands")).abi,
                functionName: "withdraw",
            });
            await publicClient.waitForTransactionReceipt({ hash: withdrawHash });

            // Try to deposit again
            try {
                await accounts[1].writeContract({
                    address: contractAddress,
                    abi: (await hre.artifacts.readArtifact("WeakHands")).abi,
                    functionName: "deposit",
                    value: depositAmount,
                });
                expect.fail("Should have thrown error");
            } catch (error: any) {
                expect(error.message).to.include("Previous lock was withdrawn");
            }
        });
    });

    describe("Parameter Setting", function () {
        it("Should allow setting parameters once", async function () {
            const depositAmount = parseEther("1.0");
            const block = await publicClient.getBlock({ blockTag: 'latest' });
            const oneYearFromNow = BigInt(Number(block.timestamp) + 365 * 24 * 60 * 60);

            const depositHash = await accounts[1].writeContract({
                address: contractAddress,
                abi: (await hre.artifacts.readArtifact("WeakHands")).abi,
                functionName: "deposit",
                value: depositAmount,
            });
            await publicClient.waitForTransactionReceipt({ hash: depositHash });

            const setParamsHash = await accounts[1].writeContract({
                address: contractAddress,
                abi: (await hre.artifacts.readArtifact("WeakHands")).abi,
                functionName: "setParameters",
                args: [oneYearFromNow, 2000n],
            });

            const receipt = await publicClient.waitForTransactionReceipt({ hash: setParamsHash });
            expect(receipt.status).to.equal("success");
        });

        it("Should not allow setting parameters without deposit", async function () {
            const block = await publicClient.getBlock({ blockTag: 'latest' });
            const oneYearFromNow = BigInt(Number(block.timestamp) + 365 * 24 * 60 * 60);

            try {
                await accounts[1].writeContract({
                    address: contractAddress,
                    abi: (await hre.artifacts.readArtifact("WeakHands")).abi,
                    functionName: "setParameters",
                    args: [oneYearFromNow, 2000n],
                });
                expect.fail("Should have thrown error");
            } catch (error: any) {
                expect(error.message).to.include("No deposit found");
            }
        });
    });

    describe("Price Oracle", function () {
        it("Should handle price updates correctly", async function () {
            const depositAmount = parseEther("1.0");
            const block = await publicClient.getBlock({ blockTag: 'latest' });
            const oneYearFromNow = BigInt(Number(block.timestamp) + 365 * 24 * 60 * 60);

            // Make deposit
            const depositHash = await accounts[1].writeContract({
                address: contractAddress,
                abi: (await hre.artifacts.readArtifact("WeakHands")).abi,
                functionName: "deposit",
                value: depositAmount,
            });
            await publicClient.waitForTransactionReceipt({ hash: depositHash });

            // Set parameters
            const setParamsHash = await accounts[1].writeContract({
                address: contractAddress,
                abi: (await hre.artifacts.readArtifact("WeakHands")).abi,
                functionName: "setParameters",
                args: [oneYearFromNow, 2500n], // Target price of $2500
            });
            await publicClient.waitForTransactionReceipt({ hash: setParamsHash });

            // Update price to $3000
            const updatePriceHash = await accounts[0].writeContract({
                address: mockPriceFeedAddress,
                abi: (await hre.artifacts.readArtifact("MockV3Aggregator")).abi,
                functionName: "updateAnswer",
                args: [300000000000n], // $3000 with 8 decimals
            });
            await publicClient.waitForTransactionReceipt({ hash: updatePriceHash });

            // Should be able to withdraw now
            const withdrawHash = await accounts[1].writeContract({
                address: contractAddress,
                abi: (await hre.artifacts.readArtifact("WeakHands")).abi,
                functionName: "withdraw",
            });
            const receipt = await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
            expect(receipt.status).to.equal("success");
        });
    });
});
