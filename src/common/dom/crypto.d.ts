// Upstream algorithm type is underspecified (it just allows `name: string`). We'll explicitly add
// `namedCurve`.
interface Algorithm {
    name: 'ECDSA';
    namedCurve: 'P-256';
}
