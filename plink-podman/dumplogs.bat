@echo off
plink -P 31022 127.0.0.1 -l arch -pw arch podman container logs ws-media-triggers_dev-back_1 ^| tee ~/wsmt-back-log.txt && ^
plink -P 31022 127.0.0.1 -l arch -pw arch podman container logs ws-media-triggers_dev-front_1 ^| tee ~/wsmt-front-log.txt && ^
pscp -l arch -pw arch -P 31022 127.0.0.1:/home/arch/wsmt-back-log.txt ./wsmt-back-log.txt && ^
pscp -l arch -pw arch -P 31022 127.0.0.1:/home/arch/wsmt-front-log.txt ./wsmt-front-log.txt
pause