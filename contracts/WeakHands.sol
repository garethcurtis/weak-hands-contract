// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract WeakHands {
    struct Lock {
        uint256 amount;
        uint256 targetDate;
        uint256 targetPrice;
        bool parametersSet;
        bool withdrawn;
    }
    
    mapping(address => Lock) public locks;
    
    AggregatorV3Interface private immutable priceFeed;
    
    event Deposit(address indexed user, uint256 amount, uint256 newTotal);
    event ParametersSet(address indexed user, uint256 targetDate, uint256 targetPrice);
    event Withdrawal(address indexed user, uint256 amount);
    
    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }
    
    function deposit() external payable {
        require(msg.value > 0, "Must deposit ETH");
        require(!locks[msg.sender].withdrawn, "Previous lock was withdrawn");
        
        locks[msg.sender].amount += msg.value;
        emit Deposit(msg.sender, msg.value, locks[msg.sender].amount);
    }
    
    function setParameters(uint256 _targetDate, uint256 _targetPriceUSD) external {
        require(locks[msg.sender].amount > 0, "No deposit found");
        require(!locks[msg.sender].parametersSet, "Parameters already set");
        require(_targetDate > block.timestamp, "Target date must be in future");
        require(_targetPriceUSD > 0, "Target price must be greater than 0");
        
        locks[msg.sender].targetDate = _targetDate;
        locks[msg.sender].targetPrice = _targetPriceUSD * 1e8; // Convert to Chainlink price format
        locks[msg.sender].parametersSet = true;
        
        emit ParametersSet(msg.sender, _targetDate, _targetPriceUSD);
    }
    
    function getLatestPrice() public view returns (uint256) {
        (, int256 price,,,) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price);
    }
    
    function canWithdraw() public view returns (bool) {
      Lock storage userLock = locks[msg.sender];

      if (userLock.amount == 0 || 
          !userLock.parametersSet || 
          userLock.withdrawn) {
          return false;
      }
      
      uint256 currentPrice = getLatestPrice();
      return (block.timestamp >= userLock.targetDate || 
              currentPrice >= userLock.targetPrice);
    }
    
    function withdraw() external {
        require(canWithdraw(), "Cannot withdraw yet");
        
        Lock storage userLock = locks[msg.sender];
        uint256 amount = userLock.amount;
        
        userLock.withdrawn = true;
        userLock.amount = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    function getLockInfo(address _user) external view returns (
        uint256 amount,
        uint256 targetDate,
        uint256 targetPrice,
        bool parametersSet,
        bool withdrawn
    ) {
        Lock storage userLock = locks[_user];
        return (
            userLock.amount,
            userLock.targetDate,
            userLock.targetPrice,
            userLock.parametersSet,
            userLock.withdrawn
        );
    }
}
