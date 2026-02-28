#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/*
 * Vulnerable SUID binary for privilege escalation training.
 * When run with arguments, it executes system() as root.
 * Users must discover the SUID bit and exploit it.
 */
int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("StatusCheck v1.0 - System Health Monitor\n");
        printf("Usage: statuscheck <command>\n");
        printf("Available: uptime, disk, memory\n");
        return 0;
    }

    if (strcmp(argv[1], "uptime") == 0) {
        system("uptime");
    } else if (strcmp(argv[1], "disk") == 0) {
        system("df -h");
    } else if (strcmp(argv[1], "memory") == 0) {
        system("free -h");
    } else {
        /* VULNERABLE: passes arbitrary input to system() */
        char cmd[512];
        snprintf(cmd, sizeof(cmd), "echo Checking: %s", argv[1]);
        system(cmd);
    }
    return 0;
}
