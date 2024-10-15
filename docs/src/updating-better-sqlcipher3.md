# Updating `better-sqlcipher3`

1. Find the current SQLCipher version at
   <https://github.com/sqlcipher/sqlcipher/blob/master/CHANGELOG.md>

2. In our internal fork of the `sqlcipher` repo, create a new branch
   `bearssl-crypto-provider-${SQLCIPHER_VERSION}`, e.g. `bearssl-crypto-provider-4.5.6` based on the
   upstream tag of the corresponding version. Cherry-pick the "Add BearSSL as a crypto provider"
   commit from one of the older branches. Push the branch.

3. In our internal `better-sqlcipher-patch` repo, look at the README to find out how to update and
   apply the patches to
   [our fork of `better-sqlcipher`](https://github.com/threema-ch/better-sqlcipher).
