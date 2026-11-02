/* structured exception handling */
int seh_div(int a, int b)
{
    int r = -1;
    __try { r = a / b; }
    __except (1) { r = -2; }
    return r;
}
