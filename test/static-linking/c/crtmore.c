/* C runtime functions "stdlib" does not provide. */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

int crt_sprintf(char *buf, int v) { return sprintf(buf, "v=%d", v); }

static int cmp(const void *a, const void *b) { return *(const int *)a - *(const int *)b; }
int crt_qsort(int *v, int n) { qsort(v, n, sizeof(int), cmp); return v[0]; }

double crt_sin(double x) { return sin(x); }
double crt_floor(double x) { return floor(x); }

int crt_atoi(const char *s) { return atoi(s); }
