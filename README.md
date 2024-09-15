# WebSocket Media Triggers

Used to play videos in a browser when certain events trigger them

> [!NOTE]
> No authorization is being done, and only one user is taken into account.
> It's probably not wise to run this on a public server for others to access.

## Preparations

1. Install [Git](https://git-scm.com/) and [Docker](https://www.docker.com/products/docker-desktop/)
2. Clone the repository

## Updating

- **Windows:** `docker/wscripts/update.bat`
- **Linux:** `docker/lscripts/update.sh`

## Starting in Development Environments

- **Windows:** `docker/wscripts/dev-start.bat`
- **Linux:** `docker/lscripts/dev-start.sh`

## Using it
- You can access the settings page at: http://localhost:3005
- You can access the WebSocket backend on port `3004`

- ⚡ Triggers the Media To Play
- 🛑 Triggers the Media To Stop
- 🔗 Will Put a Copy of The Widget Link Into Your Clipboard
- 🔧 Will Allow You To Change What Triggers The Media
