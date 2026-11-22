/*
 * A user-mode stand-in for the 32-bit hal.dll, for tbKMode's exe cases: the routines the x86
 * kernel's hal.dll exports and the package's 32-bit Declares name there (from tbKMode 0.3.0.8). Each
 * passes its call to the routine of the same name in the stand-in for ntoskrnl.exe (ntoskrnl.c),
 * which records it, so that the cases read one record whichever file the Declare names. It is
 * never a kernel and starts nothing. Built by ../prepare.mjs for x86 only: the x64 kernel exports
 * these itself.
 *
 * Its exports are named in hal.def, undecorated as the kernel's are. Each routine has the
 * convention of the x86 hal.dll's (wdm.h: FASTCALL for the fast mutexes and KfAcquireSpinLock, NTAPI for
 * KeReleaseSpinLock), and calls the stand-in's in the same one.
 */
#include <windows.h>

typedef void(__fastcall *Mutex)(void *);
typedef BOOLEAN(__fastcall *TryMutex)(void *);
typedef void(__stdcall *ReleaseSpinLock)(ULONG_PTR *, UCHAR);

/* The stand-in for ntoskrnl.exe, which the exe has loaded: it imports both. */
static FARPROC kernel(const char *name) { return GetProcAddress(GetModuleHandleW(L"ntoskrnl.exe"), name); }

void __fastcall ExAcquireFastMutex(void *mutex) { ((Mutex)kernel("ExAcquireFastMutex"))(mutex); }

void __fastcall ExReleaseFastMutex(void *mutex) { ((Mutex)kernel("ExReleaseFastMutex"))(mutex); }

BOOLEAN __fastcall ExTryToAcquireFastMutex(void *mutex) {
  return ((TryMutex)kernel("ExTryToAcquireFastMutex"))(mutex);
}

/* KfAcquireSpinLock jumps to the stand-in's routine of that name with the registers and the stack
   as the caller left them, so that it reads what the call passed, wherever the call put it. */
static FARPROC acquire;
static FARPROC __cdecl acquireTarget(void) {
  if (!acquire) acquire = kernel("KfAcquireSpinLock");
  return acquire;
}

__declspec(naked) void KfAcquireSpinLock(void) {
  __asm {
    push ecx
    push edx
    call acquireTarget
    pop edx
    pop ecx
    jmp eax
  }
}

void __stdcall KeReleaseSpinLock(ULONG_PTR *lock, UCHAR irql) {
  ((ReleaseSpinLock)kernel("KeReleaseSpinLock"))(lock, irql);
}

BOOL WINAPI DllMain(HINSTANCE h, DWORD reason, LPVOID reserved) { return TRUE; }
