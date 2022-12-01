/**
 * All strings (including `data`) are expected to be the hex representation of the byte array.
 */
export interface DeviceGroupKeyDerivationTestVector {
    readonly dgk: string;
    readonly derived: {
        readonly dgpk: string;
        readonly dgrk: string;
        readonly dgdik: string;
        readonly dgsddk: string;
        readonly dgtsk: string;
    };
}

export const testVectors: DeviceGroupKeyDerivationTestVector[] = [
    {
        dgk: '1b35ed7e1ba9993171fe4a7eed30c2831905c3a583616d61e93782da900bf8ba',
        derived: {
            dgpk: '60c0ed9098902c0b6093be4a819bf344900bc7473504ccdb61004b1b58aa2233',
            dgrk: 'a4bf34ff67ed3b731a2aa6e023335f7eba6c914e877da3d15bff41d84f7f75f8',
            dgdik: '5953fb9775d8c23fae573e245534dac2c7aa16b62ea73b954ea4177d192e8c50',
            dgsddk: '7a91ad36bc9537ccfd6fd76b23d7f5319e506e6a5294c988c9a75c8e34a3c9dd',
            dgtsk: '7c6b94affb171c564bfd375d50c4781d72ab2671ae4035ab4307dedce67ef30e',
        },
    },
    {
        dgk: '7cf1c4847fb32d6c3702747018d0cccdc2f724c115bfca1036ae6208d2b7c68c',
        derived: {
            dgpk: '2b59e83e5a93ce4a09eeb4db91ec30e63cc3f173385742dd4a27ef83e5bef4f3',
            dgrk: 'fa33785f528439c2bfd9b7220ff03ebca919c1c127aca91878f2038b65a79c73',
            dgdik: '8a8199023dfeda5793e06552fb968282d7e7e29452c1229dcb212fb7d48f1e6a',
            dgsddk: 'bd96dd0f700c5d77da666990854eb4287d5f20a9be0deda6d88b875963c39b3f',
            dgtsk: '351e81590fb0115f8d1ab604c7eaf6996f3e079ea0a591db62caea4dcd7c6bda',
        },
    },
    {
        dgk: '0000000000000000000000000000000000000000000000000000000000000000',
        derived: {
            dgpk: '4b464e5d33debe0d3f9be535b9a1449f79caac615c852da734b47ef3a23e14ca',
            dgrk: 'd597f6380d1ecf6f1a7fd265c49bc53cff04c0efc1236a542dae338bba4bc6e9',
            dgdik: '8bb45615b2982e8d6aefcfbe46a44bcea0df048df7a05d9d50afd01911ed10d8',
            dgsddk: '86fa7962c7d85e01876de9a90cad95cf83b4605d40b83b6580b80618f56fa4d4',
            dgtsk: '7ab0a7c3239323e1b9f697eb59196d888747f027df356a305f58f55ebb8c23aa',
        },
    },
];
