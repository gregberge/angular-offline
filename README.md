# angular-offline
[![Build Status](https://travis-ci.org/neoziro/angular-offline.svg?branch=master)](https://travis-ci.org/neoziro/angular-offline)
[![Dependency Status](https://david-dm.org/neoziro/angular-offline.svg?theme=shields.io)](https://david-dm.org/neoziro/angular-offline)
[![devDependency Status](https://david-dm.org/neoziro/angular-offline/dev-status.svg?theme=shields.io)](https://david-dm.org/neoziro/angular-offline#info=devDependencies)

plugin-description

## Install

### Using npm

```
npm install angular-offline
```

### Using bower

```
bower install angular-offline
```

## Usage

```js
```

## Workflow

- Request GET
  -> interceptor.request
    -> has offline config
      -> define a custom cache
      -> is online
        -> clean cache
- Other requests
  -> interceptor.request
    -> has offline config and is offline
      -> push request in stack
      -> reject

- "online" event
  -> process stack


## License

MIT
