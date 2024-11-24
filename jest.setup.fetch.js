import fetch from 'node-fetch'

global.fetch = fetch
global.Request = fetch.Request
global.Response = fetch.Response 