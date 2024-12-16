# WeakHands Smart Contract

The WeakHands contract is a DeFi mechanism designed to encourage long-term holding of ETH by allowing users to lock their funds until either a specific date is reached, or a target ETH price is achieved. This contract leverages a Chainlink price feed to provide reliable ETH/USD price data for determining withdrawal conditions.

## Contract Functions

### deposit()
Allows users to deposit ETH into the contract. Multiple deposits are allowed as long as a previous lock hasn't been withdrawn.

### setParameters(uint256 _targetDate, uint256 _targetPriceUSD)
Sets the conditions for withdrawal: a future target date and a target ETH price in USD. Can only be set once per lock and requires an existing deposit.

### getLatestPrice()
Retrieves the current ETH/USD price from the Chainlink price feed oracle.

### canWithdraw()
Checks if the withdrawal conditions have been met (either target date reached or price threshold exceeded).

### withdraw()
Allows users to withdraw their locked ETH if the conditions are met.

### getLockInfo(address _user)
Returns complete information about a user's lock, including amount, target date, target price, and status flags.

## Potential Improvements

* Implement partial withdrawal functionality to allow users to withdraw portions of their locked amount while maintaining the remaining balance under the same conditions.
* Add support for multiple concurrent locks per user, enabling different timeframes and price targets for different portions of their holdings.

## Known Issues

The contract currently only allows a single deposit and subsequent withdrawal. It would need to be improved to allow a single ETH address to use the contract more once. Perhaps by implementing some sort of reset function or allowing the user to have more than one account somehow...
