import * as fs from 'node:fs/promises';
import * as path from 'node:path';
/**
 * Simple Server by ZOODUCK.
 *
 * @example
 * // Start a server:
 * const server = new SimpleServer()
 * server.start()
 *
 * @example
 * // Start a server (with parameters):
 * const server = new SimpleServer({ port: 1234, protocol: 'https', staticPath: './app/' })
 * server.start()
 *
 * @example
 * // Add a route:
 * const server = new SimpleServer()
 * server.addRoute('/api/book', (request) => {
 *    if (request.method === 'GET') {
 *      const { searchParams } = new URL(request.url, 'http://example.com')
 *      const book = getBook(searchParams.get('book_id'))
 *      // Always return JSON...
 *      return JSON.stringify(book)
 *    }
 *    // ...or null (for bad requests)
 *    return null
 * })
 *
 * @example
 * // Make a bad request from the client (make a POST request for a route that only supports GET):
 * const response = await fetch('/api/book', { method: 'POST', body: 'This is a bad request' })
 * const result = await response.json()
 * console.log(result)
 * // { error: '400 Bad Request' }
 */
class SimpleServer {
  static #MIME_TYPES = {
    default: 'application/octet-stream',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    mjs: 'text/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon'
  };
  static #DEFAULT_PROTOCOL = 'http';
  static #VALID_PROTOCOL_REGEX = /^https?$/;
  #port;
  #protocol;
  #routes = new Map();
  #staticPath;
  /**
   * @constructor
   * @param {{port: number, protocol: 'http'|'https', staticPath: string}} [options]
   */
  constructor({ port = 8080, protocol = 'http', staticPath = './' } = {}) {
    this.#port = port;
    this.#protocol = this.constructor.#VALID_PROTOCOL_REGEX.test(protocol) ? protocol : this.constructor.#DEFAULT_PROTOCOL;
    this.#staticPath = staticPath;
  }
  /**
   * @static
   * @method
   * @param {Request} request
   * @returns {Promise<string>} body
   */
  static getBodyFromRequest(request) {
    return new Promise((resolve) => {
      let body = '';
      request.on('data', (data) => {
        body += data;
      });
      request.on('end', () => {
        resolve(body);
      });
    })
  };
  /**
   * @static
   * @method
   * @param {Request} request
   * @returns {URLSearchParams}
   */
  static getSearchParamsFromRequest(request) {
    return new URL(request.url, `http://${request.headers.host}`).searchParams;
  }
  /**
   * @method
   * @param {string} path
   * @param {Function} callback
   * @returns {void}
   */
  addRoute(path, callback) {
    this.#routes.set(this.#normalizePath(path), callback);
  }
  /**
   * @method
   * @returns {Promise<void>}
   */
  async start() {
    try {
      const filehandle = await fs.open(path.join(this.#staticPath, '404.html'), 'r');
      filehandle.close();
    } catch (error) {
      await fs.writeFile(path.join(this.#staticPath, '404.html'), `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>404 Not Found</title>
  </head>
  <body>404 Not Found</body>
</html>
      `.trim());
    }

    await new Promise((resolve) => {
      switch (this.#protocol) {
        case 'http':
          import('node:http').then((http) => {
            http.createServer(this.#requestListener.bind(this)).listen(this.#port);
            resolve();
          });
          break;
        case 'https':
          import('node:https').then((https) => {
            https.createServer(this.#requestListener.bind(this)).listen(this.#port);
            resolve();
          });
          break;
      }
    });

    console.log(`${this.#protocol} server running at 127.0.0.1: ${this.#port}...`);
  }
  /**
   * @private
   * @method
   * @param {Request} request
   * @returns {string} pathname
   */
  #getPathnameFromRequest = (request) => {
    return new URL(request.url, `http://${request.headers.host}`).pathname;
  };
  /**
   * @private
   * @method
   * @param {string} pathToNormalize
   * @returns {string} normalizedPath
   */
  #normalizePath(pathToNormalize) {
    return path.normalize(pathToNormalize).replace(/^[/\\]|[/\\]$/g, '');
  }
  /**
   * @private
   * @method
   * @param {Request} request
   * @param {Response} response
   * @returns {Promise<void>}
   */
  async #requestListener (request, response) {
    const url = this.#getPathnameFromRequest(request);
    // --------
    // API
    // --------
    const route = this.#routes.get(this.#normalizePath(url));
    if (route) {
      const result = await route(request);
      if (!result) {
        response.statusCode = '400';
        return response.end(JSON.stringify({
          error: '400 Bad Request'
        }));
      }
      return response.end(result);
    }
    // -------------
    // File Server
    // -------------
    const filePath = url.endsWith('/') ? path.join(this.#staticPath, url, 'index.html') : path.join(this.#staticPath, url);

    let fileExists;
    let filehandle;

    await new Promise(async (resolve) => {
      try {
        filehandle = await fs.open(filePath, 'r');
        fileExists = true;
      } catch (error) {
        console.warn(error);
      } finally {
        filehandle?.close();
        resolve();
      }
    });

    const statusCode = fileExists ? 200 : 404;
    const streamPath = fileExists ? filePath : path.join(this.#staticPath, '404.html');
    const fileExtension = path.extname(streamPath).substring(1).toLowerCase();
    const mimeType = this.constructor.#MIME_TYPES[fileExtension] || this.constructor.#MIME_TYPES.default;

    const fileHandle = await fs.open(streamPath);
    const stream = fileHandle.createReadStream({ autoClose: false });

    stream.addListener('end', () => {
      stream.close();
    });

    response.setHeader('Content-type', mimeType);
    response.statusCode = statusCode;

    stream.pipe(response);
  };
}

export { SimpleServer };
