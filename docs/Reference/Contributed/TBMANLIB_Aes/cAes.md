---
title: cAes
parent: TBMANLIB_Aes Package
permalink: /tB/Packages/Contributed/TBMANLIB_Aes/cAes
has_toc: false
---

# cAes class
{: .no_toc }

Encrypts and decrypts text and byte arrays with AES, in one of six cipher modes, with a key of 128, 192 or 256 bits.

A **cAes** keeps a [**Key**](#key), an [**IV**](#iv), a [**CipherMode**](#ciphermode) and a [**PaddingMode**](#paddingmode). [**EncryptString**](#encryptstring) and [**EncryptBytes**](#encryptbytes) encrypt with them, and [**DecryptString**](#decryptstring) and [**DecryptBytes**](#decryptbytes) decrypt. In the GCM mode, [**GcmTag**](#gcmtag) and [**GcmAAD**](#gcmaad) take part as well.

```tb check_build check_run
Dim aes As New cAes
aes.CipherMode = AesCipherMode.GCM
aes.SetKeyFromString "0123456789abcdef0123456789abcdef"    ' 32 characters: an AES-256 key
aes.GenerateRandomIV

Dim cipherText As String
cipherText = aes.EncryptString("Hello, AES!")
Debug.Print aes.DecryptString(cipherText)                   ' Hello, AES!
```

The output of **EncryptString** and **EncryptBytes** holds the encrypted bytes and nothing else: not the IV, not the padding mode and, in GCM mode, not the tag. The program keeps them, and gives them to the **cAes** that decrypts.

* TOC
{:toc}

In the syntax lines of this page, *object* is a **cAes**.

## Defaults

<!-- test: DefaultsAndConstantsTests.New_StartsWithTheDefaultValues -->
A new **cAes** starts with these values.

| Property | Starting value |
|---|---|
| [**KeySize**](#keysize) | **KeySize_256** |
| [**CipherMode**](#ciphermode) | **CBC** |
| [**PaddingMode**](#paddingmode) | **PKCS7** |
| [**Key**](#key), [**IV**](#iv), [**GcmTag**](#gcmtag), [**GcmAAD**](#gcmaad) | an array with no elements |
| [**IsInitialized**](#isinitialized) | **False** |
| [**LastError**](#lasterror) | an empty string |

```tb check_build check_run
Dim aes As New cAes
Dim helper As New cAesHelper
Dim keyBytes() As Byte

keyBytes = aes.Key
Debug.Print aes.KeySize                      ' 256
Debug.Print aes.CipherMode                   ' 2
Debug.Print aes.PaddingMode                  ' 1
Debug.Print helper.IsArrayEmpty(keyBytes)    ' True
Debug.Print aes.IsInitialized                ' False
Debug.Print Len(aes.LastError)               ' 0
```
<!-- /test -->

<!-- test: ModeTests.EncryptBytes_TwoCallsWithTheSamePropertiesGiveTheSameOutput -->
Every call of an encrypt or a decrypt method starts again from **Key** and **IV**: it makes new Windows key objects, and it does not continue the chaining of an earlier call. Two encryptions in a row with the same properties give the same output.
<!-- /test -->

## Which mode runs

<!-- test: ModeTests.EncryptBytes_Ecb_EqualPlainBlocksGiveEqualCipherBlocks, ModeTests.EncryptBytes_Cbc_EqualPlainBlocksGiveDifferentCipherBlocks, ModeTests.EncryptBytes_Cbc_DefaultModeGivesDifferentCipherBlocksForEqualPlainBlocks, ModeTests.EncryptBytes_Cbc_IVChangesTheCiphertext, ModeTests.EncryptBytes_Ecb_IVDoesNotChangeTheCiphertext, ModeTests.EncryptBytes_Ofb_DiffersFromCfbAfterTheFirstBlock, ModeTests.EncryptBytes_Ctr_DiffersFromCfb, ModeTests.EncryptBytes_Ctr_DiffersFromOfb, ModeTests.EncryptBytes_Cfb_IVChangesTheCiphertext, ModeTests.EncryptBytes_Ecb_RoundTrips, ModeTests.EncryptBytes_Cbc_RoundTrips, ModeTests.EncryptBytes_Cfb_RoundTrips, ModeTests.EncryptBytes_Ofb_RoundTrips, ModeTests.EncryptBytes_Ctr_RoundTrips, ModeTests.EncryptBytes_Gcm_RoundTrips, StandardVectorTests.EncryptBytes_Ecb_Aes128_GivesTheVectorOfSp80038aF11, StandardVectorTests.EncryptBytes_Ecb_Aes192_GivesTheVectorOfSp80038aF13, StandardVectorTests.EncryptBytes_Ecb_Aes256_GivesTheVectorOfSp80038aF15, StandardVectorTests.DecryptBytes_Ecb_Aes128_GivesThePlaintextOfSp80038aF12, StandardVectorTests.EncryptBytes_Cbc_Aes128_GivesTheVectorOfSp80038aF21, StandardVectorTests.EncryptBytes_Cbc_Aes192_GivesTheVectorOfSp80038aF23, StandardVectorTests.EncryptBytes_Cbc_Aes256_GivesTheVectorOfSp80038aF25, StandardVectorTests.DecryptBytes_Cbc_Aes128_GivesThePlaintextOfSp80038aF22, StandardVectorTests.EncryptBytes_Cfb_Aes128_GivesTheVectorOfSp80038aF313, StandardVectorTests.EncryptBytes_Cfb_Aes192_GivesTheVectorOfSp80038aF315, StandardVectorTests.EncryptBytes_Cfb_Aes256_GivesTheVectorOfSp80038aF317, StandardVectorTests.DecryptBytes_Cfb_Aes128_GivesThePlaintextOfSp80038aF314, StandardVectorTests.EncryptBytes_Ofb_Aes128_GivesTheVectorOfSp80038aF41, StandardVectorTests.EncryptBytes_Ofb_Aes192_GivesTheVectorOfSp80038aF43, StandardVectorTests.EncryptBytes_Ofb_Aes256_GivesTheVectorOfSp80038aF45, StandardVectorTests.DecryptBytes_Ofb_Aes128_GivesThePlaintextOfSp80038aF42, StandardVectorTests.EncryptBytes_Ctr_Aes128_GivesTheVectorOfSp80038aF51, StandardVectorTests.EncryptBytes_Ctr_Aes192_GivesTheVectorOfSp80038aF53, StandardVectorTests.EncryptBytes_Ctr_Aes256_GivesTheVectorOfSp80038aF55, StandardVectorTests.DecryptBytes_Ctr_Aes128_GivesThePlaintextOfSp80038aF52 -->
> [!WARNING] 1.0.0.4
> The name of a mode is not always the mode that runs. **ECB** runs CBC with an IV of zero bytes, **CBC** runs ECB, and **OFB** and **CTR** run CFB. The CFB that runs has an 8-bit feedback, where the standard CFB has a 128-bit feedback, so **CFB**, **OFB** and **CTR** give the output of none of the standard modes of those names. Neither **ECB** nor **CBC** uses the IV that the program sets, so the same key and plaintext always give the same ciphertext, and in the default mode **CBC** equal plaintext blocks give equal ciphertext blocks. A round trip succeeds in every case, because encryption and decryption use the same mode, so a test that only decrypts what it has encrypted shows nothing.

| Mode | Windows interface | What runs | The IV |
|---|---|---|---|
| **ECB** | Crypto API | CBC | Not passed to Windows; the IV is all zero bytes |
| **CBC** | Crypto API | ECB | Passed to Windows, and ECB ignores it |
| **CFB**, **OFB**, **CTR** | CNG | CFB with an 8-bit feedback | 16 bytes from [**IV**](#iv); all zero bytes when none is set |
| **GCM** | CNG | GCM with a 12-byte nonce and a 16-byte tag | The first 12 bytes of [**IV**](#iv) are the nonce |

The swap of **ECB** and **CBC** comes from the constants of the package: **CRYPT_MODE_ECB** is 1 and **CRYPT_MODE_CBC** is 2, and the Crypto API defines 1 as CBC and 2 as ECB. See [mAesConstants](mAesConstants#windows-constants). The class sets the IV of a Crypto API key only when the mode is not **ECB**, so the mode **ECB**, which runs CBC, starts with the zero IV that Windows gives a new key, and the mode **CBC**, which runs ECB, sets an IV that ECB does not read. **OFB** and **CTR** have no code of their own: the class sets the CNG chaining mode to CFB for every mode but GCM, and accepts the two modes without an error.

The samples on this page print bytes with `HexOf` and read hexadecimal text with `FromHex`. The two functions are not part of the package.

```tb check_build slot=module projname=aes-class
Public Function HexOf(ByRef bytes() As Byte) As String
    Dim i As Long
    Dim text As String
    For i = LBound(bytes) To UBound(bytes)
        text = text & Right$("0" & LCase$(Hex$(bytes(i))), 2)
    Next
    HexOf = text
End Function

Public Function FromHex(ByVal text As String) As Byte()
    Dim bytes() As Byte
    Dim i As Long
    ReDim bytes(Len(text) \ 2 - 1)
    For i = 0 To UBound(bytes)
        bytes(i) = CByte("&H" & Mid$(text, i * 2 + 1, 2))
    Next
    FromHex = bytes
End Function
```

### The Crypto API modes

The modes **ECB** and **CBC** acquire a context of the Crypto API for the provider type **PROV_RSA_AES** with no container name. When Windows refuses, the class asks again with **CRYPT_NEWKEYSET**, which creates the default key container of the user. It then hashes the bytes of [**Key**](#key) once with SHA-256, without a salt, and gives the hash to `CryptDeriveKey`, which makes the AES key. The algorithm is AES-128, AES-192 or AES-256 as [**KeySize**](#keysize) says, and the key is the first 16, 24 or 32 bytes of the hash.

The **Key** array is therefore not the AES key of these two modes. Other software that is given the same array and uses it as the AES key cannot decrypt their output; it has to hash the array in the same way first.

The class pads the data as [**PaddingMode**](#paddingmode) says, and then calls `CryptEncrypt` for the last block. Windows adds its own PKCS #5 padding at that call, whatever **PaddingMode** is, so the output is longer than the padded data by 1 to 16 bytes: a whole block when the padded data already fills its blocks. On decryption Windows takes off its padding, and then the class takes off its own.

<!-- test: StandardVectorTests.EncryptBytes_Ecb_Aes128_GivesTheBlockOfFips197C1, StandardVectorTests.EncryptBytes_Ecb_Aes192_GivesTheBlockOfFips197C2, StandardVectorTests.EncryptBytes_Ecb_Aes256_GivesTheBlockOfFips197C3, StandardVectorTests.EncryptBytes_Ecb_Aes128_GivesTheVectorOfSp80038aF11, StandardVectorTests.EncryptBytes_Cbc_Aes128_GivesTheVectorOfSp80038aF21, CryptoApiModeTests.EncryptBytes_Ecb_NoPaddingKeepsTheLengthOfTheInput, CryptoApiModeTests.EncryptBytes_Cbc_NoPaddingKeepsTheLengthOfTheInput, CryptoApiModeTests.EncryptBytes_Ecb_Pkcs7OfOneBlockGivesTwoBlocks, CryptoApiModeTests.EncryptBytes_Cbc_Pkcs7OfOneBlockGivesTwoBlocks, CryptoApiModeTests.EncryptBytes_Ecb_RefusesAKeyOfFiveBytes, CryptoApiModeTests.EncryptBytes_Cbc_RefusesAKeyOfFortyBytes -->
> [!WARNING] 1.0.0.4
> The output of **ECB** and **CBC** is not AES under the key in **Key**: the key is the SHA-256 hash of the bytes, and Windows adds a padding of its own, so the output is longer than the data even with **NoPadding**. The AES test vectors of FIPS 197 and NIST SP 800-38A do not come out, and other AES software cannot read the output. A **Key** of any length is accepted, a key of 5 or 40 bytes included, and a program is not told that the key is not an AES key.

In this sample, the default mode **CBC** encrypts two equal blocks. The first two blocks of the output are equal, and so are the last two, which come from the two paddings. **Key** is the 16-byte key of the examples of NIST SP 800-38A, and the mode hashes it before it uses it.

```tb check_build check_run projname=aes-class
Dim aes As New cAes                          ' CBC, KeySize_256
Dim keyBytes() As Byte
Dim plain() As Byte
Dim cipher() As Byte
Dim cipherHex As String

keyBytes = FromHex("2b7e151628aed2a6abf7158809cf4f3c")
plain = StrConv(String$(32, "A"), vbFromUnicode)     ' two equal blocks

aes.Key = keyBytes
cipher = aes.EncryptBytes(plain)
cipherHex = HexOf(cipher)
Debug.Print UBound(cipher) + 1                                   ' 64
Debug.Print Mid$(cipherHex, 1, 32) = Mid$(cipherHex, 33, 32)     ' True
Debug.Print cipherHex                                            ' db9c065d2a475f8f9eff8b040db4701edb9c065d2a475f8f9eff8b040db4701e9a77fe2fe55ee4f0e139d67ab6fa7eda9a77fe2fe55ee4f0e139d67ab6fa7eda
```

The mode **ECB** runs CBC, and the IV that the program sets does not reach Windows. Its output is the same with an IV and without one, and its second block differs from its first, since the blocks are chained. Its first block equals the first block of the sample above, because the zero IV changes nothing in the first block.

```tb check_build check_run projname=aes-class
Dim aes As New cAes
Dim keyBytes() As Byte
Dim ivBytes() As Byte
Dim plain() As Byte
Dim cipher() As Byte
Dim withoutIV As String

keyBytes = FromHex("2b7e151628aed2a6abf7158809cf4f3c")
ivBytes = FromHex("000102030405060708090a0b0c0d0e0f")
plain = StrConv(String$(32, "A"), vbFromUnicode)

aes.CipherMode = AesCipherMode.ECB
aes.Key = keyBytes
cipher = aes.EncryptBytes(plain)                 ' no IV set
withoutIV = HexOf(cipher)

aes.IV = ivBytes
cipher = aes.EncryptBytes(plain)
Debug.Print HexOf(cipher) = withoutIV            ' True
Debug.Print withoutIV                            ' db9c065d2a475f8f9eff8b040db4701e438fd62477608499b6746bf92dfc4fa264d3d3facff9b49957177244d0ad2fa78b80b345771fac552c30f1fc7ce6c9a2
```

The next sample encrypts one block of NIST SP 800-38A, with **NoPadding** so that the only padding is the one that Windows adds. The standard results for the key `2b7e151628aed2a6abf7158809cf4f3c` are `3ad77bb40d7a3660a89ecaf32466ef97` for ECB (F.1.1) and `7649abac8119b246cee98e9b12e9197d` for CBC with the IV `000102030405060708090a0b0c0d0e0f` (F.2.1). Neither mode of the class gives them: the first 16 bytes of the two outputs are equal to each other, and are the encryption of the block under the SHA-256 hash of the key.

```tb check_build check_run projname=aes-class
Dim aes As New cAes
Dim keyBytes() As Byte
Dim ivBytes() As Byte
Dim plain() As Byte
Dim cipher() As Byte

keyBytes = FromHex("2b7e151628aed2a6abf7158809cf4f3c")
ivBytes = FromHex("000102030405060708090a0b0c0d0e0f")
plain = FromHex("6bc1bee22e409f96e93d7e117393172a")
aes.PaddingMode = AesPaddingMode.NoPadding
aes.Key = keyBytes
aes.IV = ivBytes

aes.CipherMode = AesCipherMode.CBC
cipher = aes.EncryptBytes(plain)
Debug.Print HexOf(cipher)    ' 4a25e445195fc88dd0b7fff307d49a9a9a77fe2fe55ee4f0e139d67ab6fa7eda

aes.CipherMode = AesCipherMode.ECB
cipher = aes.EncryptBytes(plain)
Debug.Print HexOf(cipher)    ' 4a25e445195fc88dd0b7fff307d49a9a3daa1722a6ebdf652bd36c4723d038fd
```

### The CNG modes

<!-- test: KeyAndIVTests.EncryptBytes_Cfb_RefusesAKeyOf20Bytes, KeyAndIVTests.EncryptBytes_Cfb_KeySizeDoesNotChangeTheKeyLengthThatRuns -->
The modes **CFB**, **OFB**, **CTR** and **GCM** open the CNG provider for AES, set its chaining mode to `ChainingModeCFB` (**CFB**, **OFB**, **CTR**) or `ChainingModeGCM` (**GCM**), and make the key from the bytes of **Key** as they are. The key length is the length of the array: 16, 24 and 32 bytes give AES-128, AES-192 and AES-256. An array of any other length, such as 20 bytes, makes the call fail, and [**KeySize**](#keysize) has no effect: a 32-byte key with **KeySize_128** is an AES-256 key.
<!-- /test -->

The class does not set the message block length of the chaining mode, and CNG then feeds back one byte at a time: the CFB of these modes is CFB with an 8-bit feedback, the mode that NIST SP 800-38A lists as CFB8, and not CFB with a 128-bit feedback. Output of other software in CFB mode, which is usually CFB128, is different from it.

The sample encrypts the first 18 bytes of the plaintext of SP 800-38A with **NoPadding**, so that the output has the length of the input. Its output is the ciphertext of the CFB8-AES128 example F.3.7. The first 16 bytes of plaintext give `3b3fd92eb72dad20333449f8e83cfb4a` in the CFB128 example F.3.13; that block and the output below share only their first byte.

```tb check_build check_run projname=aes-class
Dim aes As New cAes
Dim keyBytes() As Byte
Dim ivBytes() As Byte
Dim plain() As Byte
Dim cipher() As Byte

keyBytes = FromHex("2b7e151628aed2a6abf7158809cf4f3c")
ivBytes = FromHex("000102030405060708090a0b0c0d0e0f")
plain = FromHex("6bc1bee22e409f96e93d7e117393172aae2d")

aes.CipherMode = AesCipherMode.CFB
aes.PaddingMode = AesPaddingMode.NoPadding
aes.Key = keyBytes
aes.IV = ivBytes
cipher = aes.EncryptBytes(plain)
Debug.Print HexOf(cipher)                    ' 3b79424c9c0dd436bace9e0ed4586a4f32b9
```

**OFB** and **CTR** give the output of **CFB**.

```tb check_build check_run projname=aes-class
Dim aes As New cAes
Dim keyBytes() As Byte
Dim ivBytes() As Byte
Dim plain() As Byte
Dim cipher() As Byte

keyBytes = FromHex("2b7e151628aed2a6abf7158809cf4f3c")
ivBytes = FromHex("000102030405060708090a0b0c0d0e0f")
plain = FromHex("6bc1bee22e409f96e93d7e117393172aae2d")
aes.PaddingMode = AesPaddingMode.NoPadding
aes.Key = keyBytes
aes.IV = ivBytes

aes.CipherMode = AesCipherMode.CFB
cipher = aes.EncryptBytes(plain)
Debug.Print HexOf(cipher)
aes.CipherMode = AesCipherMode.OFB
cipher = aes.EncryptBytes(plain)
Debug.Print HexOf(cipher)
aes.CipherMode = AesCipherMode.CTR
cipher = aes.EncryptBytes(plain)
Debug.Print HexOf(cipher)
' Output:
' 3b79424c9c0dd436bace9e0ed4586a4f32b9
' 3b79424c9c0dd436bace9e0ed4586a4f32b9
' 3b79424c9c0dd436bace9e0ed4586a4f32b9
```

<!-- test: KeyAndIVTests.EncryptBytes_Cfb_NoIVGivesTheOutputOfAnIVOfZeroBytes, KeyAndIVTests.EncryptBytes_Cfb_RefusesAnIVOf12Bytes, KeyAndIVTests.EncryptBytes_Cfb_IVOf16BytesIsAccepted -->
The IV of these modes is passed to CNG as it is, from the first element, with its length. CNG needs 16 bytes for CFB, and an IV of another length, such as 12 bytes, makes the call fail. With no IV set, the class passes none, and CNG uses 16 zero bytes: the output equals that of an IV of 16 zero bytes.
<!-- /test -->

### Reading the output with other software

The output of a mode is the output of a standard mode under particular keys and paddings. These are the equivalents, with the names of the OpenSSL ciphers; *N* is the key length in bits.

| Mode | Standard mode | Key | IV |
|---|---|---|---|
| **CBC** | `aes-N-ecb`, *N* from [**KeySize**](#keysize) | The first *N*/8 bytes of the SHA-256 hash of [**Key**](#key) | None |
| **ECB** | `aes-N-cbc`, *N* from [**KeySize**](#keysize) | The same | 16 zero bytes |
| **CFB**, **OFB**, **CTR** | `aes-N-cfb8`, *N* from the length of [**Key**](#key) | [**Key**](#key) | [**IV**](#iv) |
| **GCM** | `aes-N-gcm`, *N* from the length of [**Key**](#key) | [**Key**](#key) | The first 12 bytes of [**IV**](#iv); the tag is [**GcmTag**](#gcmtag) |

What the standard decryption returns is the data followed by the padding that [**PaddingMode**](#paddingmode) added. With **NoPadding** it is the data itself in the CNG modes. In the Crypto API modes a standard decryption also returns the PKCS #7 block of Windows unless the software removes it, which standard software does; with **NoPadding** the output is then the data, and with **PKCS7** or **ZeroPadding** it is the data and the padding of the class. The Base64 text from [**EncryptString**](#encryptstring) is the plain Base64 of these bytes.

### Data that is not checked

<!-- test: FailureTests.DecryptString_WrongKeyWithNoPadding_ReturnsOtherText -->
None of the modes but **GCM** checks that the data is the data that was encrypted. A decryption with a wrong key, a wrong IV or damaged bytes gives other bytes, and nothing reports it. With the **PKCS7** padding of the default, the padding check rejects most of these results, about 255 of 256, and the decryption fails; the rest pass as data. With **NoPadding** or **ISO10126** there is no check, and [**DecryptString**](#decryptstring) returns whatever text the bytes decode to.

```tb check_build check_run
Dim writer As New cAes
Dim reader As New cAes
Dim rightKey() As Byte
Dim wrongKey() As Byte
Dim ivBytes() As Byte
Dim text As String

rightKey = StrConv("0123456789abcdef", vbFromUnicode)
wrongKey = StrConv("0123456789abcdeg", vbFromUnicode)    ' one character differs
ivBytes = StrConv("fedcba9876543210", vbFromUnicode)

writer.CipherMode = AesCipherMode.CFB
writer.PaddingMode = AesPaddingMode.NoPadding
writer.Key = rightKey
writer.IV = ivBytes
reader.CipherMode = AesCipherMode.CFB
reader.PaddingMode = AesPaddingMode.NoPadding
reader.Key = wrongKey
reader.IV = ivBytes

text = reader.DecryptString(writer.EncryptString("Hello, AES!"))
Debug.Print Len(text) > 0                    ' True
Debug.Print text = "Hello, AES!"             ' False
```
<!-- /test -->

## GCM mode

GCM encrypts and authenticates. A **cAes** in GCM mode works in these steps.

1. Set [**Key**](#key) and [**IV**](#iv). The nonce is the first 12 bytes of **IV**. An IV of 16 bytes, such as [**GenerateRandomIV**](#generaterandomiv) makes, is cut to 12 bytes; a shorter IV is extended with zero bytes to 12.
2. Set [**GcmAAD**](#gcmaad), data that is authenticated and not encrypted, if the message has any.
3. Encrypt. The return value is the ciphertext, and [**GcmTag**](#gcmtag) holds the 16-byte tag of this encryption.
4. Keep the ciphertext, the IV, the tag and the additional data.

To decrypt, a **cAes** with the same key needs the same **IV**, **GcmTag** and **GcmAAD**. Windows checks the tag against the ciphertext and the additional data. When the check fails, [**DecryptBytes**](#decryptbytes) raises the error described under [Failures](#failures) and [**DecryptString**](#decryptstring) returns an empty string. No text is recorded in [**LastError**](#lasterror).

<!-- test: GcmTests.EncryptBytes_Gcm_DefaultPaddingGivesTheStandardOutput -->
> [!NOTE] 1.0.0.4
> **PaddingMode** applies in GCM mode as in the others. With the default **PKCS7** the ciphertext is 1 to 16 bytes longer than the plaintext, which is not what other GCM software produces, and the tag is a tag of the padded data. Use **NoPadding** to get standard GCM output.

<!-- test: GcmTests.EncryptBytes_Gcm_Aes128_GivesTheVectorOfTestCase4, GcmTests.EncryptBytes_Gcm_Aes192_GivesTheVectorOfTestCase10, GcmTests.EncryptBytes_Gcm_Aes256_GivesTheVectorOfTestCase16, GcmTests.EncryptBytes_Gcm_AnIVLongerThan12BytesGivesTheOutputOfItsFirst12Bytes, GcmTests.DecryptBytes_Gcm_DamagedTagRaises, GcmTests.DecryptBytes_Gcm_DamagedAdditionalDataRaises, GcmTests.DecryptBytes_Gcm_DamagedCiphertextRaises, GcmTests.DecryptBytes_Gcm_ChangedIVRaises, GcmTests.DecryptBytes_Gcm_NoTagRaises, GcmTests.DecryptBytes_Gcm_TagOf12BytesIsAccepted, GcmTests.DecryptBytes_Gcm_TagOf4BytesIsRefused -->
The sample is test case 4 of the GCM specification by McGrew and Viega, the document that NIST SP 800-38D is based on: a 60-byte plaintext, 20 bytes of additional data and the standard IV length of 96 bits.

```tb check_build check_run projname=aes-class
Dim aes As cAes = New cAes(AesKeySize.KeySize_128, AesCipherMode.GCM, AesPaddingMode.NoPadding)
Dim keyBytes() As Byte
Dim ivBytes() As Byte
Dim aad() As Byte
Dim plain() As Byte
Dim cipher() As Byte
Dim tag() As Byte
Dim decrypted() As Byte

keyBytes = FromHex("feffe9928665731c6d6a8f9467308308")
ivBytes = FromHex("cafebabefacedbaddecaf888")
aad = FromHex("feedfacedeadbeeffeedfacedeadbeefabaddad2")
plain = FromHex("d9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b39")

aes.Key = keyBytes
aes.IV = ivBytes
aes.GcmAAD = aad
cipher = aes.EncryptBytes(plain)
tag = aes.GcmTag
Debug.Print HexOf(cipher)    ' 42831ec2217774244b7221b784d0d49ce3aa212f2c02a4e035c17e2329aca12e21d514b25466931c7d8f6a5aac84aa051ba30b396a0aac973d58e091
Debug.Print HexOf(tag)       ' 5bc94fbc3221a5db94fae95ae7121a47

decrypted = aes.DecryptBytes(cipher)
Debug.Print HexOf(decrypted) = HexOf(plain)  ' True
```

With a tag that has one bit changed, the decryption fails. The failure is the same for changed additional data, a changed IV and changed ciphertext. The package prints five lines with `Debug.Print` on the way, and the Debug Console of the IDE shows them; the first line holds the Windows status `0xC000A002`, which is `STATUS_AUTH_TAG_MISMATCH`, and a message in Chinese. The error that reaches the program is **Unspecified error**.

```tb check_build check_run projname=aes-class
Dim aes As cAes = New cAes(AesKeySize.KeySize_128, AesCipherMode.GCM, AesPaddingMode.NoPadding)
Dim keyBytes() As Byte
Dim ivBytes() As Byte
Dim plain() As Byte
Dim cipher() As Byte
Dim tag() As Byte
Dim decrypted() As Byte

keyBytes = FromHex("feffe9928665731c6d6a8f9467308308")
ivBytes = FromHex("cafebabefacedbaddecaf888")
plain = StrConv("Hello, AES!", vbFromUnicode)
aes.Key = keyBytes
aes.IV = ivBytes
cipher = aes.EncryptBytes(plain)
tag = aes.GcmTag

tag(0) = tag(0) Xor 1                        ' damage the tag
aes.GcmTag = tag
On Error Resume Next
decrypted = aes.DecryptBytes(cipher)
Debug.Print Err.Number
' Output:
' BCryptDecrypt_GCM failed: 0xC000A002 - CNG 错误: 0xC000A002
' DoDecryptCNG_GCM failed: Unspecified error
' DoDecryptCNG failed: Unspecified error
' DoDecrypt failed: Unspecified error
' DecryptBytes error: Unspecified error
' -2147467259
```

A decryption with no tag set fails in the same way, after the line `DoDecryptCNG_GCM failed: GCM tag not set for decryption`. A tag of 16 bytes is the length that the encryption makes. The class passes the length of **GcmTag** to Windows as it is: a tag cut to its first 12 bytes is accepted and the decryption returns the plaintext, and one cut to 4 bytes makes Windows fail with an invalid parameter.
<!-- /test -->

<!-- test: GcmTests.EncryptBytes_Gcm_NoIVCanBeDecrypted, GcmTests.EncryptBytes_Gcm_NoIVLeavesTheNonceInIV, GcmTests.EncryptBytes_Gcm_NoIVRaisesNoErrorAndUsesAFreshNonceEachTime -->
> [!WARNING] 1.0.0.4
> A GCM encryption with no IV set makes a random 12-byte nonce, uses it, and keeps it nowhere. [**IV**](#iv) stays empty. A decryption with no IV uses a nonce of 12 zero bytes, so its tag check fails and the data cannot be decrypted. The encryption raises no error. Set **IV** before every GCM encryption, and keep it with the ciphertext.

```tb check_build check_run projname=aes-class
Dim aes As cAes = New cAes(AesKeySize.KeySize_128, AesCipherMode.GCM, AesPaddingMode.NoPadding)
Dim helper As New cAesHelper
Dim keyBytes() As Byte
Dim plain() As Byte
Dim first() As Byte
Dim second() As Byte
Dim ivBytes() As Byte

keyBytes = FromHex("feffe9928665731c6d6a8f9467308308")
plain = StrConv("Hello, AES!", vbFromUnicode)
aes.Key = keyBytes                           ' no IV is set
first = aes.EncryptBytes(plain)
second = aes.EncryptBytes(plain)
ivBytes = aes.IV
Debug.Print HexOf(first) = HexOf(second)     ' False
Debug.Print helper.IsArrayEmpty(ivBytes)     ' True
```

<!-- test: GcmTests.EncryptBytes_Gcm_TwoEncryptionsWithTheSameIVUseTheSameNonce -->
GCM requires that no nonce is used twice with the same key (NIST SP 800-38D). The class never changes **IV**, so two encryptions in a row use the same nonce unless the program sets a new **IV** between them.
<!-- /test -->

## Failures

A failed call does not tell why, and what the caller gets depends on the member.

- [**EncryptBytes**](#encryptbytes) and [**DecryptBytes**](#decryptbytes) raise the run-time error -2147467259 (`&H80004005`) with the description `Unspecified error` and an empty `Err.Source`. The cause is lost: the code that handles the original error, such as `Key not set`, assigns **Nothing** to the **Byte** array it returns, and that assignment raises this error in place of it.
- [**EncryptString**](#encryptstring) and [**DecryptString**](#decryptstring) return an empty string and raise no error. `Err` keeps the last error and is not cleared. For an empty text it is the error that the method raised itself, `Plain text cannot be empty` (`vbObjectError + 3`) or `Cipher text cannot be empty` (`vbObjectError + 8`); for the other failures it is **Unspecified error**.
- [**SetKeyFromString**](#setkeyfromstring) raises an error of its own, `vbObjectError + 2`.
- [**GenerateRandomIV**](#generaterandomiv) and [**Cleanup**](#cleanup) cannot fail, and the properties raise nothing.

<!-- test: FailureTests.EncryptBytes_NoKey_RaisesUnspecifiedError, FailureTests.EncryptBytes_NoKey_ErrorNamesTheCause, FailureTests.EncryptBytes_EmptyInput_RaisesUnspecifiedError, FailureTests.DecryptBytes_NoKey_RaisesUnspecifiedError, FailureTests.DecryptBytes_NoKey_ErrorNamesTheCause, FailureTests.DecryptBytes_GcmDamagedTag_ErrorNamesTheCause, FailureTests.DecryptBytes_Cfb_InvalidPadding_RaisesUnspecifiedError -->
> [!NOTE] 1.0.0.4
> A program that calls **EncryptBytes** or **DecryptBytes** needs an `On Error` statement, and cannot tell a missing key from a wrong tag or a damaged ciphertext by the error. The Debug Console of the IDE shows more: the package prints lines with `Debug.Print`, such as `DecryptBytes error: Key not set` and `BCryptEncrypt failed: 0xC0000206` followed by a message, and a built program writes none of them.

<!-- test: FailureTests.EncryptString_NoKey_ReturnsAnEmptyString, FailureTests.EncryptString_NoKey_ReportsTheFailure, FailureTests.EncryptString_EmptyText_ReturnsAnEmptyString, FailureTests.DecryptString_GcmDamagedTag_ReturnsAnEmptyString, FailureTests.DecryptString_GcmDamagedTag_ReportsTheFailure, FailureTests.DecryptString_InvalidBase64_ReturnsAnEmptyStringAndSetsLastError -->
> [!WARNING] 1.0.0.4
> The string members hide a failure in an empty string. **DecryptString** of a GCM message whose tag does not match, of a message with a wrong key in a mode with padding, and of Base64 text that is not valid, all give the same empty string as an empty plaintext would, and **EncryptString** gives an empty string for a missing key. A program must test the result with `Len`.

These are the causes of a failure in the source:

- the text or the array to encrypt or decrypt is empty, so an empty input is a failure and not an empty output;
- no key is set;
- the key or the IV has a length that Windows does not accept in the mode;
- the padding of a decryption is not valid, or in GCM mode the tag check fails or no tag is set;
- the Base64 text of [**DecryptString**](#decryptstring) is not valid;
- Windows reports an error, for example when the CNG provider is not available.

<!-- test: FailureTests.LastError_IsNotClearedByALaterSuccess -->
[**LastError**](#lasterror) holds a text only for the failures of the Base64, UTF-8 and padding functions of [**cAesHelper**](cAesHelper#lasterror), and is never cleared. `Err.Number` can also be 9 after a call that succeeded: the class tests its arrays with [**IsArrayEmpty**](cAesHelper#isarrayempty), which leaves the error 9 in `Err` when an array was never sized, for example when no IV is set in the mode **CFB**. A program should not take a non-zero `Err.Number` after a call that raised nothing for a failure.

```tb check_build check_run
Dim aes As New cAes                          ' no key is set
Dim plain() As Byte
Dim cipher() As Byte

plain = StrConv("text", vbFromUnicode)
On Error Resume Next
cipher = aes.EncryptBytes(plain)
Debug.Print Err.Number                       ' -2147467259
Debug.Print Err.Description                  ' Unspecified error
Err.Clear
Debug.Print Len(aes.EncryptString("text"))   ' 0
Debug.Print Len(aes.LastError)               ' 0
```
<!-- /test -->

## Constructors

### New
{: .no_toc }

Creates a **cAes**.

Syntax: **Dim** *aes* **As New cAes**

Syntax: **Dim** *aes* **As cAes = New cAes** ( *keySize*, *cipherMode*, *paddingMode* )

*keySize*
: *required* An [**AesKeySize**](mAesConstants#aeskeysize) member, stored in [**KeySize**](#keysize).

*cipherMode*
: *required* An [**AesCipherMode**](mAesConstants#aesciphermode) member, stored in [**CipherMode**](#ciphermode).

*paddingMode*
: *required* An [**AesPaddingMode**](mAesConstants#aespaddingmode) member, stored in [**PaddingMode**](#paddingmode).

<!-- test: DefaultsAndConstantsTests.New_WithArgumentsStoresThem -->
With no arguments the object starts with the values in [Defaults](#defaults). The constructor does not check the values. The class has the attribute `[COMCreatable(False)]`, so a program creates it with `New` and not with `CreateObject`.
<!-- /test -->

```tb check_build check_run
Dim aes As cAes = New cAes(AesKeySize.KeySize_128, AesCipherMode.GCM, AesPaddingMode.NoPadding)

Debug.Print aes.KeySize                      ' 128
Debug.Print aes.CipherMode                   ' 6
Debug.Print aes.PaddingMode                  ' 3
```

## Properties

### CipherMode
{: .no_toc }

The cipher mode. An [**AesCipherMode**](mAesConstants#aesciphermode) member, read/write. Default: **CBC**.

Syntax: *object*.**CipherMode** [ **=** *mode* ]

[Which mode runs](#which-mode-runs) says what each member does in version 1.0.0.4, and it differs from the names. The setter stores the value without a check, and sets [**IsInitialized**](#isinitialized) to **False**. A value that is not a member makes an encryption or a decryption fail.

### GcmAAD
{: .no_toc }

The additional authenticated data of the GCM mode. A **Byte** array, read/write. Default: no elements.

Syntax: *object*.**GcmAAD** [ **=** *bytes* ]

The data is authenticated and not encrypted. A decryption needs the same bytes as the encryption that made the tag, or its tag check fails. The data is not part of the output, and the program keeps it. Assigning an array that was never sized removes the data.

The other modes do not read it. The property keeps its value across calls, and [**Cleanup**](#cleanup) does not clear it. [**SetGcmAADFromString**](#setgcmaadfromstring) sets it from a string.

### GcmTag
{: .no_toc }

The authentication tag of the GCM mode. A **Byte** array, read/write. Default: no elements.

Syntax: *object*.**GcmTag** [ **=** *bytes* ]

A GCM encryption sets it to 16 bytes, replacing the previous value. A decryption reads it, and passes its whole length to Windows as the tag; the class does not check that the length is 16. A tag of 12 bytes is accepted, and one of 4 bytes is not. With no tag set, the decryption fails. The tag is not part of the output of the encrypt methods, so the program keeps it.

The other modes do not read it.

### IsInitialized
{: .no_toc }

Whether the Windows key objects of the object exist. **Boolean**, read-only. Default: **False**.

Syntax: *object*.**IsInitialized**

<!-- test: DefaultsAndConstantsTests.IsInitialized_IsTrueAfterACallAndFalseAfterASetterOrCleanup -->
An encrypt or a decrypt call makes the key objects, and **IsInitialized** is **True** after one succeeded in making them. The setters of [**Key**](#key), [**IV**](#iv), [**KeySize**](#keysize), [**CipherMode**](#ciphermode) and [**PaddingMode**](#paddingmode), [**SetKeyFromString**](#setkeyfromstring) and [**Cleanup**](#cleanup) set it to **False**. The property does not say that the key is valid or that the last call succeeded. No call needs it: each call makes its own key objects.
<!-- /test -->

```tb check_build check_run
Dim aes As New cAes
Dim text As String

aes.SetKeyFromString "key"
Debug.Print aes.IsInitialized                ' False
text = aes.EncryptString("text")
Debug.Print aes.IsInitialized                ' True
aes.KeySize = AesKeySize.KeySize_256
Debug.Print aes.IsInitialized                ' False
text = aes.EncryptString("text")
aes.Cleanup
Debug.Print aes.IsInitialized                ' False
```

### IV
{: .no_toc }

The initialisation vector. A **Byte** array, read/write. Default: no elements.

Syntax: *object*.**IV** [ **=** *bytes* ]

The output of the encrypt methods does not hold the IV, so the program keeps it with the ciphertext and sets it before it decrypts. [**GenerateRandomIV**](#generaterandomiv) sets it and returns it. How each mode uses it:

| Mode | Use of the IV |
|---|---|
| **ECB** | Not used. The class does not pass it to Windows, and the mode runs with an IV of zero bytes. |
| **CBC** | Not used. The class passes it to Windows, and the mode that runs, ECB, ignores it. |
| **CFB**, **OFB**, **CTR** | Passed with its length, which must be 16 bytes. All zero bytes when none is set. |
| **GCM** | The first 12 bytes are the nonce; see [GCM mode](#gcm-mode). |

In the default mode **CBC** two IVs give the same ciphertext.

```tb check_build check_run projname=aes-class
Dim aes As New cAes                          ' CBC, the default mode
Dim keyBytes() As Byte
Dim iv1() As Byte
Dim iv2() As Byte
Dim plain() As Byte
Dim cipher1() As Byte
Dim cipher2() As Byte

keyBytes = FromHex("2b7e151628aed2a6abf7158809cf4f3c")
iv1 = FromHex("000102030405060708090a0b0c0d0e0f")
iv2 = FromHex("ffffffffffffffffffffffffffffffff")
plain = StrConv("Hello, AES!", vbFromUnicode)
aes.Key = keyBytes

aes.IV = iv1
cipher1 = aes.EncryptBytes(plain)
aes.IV = iv2
cipher2 = aes.EncryptBytes(plain)
Debug.Print HexOf(cipher1) = HexOf(cipher2)  ' True
```

In GCM mode a longer IV gives the output of its first 12 bytes.

```tb check_build check_run projname=aes-class
Dim aes As cAes = New cAes(AesKeySize.KeySize_128, AesCipherMode.GCM, AesPaddingMode.NoPadding)
Dim keyBytes() As Byte
Dim iv12() As Byte
Dim iv16() As Byte
Dim plain() As Byte
Dim cipher12() As Byte
Dim cipher16() As Byte

keyBytes = FromHex("feffe9928665731c6d6a8f9467308308")
iv12 = FromHex("cafebabefacedbaddecaf888")
iv16 = FromHex("cafebabefacedbaddecaf88801020304")
plain = StrConv("Hello, AES!", vbFromUnicode)
aes.Key = keyBytes

aes.IV = iv12
cipher12 = aes.EncryptBytes(plain)
aes.IV = iv16
cipher16 = aes.EncryptBytes(plain)
Debug.Print HexOf(cipher12) = HexOf(cipher16)    ' True
```

### Key
{: .no_toc }

The key bytes. A **Byte** array, read/write. Default: no elements.

Syntax: *object*.**Key** [ **=** *bytes* ]

The setter stores a copy of the array without a check of its length, and sets [**IsInitialized**](#isinitialized) to **False**. What the key is depends on the mode:

- The modes **ECB** and **CBC** hash the bytes with SHA-256 and make the AES key from the hash, as [The Crypto API modes](#the-crypto-api-modes) describes. The array may have any length; an array of 5 bytes and one of 40 bytes both work.
- The modes **CFB**, **OFB**, **CTR** and **GCM** use the bytes as the AES key. The array must have 16, 24 or 32 bytes.

[**SetKeyFromString**](#setkeyfromstring) fills the property from a string. The package has no function that generates a key.

### KeySize
{: .no_toc }

The key length in bits. An [**AesKeySize**](mAesConstants#aeskeysize) member, read/write. Default: **KeySize_256**.

Syntax: *object*.**KeySize** [ **=** *size* ]

The setter stores the value and sets [**IsInitialized**](#isinitialized) to **False**. The value is read in two places only:

- [**SetKeyFromString**](#setkeyfromstring) makes a key of 16, 24 or 32 bytes. Setting **KeySize** afterwards does not change a key that is already set.
- The modes **ECB** and **CBC** choose the AES algorithm, AES-128, AES-192 or AES-256, for the key they derive from the hash of **Key**: the first 16, 24 or 32 bytes of the hash.

The modes **CFB**, **OFB**, **CTR** and **GCM** ignore it and take the length of the [**Key**](#key) array. A 32-byte key with **KeySize_128** is an AES-256 key in these modes.

### LastError
{: .no_toc }

The text of the last failure of a conversion or a padding function. **String**, read-only.

Syntax: *object*.**LastError**

The property returns the [**LastError**](cAesHelper#lasterror) of the **cAesHelper** that the object holds. It is an empty string for a new object. A failure sets it only when it happens in the Base64, UTF-8 or padding functions of that helper, and the text is then of the form `Base64 decoding exception: Unspecified error` or `PKCS7 unpadding exception: Unspecified error`; the table under **cAesHelper** lists them. A later success does not clear it, and the object has no way to clear it. The failures of the rest of the class, such as a tag that does not match, set nothing; see [Failures](#failures).

### PaddingMode
{: .no_toc }

The padding of the last block. An [**AesPaddingMode**](mAesConstants#aespaddingmode) member, read/write. Default: **PKCS7**.

Syntax: *object*.**PaddingMode** [ **=** *mode* ]

The setter stores the value and sets [**IsInitialized**](#isinitialized) to **False**. The class pads the data before it encrypts and takes the padding off after it decrypts, in every cipher mode. [**AesPaddingMode**](mAesConstants#aespaddingmode) lists what each member does.

The modes **ECB** and **CBC** add the padding of Windows as well, on top of the padding of the class, so their output is 1 to 16 bytes longer than the padded data. The sample encrypts 16 bytes, one whole block, in the default mode **CBC**.

```tb check_build check_run projname=aes-class
Dim aes As New cAes                          ' CBC, the default mode
Dim keyBytes() As Byte
Dim plain() As Byte
Dim cipher() As Byte

keyBytes = FromHex("2b7e151628aed2a6abf7158809cf4f3c")
plain = StrConv("0123456789abcdef", vbFromUnicode)
aes.Key = keyBytes

aes.PaddingMode = AesPaddingMode.PKCS7
cipher = aes.EncryptBytes(plain)
Debug.Print UBound(cipher) + 1               ' 48
aes.PaddingMode = AesPaddingMode.ZeroPadding
cipher = aes.EncryptBytes(plain)
Debug.Print UBound(cipher) + 1               ' 48
aes.PaddingMode = AesPaddingMode.NoPadding
cipher = aes.EncryptBytes(plain)
Debug.Print UBound(cipher) + 1               ' 32
aes.PaddingMode = AesPaddingMode.ISO10126
cipher = aes.EncryptBytes(plain)
Debug.Print UBound(cipher) + 1               ' 32
```

<!-- test: PaddingTests.EncryptBytes_Pkcs7_PadsToTheNextWholeBlock, PaddingTests.EncryptBytes_ZeroPadding_PadsToTheNextWholeBlock, PaddingTests.EncryptBytes_NoPadding_KeepsTheLengthOfTheInput, PaddingTests.EncryptBytes_Pkcs7_RoundTripsEveryLengthFrom1To40, PaddingTests.DecryptBytes_Pkcs7_RejectsInvalidPadding, PaddingTests.DecryptBytes_Iso10126_RoundTrips, PaddingTests.DecryptBytes_ZeroPadding_TakesOffTheZeroBytesTheEncryptionAdded -->
With **NoPadding** in the modes **CFB**, **OFB**, **CTR** and **GCM**, the output has the length of the input. In the modes **ECB** and **CBC** it never does.

**ISO10126** gives the output of **NoPadding**, and no padding is added. With **ZeroPadding** the decryption removes every zero byte at the end of the data, and with the data `41 42 00 00` it returns the two bytes `41 42`.
<!-- /test -->

<!-- test: PaddingTests.DecryptBytes_ZeroPadding_KeepsTheTrailingZeroBytesOfTheData, PaddingTests.DecryptBytes_ZeroPadding_DataOfZeroBytesRoundTrips -->
> [!WARNING] 1.0.0.4
> With **ZeroPadding**, the class gives back less than it was given when the data ends in zero bytes. The decryption removes every zero byte at the end of the data, and not only the ones that the encryption added, and raises no error. Data that is all zero bytes fails the decryption. Use **PKCS7** for data that can end in zero bytes.

## Methods

### Cleanup
{: .no_toc }

Releases the Windows handles of the object.

Syntax: *object*.**Cleanup**

<!-- test: DefaultsAndConstantsTests.Cleanup_LeavesTheObjectUsable -->
The object holds a Crypto API provider and key and a CNG algorithm and key after an encrypt or a decrypt call. **Cleanup** closes and destroys them, and sets [**IsInitialized**](#isinitialized) to **False**. The class calls it when the object is destroyed, so a program needs it only to release the handles earlier. The next encrypt or decrypt call makes new ones, so the object stays usable.
<!-- /test -->

**Cleanup** does not clear the memory of [**Key**](#key), [**IV**](#iv), [**GcmTag**](#gcmtag) or [**GcmAAD**](#gcmaad), and does not empty them.

### DecryptBytes
{: .no_toc }

Decrypts a byte array.

Syntax: *object*.**DecryptBytes** ( *cipherBytes* ) **As Byte()**

*cipherBytes*
: *required* A **Byte** array of encrypted bytes, passed by reference. The method does not change it.

Returns a new array with the plaintext. The method decrypts with the current [**Key**](#key), [**IV**](#iv) and [**CipherMode**](#ciphermode), in the mode GCM with [**GcmTag**](#gcmtag) and [**GcmAAD**](#gcmaad), and then takes off the padding that [**PaddingMode**](#paddingmode) names.

The method raises **Unspecified error** in these cases: *cipherBytes* is empty; no key is set; Windows rejects the key, the IV or the ciphertext; the padding is not valid; the tag check of the GCM mode fails; or the plaintext, once the padding is off, has no bytes. For the Crypto API modes the ciphertext must be a multiple of 16 bytes. See [Failures](#failures). When the padding is not valid, [**LastError**](#lasterror) holds `PKCS7 unpadding exception: Unspecified error`.

### DecryptString
{: .no_toc }

Decrypts Base64 text that [**EncryptString**](#encryptstring) made.

Syntax: *object*.**DecryptString** ( *cipherText* ) **As String**

*cipherText*
: *required* A **String** of Base64 text.

Returns the plaintext as a **String**. The method decodes the Base64 text, calls [**DecryptBytes**](#decryptbytes), and reads the bytes as UTF-8. Bytes that are not valid UTF-8 become the character U+FFFD, with no error.

The method returns an empty string, and raises no error, when *cipherText* is empty or is not Base64 text, and whenever **DecryptBytes** fails. It prints a line `DecryptString error: ` and the description with `Debug.Print`, which the Debug Console of the IDE shows. Text that is not valid Base64 sets [**LastError**](#lasterror) to `Base64 decoding exception: Unspecified error`. Only the GCM mode verifies the data; [Data that is not checked](#data-that-is-not-checked) says what a wrong key gives in the others.

```tb check_build check_run
Dim aes As New cAes
Dim keyBytes() As Byte
Dim ivBytes() As Byte

keyBytes = StrConv("0123456789abcdef", vbFromUnicode)    ' 16 bytes
ivBytes = StrConv("fedcba9876543210", vbFromUnicode)
aes.CipherMode = AesCipherMode.CFB
aes.Key = keyBytes
aes.IV = ivBytes

Debug.Print aes.DecryptString(aes.EncryptString("Hello, AES!"))
Debug.Print Len(aes.DecryptString("!!! not base64"))
Debug.Print aes.LastError
' Output:
' Hello, AES!
' DecryptString error: Unspecified error
' 0
' Base64 decoding exception: Unspecified error
```

### EncryptBytes
{: .no_toc }

Encrypts a byte array.

Syntax: *object*.**EncryptBytes** ( *plainBytes* ) **As Byte()**

*plainBytes*
: *required* A **Byte** array of at least one element, passed by reference. The method does not change it.

Returns a new array with the ciphertext, whose first element has the index 0. The method pads the data as [**PaddingMode**](#paddingmode) says, and encrypts it with the current [**Key**](#key), [**IV**](#iv) and [**CipherMode**](#ciphermode). In the mode GCM it also sets [**GcmTag**](#gcmtag) and uses [**GcmAAD**](#gcmaad). The length of the result depends on the mode and the padding, as [Which mode runs](#which-mode-runs) and [**PaddingMode**](#paddingmode) say.

The method raises **Unspecified error** when *plainBytes* is empty, no key is set, or Windows rejects the key or the IV; see [Failures](#failures). Nothing in the error tells the program which of the causes it was.

### EncryptString
{: .no_toc }

Encrypts text and returns the ciphertext as Base64 text.

Syntax: *object*.**EncryptString** ( *plainText* ) **As String**

*plainText*
: *required* A **String** of at least one character.

Returns a **String**. The method converts *plainText* to UTF-8, calls [**EncryptBytes**](#encryptbytes), and encodes the result as Base64: the usual alphabet, `=` at the end when the last group is short, on one line. The text holds only the ciphertext. For the IV, and in GCM mode the tag, see the notes under [**IV**](#iv) and [**GcmTag**](#gcmtag).

The method returns an empty string, and raises no error, when *plainText* is empty and whenever **EncryptBytes** fails.

The sample uses the mode **CFB** with the key and the IV of the first block of NIST SP 800-38A. The last line uses the default mode **CBC**, whose key is the SHA-256 hash of the key bytes and whose output holds the two paddings.

```tb check_build check_run projname=aes-class
Dim aes As New cAes
Dim keyBytes() As Byte
Dim ivBytes() As Byte

keyBytes = FromHex("2b7e151628aed2a6abf7158809cf4f3c")
ivBytes = FromHex("000102030405060708090a0b0c0d0e0f")
aes.CipherMode = AesCipherMode.CFB
aes.Key = keyBytes
aes.IV = ivBytes

Debug.Print aes.EncryptString("Hello, AES!")      ' GL1oJTEdiyUmaKuRzd/eAw==
aes.PaddingMode = AesPaddingMode.NoPadding
Debug.Print aes.EncryptString("Hello, AES!")      ' GL1oJTEdiyUmaKs=

aes.CipherMode = AesCipherMode.CBC
aes.PaddingMode = AesPaddingMode.PKCS7
Debug.Print aes.EncryptString("Hello, AES!")      ' 34qvE3+1wgC5hBWfIIK7XJp3/i/lXuTw4TnWerb6fto=
```

### GenerateRandomIV
{: .no_toc }

Fills [**IV**](#iv) with 16 random bytes, and returns them.

Syntax: *object*.**GenerateRandomIV** ( ) **As Byte()**

<!-- test: KeyAndIVTests.GenerateRandomIV_Returns16BytesAndSetsTheIV -->
Returns a **Byte** array of 16 bytes, which is also the new value of **IV**. The method calls `Randomize`, which mixes the system timer into the state of `Rnd` for the whole program, and then takes 16 values of `Rnd`.
<!-- /test -->

<!-- test: KeyAndIVTests.GenerateRandomIV_TwoCallsFromTheSameRndStateGiveDifferentIVs -->
> [!WARNING] 1.0.0.4
> The bytes come from `Rnd`, a pseudo-random generator, and not from a cryptographic one; the comment in the source says that the Crypto API would give better randomness. The state of `Rnd` has 24 bits: its sequence repeats after 16,777,216 values, so the method can return at most 16,777,216 different IVs, and two calls that start from the same state of `Rnd` return the same IV. A program that needs an IV that cannot be predicted can set [**IV**](#iv) from a source of its own.

The first sample counts the calls of `Rnd` between a value and its next appearance. The second puts `Rnd` into the same state before each of two calls, with `Rnd -1` and `Randomize 7`, and finds two calls that return the same IV.

```tb check_build check_run projname=aes-class
Dim first As Single
Dim value As Single
Dim count As Long

Rnd -1
Randomize 7
first = Rnd
Do
    value = Rnd
    count = count + 1
Loop Until value = first Or count > 20000000
Debug.Print count                            ' 16777216
```

```tb check_build check_run projname=aes-class
Dim aes As New cAes
Dim firstIV() As Byte
Dim secondIV() As Byte
Dim attempt As Long
Dim found As Boolean

For attempt = 1 To 50
    Rnd -1
    Randomize 7
    firstIV = aes.GenerateRandomIV()
    Rnd -1
    Randomize 7
    secondIV = aes.GenerateRandomIV()
    If HexOf(firstIV) = HexOf(secondIV) Then
        found = True
        Exit For
    End If
Next
Debug.Print found                            ' True
```

For the modes **CFB**, **OFB**, **CTR** and **GCM**, an IV of 16 bytes is the length that CNG needs, and GCM cuts it to 12 bytes. The modes **ECB** and **CBC** do not use the IV.

```tb check_build check_run projname=aes-class
Dim aes As New cAes
Dim iv() As Byte
Dim stored() As Byte

iv = aes.GenerateRandomIV()
stored = aes.IV
Debug.Print UBound(iv) + 1                   ' 16
Debug.Print HexOf(iv) = HexOf(stored)        ' True
```

### SetGcmAADFromString
{: .no_toc }

Sets [**GcmAAD**](#gcmaad) from a string.

Syntax: *object*.**SetGcmAADFromString** ( *aadString* [, *encoding*] )

*aadString*
: *required* A **String**.

*encoding*
: *optional* A **Long**, a conversion argument of [**StrConv**](../../../Modules/Strings/StrConv). Default: **vbFromUnicode**, which gives the bytes of the string in the ANSI code page of the system; **vbUTF8** gives UTF-8.

The method does not raise an error. When the conversion fails, it prints `SetGcmAADFromString failed: ` and the description with `Debug.Print`, which a built program does not show, and leaves **GcmAAD** as it was. The program that decrypts has to convert the string in the same way, since the bytes with another encoding are other bytes. [**EncryptString**](#encryptstring) uses UTF-8 for its text, and this method does not.

<!-- test: GcmTests.SetGcmAADFromString_EmptyTextRemovesTheData, GcmTests.SetGcmAADFromString_SetsTheBytesOfTheText -->
> [!WARNING] 1.0.0.4
> An empty string does not remove the additional data. The method fails for an empty string and keeps the data that was set before, and only the Debug Console shows the message `SetGcmAADFromString failed: Unspecified error`. The next GCM encryption then authenticates the old data. To remove the data, assign an array that was never sized to [**GcmAAD**](#gcmaad).

```tb check_build check_run projname=aes-class
Dim aes As New cAes
Dim aad() As Byte

aes.SetGcmAADFromString "header"
aad = aes.GcmAAD
Debug.Print HexOf(aad)
aes.SetGcmAADFromString ""
aad = aes.GcmAAD
Debug.Print HexOf(aad)
' Output:
' 686561646572
' SetGcmAADFromString failed: Unspecified error
' 686561646572
```

### SetKeyFromString
{: .no_toc }

Sets [**Key**](#key) from a string.

Syntax: *object*.**SetKeyFromString** ( *keyString* [, *encoding*] )

*keyString*
: *required* A **String** of at least one character.

*encoding*
: *optional* A **Long**, a conversion argument of [**StrConv**](../../../Modules/Strings/StrConv). Default: **vbFromUnicode**, which gives the bytes of the string in the ANSI code page of the system; **vbUTF8** gives UTF-8.

The method converts *keyString* to bytes with **StrConv** and makes an array of the length that [**KeySize**](#keysize) names, 16, 24 or 32 bytes: the first bytes of the conversion when it is longer, and the bytes followed by zero bytes when it is shorter. The array is the new value of **Key**. The method does not use the string in any other way.

<!-- test: KeyAndIVTests.SetKeyFromString_DifferentTextsGiveDifferentKeys, KeyAndIVTests.SetKeyFromString_ShortTextIsNotExtendedWithZeroBytes, KeyAndIVTests.SetKeyFromString_TextLongerThanTheKeyIsCutAndShorterIsFollowedByZeros -->
> [!WARNING] 1.0.0.4
> There is no key derivation. The key is the bytes of the text, cut or extended with zero bytes: a string longer than the key is cut without a message, so that two strings that begin with the same 32 bytes give the same key (with **KeySize_256**), and a short string is a short key followed by zeros. The modes **ECB** and **CBC** then hash the bytes once with SHA-256, without a salt; the modes **CFB**, **OFB**, **CTR** and **GCM** use them as the key. With the default encoding, a character that is not in the ANSI code page of the system is converted to another character, and the same text gives different bytes on systems with another code page.

<!-- test: KeyAndIVTests.SetKeyFromString_KeyHasTheLengthOfKeySize, KeyAndIVTests.SetKeyFromString_Utf8EncodingGivesTheBytesOfUtf8, KeyAndIVTests.SetKeyFromString_EmptyTextRaisesAndKeepsTheKey -->
The method raises an error when *keyString* is empty: **Err.Number** is `vbObjectError + 2`, **Err.Source** is `cAes.SetKeyFromString` and **Err.Description** is `Key cannot be empty`. **Key** is not changed, and [**IsInitialized**](#isinitialized) is set to **False**. When **KeySize** has a value that is not a member of the enumeration, the key is left as it was and no error is raised.

```tb check_build check_run projname=aes-class
Dim aes As New cAes
Dim keyBytes() As Byte

aes.SetKeyFromString "abc"
keyBytes = aes.Key
Debug.Print HexOf(keyBytes)                  ' 6162630000000000000000000000000000000000000000000000000000000000

aes.SetKeyFromString "0123456789ABCDEF0123456789ABCDEF-extra"
keyBytes = aes.Key
Debug.Print HexOf(keyBytes)                  ' 3031323334353637383941424344454630313233343536373839414243444546

aes.KeySize = AesKeySize.KeySize_128
aes.SetKeyFromString "e" & ChrW(233), vbUTF8
keyBytes = aes.Key
Debug.Print HexOf(keyBytes)                  ' 65c3a900000000000000000000000000

On Error Resume Next
aes.SetKeyFromString ""
Debug.Print Err.Number - vbObjectError       ' 2
Debug.Print Err.Source                       ' cAes.SetKeyFromString
Debug.Print Err.Description                  ' Key cannot be empty
```
<!-- /test -->

## See Also

- [cAesHelper](cAesHelper) class -- the Base64, UTF-8 and padding functions that this class calls
- [mAesConstants](mAesConstants) module -- the enumerations of the modes, key sizes and padding modes
- [TBMANLIB_Aes](.) package -- the landing page
