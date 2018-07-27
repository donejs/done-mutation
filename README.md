# done-mutation-serialize

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/donejs/done-mutation/blob/master/LICENSE)
[![npm version](https://badge.fury.io/js/done-mutation.svg)](https://www.npmjs.com/package/done-mutation)
[![Build Status](https://travis-ci.org/donejs/done-mutation.svg?branch=master)](https://travis-ci.org/donejs/done-mutation)

Serialize MutationRecords so they can be patched on other documents

## Usage

### ES6 use

With StealJS, you can import this module directly in a template that is autorendered:

```js
import plugin from 'done-mutation-serialize';
```

### CommonJS use

Use `require` to load `done-mutation-serialize` and everything else
needed to create a template that uses `done-mutation-serialize`:

```js
var plugin = require("done-mutation-serialize");
```

### Standalone use

Load the `global` version of the plugin:

```html
<script src='./node_modules/done-mutation-serialize/dist/global/done-mutation-serialize.js'></script>
```
