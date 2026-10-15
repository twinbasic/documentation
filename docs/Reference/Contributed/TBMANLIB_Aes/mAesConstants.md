---
title: mAesConstants
parent: TBMANLIB_Aes Package
permalink: /tB/Packages/Contributed/TBMANLIB_Aes/mAesConstants
has_toc: false
---

# mAesConstants module
{: .no_toc }

Holds the three enumerations of the package, the sizes of AES keys and blocks, the version string, and the Windows constants that [**cAes**](cAes) and [**cAesHelper**](cAesHelper) pass to the Crypto API.

The enumerations are the types of the [**CipherMode**](cAes#ciphermode), [**KeySize**](cAes#keysize) and [**PaddingMode**](cAes#paddingmode) properties of **cAes** and of the parameters of its constructor. A member is written with its enumeration, as in `AesCipherMode.GCM`. The constants are written with the module, as in `mAesConstants.KEY_SIZE_256`.

<!-- test: DefaultsAndConstantsTests.Enumerations_HaveTheDocumentedValues, DefaultsAndConstantsTests.PackageConstants_HaveTheDocumentedValues -->
```tb check_build check_run
Debug.Print AesCipherMode.GCM              ' 6
Debug.Print AesPaddingMode.NoPadding       ' 3
Debug.Print AesKeySize.KeySize_192         ' 192
Debug.Print mAesConstants.KEY_SIZE_192     ' 24
Debug.Print mAesConstants.BLOCK_SIZE_128   ' 16
Debug.Print mAesConstants.VERSION          ' 1.0.0
```
<!-- /test -->

* TOC
{:toc}

## Enumerations

### AesCipherMode
{: .no_toc }

The cipher mode that a [**cAes**](cAes) uses. Default: **CBC**.

| Member | Value | Windows interface | Runs as |
|---|---:|---|---|
| **ECB** | 1 | Crypto API | CBC, with an IV of zero bytes |
| **CBC** | 2 | Crypto API | ECB |
| **CFB** | 3 | CNG | CFB with an 8-bit feedback |
| **OFB** | 4 | CNG | CFB with an 8-bit feedback |
| **CTR** | 5 | CNG | CFB with an 8-bit feedback |
| **GCM** | 6 | CNG | GCM, with a 12-byte nonce and a 16-byte tag |

<!-- test: ModeTests.EncryptBytes_Ecb_EqualPlainBlocksGiveEqualCipherBlocks, ModeTests.EncryptBytes_Cbc_EqualPlainBlocksGiveDifferentCipherBlocks, ModeTests.EncryptBytes_Cbc_DefaultModeGivesDifferentCipherBlocksForEqualPlainBlocks, ModeTests.EncryptBytes_Cbc_IVChangesTheCiphertext, ModeTests.EncryptBytes_Ecb_IVDoesNotChangeTheCiphertext, ModeTests.EncryptBytes_Ofb_DiffersFromCfbAfterTheFirstBlock, ModeTests.EncryptBytes_Ctr_DiffersFromCfb, ModeTests.EncryptBytes_Ctr_DiffersFromOfb, ModeTests.EncryptBytes_Cfb_IVChangesTheCiphertext, ModeTests.EncryptBytes_Ecb_RoundTrips, ModeTests.EncryptBytes_Cbc_RoundTrips, ModeTests.EncryptBytes_Cfb_RoundTrips, ModeTests.EncryptBytes_Ofb_RoundTrips, ModeTests.EncryptBytes_Ctr_RoundTrips, ModeTests.EncryptBytes_Gcm_RoundTrips, StandardVectorTests.EncryptBytes_Cfb_Aes128_GivesTheVectorOfSp80038aF313, StandardVectorTests.EncryptBytes_Ofb_Aes128_GivesTheVectorOfSp80038aF41, StandardVectorTests.EncryptBytes_Ctr_Aes128_GivesTheVectorOfSp80038aF51 -->
> [!WARNING] 1.0.0.4
> The name of a mode is not always the mode that runs. **ECB** runs CBC with an IV of zero bytes, **CBC** runs ECB, and **OFB** and **CTR** run CFB, whose feedback has 8 bits where the standard CFB has 128. Neither **ECB** nor **CBC** uses the IV that the program sets, so the same key and plaintext always give the same ciphertext, and the default mode, **CBC**, gives equal ciphertext blocks for equal plaintext blocks. Encryption and decryption agree with each other, so a round trip succeeds and shows nothing. [**cAes**](cAes#which-mode-runs) describes each mode in detail.

The Crypto API is the older interface of Windows (`advapi32.dll`), and CNG, Cryptography API: Next Generation, the newer one (`bcrypt.dll`). **cAes** uses the Crypto API for **ECB** and **CBC**, and CNG for the other four modes.

### AesKeySize
{: .no_toc }

The length of the AES key, in bits. Default: **KeySize_256**.

| Member | Value | Key length |
|---|---:|---|
| **KeySize_128** | 128 | 16 bytes |
| **KeySize_192** | 192 | 24 bytes |
| **KeySize_256** | 256 | 32 bytes |

The value is the number of bits, and not an index. [**cAes**](cAes) reads it in two places only. [**SetKeyFromString**](cAes#setkeyfromstring) makes a key of the matching number of bytes, and the two modes that use the Crypto API choose from it the AES algorithm of the key they derive. The four modes that use CNG take the length of the [**Key**](cAes#key) array instead, and ignore **KeySize**; see [**KeySize**](cAes#keysize).

### AesPaddingMode
{: .no_toc }

How [**cAes**](cAes) fills the last block of the data before it encrypts, and how it takes the filling off after it decrypts. Default: **PKCS7**.

| Member | Value | Encryption | Decryption |
|---|---:|---|---|
| **PKCS7** | 1 | Adds 1 to 16 bytes, each holding the number of bytes added. Data that already fills its blocks gets a whole block of 16 bytes of the value 16. | Takes off the bytes the last byte counts, after it checks that the last byte is from 1 to 16 and that the bytes it counts are all equal to it. Data that fails the check fails the decryption. |
| **ZeroPadding** | 2 | Adds 1 to 16 zero bytes. Data that already fills its blocks gets a whole block of 16 zero bytes. | Takes off every zero byte at the end of the data, including those that belong to the data. |
| **NoPadding** | 3 | Adds nothing. | Takes nothing off. |
| **ISO10126** | 4 | Adds nothing, as **NoPadding**. | Takes nothing off, as **NoPadding**. |

<!-- test: PaddingTests.EncryptBytes_Iso10126_PadsToTheNextWholeBlock -->
> [!WARNING] 1.0.0.4
> **ISO10126** is not implemented. It behaves as **NoPadding**, and no error says so. The comment in the source calls the member "ISO/IEC 7816-4 padding", a scheme that differs from ISO 10126, and neither is applied.

The functions that add and take off **PKCS7** and **ZeroPadding** padding are public members of [**cAesHelper**](cAesHelper). The padding of the data is only part of what the Crypto API modes do: Windows adds its own padding to the output of **ECB** and **CBC**, whatever the padding mode is. See [**PaddingMode**](cAes#paddingmode).

## Package constants

### BLOCK_SIZE_128
{: .no_toc }

The size of an AES block in bytes: 16, a **Long**. [**cAes**](cAes) uses it as the block size for padding and as the length of a generated IV, and [**RemovePKCS7Padding**](cAesHelper#removepkcs7padding) of **cAesHelper** uses it as the largest padding count it accepts.

### KEY_SIZE_128
{: .no_toc }

The length in bytes of a 128-bit key: 16, a **Long**. [**SetKeyFromString**](cAes#setkeyfromstring) makes a key of this length when [**KeySize**](cAes#keysize) is **KeySize_128**.

### KEY_SIZE_192
{: .no_toc }

The length in bytes of a 192-bit key: 24, a **Long**.

### KEY_SIZE_256
{: .no_toc }

The length in bytes of a 256-bit key: 32, a **Long**.

### VERSION
{: .no_toc }

The text `1.0.0`, a **String**. It is the version in the headers of the source files. The version of the package is 1.0.0.4, and **VERSION** is not used by any code of the package.

## Windows constants

<!-- test: DefaultsAndConstantsTests.WindowsConstants_MatchWincryptHExceptTheFive -->
These constants have the names and, with five exceptions, the values of the constants that the Windows header `wincrypt.h` defines. **cAes** and **cAesHelper** pass them to the Crypto API functions. A program does not need them.

| Constant | Value | Names | Used by the package |
|---|---:|---|:---:|
| **PROV_RSA_AES** | 24 | The provider type of the Microsoft Enhanced RSA and AES Cryptographic Provider | yes |
| **PROV_RSA_FULL** | 1 | The provider type of the RSA full provider | no |
| **CRYPT_EXPORTABLE** | &H1 | A flag of `CryptDeriveKey`: the key can be exported | yes |
| **CRYPT_NEWKEYSET** | &H8 | A flag of `CryptAcquireContext`: create the default key container | yes |
| **CALG_AES_128** | 26126 | The algorithm identifier of AES with a 128-bit key | yes |
| **CALG_AES_192** | 26127 | The algorithm identifier of AES with a 192-bit key | yes |
| **CALG_AES_256** | 26128 | The algorithm identifier of AES with a 256-bit key | yes |
| **CALG_SHA_256** | 32780 | The algorithm identifier of SHA-256 | yes |
| **CALG_MD5** | 32771 | The algorithm identifier of MD5 | no |
| **CRYPT_MODE_ECB** | 1 | The `KP_MODE` value for ECB | yes |
| **CRYPT_MODE_CBC** | 2 | The `KP_MODE` value for CBC | yes |
| **CRYPT_MODE_CFB** | 3 | The `KP_MODE` value for CFB | in code that never runs |
| **CRYPT_MODE_OFB** | 4 | The `KP_MODE` value for OFB | in code that never runs |
| **KP_IV** | 1 | The key parameter that holds the IV | yes |
| **KP_PADDING** | 3 | The key parameter that holds the padding method | no |
| **KP_MODE** | 4 | The key parameter that holds the cipher mode | yes |
| **KP_BLOCKLEN** | 8 | The key parameter that holds the block length in bits | yes |
| **PKCS5_PADDING** | 1 | The `KP_PADDING` value for PKCS #5 | no |
| **ZERO_PADDING** | 2 | The `KP_PADDING` value for zero padding | no |
| **HP_HASHVAL** | 2 | The hash parameter that holds the hash value | no |
| **HP_HASHSIZE** | 4 | The hash parameter that holds the size of the hash value | no |
| **AT_KEYEXCHANGE** | 1 | The key specification for a key exchange key | no |
| **AT_SIGNATURE** | 2 | The key specification for a signature key | no |
| **CRYPT_STRING_BASE64** | &H1 | The `CryptBinaryToString` and `CryptStringToBinary` format: Base64 without a header | yes |
| **CRYPT_STRING_NOCRLF** | &H40000000 | The `CryptBinaryToString` flag: no line breaks | yes |

All are **Long** constants. They are meant for the Crypto API functions that the module **mWin32CryptoAPI** wraps, described on the [landing page](.#declaration-modules).
<!-- /test -->

Five values differ from `wincrypt.h`:

| Constant | Package value | Windows value |
|---|---:|---:|
| **CRYPT_MODE_ECB** | 1 | 2 |
| **CRYPT_MODE_CBC** | 2 | 1 |
| **CRYPT_MODE_CFB** | 3 | 4 |
| **CRYPT_MODE_OFB** | 4 | 3 |
| **ZERO_PADDING** | 2 | 3 |

<!-- test: DefaultsAndConstantsTests.CryptModeConstants_EcbAndCbcMatchWincryptH -->
**cAes** gives the value of **CRYPT_MODE_ECB** to the Crypto API when the mode is **ECB**, and the Crypto API reads 1 as CBC. That is why the modes **ECB** and **CBC** are swapped, as the warning under [AesCipherMode](#aesciphermode) says. Nothing in the package reads **ZERO_PADDING**.
<!-- /test -->

## See Also

- [cAes](cAes) class -- encrypts and decrypts with these modes and sizes
- [cAesHelper](cAesHelper) class -- adds and takes off the padding, and converts to Base64 and UTF-8
- [TBMANLIB_Aes](.) package -- the landing page
