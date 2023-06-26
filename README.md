# SimpleServer

Simple zero-dependency file server with routing.

## Installation

### For users with an access token

Add a `.npmrc` file to your project, with the following lines:

```text
@zooduck:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_ACCESS_TOKEN
```

Install from the command line:

```node
npm install @zooduck/simple-server@latest
```

Install via package.json:

```json
"@zooduck/simple-server": "latest"
```

### For users without an access token

Clone or [Download](https://github.com/zooduck/simple-server/archive/refs/heads/master.zip) the repository to your machine.

## Import

```javascript
import { SimpleServer } from 'path/to/@zooduck/simple-server/dist/index.module.js'
```

## Use

This module is primarily designed for development use, but also includes basic support for routing (see examples for more details).

## Examples

### Start a server

```javascript
const server = new SimpleServer()
server.start()
```

### Start a server (with parameters)

```javascript
const server = new SimpleServer({ port: 1234, protocol: 'https', staticPath: 'public' })
server.start()
```

### Add a route

```javascript
const server = new SimpleServer()
server.addRoute('book', (request) => {
   if (request.method === 'GET') {
     const { searchParams } = new URL(request.url, 'http://example.com')
     const book = getBook(searchParams.get('book_id'))
     // Always return JSON...
     return JSON.stringify(book)
   }
   // ...or null (for bad requests)
   return null
})
server.start()
```

Call the endpoint:

```javascript
// Routes always get prefixed with "api/".
const bookResponse = await fetch('api/book')
const bookResult = await bookResponse.json()
```

### Add a route using a file

You can also use files for routes.

The file must reside in a root level (staticPath) "api" folder (or subdirectory) and export a default function.

The function can be asynchronous or synchronous.

```javascript
// public/api/v2/book.js
export default async (request) => {
 // ...
 return JSON.stringify(book)
}
```

Call the endpoint:

```javascript
const bookResponse = await fetch('api/v2/book')
const bookResult = await bookResponse.json()
```

### Defining globals

If you need to share globals between file routes, use the defineGlobals() method.

Globals are passed as the second argument to your exported function.

```javascript
// server.js
const server = new SimpleServer()
let numberOfCallsToBookEndpoint = 0;
// ...
server.defineGlobals({ numberOfCallsToBookEndpoint: numberOfCallsToBookEndpoint })

// public/api/book.js
export default (request, globals) => {
 globals.numberOfCallsToBookEndpoint += 1;
 // ...
 return JSON.stringify({ book: book, totalRequests: globals.numberOfCallsToBookEndpoint })
}
```

### Make a bad request from the client (make a POST request for a route that only supports GET)

```javascript
const response = await fetch('api/book', { method: 'POST', body: 'This is a bad request' })
const result = await response.json()
console.log(result)
// { error: '400 Bad Request' }

```
