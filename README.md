# Metaship

A raycast plugin to quickly start any Metabase tag you want, and connect it to any database you want.

## Installation

- Check out the repo
- `npm install`
- `npm run dev` (you can close this after it st(arted)

## Usage

First you need to configure:
- A GitHub token for the plugin to pull MB tags
- An enterprise token to use for your Metabases

There are two commands:
- Metabases: shows running Metabases (docker) and all Github tags you can check out (they refresh once per day). You can:
  - Start an Enterprise Metabase, pointing to the selected database on the top-right
  - Start an OSS Metabase
  - On an active Metabase, add the selected DB to it
  - On an active Metabase, get a serialization export CURL to paste in Postman
  - On an active Metabase, create an API key and copy it

When you start a Metabase through this command, you need to wait until it pulls and starts the image for Raycast to autoconfigure your metabase (if you exit the command before it starts, it can't poll for the new instance because you "killed" the plugin). 

MB login will always be `test@gmail.com`, password `123123123`.

- Databases: allows you to quickly start a database. If you press enter on a running DB, it starts/opens CloudBeaver on your browser with the connection already pre-filled so you can start running SQL against it.