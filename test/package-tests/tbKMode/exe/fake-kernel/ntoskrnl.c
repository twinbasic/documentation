/*
 * A user-mode stand-in for ntoskrnl.exe, for tbKMode's exe cases: a DLL that tbrun copies into the
 * test exe's folder (../prepare.mjs), where the loader finds it before System32's, so that the
 * package's `Lib "ntoskrnl.exe"` Declares, which the exe imports, resolve to it. It is never a
 * kernel and starts nothing: the memory and string routines do in user mode what the kernel's do,
 * and the kernel's other routines only record their arguments, which the cases read back through
 * the FakeKernel_ functions. A routine the exe imports that it does not export stops the exe from
 * starting, so a new case that calls one adds it here and to ntoskrnl.def.
 *
 * Its exports are named in ntoskrnl.def, so that an x86 build exports them undecorated. Built by
 * ../prepare.mjs for each architecture. The routines are __stdcall (NTAPI) where the
 * kernel's are, __fastcall where the x86 kernel's are (wdm.h's FASTCALL), and __cdecl for the C
 * library's.
 */
#include <windows.h>
#include <wchar.h>
#include <wctype.h>

typedef struct {
  USHORT Length;
  USHORT MaximumLength;
  PWSTR Buffer;
} FAKE_UNICODE_STRING;

/* --- memory and strings, as the kernel's do them (windows.h makes RtlMoveMemory and RtlZeroMemory
   macros, so these two have fake_ names too) --- */

void __stdcall fake_RtlMoveMemory(void *dest, const void *src, SIZE_T length) {
  memmove(dest, src, length);
}

void __stdcall fake_RtlZeroMemory(void *dest, SIZE_T length) {
  memset(dest, 0, length);
}

void __stdcall RtlInitUnicodeString(FAKE_UNICODE_STRING *dest, PCWSTR src) {
  dest->Buffer = (PWSTR)src;
  if (src) {
    SIZE_T n = wcslen(src) * sizeof(WCHAR);
    dest->Length = (USHORT)n;
    dest->MaximumLength = (USHORT)(n + sizeof(WCHAR));
  } else {
    dest->Length = dest->MaximumLength = 0;
  }
}

/* Case-sensitive, as the kernel's: the difference of the first two characters that differ, else
   the difference of the lengths in bytes. (CaseInSensitive is not needed by the cases.) */
LONG __stdcall RtlCompareUnicodeString(const FAKE_UNICODE_STRING *s1, const FAKE_UNICODE_STRING *s2,
                                       BOOLEAN caseInSensitive) {
  USHORT n1 = s1->Length / sizeof(WCHAR), n2 = s2->Length / sizeof(WCHAR);
  for (USHORT i = 0; i < n1 && i < n2; i++)
    if (s1->Buffer[i] != s2->Buffer[i]) return (LONG)s1->Buffer[i] - (LONG)s2->Buffer[i];
  return (LONG)s1->Length - (LONG)s2->Length;
}

wchar_t *__cdecl fake_wcsstr(const wchar_t *s, const wchar_t *find) {
  return (wchar_t *)wcsstr(s, find);
}

wchar_t *__cdecl fake_wcslwr(wchar_t *s) {
  for (wchar_t *p = s; *p; p++) *p = towlower(*p);
  return s;
}

wchar_t *__cdecl fake_wcsupr(wchar_t *s) {
  for (wchar_t *p = s; *p; p++) *p = towupper(*p);
  return s;
}

wchar_t *__cdecl fake_wcsrev(wchar_t *s) {
  size_t n = wcslen(s);
  for (size_t i = 0; i < n / 2; i++) {
    wchar_t c = s[i];
    s[i] = s[n - 1 - i];
    s[n - 1 - i] = c;
  }
  return s;
}

/* --- kernel routines that only record what they were given --- */

static WCHAR hardErrorText[256], hardErrorTitle[256];
static LONG hardErrorStatus, hardErrorCount;
static ULONG hardErrorParams, hardErrorMask;
static LONG eventCount, eventType;
static void *eventAddress;
static void *spinLocks[16];
static LONG spinLockCount;

static void copyString(WCHAR *to, const FAKE_UNICODE_STRING *from) {
  to[0] = 0;
  if (!from || !from->Buffer) return;
  size_t n = from->Length / sizeof(WCHAR);
  if (n > 255) n = 255;
  memcpy(to, from->Buffer, n * sizeof(WCHAR));
  to[n] = 0;
}

/* Records the message box ExRaiseHardError would show: its first two parameters are the text and
   the title, each a UNICODE_STRING, as STATUS_SERVICE_NOTIFICATION takes them. Shows nothing. */
LONG __stdcall ExRaiseHardError(LONG status, ULONG count, ULONG mask, ULONG_PTR *params,
                                                      ULONG options, ULONG *response) {
  hardErrorCount++;
  hardErrorStatus = status;
  hardErrorParams = count;
  hardErrorMask = mask;
  copyString(hardErrorText, count > 0 ? (FAKE_UNICODE_STRING *)params[0] : NULL);
  copyString(hardErrorTitle, count > 1 ? (FAKE_UNICODE_STRING *)params[1] : NULL);
  if (response) *response = 6; /* ResponseOk */
  return 0;
}

void __stdcall KeInitializeEvent(void *event, LONG type, BOOLEAN state) {
  eventCount++;
  eventType = type;
  eventAddress = event;
  memset(event, 0, 3 * sizeof(void *));
}

LONG __stdcall KeInitializeSpinLock(ULONG_PTR *lock) {
  *lock = 0;
  return 0;
}

static void record(const char *name, ULONG_PTR a, ULONG_PTR b);

UCHAR __stdcall KeAcquireSpinLockRaiseToDpc(ULONG_PTR *lock) {
  record("KeAcquireSpinLockRaiseToDpc", (ULONG_PTR)lock, 0);
  if (spinLockCount < 16) spinLocks[spinLockCount++] = lock;
  *lock = 1;
  return 0;
}

/* The kernel's releases the lock and sets the IRQL to irql. A lock that KeAcquireSpinLockRaiseToDpc
   did not acquire (0, as KeInitializeSpinLock leaves it) is counted, with the IRQL it was given:
   the kernel would lower its caller's IRQL to that, PASSIVE_LEVEL for 0. */
static LONG unmatchedReleases;
static LONG unmatchedIrql = -1;

void __stdcall KeReleaseSpinLock(ULONG_PTR *lock, UCHAR irql) {
  if (!*lock) {
    unmatchedReleases++;
    unmatchedIrql = irql;
  }
  *lock = 0;
}

/* Whether the spin lock that ExInterlockedAddUlong or ExInterlockedAddLargeInteger was given was
   held when it was called: -1 when neither has been called since FakeKernel_ResetCall, 0 free,
   1 held. The kernel's routines acquire the lock, so a held one is waited for until it is
   released; these record it and never wait. */
static LONG lockHeldAtEntry = -1;

static void recordLock(const ULONG_PTR *lock) { lockHeldAtEntry = lock && *lock ? 1 : 0; }

/* --- the routines that the x86 kernel exports as __fastcall (wdm.h: FASTCALL): each records its
   name and its arguments, and returns a value the cases know. In an x64 build __fastcall is the
   one convention, so there they are what the x64 kernel's are. Until tbKMode 0.3.0.6 the x86
   build had naked stand-ins that popped what a Declare in the wrong convention pushed; from 0.3.0.6
   the package declares each of these as the kernel has it, so one C routine serves both builds,
   and a Declare that changes its convention again leaves the exe's stack off. --- */

static const char *lastCall = "";
static ULONG_PTR lastArgs[2];

static void record(const char *name, ULONG_PTR a, ULONG_PTR b) {
  lastCall = name;
  lastArgs[0] = a;
  lastArgs[1] = b;
}

/* KfAcquireSpinLock, the x86 hal.dll's __fastcall routine that the package's 32-bit KeAcquireSpinLock
   names (the stand-in for hal.dll jumps here). It reads the lock from ECX. The package declares it
   without FastCall (tbKMode 0.3.0.6), whose call pushes the lock: this records ECX, where the
   routine reads the lock, and the address pushed, and pops the 4 bytes pushed, so that the exe goes
   on. Once the package declares it FastCall, this must pop nothing (`ret 0`). The x64 kernel has no
   such routine; the x64 build exports one so that both builds share ntoskrnl.def. */
#ifdef _M_IX86
static void __stdcall record_std(const char *name, ULONG_PTR a, ULONG_PTR b) { record(name, a, b); }
static const char nm_KfAcquireSpinLock[] = "KfAcquireSpinLock";

__declspec(naked) void KfAcquireSpinLock(void) {
  __asm {
    push dword ptr [esp + 4]
    push ecx
    push offset nm_KfAcquireSpinLock
    call record_std
    xor eax, eax
    ret 4
  }
}
#else
UCHAR __fastcall KfAcquireSpinLock(ULONG_PTR *lock) {
  record("KfAcquireSpinLock", (ULONG_PTR)lock, 0);
  return 0;
}
#endif

/* Records the lock it was given, and Addend and Value, and adds as the kernel's does. */
ULONG __fastcall ExInterlockedAddUlong(ULONG *addend, ULONG value, ULONG_PTR *lock) {
  recordLock(lock);
  record("ExInterlockedAddUlong", (ULONG_PTR)addend, value);
  ULONG old = *addend;
  *addend = old + value;
  return old;
}

LONG __fastcall IofCallDriver(void *device, void *irp) {
  record("IofCallDriver", (ULONG_PTR)device, (ULONG_PTR)irp);
  return 0x1234;
}

LONG_PTR __fastcall ObfDereferenceObject(void *object) {
  record("ObfDereferenceObject", (ULONG_PTR)object, 0);
  return 0x1234;
}

void __fastcall ExReleaseResourceLite(void *resource) {
  record("ExReleaseResourceLite", (ULONG_PTR)resource, 0);
}

void __fastcall ExReleaseResourceAndLeaveCriticalRegion(void *resource) {
  record("ExReleaseResourceAndLeaveCriticalRegion", (ULONG_PTR)resource, 0);
}

void __fastcall ExAcquireFastMutex(void *mutex) { record("ExAcquireFastMutex", (ULONG_PTR)mutex, 0); }

void __fastcall ExReleaseFastMutex(void *mutex) { record("ExReleaseFastMutex", (ULONG_PTR)mutex, 0); }

BOOLEAN __fastcall ExTryToAcquireFastMutex(void *mutex) {
  record("ExTryToAcquireFastMutex", (ULONG_PTR)mutex, 0);
  return 1;
}

void *__fastcall fake_InterlockedPopEntrySList(void *head) {
  record("InterlockedPopEntrySList", (ULONG_PTR)head, 0);
  return (void *)0x1234;
}

void *__stdcall ExAllocatePool2(ULONG64 flags, SIZE_T size, ULONG tag) {
  record("ExAllocatePool2", size, tag);
  return NULL;
}

LONG __stdcall ObCloseHandle(void *handle, CHAR previousMode) {
  record("ObCloseHandle", (ULONG_PTR)handle, (ULONG_PTR)(UCHAR)previousMode);
  return 0;
}

/* The x86 kernel's export, which the package's 32-bit Declare names; the x64 kernel has none.
   It increments what it is given, as the kernel's does; a case passes the address of a Long. */
LONG __fastcall fake_InterlockedIncrement(LONG volatile *addend) {
  record("InterlockedIncrement", (ULONG_PTR)addend, 0);
  return ++*addend;
}


/* The x64 kernel's name for InterlockedPopEntrySList, which the package's 64-bit Declare uses. */
void *__fastcall ExpInterlockedPopEntrySList(void *head) {
  record("ExpInterlockedPopEntrySList", (ULONG_PTR)head, 0);
  return (void *)0x1234;
}

LONGLONG __stdcall ExInterlockedAddLargeInteger(LONGLONG *addend, LONGLONG value,
                                                                     ULONG_PTR *lock) {
  recordLock(lock);
  LONGLONG old = *addend;
  *addend = old + value;
  return old;
}

/* The remove-lock routines, __stdcall (NTAPI) in both builds as the kernel's are: each records its
   name, the Tag it receives and, for IoAcquireRemoveLockEx, the File it receives, read as the PCSTR
   the WDK declares, and the Line. */
static char removeLockFile[256];

LONG __stdcall IoAcquireRemoveLockEx(void *removeLock, void *tag, const char *file, ULONG line,
                                     ULONG size) {
  record("IoAcquireRemoveLockEx", (ULONG_PTR)tag, line);
  removeLockFile[0] = 0;
  if (file) {
    size_t n = 0;
    while (n < sizeof removeLockFile - 1 && file[n]) n++;
    memcpy(removeLockFile, file, n);
    removeLockFile[n] = 0;
  }
  return 0; /* STATUS_SUCCESS */
}

void __stdcall IoReleaseRemoveLockEx(void *removeLock, void *tag, ULONG size) {
  record("IoReleaseRemoveLockEx", (ULONG_PTR)tag, 0);
}

void __stdcall IoReleaseRemoveLockAndWaitEx(void *removeLock, void *tag, ULONG size) {
  record("IoReleaseRemoveLockAndWaitEx", (ULONG_PTR)tag, 0);
}

/* Records the call, and copies the string's descriptor: the cases read only that it was called
   here, in the stand-in for ntoskrnl.exe. */
LONG __stdcall RtlDuplicateUnicodeString(ULONG flags, const FAKE_UNICODE_STRING *in, FAKE_UNICODE_STRING *out) {
  record("RtlDuplicateUnicodeString", flags, 0);
  if (in && out) *out = *in;
  return 0; /* STATUS_SUCCESS */
}

/* The bitmap routines that write a run's first index through a PULONG: each writes 5 there and
   returns 3. An address that is not one (the package passes the index ByVal) is caught, as the
   kernel's routine would fault, so that the exe goes on. */
static void writeIndex(ULONG *startingIndex) {
  __try {
    *startingIndex = 5;
  } __except (EXCEPTION_EXECUTE_HANDLER) {
  }
}

ULONG __stdcall RtlFindFirstRunClear(void *bitmap, ULONG *startingIndex) {
  writeIndex(startingIndex);
  return 3;
}

ULONG __stdcall RtlFindLongestRunClear(void *bitmap, ULONG *startingIndex) {
  writeIndex(startingIndex);
  return 3;
}

/* Maps an MDL's pages, as the kernel's does for MmGetSystemAddressForMdlSafe when the MDL has no
   system address yet: here it records the call and maps nothing. */
void *__stdcall MmMapLockedPagesSpecifyCache(void *mdl, CHAR accessMode, LONG cacheType, void *requestedAddress,
                                             ULONG bugCheckOnFailure, ULONG priority) {
  record("MmMapLockedPagesSpecifyCache", (ULONG_PTR)mdl, (ULONG_PTR)(ULONG)priority);
  return NULL;
}

/* The kernel's exported object-type variables, each holding a POBJECT_TYPE: here an address the
   cases know, so that they can tell the variable from its value. */
ULONG_PTR PsProcessType = 0x50000001;
ULONG_PTR PsThreadType = 0x50000002;

/* Returns the address of an export of this DLL by name, as the kernel's returns its own. */
void *__stdcall MmGetSystemRoutineAddress(FAKE_UNICODE_STRING *name) {
  char ansi[128];
  int n = WideCharToMultiByte(CP_ACP, 0, name->Buffer, name->Length / sizeof(WCHAR), ansi, sizeof ansi - 1, NULL, NULL);
  ansi[n] = 0;
  HMODULE self = NULL;
  GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
                     (LPCWSTR)&MmGetSystemRoutineAddress, &self);
  return (void *)GetProcAddress(self, ansi);
}

/* --- what the cases read back --- */

/* 1 when this module is the stand-in: the cases check it before they call any helper. */
LONG __stdcall FakeKernel_IsFake(void) { return 1; }

LONG __stdcall FakeKernel_HardErrorCount(void) { return hardErrorCount; }
LONG __stdcall FakeKernel_HardErrorStatus(void) { return hardErrorStatus; }
const WCHAR *__stdcall FakeKernel_HardErrorText(void) { return hardErrorText; }
const WCHAR *__stdcall FakeKernel_HardErrorTitle(void) { return hardErrorTitle; }
LONG __stdcall FakeKernel_EventCount(void) { return eventCount; }
LONG __stdcall FakeKernel_EventType(void) { return eventType; }
void *__stdcall FakeKernel_EventAddress(void) { return eventAddress; }
LONG __stdcall FakeKernel_SpinLockCount(void) { return spinLockCount; }
void *__stdcall FakeKernel_SpinLock(LONG i) { return i >= 0 && i < 16 ? spinLocks[i] : NULL; }
const char *__stdcall FakeKernel_LastCall(void) { return lastCall; }
ULONG_PTR __stdcall FakeKernel_LastArg(LONG i) { return i >= 0 && i < 2 ? lastArgs[i] : 0; }
LONG __stdcall FakeKernel_LockHeldAtEntry(void) { return lockHeldAtEntry; }
const char *__stdcall FakeKernel_RemoveLockFile(void) { return removeLockFile; }
LONG __stdcall FakeKernel_UnmatchedReleases(void) { return unmatchedReleases; }
LONG __stdcall FakeKernel_UnmatchedIrql(void) { return unmatchedIrql; }
void __stdcall FakeKernel_ResetCall(void) {
  record("", 0, 0);
  lockHeldAtEntry = -1;
  removeLockFile[0] = 0;
  unmatchedReleases = 0;
  unmatchedIrql = -1;
}

BOOL WINAPI DllMain(HINSTANCE h, DWORD reason, LPVOID reserved) { return TRUE; }
