# (optimistically) Anonymous Voting for Aragon

### Usage
1. Obtain at least 1 APP token 
2. Generate your personal `aragon-ID.json` and password
3. Switch your Ethereum account to a second, secret account of your choice
4. Vote in relative freedom!

### Run
```bash
npm i
aragon run --kit Kit --kit-init @ARAGON_ENS
```
### Considerations
* The ID generation step could be removed by extensively messing up the Aragon wrapper and the underlying `solcrypto` library (and probably even web3)
* The `sign` function executes the contents of `uaosring/app.zip` from a Python interpreter compiled into WASM. Native C libraries have been replaced with pure Python implementations to ease linking (slow and steady c:)
* Signature verification would be better implemented at ACL level
* The contract allows for multiple accounts to vote with the same ID, making both the ring smaller and signature generation faster
* The shape and size of the signature object are highly inconsistent for a number reasons, the majority being imputable to the misfortune of the marriage between Python, C, Javascript and Solidity 
