import * as tweetnacl from 'tweetnacl';

import type {Ed25519PublicKey, Ed25519Signature} from '~/common/crypto';
import type {ReadonlyUint8Array} from '~/common/types';
import {base64ToU8a} from '~/common/utils/base64';

/**
 * A few tests copied from https://github.com/dchest/tweetnacl-js/tree/master/test/data
 */
export default function (): [
    publicKey: Ed25519PublicKey,
    message: ReadonlyUint8Array,
    signature: Ed25519Signature,
][] {
    return (
        [
            [
                'nWGxne/9WmC6hEr0kuwsxERJxWl7MmkZcDusAxyuf2DXWpgBgrEKt9VL/tPJZAc6DuFy89qmIyWvAhpo9wdRGg==',
                '',
                '5VZDAMNgrHKQhuLMgG6CioSHfx645dl02HPgZSJJAVVfuIIVkKM7rMYeOXAc+bRr0lv18FlbviRlUUFDjnoQCw==',
            ],
            [
                'TM0Imyj/ltqdtsNG7BFOD1uKMZ81q6Yk2oz27U+4pvs9QBfD6EOJWpK3CqdNG368nJgszy7ElozAzVXxKvRmDA==',
                'cg==',
                'kqAJqfDUyrhyDoILX2QlQKKye1QWUD+Ps3YiI+vbadoIWsHkPhWZbkWPNhPQ8R2MOHsurrQwKu6wDSkWErsMAA==',
            ],
            [
                'xaqN9D+fg3vtt0QvMdy3sWbThTUHbwlLhc46LgtEWPf8Uc2OYhiho42kftACMPBYCBbtE7ozA6xd65EVSJCAJQ==',
                'r4I=',
                'YpHWV97sJAJIJ+acOr4BowzlSKKEdDpEXjaA19taw6wY/5tTjRbykK5n92CYTcZZSnwV6XFu0o3AJ77O6h7ECg==',
            ],
            [
                'K0yuOA6VzmlMJqx5V0RzR/mOMbS/AtdE4TFSkHHiMB3m/HBaecmOEVtOKNOqFQa3TudCdsX8EQmn9Nicb6+4iQ==',
                '4LglDie3wCkdvEem2m8SaJh6/fCh6Qvmm8vENwhlIXgw1SCGk757cEUJmiLqJ/lS6z95qaDxtah7GTZ3kHiNNMIZwuKmuDQCD7T9FJ3Fa1RP3btCBxoWL8fLM8FGysBaMbGD6dqtxhbzr0SbFw==',
                'VV5FZWupz79RVdDlJXblGXq7vJ3SM5k+7Coe5/aoZAnAtxsKZhl4/14KzclGPcRJkG9HT455u4YWi/cHQeNLAg==',
            ],
            [
                'KCd1356718WmXzorCW427mSo+Opxnad3WHOeTnR2ER2itJZGAzoTk3ytaw6RTjzsVJicJSylZD0HZVXYxV5W4A==',
                'FMxQwpc+qdAYenP3HLnxzgfnOeBJ7Csn5mE8EMJrc6KpZuAaw76LUFrqrRSFwcKjxsKwD4G55fkntzv9SYYBp2IuhUSDeq0C5yv3IZbcJGkC5YryU61+Al42ZtO/xGtbAvDrSjfJVUmSq8hlHeEv2BMXc3m7DOFyzYqvk3+XlkK8LtfHpDDLFMPNMQG59rke4/VCrN8Bf4whFil/RWR2j025Xa2Km83I2k2PsT724toLExbTyMLz7YNrNf4v0z7/tAnjvBsPhSJdKh3jv8LSBWOUZHXE18qf3br1mtj4lh0oeufdgD568fphIymxvcBOIlYArnMbwBrgklrtYqxQ1GCG82Rs9HsHLw07BEs2+FzscpqLsrkog8pN+zSo7ooCc7Ma9QmCu2Exv6EdVVBLH28aCgBDjKJtirT0i83cnVo4hRq+3kFR1bcNcgcyoAq+osi5eQ==',
                'FXY5c4WUApB9jcuGrcJKKhaLo6vyJGFz1jSK/tUe9gsMDt7/ThC870xuV3jIvB9enuAjc3NEW0VRVdI94SeiAg==',
            ],
            [
                'zzPnl02PC/iZrFuDTHz5ZHnOHP1FOvB/lwUn82qoXB9Xj2Azix8EGpfTGf7Powz67TaTA8wAs+yMXJkEEVjiDA==',
                '6BMUS9EW9qw2OJIXtRcakC8Gt917FE30+QkVU8fHg1dTopbLsNf6uZzvd7YfNKBMivBOfV0flhMC3oniAF8pn1pKoXkkYX0AZpOTd0VTnDBI7ja4wjr+wK+f6qAGbIr44KfwkJNJghD22NzAqq2lZoeGkQ/3xbNI1MzW7u/6Os0YFtkBGkxAJfbC/SwCChBZNidSDU3ZngfGLS2+voQTnhx9hnwJNXT6YB5O4weskm5dNrYtfthKJhWIt+KIPHkmYStMxn4rtyVEoQ1rSSnIjvbEfCYl0vaBa9c8O66J0uDIYXGsS9CArlVdYnQNHSp2HO2G38Mo7MJ+49ttQEEI704LZJBiU7TAp3Gt7+3IosW1PEJacM1vY5Vvegphn9+/0AqgeEGOtGUvi8bzwlO+7Jg4t3+cvi7yuAVcV3NTnjVr2BkmBuwQHj9gWLHdCKaP28VJ3+a3cl3CVJ6OP5DcW+PM+wo4uvk3fLP2UB0uFcyzVWqJXMsj8Lbfn+WTEc/1U3TD+zoymByiarQm82Y9BOMWflOlN7dYmp+3NnkJCiBVMsEykGY0M0p+h0l5P4xZPz/WJ4zgBQODSH87JFBnr5SIGqGulo0Mrrpfpce+X05LcldRhpXYm8zexQe5Z7T9ZLaJOz7ngDwdNuqKAvxCb5r8jp8kMhUn7JhEvDxUoPdmfgNDALu0+wIPbVu5VOe1o6cGpJOdszwVSJJkNHaikdR9web3LOkdE28R2ya5ybpzbkDfChXBqJFJmWslHdmIs5AE5u9BvcBh21gLe3TeKmUYEL2JF1O5c4bX+Mvbtuw4b6LDQvXvIObjqLtNUUmn1N4SJN/x0XLIdXD3dtXvRZWb4JOK159dM5XLJyFicSKIe9eomDtkd5e9QdiCZByBQxzo2bMGet7EzekmxRMT8M+ExSklYt1JCGQt0kUohITFVop4fQztNqNS8DLaT35N4GsRRz9lDuxl3amWOa8tQthO4jD0+DYj2cmqo7Fr2hDdqtJa9cHBD4HIxRyBGjqj49tYpwJeQ4DihdpHSmG6WRc/8EKkanmrGEsHAQhBb51hWM+W0ObbRHYUoNkInrtq7k7xB75Fk9ceefZ5hminQK5LrFrHWU7L1dyC59D5yw==',
                'l6W20miltBdfsG8fN9CmM1GSlu3DABHJVNjwubviZBgAOWxLNdSw19Kh0Xy769xVqAlGLWzBmm+tvhvRuuiKAQ==',
            ],
            [
                '9eV2fPFTMZUXYw8iaHa4bIFgzFg7wBN0TGvyVfXMDuUngRf8FExyNA9n0PIxboOGzv+/KyQoycUf73xZfx1Cbg==',
                'CLiytzNCQkN2D+QmpLVJCGMhEKZsL2WR6r0zRePk65j6biZL8J7+Eu5Q+PVOn3ex41X2xQVE4j+xQz3fc76E2HnefABG3EmW2edz9Lye/lc4gprbJsgbN8k6GycLIDKdZYZ1/G6lNOCBCkQygmv1jJQe+2XVejOLvS4mZA+J/7wahY78uFUO46XhmYvRd+k6c2PDRP5rGZ7l0C6C1SLE/roVRS+AKIqCGleRFuxtrSs7MQ2pA0AapiEAq10aNlU+BiA7M4kMybgy9574BWDMuaOc52eWftYoxq1XPLEW2+/v11SZ2pa9aKipe5KKi7wQO2Yh/N4r7KEjHSBr5s2ex6/29slPzXIE7TRVxoyD9KQdpK8rdO9cU/HYrHC9y37Rhc6BvYQ1nUQlTZVinphVqUp8GVjR+K2l0FMu2KWqP7LRe6cOtiSOWU4aIpesu7OdUC8ajG628c4is94aH0DMJFVBGagxqarWB5ytiEJd5r3hqRh+u2CSz2e/KxP9ZfJwiNeLfog8h1nSxPXGWtt1U4eK1XX5+th46AoMm6Y7y8wnMuaUhbvJyQv71iSB2Qib7M+Az+LfFqLPZb2S3Vl7BwfgkXr0i7t1/tQT0jj1VVp6Vp2Aw0FKjQhZ3GWkYSi6snr4enExTzGMeCsj6/6Ai4KwziZAHS4i8E2D0SVdxRrd07daKxrgeEUE31Q6+Jab4+pwgv9/yYiMFE2ir1hCnslgMdvK09rZrw3Lqq8mjLj8/+rZTzx8pJXgVqm0es23Uftz5mbGxlWt6Clyl9B60bpeQ/G8oyMBZRM54ikEzIxC9YwwwEqv2wON2ghH3ZiNzabzv9FcS0xFJQBKoG7v+MpheDqs7Ff7PR+SsP4v0ahfZyRRe2XmFK1oCNb27jTf9zEP3IKuv9kEsB4dxUspJwlLLbaNb5A7aEAa3r9afgjXj/TvXWNlOmUEDPm/1KynmEp003FFmGeA/AsWrEUWSd5hiKfb3xkfZLX8Xiq0e1f39yds1BnBejyo4bk5rknkiKy6a5ZWELVIAQnIsXuA4be3UN/HWY1dUBH9LcxWAKMu9bUqHsyCDjCKo0JyGqwJQ79mhrZLJXk3ZQTMxJPZfmrtP7D5zXGkPdSX8B8XwOLLN5eqKi8lZlYWjmxJavxfuTJG9rERY5ijRvGmQfOwQemJ95FPkMwsf/81eHblBrUNM0unfCJbwwe6U3FS8/FhDk6v5ZX22dkNEfqpM6Fe8TaVRoaKfzpFqWdo1A/Z0DQSwJHGMVz0/efLaGBpNzgNsuqqcHtMQYXDLt3N0wZwXk3B/8hy7u5HWmTfrIarpBwGGJg/h0HF72jToQHoo7jKxgyQXBX8kQhAuUwAoLnQ',
                'CqtMkAUBs+JNfN9GYzJqOoffXkhDssvbZ8v25GD+w1CqU3GxUI+fRSjs6iPENtlLXo/NT2geMKasAKlwShiKAw==',
            ],
        ] as const
    ).map(([secretKey, message, signature]) => [
        tweetnacl.sign.keyPair.fromSecretKey(base64ToU8a(secretKey))
            .publicKey as ReadonlyUint8Array as Ed25519PublicKey,
        base64ToU8a(message),
        base64ToU8a(signature) as ReadonlyUint8Array as Ed25519Signature,
    ]);
}
