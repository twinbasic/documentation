---
title: cAesHelper
parent: TBMANLIB_Aes Package
permalink: /tB/Packages/Contributed/TBMANLIB_Aes/cAesHelper
has_toc: false
---

# cAesHelper class
{: .no_toc }

Converts byte arrays to Base64 text and back, converts text to UTF-8 bytes and back, adds and takes off PKCS #7 and zero padding, and tests a byte array for emptiness. [**cAes**](cAes) holds one of these objects and calls it for all of this work.

A program can create its own **cAesHelper** with `New`, for example to test the result of a call of **cAes** with [**IsArrayEmpty**](#isarrayempty), or to encode the ciphertext in a way of its own choice. The object holds no key and no state apart from [**LastError**](#lasterror).

```tb check_build check_run
Dim helper As New cAesHelper
Dim data() As Byte
Dim text As String

data = StrConv("Man", vbFromUnicode)
text = helper.Base64Encode(data)
Debug.Print text                              ' TWFu

data = helper.Base64Decode(text)
Debug.Print StrConv(data, vbUnicode)          ' Man
```

* TOC
{:toc}

In the syntax lines of this page, *object* is a **cAesHelper**.

## Failures

A member that fails does not tell why, and what the caller gets depends on the type of the result.

- **ApplyPKCS7Padding**, **Base64Decode**, **RemovePKCS7Padding**, **RemoveZeroPadding** and **StringToUtf8Bytes**, members that return a **Byte** array, raise the run-time error -2147467259 (`&H80004005`) with the description `Unspecified error` and an empty `Err.Source`. They raise it for an empty input as well as for bad input. The cause of the failure is lost, because the code assigns **Nothing** to the result, and that assignment raises this error in place of the one it was handling. What remains of the cause is the text in [**LastError**](#lasterror). **ApplyZeroPadding**, which also returns a **Byte** array, gives a block of zero bytes for an empty input and raises the error only when the code itself fails.
- **Base64Encode** and **Utf8BytesToString**, the members that return a **String**, return an empty string and raise no error. They leave the error in `Err`, which is not cleared: after an array that was never sized, `Err.Number` is 9.
- **IsArrayEmpty** raises no error, and leaves `Err.Number` at 9 when it tests an array that was never sized.

> [!NOTE]
> The members that raise **Unspecified error** do so for the failures that [**cAes**](cAes) cannot recover from as well. A program that calls one of them with an input that can be empty or damaged needs an `On Error` statement, and cannot tell the causes apart by the error.

Every member that reads an array reads its first element as the element with index 0. An array with another lower bound fails: **Base64Encode** returns an empty string with the [**LastError**](#lasterror) text `Base64 encoding exception: Subscript out of range`, and **ApplyPKCS7Padding** raises **Unspecified error**, after it has set the text `PKCS7 padding exception: Subscript out of range`.

## Properties

### LastError
{: .no_toc }

The text of the last failure that a member of this object recorded, or an empty string when none did. **String**, read-only.

Syntax: *object*.**LastError**

The text stays after later calls succeed, and the object has no way to clear it; a new **cAesHelper** starts with an empty string. A **cAes** has a **cAesHelper** of its own, and its [**LastError**](cAes#lasterror) property returns the text of that object.

A member that fails by an error ends with the text `<name> exception: ` and the description of the error. For the members that raise **Unspecified error**, the description is `Unspecified error`, and this text replaces any more specific text that the member had set before it assigned **Nothing**. These are the texts that remain:

| Member | Text after a failure |
|---|---|
| [**Base64Decode**](#base64decode) | `Base64 decoding exception: Unspecified error` |
| [**Base64Encode**](#base64encode) | `Base64 encoding exception: ` and the description, such as `Subscript out of range` |
| [**StringToUtf8Bytes**](#stringtoutf8bytes) | `String conversion exception: Unspecified error` |
| [**Utf8BytesToString**](#utf8bytestostring) | `Byte conversion exception: ` and the description, such as `Subscript out of range` |
| [**ApplyPKCS7Padding**](#applypkcs7padding) | `PKCS7 padding exception: Unspecified error` |
| [**RemovePKCS7Padding**](#removepkcs7padding) | `PKCS7 unpadding exception: Unspecified error` |
| [**RemoveZeroPadding**](#removezeropadding) | `Zero unpadding exception: Unspecified error` |
| [**ApplyZeroPadding**](#applyzeropadding), [**IsArrayEmpty**](#isarrayempty) | none |

The source of the class has more specific texts, such as `Invalid PKCS7 padding length: 102`, `Padding length exceeds data length` and `PKCS7 padding validation failed` for the padding, and `Failed to get Base64 decoding length` for Base64 text. They are set just before the member assigns **Nothing**, so the text above replaces them and a program does not see them.

```tb check_build check_run
Dim helper As New cAesHelper
Dim data() As Byte
Dim result() As Byte

data = StrConv("0123456789abcdef", vbFromUnicode)    ' the last byte is 102
On Error Resume Next
result = helper.RemovePKCS7Padding(data)
Debug.Print Err.Number                               ' -2147467259
Debug.Print Err.Description                          ' Unspecified error
Debug.Print helper.IsArrayEmpty(result)              ' True
Debug.Print helper.LastError                         ' PKCS7 unpadding exception: Unspecified error
```

## Methods

### ApplyPKCS7Padding
{: .no_toc }

Returns a copy of a byte array with PKCS #7 padding added.

Syntax: *object*.**ApplyPKCS7Padding** ( *data*, *blockSize* ) **As Byte()**

*data*
: *required* A **Byte** array, passed by reference. The function does not change it.

*blockSize*
: *required* A **Long**, the block size in bytes. [**cAes**](cAes) passes 16. The padding bytes hold their own count, so the value must be at most 255.

The function adds from 1 to *blockSize* bytes, to make the length a multiple of *blockSize*. Each added byte holds the number of bytes added. Data whose length is already a multiple of *blockSize* gets a whole block, *blockSize* bytes holding the value *blockSize*. The result is a new array with index 0 as its first element.

An array that was never sized raises **Unspecified error**, as [Failures](#failures) describes.

```tb check_build check_run
Dim helper As New cAesHelper
Dim data() As Byte
Dim padded() As Byte

data = StrConv("Hello", vbFromUnicode)
padded = helper.ApplyPKCS7Padding(data, 16)
Debug.Print UBound(padded) + 1               ' 16
Debug.Print Hex$(padded(5))                  ' B
Debug.Print Hex$(padded(15))                 ' B

data = StrConv("0123456789abcdef", vbFromUnicode)
padded = helper.ApplyPKCS7Padding(data, 16)
Debug.Print UBound(padded) + 1               ' 32
Debug.Print Hex$(padded(16))                 ' 10
```

### ApplyZeroPadding
{: .no_toc }

Returns a copy of a byte array with zero bytes added.

Syntax: *object*.**ApplyZeroPadding** ( *data*, *blockSize* ) **As Byte()**

*data*
: *required* A **Byte** array, passed by reference. The function does not change it.

*blockSize*
: *required* A **Long**, the block size in bytes. [**cAes**](cAes) passes 16.

The function adds from 1 to *blockSize* zero bytes, to make the length a multiple of *blockSize*. Data whose length is already a multiple of *blockSize* gets a whole block of zero bytes. An array that was never sized gives one block of *blockSize* zero bytes, and no error.

```tb check_build check_run
Dim helper As New cAesHelper
Dim data() As Byte
Dim padded() As Byte

data = StrConv("Hello", vbFromUnicode)
padded = helper.ApplyZeroPadding(data, 16)
Debug.Print UBound(padded) + 1               ' 16

data = StrConv("0123456789abcdef", vbFromUnicode)
padded = helper.ApplyZeroPadding(data, 16)
Debug.Print UBound(padded) + 1               ' 32
```

### Base64Decode
{: .no_toc }

Converts Base64 text to the bytes it stands for.

Syntax: *object*.**Base64Decode** ( *base64* ) **As Byte()**

*base64*
: *required* A **String** of Base64 text.

The function calls the Windows function `CryptStringToBinaryW` with the format `CRYPT_STRING_BASE64`, Base64 without a header. Line breaks and spaces in the text are skipped. The result is a new array with index 0 as its first element.

An empty string and text that Windows cannot decode both raise **Unspecified error**, and [**LastError**](#lasterror) holds `Base64 decoding exception: Unspecified error`.

### Base64Encode
{: .no_toc }

Converts bytes to Base64 text.

Syntax: *object*.**Base64Encode** ( *data* ) **As String**

*data*
: *required* A **Byte** array, passed by reference.

The function calls the Windows function `CryptBinaryToStringW` with the format `CRYPT_STRING_BASE64` and the flag `CRYPT_STRING_NOCRLF`. The result is Base64 text of the usual alphabet (`A`-`Z`, `a`-`z`, `0`-`9`, `+` and `/`) with `=` at the end when the last group is short, on one line, with no header and no line break. An array that was never sized gives an empty string, with no text in [**LastError**](#lasterror).

```tb check_build check_run
Dim helper As New cAesHelper
Dim data() As Byte

data = StrConv("Ma", vbFromUnicode)
Debug.Print helper.Base64Encode(data)        ' TWE=
```

### IsArrayEmpty
{: .no_toc }

Tests whether a **Byte** array has no elements.

Syntax: *object*.**IsArrayEmpty** ( *arr* ) **As Boolean**

*arr*
: *required* A **Byte** array variable, passed by reference.

Returns **True** when the array has no elements, because its upper bound is lower than its lower bound or because it was never given a size. Returns **False** otherwise. The function does not raise an error and does not use [**LastError**](#lasterror). It leaves `Err.Number` at 9 when the array was never sized, because it tests the array with `UBound` under `On Error Resume Next` and does not clear the error.

A program uses it to test the arrays that [**cAes**](cAes) keeps in its properties, such as [**Key**](cAes#key) and [**GcmTag**](cAes#gcmtag), when they may not be set.

```tb check_build check_run
Dim helper As New cAesHelper
Dim unsized() As Byte
Dim data(3) As Byte

Debug.Print helper.IsArrayEmpty(unsized)     ' True
Debug.Print Err.Number                       ' 9
Debug.Print helper.IsArrayEmpty(data)        ' False
```

### RemovePKCS7Padding
{: .no_toc }

Returns a copy of a byte array without its PKCS #7 padding.

Syntax: *object*.**RemovePKCS7Padding** ( *data* ) **As Byte()**

*data*
: *required* A **Byte** array, passed by reference. The function does not change it.

The function reads the last byte as the count of padding bytes. It checks that the count is from 1 to 16, that it is not greater than the length of the array, and that the last *count* bytes are all equal to it. The largest count is the constant **BLOCK_SIZE_128**, whatever block size the data was padded with; the function does not check that the length of the array is a multiple of 16.

When a check fails, and when the padding is the whole array, the function raises **Unspecified error**, and [**LastError**](#lasterror) holds `PKCS7 unpadding exception: Unspecified error`. The check cannot tell padded data from other data that happens to end in valid padding bytes, so it does not prove that the data is intact.

### RemoveZeroPadding
{: .no_toc }

Returns a copy of a byte array without its trailing zero bytes.

Syntax: *object*.**RemoveZeroPadding** ( *data* ) **As Byte()**

*data*
: *required* A **Byte** array, passed by reference. The function does not change it.

The function finds the last byte that is not zero and returns the array up to and including that byte. It does not know how many bytes were added, so it also removes zero bytes that belong to the data. An array that holds only zero bytes raises **Unspecified error**, and [**LastError**](#lasterror) holds `Zero unpadding exception: Unspecified error`.

```tb check_build check_run
Dim helper As New cAesHelper
Dim data(3) As Byte
Dim padded() As Byte
Dim result() As Byte

data(0) = 1
data(1) = 2                                  ' data(2) and data(3) are zero
padded = helper.ApplyZeroPadding(data, 16)
result = helper.RemoveZeroPadding(padded)
Debug.Print UBound(padded) + 1               ' 16
Debug.Print UBound(result) + 1               ' 2
```

### StringToUtf8Bytes
{: .no_toc }

Converts a string to the bytes of its UTF-8 encoding.

Syntax: *object*.**StringToUtf8Bytes** ( *text* ) **As Byte()**

*text*
: *required* A **String**.

The function calls the Windows function `WideCharToMultiByte` with the UTF-8 code page. The result is a new array with index 0 as its first element, without a byte order mark and without a terminating zero byte. An empty string raises **Unspecified error**, and [**LastError**](#lasterror) holds `String conversion exception: Unspecified error`.

[**EncryptString**](cAes#encryptstring) encodes its text with this function.

```tb check_build check_run
Dim helper As New cAesHelper
Dim data() As Byte

data = helper.StringToUtf8Bytes("caf" & ChrW(233))   ' cafe with an acute accent
Debug.Print UBound(data) + 1                         ' 5
Debug.Print Hex$(data(3))                            ' C3
Debug.Print Hex$(data(4))                            ' A9
```

### Utf8BytesToString
{: .no_toc }

Converts UTF-8 bytes to a string.

Syntax: *object*.**Utf8BytesToString** ( *bytes* ) **As String**

*bytes*
: *required* A **Byte** array, passed by reference.

The function calls the Windows function `MultiByteToWideChar` with the UTF-8 code page. A byte sequence that is not valid UTF-8 becomes the character U+FFFD. An array with no elements gives an empty string. An array that was never sized also gives an empty string, with `Err.Number` left at 9 and the [**LastError**](#lasterror) text `Byte conversion exception: Subscript out of range`.

[**DecryptString**](cAes#decryptstring) decodes its result with this function.

```tb check_build check_run
Dim helper As New cAesHelper
Dim data(1) As Byte
Dim text As String

data(0) = &HC3
data(1) = &HA9
text = helper.Utf8BytesToString(data)
Debug.Print Len(text)                        ' 1
Debug.Print AscW(text)                       ' 233

Dim bad(0) As Byte
bad(0) = &HFF                                ' not valid UTF-8
text = helper.Utf8BytesToString(bad)
Debug.Print Len(text)                        ' 1
Debug.Print Hex$(AscW(text) And &HFFFF&)     ' FFFD
```

## See Also

- [cAes](cAes) class -- encrypts and decrypts, and uses this class for the conversions and the padding
- [mAesConstants](mAesConstants) module -- the padding modes and the block size
- [TBMANLIB_Aes](.) package -- the landing page
