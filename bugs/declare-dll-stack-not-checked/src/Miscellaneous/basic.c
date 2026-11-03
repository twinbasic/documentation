/* plain C: nothing from a runtime, static data, a string literal, a stdcall function */
int add(int a, int b) { return a + b; }

static int counter = 100;
int next_count(void) { return ++counter; }

const char *greeting(void) { return "hello from C"; }

int __stdcall add_std(int a, short b) { return a + b; }

/* a callback: calls a function pointer passed in from twinBASIC */
typedef int (__stdcall *binop)(int, int);
int apply(binop f, int a, int b) { return f(a, b); }
