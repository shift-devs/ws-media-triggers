@echo off
plink -P 31022 127.0.0.1 -l arch -pwfile .pwfile -m cmdlists/update
pause