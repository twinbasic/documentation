// C++ new and delete, from the C++ runtime.
extern "C" int cpp_new(int n)
{
    int *p = new int[n];
    int s = 0;
    for (int i = 0; i < n; i++) p[i] = i;
    for (int i = 0; i < n; i++) s += p[i];
    delete[] p;
    return s;
}
