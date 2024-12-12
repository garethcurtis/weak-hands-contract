// This file was autogenerated by hardhat-viem, do not edit it.
// prettier-ignore
// tslint:disable
// eslint-disable

import type { Address } from "viem";
import type { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";
import "@nomicfoundation/hardhat-viem/types";

export interface AggregatorV3Interface$Type {
  "_format": "hh-sol-artifact-1",
  "contractName": "AggregatorV3Interface",
  "sourceName": "contracts/interfaces/AggregatorV3Interface.sol",
  "abi": [
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "latestRoundData",
      "outputs": [
        {
          "internalType": "uint80",
          "name": "roundId",
          "type": "uint80"
        },
        {
          "internalType": "int256",
          "name": "answer",
          "type": "int256"
        },
        {
          "internalType": "uint256",
          "name": "startedAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "updatedAt",
          "type": "uint256"
        },
        {
          "internalType": "uint80",
          "name": "answeredInRound",
          "type": "uint80"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ],
  "bytecode": "0x",
  "deployedBytecode": "0x",
  "linkReferences": {},
  "deployedLinkReferences": {}
}

declare module "@nomicfoundation/hardhat-viem/types" {
  export function deployContract(
    contractName: "AggregatorV3Interface",
    constructorArgs?: [],
    config?: DeployContractConfig
  ): Promise<GetContractReturnType<AggregatorV3Interface$Type["abi"]>>;
  export function deployContract(
    contractName: "contracts/interfaces/AggregatorV3Interface.sol:AggregatorV3Interface",
    constructorArgs?: [],
    config?: DeployContractConfig
  ): Promise<GetContractReturnType<AggregatorV3Interface$Type["abi"]>>;

  export function sendDeploymentTransaction(
    contractName: "AggregatorV3Interface",
    constructorArgs?: [],
    config?: SendDeploymentTransactionConfig
  ): Promise<{
    contract: GetContractReturnType<AggregatorV3Interface$Type["abi"]>;
    deploymentTransaction: GetTransactionReturnType;
  }>;
  export function sendDeploymentTransaction(
    contractName: "contracts/interfaces/AggregatorV3Interface.sol:AggregatorV3Interface",
    constructorArgs?: [],
    config?: SendDeploymentTransactionConfig
  ): Promise<{
    contract: GetContractReturnType<AggregatorV3Interface$Type["abi"]>;
    deploymentTransaction: GetTransactionReturnType;
  }>;

  export function getContractAt(
    contractName: "AggregatorV3Interface",
    address: Address,
    config?: GetContractAtConfig
  ): Promise<GetContractReturnType<AggregatorV3Interface$Type["abi"]>>;
  export function getContractAt(
    contractName: "contracts/interfaces/AggregatorV3Interface.sol:AggregatorV3Interface",
    address: Address,
    config?: GetContractAtConfig
  ): Promise<GetContractReturnType<AggregatorV3Interface$Type["abi"]>>;
}