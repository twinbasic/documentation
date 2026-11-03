/* The C runtime functions "stdlib" provides. */
#include <string.h>
#include <stdlib.h>

int crt_strings(char *buf, int size)
{
    memset(buf, 0, size);
    strcpy(buf, "abc");
    memcpy(buf + 3, "def", 4);
    return (int)strlen(buf);
}

int crt_malloc(int n)
{
    int *p = (int *)malloc(n * sizeof(int));
    int i, s = 0;
    if (!p) return -1;
    for (i = 0; i < n; i++) p[i] = i;
    for (i = 0; i < n; i++) s += p[i];
    free(p);
    return s;
}
