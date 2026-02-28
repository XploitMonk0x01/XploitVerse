/*
 * suid_helper.c — Intentionally vulnerable SUID binary.
 * When run, it executes a command passed as argv[1] as root.
 * Students discover it via: find / -perm -4000 2>/dev/null
 * Exploit: /usr/local/bin/suid_helper "/bin/sh"
 */
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage: %s <command>\n", argv[0]);
        printf("A helpful system utility.\n");
        return 1;
    }

    /* Intentionally vulnerable: runs command as the file owner (root) */
    setuid(0);
    setgid(0);
    system(argv[1]);
    return 0;
}
