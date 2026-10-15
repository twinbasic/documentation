---
title: TBMANLIB_Aes Package
parent: Experimental Packages
has_toc: false
exclude_from_docs:
  - mWin32CNG
  - mWin32CryptoAPI
  - mAesUsage
indexed_from: 1.0.0.4
permalink: /tB/Packages/Contributed/TBMANLIB_Aes/
---

# TBMANLIB_Aes Package
{: .no_toc }

**Author:** woeoio. **Version:** 1.0.0.4

The **TBMANLIB_Aes** contributed package encrypts and decrypts text and byte arrays with AES. Its class [**cAes**](cAes) has six cipher modes, named ECB, CBC, CFB, OFB, CTR and GCM, four padding modes, and keys of 128, 192 and 256 bits. The package calls two interfaces of Windows. The older Crypto API (`advapi32.dll`) does the modes named ECB and CBC, and Cryptography API: Next Generation, CNG (`bcrypt.dll`), does the other four. A second class, [**cAesHelper**](cAesHelper), holds the Base64, UTF-8 and padding functions that **cAes** uses, and the module [**mAesConstants**](mAesConstants) holds the enumerations and the constants. This section documents version 1.0.0.4, published on TWINSERV under the MIT licence. The package describes itself as "TBMAN: A crypto library contains AES (ECB/CBC/CFB/OFB/CTR/GCM)".

Add the package to the project as [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) describes. The classes are then created with `New`.

```tb check_build check_run
Dim aes As New cAes
Dim keyBytes() As Byte
Dim ivBytes() As Byte
Dim tag() As Byte
Dim cipherText As String

aes.CipherMode = AesCipherMode.GCM
keyBytes = StrConv("0123456789abcdef", vbFromUnicode)    ' 16 bytes: an AES-128 key
ivBytes = StrConv("unique nonce", vbFromUnicode)         ' 12 bytes: the GCM nonce
aes.Key = keyBytes
aes.IV = ivBytes

cipherText = aes.EncryptString("Hello, AES!")
tag = aes.GcmTag
Debug.Print cipherText                                   ' 0PfWIAMiX5mbxhPnfrGRLg==
Debug.Print UBound(tag) + 1                              ' 16
Debug.Print aes.DecryptString(cipherText)                ' Hello, AES!
```

The text that **EncryptString** returns is Base64 of the ciphertext alone. The program keeps the IV, and in GCM mode the tag, and sets them in the object that decrypts.

<!-- test: ModeTests.EncryptBytes_Ecb_EqualPlainBlocksGiveEqualCipherBlocks, ModeTests.EncryptBytes_Cbc_EqualPlainBlocksGiveDifferentCipherBlocks, ModeTests.EncryptBytes_Cbc_DefaultModeGivesDifferentCipherBlocksForEqualPlainBlocks, ModeTests.EncryptBytes_Cbc_IVChangesTheCiphertext, ModeTests.EncryptBytes_Ecb_IVDoesNotChangeTheCiphertext, ModeTests.EncryptBytes_Ofb_DiffersFromCfbAfterTheFirstBlock, ModeTests.EncryptBytes_Ctr_DiffersFromCfb, ModeTests.EncryptBytes_Ctr_DiffersFromOfb, ModeTests.EncryptBytes_Cfb_IVChangesTheCiphertext, ModeTests.EncryptBytes_Ecb_RoundTrips, ModeTests.EncryptBytes_Cbc_RoundTrips, ModeTests.EncryptBytes_Cfb_RoundTrips, ModeTests.EncryptBytes_Ofb_RoundTrips, ModeTests.EncryptBytes_Ctr_RoundTrips, ModeTests.EncryptBytes_Gcm_RoundTrips, StandardVectorTests.EncryptBytes_Cfb_Aes128_GivesTheVectorOfSp80038aF313, StandardVectorTests.EncryptBytes_Ofb_Aes128_GivesTheVectorOfSp80038aF41, StandardVectorTests.EncryptBytes_Ctr_Aes128_GivesTheVectorOfSp80038aF51 -->
> [!WARNING] 1.0.0.4
> The name of a cipher mode is not always the mode that runs: **ECB** runs CBC, **CBC** runs ECB, and **OFB** and **CTR** run CFB, whose feedback has 8 bits where the standard CFB has 128. Neither **ECB** nor **CBC** uses the IV, so the same key and plaintext always give the same ciphertext, and the default mode, **CBC**, gives equal ciphertext blocks for equal plaintext blocks. A test that decrypts what it has encrypted does not show this. [Known problems in version 1.0.0.4](#known-problems-in-version-1004) lists this and the other defects.

* TOC
{:toc}

## Which Windows function does what

| Mode | Interface | Functions |
|---|---|---|
| ECB, CBC | Crypto API | `CryptAcquireContext`, `CryptCreateHash`, `CryptHashData`, `CryptDeriveKey`, `CryptSetKeyParam`, `CryptEncrypt`, `CryptDecrypt` |
| CFB, OFB, CTR, GCM | CNG | `BCryptOpenAlgorithmProvider`, `BCryptSetProperty`, `BCryptGenerateSymmetricKey`, `BCryptEncrypt`, `BCryptDecrypt` |

The conversion of text to Base64 and back uses `CryptBinaryToStringW` and `CryptStringToBinaryW` of `crypt32.dll`, and the conversion to UTF-8 and back uses `WideCharToMultiByte` and `MultiByteToWideChar` of `kernel32.dll`. The four CNG modes need CNG, which Windows has had since Windows Vista; the sources name Vista as the oldest version.

## Known problems in version 1.0.0.4

- **The mode names.** **ECB** runs CBC with an IV of zero bytes, **CBC** runs ECB, **OFB** and **CTR** run CFB, and the CFB of the CNG modes has an 8-bit feedback. [Which mode runs](cAes#which-mode-runs) has the details and a sample for each.
- **The key of ECB and CBC.** These modes hash [**Key**](cAes#key) with SHA-256 and use the hash as the AES key, and Windows adds its padding to the output. Other AES software that is given the same key does not decrypt it, and the standard test vectors of NIST SP 800-38A for ECB and CBC do not come out. See [The Crypto API modes](cAes#the-crypto-api-modes) and [Reading the output with other software](cAes#reading-the-output-with-other-software).
- **Keys from text.** [**SetKeyFromString**](cAes#setkeyfromstring) cuts the text at the key length and extends a short text with zero bytes. There is no key derivation. See its warning.
- **The IV.** [**GenerateRandomIV**](cAes#generaterandomiv) takes its bytes from `Rnd`, whose state has 24 bits, so that it can return only 16,777,216 different IVs. The encrypted output never holds the IV.
- **GCM without an IV.** A GCM encryption with no IV set uses a random nonce that nothing keeps, and the data cannot be decrypted. See [GCM mode](cAes#gcm-mode).
- **Padding.** With **ZeroPadding** the decryption removes all trailing zero bytes of the data, and **ISO10126** is **NoPadding**. See [**AesPaddingMode**](mAesConstants#aespaddingmode) and [**PaddingMode**](cAes#paddingmode).
- **Data that is not checked.** Only GCM checks that the data is the data that was encrypted. A wrong key or a damaged ciphertext in another mode gives other bytes, or a failed decryption, and no sign of which. See [Data that is not checked](cAes#data-that-is-not-checked).
- **Failures have no reason.** **EncryptBytes** and **DecryptBytes** raise the error -2147467259, `Unspecified error`, whatever the cause, and **EncryptString** and **DecryptString** return an empty string. See [Failures](cAes#failures).
- **An empty additional string.** [**SetGcmAADFromString**](cAes#setgcmaadfromstring) with an empty string fails and keeps the data that was set before.

## Classes and modules

- [cAes](cAes) -- encrypts and decrypts strings and byte arrays with a key, an IV, a cipher mode and a padding mode
- [cAesHelper](cAesHelper) -- converts to and from Base64 and UTF-8, adds and removes padding, and tests an array for emptiness
- [mAesConstants](mAesConstants) -- the enumerations `AesCipherMode`, `AesKeySize` and `AesPaddingMode`, the sizes of keys and blocks, and the Windows constants

## Properties (cAes)

- [CipherMode](cAes#ciphermode) -- the cipher mode, **AesCipherMode**; the default is CBC
- [GcmAAD](cAes#gcmaad) -- the additional authenticated data of the GCM mode
- [GcmTag](cAes#gcmtag) -- the authentication tag that a GCM encryption makes and a GCM decryption checks
- [IsInitialized](cAes#isinitialized) -- whether the Windows key objects exist
- [IV](cAes#iv) -- the initialisation vector
- [Key](cAes#key) -- the key bytes
- [KeySize](cAes#keysize) -- the key length in bits, **AesKeySize**; the default is 256
- [LastError](cAes#lasterror) -- the text of the last failure of a Base64, UTF-8 or padding function
- [PaddingMode](cAes#paddingmode) -- the padding, **AesPaddingMode**; the default is PKCS7

## Methods (cAes)

- [Cleanup](cAes#cleanup) -- releases the Windows handles
- [DecryptBytes](cAes#decryptbytes) -- decrypts a byte array
- [DecryptString](cAes#decryptstring) -- decrypts Base64 text to a string
- [EncryptBytes](cAes#encryptbytes) -- encrypts a byte array
- [EncryptString](cAes#encryptstring) -- encrypts a string to Base64 text
- [GenerateRandomIV](cAes#generaterandomiv) -- fills the IV with 16 bytes from `Rnd`
- [SetGcmAADFromString](cAes#setgcmaadfromstring) -- sets the additional data from a string
- [SetKeyFromString](cAes#setkeyfromstring) -- sets the key from a string, cut or extended to the key length

## Methods (cAesHelper)

- [ApplyPKCS7Padding](cAesHelper#applypkcs7padding) -- adds PKCS #7 padding
- [ApplyZeroPadding](cAesHelper#applyzeropadding) -- adds zero bytes
- [Base64Decode](cAesHelper#base64decode) -- converts Base64 text to bytes
- [Base64Encode](cAesHelper#base64encode) -- converts bytes to Base64 text
- [IsArrayEmpty](cAesHelper#isarrayempty) -- tests whether a byte array has no elements
- [RemovePKCS7Padding](cAesHelper#removepkcs7padding) -- takes off PKCS #7 padding
- [RemoveZeroPadding](cAesHelper#removezeropadding) -- takes off trailing zero bytes
- [StringToUtf8Bytes](cAesHelper#stringtoutf8bytes) -- converts a string to UTF-8 bytes
- [Utf8BytesToString](cAesHelper#utf8bytestostring) -- converts UTF-8 bytes to a string

## Declaration modules

Two more public modules hold Windows declarations. They have no page of their own, since a program does not need them, but a project that references the package can call their members.

**mWin32CNG** declares the CNG functions of `bcrypt.dll` that **cAes** calls, and others: `BCryptOpenAlgorithmProvider`, `BCryptCloseAlgorithmProvider`, `BCryptGetProperty`, `BCryptSetProperty`, `BCryptGenerateSymmetricKey`, `BCryptImportKey`, `BCryptDestroyKey`, `BCryptEncrypt` and `BCryptDecrypt`. Their parameters are `LongPtr` and `Long`, as in the C declarations. The module also holds the names of the algorithm, the chaining modes and the properties as **String** constants (`BCRYPT_AES_ALGORITHM` is `AES`, and `BCRYPT_CHAIN_MODE_GCM` is `ChainingModeGCM`), the type `BCRYPT_AUTH_MODE_INFO` that GCM needs, and five status codes (`STATUS_SUCCESS` and four errors). Three procedures belong to it:

- **IsCNGAvailable** returns **True** when Windows opens the AES algorithm provider.
- **CNGErrorMessage** returns a message for a status code. For four of the status codes the message is a Chinese phrase followed by the English name in parentheses, and for any other code it is a short Chinese label and the code in hexadecimal.
- **InitGcmModeInfo** fills a `BCRYPT_AUTH_MODE_INFO` from the arrays of a nonce, additional data and a tag. **cAes** does not call it.

**mWin32CryptoAPI** holds the Crypto API functions that **cAes** needs, and the UTF-8 conversions. The declarations of `advapi32.dll` and `crypt32.dll` are `Private`; the module exposes each through a `Public` function with the prefix `AES_`, such as `AES_CryptDeriveKey` and `AES_CryptEncrypt`, that passes its arguments on. `AES_CopyMemory` and `AES_ZeroMemory` do the same for `RtlMoveMemory` and `RtlZeroMemory`. The constant `CP_UTF8` is 65001, and `WideStringToUtf8Bytes` and `Utf8BytesToWideString` are the functions that [**StringToUtf8Bytes**](cAesHelper#stringtoutf8bytes) and [**Utf8BytesToString**](cAesHelper#utf8bytestostring) call.

## The usage examples

The module **mAesUsage** holds ten `Public Sub` procedures that show the package, and `RunAllExamples`, which calls them in the order below with an empty line between. They print with [`Debug.Print`](../../../Modules/Debug), so the text appears in the Debug Console of the IDE and a built program writes nothing. All use the key `MySecretKey12345`, set with **SetKeyFromString**, except **Example_KeySizes**, which uses `TestKeyForEncryption1234567890`. **Example_CFB**, **Example_OFB**, **Example_CTR** and **Example_GCM** call **GenerateRandomIV**, so their Base64 text changes from run to run. The Base64 text of the others stays the same from run to run, since neither of the two Crypto API modes uses the IV; **Example_CBC_Basic** and **Example_ECB** use the same key and text, and their two Base64 texts begin with the same block.

| Procedure | Prints |
|---|---|
| **Example_CBC_Basic** | `=== Example 1: CBC Mode (CryptoAPI) ===`, the Base64 text of `Hello, AES Encryption!` after `Encrypted: `, and the decrypted text after `Decrypted: ` |
| **Example_ECB** | `=== Example 2: ECB Mode (CryptoAPI) ===` and the same two lines for the mode ECB, which has no IV set |
| **Example_CFB** | `=== Example 3: CFB Mode (CNG) ===` and the two lines for `Hello, AES CFB Mode!`; when CNG is not available, `CNG not available (requires Vista or later)` instead |
| **Example_OFB** | `=== Example 4: OFB Mode (CNG) ===` and the two lines for `Hello, AES OFB Mode!` |
| **Example_CTR** | `=== Example 5: CTR Mode (CNG) ===` and the two lines for `Hello, AES CTR Mode!` |
| **Example_GCM** | `=== Example 6: GCM Mode (CNG - Authenticated Encryption) ===`, the Base64 text, `Auth Tag: ` and 32 hexadecimal digits, and the decrypted text; the example sets the additional data `Additional authenticated data` |
| **Example_KeySizes** | `=== Example 7: Different Key Sizes ===` and the Base64 text of `Test message for AES-128`, `AES-192` and `AES-256`, one line each, after the label `AES-128: ` and so on |
| **Example_PaddingModes** | `=== Example 8: Different Padding Modes ===`, then `PKCS7: OK - Test message`, and the same line with `Zero`, `None` and `ISO10126` in place of `PKCS7` |
| **Example_BinaryData** | `=== Example 9: Binary Data Encryption ===`, `Encrypted bytes: 48`, `Decrypted bytes: 16` and `Data matches: True` for 16 bytes of data |
| **Example_API_Info** | `=== Example 10: API Backend Information ===`, `CNG Available: ` and **True** or **False**, `Mode -> API Backend:`, and six lines that name ECB and CBC as the Crypto API and the other four modes as CNG |

**Example_PaddingModes** prints `OK` for all four padding modes, since **ISO10126** works as **NoPadding**. **Example_API_Info** prints the assignment of interfaces in the table [above](#which-windows-function-does-what), and it does not say which mode runs; see [Which mode runs](cAes#which-mode-runs).

## See Also

- [cAes](cAes) class -- the AES encryption class
- [cAesHelper](cAesHelper) class -- the Base64, UTF-8 and padding functions
- [mAesConstants](mAesConstants) module -- the enumerations and constants
- [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) -- adding a published package to a project

## Test cases

The notes and warnings of this section are checked by the test cases in [TBMANLIB_Aes-tests.twinproj](TBMANLIB_Aes-tests.twinproj), a twinBASIC project. It uses TBMANLIB_Aes as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
