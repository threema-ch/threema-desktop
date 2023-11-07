# Threema Desktop Launcher

The launcher binary has the responsibility of launching the actual Threema Desktop binary. When
Threema Desktop exits, depending on the exit codes, further actions can be taken.

## Exit Codes

| Code | Description                | Action                                                                  |
| ---- | -------------------------- | ----------------------------------------------------------------------- |
| 0    | Application closed by user | Quit with exit code 0                                                   |
| 7    | Uncaught error             | Quit with exit code 7                                                   |
| 8    | Simple restart             | Restart the binary with the same arguments                              |
| 9    | Delete profile and restart | Delete profile directory and restart the binary with the same arguments |
