var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[Object.keys(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};

// node_modules/@sveltejs/kit/dist/install-fetch.js
function dataUriToBuffer(uri) {
  if (!/^data:/i.test(uri)) {
    throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  }
  uri = uri.replace(/\r?\n/g, "");
  const firstComma = uri.indexOf(",");
  if (firstComma === -1 || firstComma <= 4) {
    throw new TypeError("malformed data: URI");
  }
  const meta = uri.substring(5, firstComma).split(";");
  let charset = "";
  let base64 = false;
  const type = meta[0] || "text/plain";
  let typeFull = type;
  for (let i = 1; i < meta.length; i++) {
    if (meta[i] === "base64") {
      base64 = true;
    } else {
      typeFull += `;${meta[i]}`;
      if (meta[i].indexOf("charset=") === 0) {
        charset = meta[i].substring(8);
      }
    }
  }
  if (!meta[0] && !charset.length) {
    typeFull += ";charset=US-ASCII";
    charset = "US-ASCII";
  }
  const encoding = base64 ? "base64" : "ascii";
  const data = unescape(uri.substring(firstComma + 1));
  const buffer = Buffer.from(data, encoding);
  buffer.type = type;
  buffer.typeFull = typeFull;
  buffer.charset = charset;
  return buffer;
}
async function* toIterator(parts, clone2 = true) {
  for (let part of parts) {
    if ("stream" in part) {
      yield* part.stream();
    } else if (ArrayBuffer.isView(part)) {
      if (clone2) {
        let position = part.byteOffset;
        let end = part.byteOffset + part.byteLength;
        while (position !== end) {
          const size = Math.min(end - position, POOL_SIZE);
          const chunk = part.buffer.slice(position, position + size);
          position += chunk.byteLength;
          yield new Uint8Array(chunk);
        }
      } else {
        yield part;
      }
    } else {
      let position = 0;
      while (position !== part.size) {
        const chunk = part.slice(position, Math.min(part.size, position + POOL_SIZE));
        const buffer = await chunk.arrayBuffer();
        position += buffer.byteLength;
        yield new Uint8Array(buffer);
      }
    }
  }
}
function isFormData(object) {
  return typeof object === "object" && typeof object.append === "function" && typeof object.set === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.delete === "function" && typeof object.keys === "function" && typeof object.values === "function" && typeof object.entries === "function" && typeof object.constructor === "function" && object[NAME] === "FormData";
}
function getHeader(boundary, name, field) {
  let header = "";
  header += `${dashes}${boundary}${carriage}`;
  header += `Content-Disposition: form-data; name="${name}"`;
  if (isBlob(field)) {
    header += `; filename="${field.name}"${carriage}`;
    header += `Content-Type: ${field.type || "application/octet-stream"}`;
  }
  return `${header}${carriage.repeat(2)}`;
}
async function* formDataIterator(form, boundary) {
  for (const [name, value] of form) {
    yield getHeader(boundary, name, value);
    if (isBlob(value)) {
      yield* value.stream();
    } else {
      yield value;
    }
    yield carriage;
  }
  yield getFooter(boundary);
}
function getFormDataLength(form, boundary) {
  let length = 0;
  for (const [name, value] of form) {
    length += Buffer.byteLength(getHeader(boundary, name, value));
    length += isBlob(value) ? value.size : Buffer.byteLength(String(value));
    length += carriageLength;
  }
  length += Buffer.byteLength(getFooter(boundary));
  return length;
}
async function consumeBody(data) {
  if (data[INTERNALS$2].disturbed) {
    throw new TypeError(`body used already for: ${data.url}`);
  }
  data[INTERNALS$2].disturbed = true;
  if (data[INTERNALS$2].error) {
    throw data[INTERNALS$2].error;
  }
  let { body } = data;
  if (body === null) {
    return Buffer.alloc(0);
  }
  if (isBlob(body)) {
    body = import_stream.default.Readable.from(body.stream());
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (!(body instanceof import_stream.default)) {
    return Buffer.alloc(0);
  }
  const accum = [];
  let accumBytes = 0;
  try {
    for await (const chunk of body) {
      if (data.size > 0 && accumBytes + chunk.length > data.size) {
        const error2 = new FetchError(`content size at ${data.url} over limit: ${data.size}`, "max-size");
        body.destroy(error2);
        throw error2;
      }
      accumBytes += chunk.length;
      accum.push(chunk);
    }
  } catch (error2) {
    const error_ = error2 instanceof FetchBaseError ? error2 : new FetchError(`Invalid response body while trying to fetch ${data.url}: ${error2.message}`, "system", error2);
    throw error_;
  }
  if (body.readableEnded === true || body._readableState.ended === true) {
    try {
      if (accum.every((c) => typeof c === "string")) {
        return Buffer.from(accum.join(""));
      }
      return Buffer.concat(accum, accumBytes);
    } catch (error2) {
      throw new FetchError(`Could not create Buffer from response body for ${data.url}: ${error2.message}`, "system", error2);
    }
  } else {
    throw new FetchError(`Premature close of server response while trying to fetch ${data.url}`);
  }
}
function fromRawHeaders(headers = []) {
  return new Headers(headers.reduce((result, value, index2, array) => {
    if (index2 % 2 === 0) {
      result.push(array.slice(index2, index2 + 2));
    }
    return result;
  }, []).filter(([name, value]) => {
    try {
      validateHeaderName(name);
      validateHeaderValue(name, String(value));
      return true;
    } catch {
      return false;
    }
  }));
}
async function fetch(url, options_) {
  return new Promise((resolve2, reject) => {
    const request = new Request(url, options_);
    const options2 = getNodeRequestOptions(request);
    if (!supportedSchemas.has(options2.protocol)) {
      throw new TypeError(`node-fetch cannot load ${url}. URL scheme "${options2.protocol.replace(/:$/, "")}" is not supported.`);
    }
    if (options2.protocol === "data:") {
      const data = dataUriToBuffer$1(request.url);
      const response2 = new Response(data, { headers: { "Content-Type": data.typeFull } });
      resolve2(response2);
      return;
    }
    const send = (options2.protocol === "https:" ? import_https.default : import_http.default).request;
    const { signal } = request;
    let response = null;
    const abort = () => {
      const error2 = new AbortError("The operation was aborted.");
      reject(error2);
      if (request.body && request.body instanceof import_stream.default.Readable) {
        request.body.destroy(error2);
      }
      if (!response || !response.body) {
        return;
      }
      response.body.emit("error", error2);
    };
    if (signal && signal.aborted) {
      abort();
      return;
    }
    const abortAndFinalize = () => {
      abort();
      finalize();
    };
    const request_ = send(options2);
    if (signal) {
      signal.addEventListener("abort", abortAndFinalize);
    }
    const finalize = () => {
      request_.abort();
      if (signal) {
        signal.removeEventListener("abort", abortAndFinalize);
      }
    };
    request_.on("error", (error2) => {
      reject(new FetchError(`request to ${request.url} failed, reason: ${error2.message}`, "system", error2));
      finalize();
    });
    fixResponseChunkedTransferBadEnding(request_, (error2) => {
      response.body.destroy(error2);
    });
    if (process.version < "v14") {
      request_.on("socket", (s2) => {
        let endedWithEventsCount;
        s2.prependListener("end", () => {
          endedWithEventsCount = s2._eventsCount;
        });
        s2.prependListener("close", (hadError) => {
          if (response && endedWithEventsCount < s2._eventsCount && !hadError) {
            const error2 = new Error("Premature close");
            error2.code = "ERR_STREAM_PREMATURE_CLOSE";
            response.body.emit("error", error2);
          }
        });
      });
    }
    request_.on("response", (response_) => {
      request_.setTimeout(0);
      const headers = fromRawHeaders(response_.rawHeaders);
      if (isRedirect(response_.statusCode)) {
        const location = headers.get("Location");
        const locationURL = location === null ? null : new URL(location, request.url);
        switch (request.redirect) {
          case "error":
            reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, "no-redirect"));
            finalize();
            return;
          case "manual":
            if (locationURL !== null) {
              headers.set("Location", locationURL);
            }
            break;
          case "follow": {
            if (locationURL === null) {
              break;
            }
            if (request.counter >= request.follow) {
              reject(new FetchError(`maximum redirect reached at: ${request.url}`, "max-redirect"));
              finalize();
              return;
            }
            const requestOptions = {
              headers: new Headers(request.headers),
              follow: request.follow,
              counter: request.counter + 1,
              agent: request.agent,
              compress: request.compress,
              method: request.method,
              body: request.body,
              signal: request.signal,
              size: request.size
            };
            if (response_.statusCode !== 303 && request.body && options_.body instanceof import_stream.default.Readable) {
              reject(new FetchError("Cannot follow redirect with body being a readable stream", "unsupported-redirect"));
              finalize();
              return;
            }
            if (response_.statusCode === 303 || (response_.statusCode === 301 || response_.statusCode === 302) && request.method === "POST") {
              requestOptions.method = "GET";
              requestOptions.body = void 0;
              requestOptions.headers.delete("content-length");
            }
            resolve2(fetch(new Request(locationURL, requestOptions)));
            finalize();
            return;
          }
          default:
            return reject(new TypeError(`Redirect option '${request.redirect}' is not a valid value of RequestRedirect`));
        }
      }
      if (signal) {
        response_.once("end", () => {
          signal.removeEventListener("abort", abortAndFinalize);
        });
      }
      let body = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), reject);
      if (process.version < "v12.10") {
        response_.on("aborted", abortAndFinalize);
      }
      const responseOptions = {
        url: request.url,
        status: response_.statusCode,
        statusText: response_.statusMessage,
        headers,
        size: request.size,
        counter: request.counter,
        highWaterMark: request.highWaterMark
      };
      const codings = headers.get("Content-Encoding");
      if (!request.compress || request.method === "HEAD" || codings === null || response_.statusCode === 204 || response_.statusCode === 304) {
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      const zlibOptions = {
        flush: import_zlib.default.Z_SYNC_FLUSH,
        finishFlush: import_zlib.default.Z_SYNC_FLUSH
      };
      if (codings === "gzip" || codings === "x-gzip") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createGunzip(zlibOptions), reject);
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      if (codings === "deflate" || codings === "x-deflate") {
        const raw = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), reject);
        raw.once("data", (chunk) => {
          body = (chunk[0] & 15) === 8 ? (0, import_stream.pipeline)(body, import_zlib.default.createInflate(), reject) : (0, import_stream.pipeline)(body, import_zlib.default.createInflateRaw(), reject);
          response = new Response(body, responseOptions);
          resolve2(response);
        });
        return;
      }
      if (codings === "br") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createBrotliDecompress(), reject);
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      response = new Response(body, responseOptions);
      resolve2(response);
    });
    writeToStream(request_, request);
  });
}
function fixResponseChunkedTransferBadEnding(request, errorCallback) {
  const LAST_CHUNK = Buffer.from("0\r\n\r\n");
  let isChunkedTransfer = false;
  let properLastChunkReceived = false;
  let previousChunk;
  request.on("response", (response) => {
    const { headers } = response;
    isChunkedTransfer = headers["transfer-encoding"] === "chunked" && !headers["content-length"];
  });
  request.on("socket", (socket) => {
    const onSocketClose = () => {
      if (isChunkedTransfer && !properLastChunkReceived) {
        const error2 = new Error("Premature close");
        error2.code = "ERR_STREAM_PREMATURE_CLOSE";
        errorCallback(error2);
      }
    };
    socket.prependListener("close", onSocketClose);
    request.on("abort", () => {
      socket.removeListener("close", onSocketClose);
    });
    socket.on("data", (buf) => {
      properLastChunkReceived = Buffer.compare(buf.slice(-5), LAST_CHUNK) === 0;
      if (!properLastChunkReceived && previousChunk) {
        properLastChunkReceived = Buffer.compare(previousChunk.slice(-3), LAST_CHUNK.slice(0, 3)) === 0 && Buffer.compare(buf.slice(-2), LAST_CHUNK.slice(3)) === 0;
      }
      previousChunk = buf;
    });
  });
}
var import_http, import_https, import_zlib, import_stream, import_util, import_crypto, import_url, commonjsGlobal, src, dataUriToBuffer$1, ponyfill_es2018, POOL_SIZE$1, POOL_SIZE, _Blob, Blob2, Blob$1, FetchBaseError, FetchError, NAME, isURLSearchParameters, isBlob, isAbortSignal, carriage, dashes, carriageLength, getFooter, getBoundary, INTERNALS$2, Body, clone, extractContentType, getTotalBytes, writeToStream, validateHeaderName, validateHeaderValue, Headers, redirectStatus, isRedirect, INTERNALS$1, Response, getSearch, INTERNALS, isRequest, Request, getNodeRequestOptions, AbortError, supportedSchemas;
var init_install_fetch = __esm({
  "node_modules/@sveltejs/kit/dist/install-fetch.js"() {
    init_shims();
    import_http = __toModule(require("http"));
    import_https = __toModule(require("https"));
    import_zlib = __toModule(require("zlib"));
    import_stream = __toModule(require("stream"));
    import_util = __toModule(require("util"));
    import_crypto = __toModule(require("crypto"));
    import_url = __toModule(require("url"));
    commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
    src = dataUriToBuffer;
    dataUriToBuffer$1 = src;
    ponyfill_es2018 = { exports: {} };
    (function(module2, exports) {
      (function(global2, factory) {
        factory(exports);
      })(commonjsGlobal, function(exports2) {
        const SymbolPolyfill = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? Symbol : (description) => `Symbol(${description})`;
        function noop2() {
          return void 0;
        }
        function getGlobals() {
          if (typeof self !== "undefined") {
            return self;
          } else if (typeof window !== "undefined") {
            return window;
          } else if (typeof commonjsGlobal !== "undefined") {
            return commonjsGlobal;
          }
          return void 0;
        }
        const globals = getGlobals();
        function typeIsObject(x) {
          return typeof x === "object" && x !== null || typeof x === "function";
        }
        const rethrowAssertionErrorRejection = noop2;
        const originalPromise = Promise;
        const originalPromiseThen = Promise.prototype.then;
        const originalPromiseResolve = Promise.resolve.bind(originalPromise);
        const originalPromiseReject = Promise.reject.bind(originalPromise);
        function newPromise(executor) {
          return new originalPromise(executor);
        }
        function promiseResolvedWith(value) {
          return originalPromiseResolve(value);
        }
        function promiseRejectedWith(reason) {
          return originalPromiseReject(reason);
        }
        function PerformPromiseThen(promise, onFulfilled, onRejected) {
          return originalPromiseThen.call(promise, onFulfilled, onRejected);
        }
        function uponPromise(promise, onFulfilled, onRejected) {
          PerformPromiseThen(PerformPromiseThen(promise, onFulfilled, onRejected), void 0, rethrowAssertionErrorRejection);
        }
        function uponFulfillment(promise, onFulfilled) {
          uponPromise(promise, onFulfilled);
        }
        function uponRejection(promise, onRejected) {
          uponPromise(promise, void 0, onRejected);
        }
        function transformPromiseWith(promise, fulfillmentHandler, rejectionHandler) {
          return PerformPromiseThen(promise, fulfillmentHandler, rejectionHandler);
        }
        function setPromiseIsHandledToTrue(promise) {
          PerformPromiseThen(promise, void 0, rethrowAssertionErrorRejection);
        }
        const queueMicrotask = (() => {
          const globalQueueMicrotask = globals && globals.queueMicrotask;
          if (typeof globalQueueMicrotask === "function") {
            return globalQueueMicrotask;
          }
          const resolvedPromise = promiseResolvedWith(void 0);
          return (fn) => PerformPromiseThen(resolvedPromise, fn);
        })();
        function reflectCall(F, V, args) {
          if (typeof F !== "function") {
            throw new TypeError("Argument is not a function");
          }
          return Function.prototype.apply.call(F, V, args);
        }
        function promiseCall(F, V, args) {
          try {
            return promiseResolvedWith(reflectCall(F, V, args));
          } catch (value) {
            return promiseRejectedWith(value);
          }
        }
        const QUEUE_MAX_ARRAY_SIZE = 16384;
        class SimpleQueue {
          constructor() {
            this._cursor = 0;
            this._size = 0;
            this._front = {
              _elements: [],
              _next: void 0
            };
            this._back = this._front;
            this._cursor = 0;
            this._size = 0;
          }
          get length() {
            return this._size;
          }
          push(element) {
            const oldBack = this._back;
            let newBack = oldBack;
            if (oldBack._elements.length === QUEUE_MAX_ARRAY_SIZE - 1) {
              newBack = {
                _elements: [],
                _next: void 0
              };
            }
            oldBack._elements.push(element);
            if (newBack !== oldBack) {
              this._back = newBack;
              oldBack._next = newBack;
            }
            ++this._size;
          }
          shift() {
            const oldFront = this._front;
            let newFront = oldFront;
            const oldCursor = this._cursor;
            let newCursor = oldCursor + 1;
            const elements = oldFront._elements;
            const element = elements[oldCursor];
            if (newCursor === QUEUE_MAX_ARRAY_SIZE) {
              newFront = oldFront._next;
              newCursor = 0;
            }
            --this._size;
            this._cursor = newCursor;
            if (oldFront !== newFront) {
              this._front = newFront;
            }
            elements[oldCursor] = void 0;
            return element;
          }
          forEach(callback) {
            let i = this._cursor;
            let node = this._front;
            let elements = node._elements;
            while (i !== elements.length || node._next !== void 0) {
              if (i === elements.length) {
                node = node._next;
                elements = node._elements;
                i = 0;
                if (elements.length === 0) {
                  break;
                }
              }
              callback(elements[i]);
              ++i;
            }
          }
          peek() {
            const front = this._front;
            const cursor = this._cursor;
            return front._elements[cursor];
          }
        }
        function ReadableStreamReaderGenericInitialize(reader, stream) {
          reader._ownerReadableStream = stream;
          stream._reader = reader;
          if (stream._state === "readable") {
            defaultReaderClosedPromiseInitialize(reader);
          } else if (stream._state === "closed") {
            defaultReaderClosedPromiseInitializeAsResolved(reader);
          } else {
            defaultReaderClosedPromiseInitializeAsRejected(reader, stream._storedError);
          }
        }
        function ReadableStreamReaderGenericCancel(reader, reason) {
          const stream = reader._ownerReadableStream;
          return ReadableStreamCancel(stream, reason);
        }
        function ReadableStreamReaderGenericRelease(reader) {
          if (reader._ownerReadableStream._state === "readable") {
            defaultReaderClosedPromiseReject(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
          } else {
            defaultReaderClosedPromiseResetToRejected(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
          }
          reader._ownerReadableStream._reader = void 0;
          reader._ownerReadableStream = void 0;
        }
        function readerLockException(name) {
          return new TypeError("Cannot " + name + " a stream using a released reader");
        }
        function defaultReaderClosedPromiseInitialize(reader) {
          reader._closedPromise = newPromise((resolve2, reject) => {
            reader._closedPromise_resolve = resolve2;
            reader._closedPromise_reject = reject;
          });
        }
        function defaultReaderClosedPromiseInitializeAsRejected(reader, reason) {
          defaultReaderClosedPromiseInitialize(reader);
          defaultReaderClosedPromiseReject(reader, reason);
        }
        function defaultReaderClosedPromiseInitializeAsResolved(reader) {
          defaultReaderClosedPromiseInitialize(reader);
          defaultReaderClosedPromiseResolve(reader);
        }
        function defaultReaderClosedPromiseReject(reader, reason) {
          if (reader._closedPromise_reject === void 0) {
            return;
          }
          setPromiseIsHandledToTrue(reader._closedPromise);
          reader._closedPromise_reject(reason);
          reader._closedPromise_resolve = void 0;
          reader._closedPromise_reject = void 0;
        }
        function defaultReaderClosedPromiseResetToRejected(reader, reason) {
          defaultReaderClosedPromiseInitializeAsRejected(reader, reason);
        }
        function defaultReaderClosedPromiseResolve(reader) {
          if (reader._closedPromise_resolve === void 0) {
            return;
          }
          reader._closedPromise_resolve(void 0);
          reader._closedPromise_resolve = void 0;
          reader._closedPromise_reject = void 0;
        }
        const AbortSteps = SymbolPolyfill("[[AbortSteps]]");
        const ErrorSteps = SymbolPolyfill("[[ErrorSteps]]");
        const CancelSteps = SymbolPolyfill("[[CancelSteps]]");
        const PullSteps = SymbolPolyfill("[[PullSteps]]");
        const NumberIsFinite = Number.isFinite || function(x) {
          return typeof x === "number" && isFinite(x);
        };
        const MathTrunc = Math.trunc || function(v) {
          return v < 0 ? Math.ceil(v) : Math.floor(v);
        };
        function isDictionary(x) {
          return typeof x === "object" || typeof x === "function";
        }
        function assertDictionary(obj, context) {
          if (obj !== void 0 && !isDictionary(obj)) {
            throw new TypeError(`${context} is not an object.`);
          }
        }
        function assertFunction(x, context) {
          if (typeof x !== "function") {
            throw new TypeError(`${context} is not a function.`);
          }
        }
        function isObject(x) {
          return typeof x === "object" && x !== null || typeof x === "function";
        }
        function assertObject(x, context) {
          if (!isObject(x)) {
            throw new TypeError(`${context} is not an object.`);
          }
        }
        function assertRequiredArgument(x, position, context) {
          if (x === void 0) {
            throw new TypeError(`Parameter ${position} is required in '${context}'.`);
          }
        }
        function assertRequiredField(x, field, context) {
          if (x === void 0) {
            throw new TypeError(`${field} is required in '${context}'.`);
          }
        }
        function convertUnrestrictedDouble(value) {
          return Number(value);
        }
        function censorNegativeZero(x) {
          return x === 0 ? 0 : x;
        }
        function integerPart(x) {
          return censorNegativeZero(MathTrunc(x));
        }
        function convertUnsignedLongLongWithEnforceRange(value, context) {
          const lowerBound = 0;
          const upperBound = Number.MAX_SAFE_INTEGER;
          let x = Number(value);
          x = censorNegativeZero(x);
          if (!NumberIsFinite(x)) {
            throw new TypeError(`${context} is not a finite number`);
          }
          x = integerPart(x);
          if (x < lowerBound || x > upperBound) {
            throw new TypeError(`${context} is outside the accepted range of ${lowerBound} to ${upperBound}, inclusive`);
          }
          if (!NumberIsFinite(x) || x === 0) {
            return 0;
          }
          return x;
        }
        function assertReadableStream(x, context) {
          if (!IsReadableStream(x)) {
            throw new TypeError(`${context} is not a ReadableStream.`);
          }
        }
        function AcquireReadableStreamDefaultReader(stream) {
          return new ReadableStreamDefaultReader(stream);
        }
        function ReadableStreamAddReadRequest(stream, readRequest) {
          stream._reader._readRequests.push(readRequest);
        }
        function ReadableStreamFulfillReadRequest(stream, chunk, done) {
          const reader = stream._reader;
          const readRequest = reader._readRequests.shift();
          if (done) {
            readRequest._closeSteps();
          } else {
            readRequest._chunkSteps(chunk);
          }
        }
        function ReadableStreamGetNumReadRequests(stream) {
          return stream._reader._readRequests.length;
        }
        function ReadableStreamHasDefaultReader(stream) {
          const reader = stream._reader;
          if (reader === void 0) {
            return false;
          }
          if (!IsReadableStreamDefaultReader(reader)) {
            return false;
          }
          return true;
        }
        class ReadableStreamDefaultReader {
          constructor(stream) {
            assertRequiredArgument(stream, 1, "ReadableStreamDefaultReader");
            assertReadableStream(stream, "First parameter");
            if (IsReadableStreamLocked(stream)) {
              throw new TypeError("This stream has already been locked for exclusive reading by another reader");
            }
            ReadableStreamReaderGenericInitialize(this, stream);
            this._readRequests = new SimpleQueue();
          }
          get closed() {
            if (!IsReadableStreamDefaultReader(this)) {
              return promiseRejectedWith(defaultReaderBrandCheckException("closed"));
            }
            return this._closedPromise;
          }
          cancel(reason = void 0) {
            if (!IsReadableStreamDefaultReader(this)) {
              return promiseRejectedWith(defaultReaderBrandCheckException("cancel"));
            }
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("cancel"));
            }
            return ReadableStreamReaderGenericCancel(this, reason);
          }
          read() {
            if (!IsReadableStreamDefaultReader(this)) {
              return promiseRejectedWith(defaultReaderBrandCheckException("read"));
            }
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("read from"));
            }
            let resolvePromise;
            let rejectPromise;
            const promise = newPromise((resolve2, reject) => {
              resolvePromise = resolve2;
              rejectPromise = reject;
            });
            const readRequest = {
              _chunkSteps: (chunk) => resolvePromise({ value: chunk, done: false }),
              _closeSteps: () => resolvePromise({ value: void 0, done: true }),
              _errorSteps: (e) => rejectPromise(e)
            };
            ReadableStreamDefaultReaderRead(this, readRequest);
            return promise;
          }
          releaseLock() {
            if (!IsReadableStreamDefaultReader(this)) {
              throw defaultReaderBrandCheckException("releaseLock");
            }
            if (this._ownerReadableStream === void 0) {
              return;
            }
            if (this._readRequests.length > 0) {
              throw new TypeError("Tried to release a reader lock when that reader has pending read() calls un-settled");
            }
            ReadableStreamReaderGenericRelease(this);
          }
        }
        Object.defineProperties(ReadableStreamDefaultReader.prototype, {
          cancel: { enumerable: true },
          read: { enumerable: true },
          releaseLock: { enumerable: true },
          closed: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamDefaultReader.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamDefaultReader",
            configurable: true
          });
        }
        function IsReadableStreamDefaultReader(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_readRequests")) {
            return false;
          }
          return x instanceof ReadableStreamDefaultReader;
        }
        function ReadableStreamDefaultReaderRead(reader, readRequest) {
          const stream = reader._ownerReadableStream;
          stream._disturbed = true;
          if (stream._state === "closed") {
            readRequest._closeSteps();
          } else if (stream._state === "errored") {
            readRequest._errorSteps(stream._storedError);
          } else {
            stream._readableStreamController[PullSteps](readRequest);
          }
        }
        function defaultReaderBrandCheckException(name) {
          return new TypeError(`ReadableStreamDefaultReader.prototype.${name} can only be used on a ReadableStreamDefaultReader`);
        }
        const AsyncIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(async function* () {
        }).prototype);
        class ReadableStreamAsyncIteratorImpl {
          constructor(reader, preventCancel) {
            this._ongoingPromise = void 0;
            this._isFinished = false;
            this._reader = reader;
            this._preventCancel = preventCancel;
          }
          next() {
            const nextSteps = () => this._nextSteps();
            this._ongoingPromise = this._ongoingPromise ? transformPromiseWith(this._ongoingPromise, nextSteps, nextSteps) : nextSteps();
            return this._ongoingPromise;
          }
          return(value) {
            const returnSteps = () => this._returnSteps(value);
            return this._ongoingPromise ? transformPromiseWith(this._ongoingPromise, returnSteps, returnSteps) : returnSteps();
          }
          _nextSteps() {
            if (this._isFinished) {
              return Promise.resolve({ value: void 0, done: true });
            }
            const reader = this._reader;
            if (reader._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("iterate"));
            }
            let resolvePromise;
            let rejectPromise;
            const promise = newPromise((resolve2, reject) => {
              resolvePromise = resolve2;
              rejectPromise = reject;
            });
            const readRequest = {
              _chunkSteps: (chunk) => {
                this._ongoingPromise = void 0;
                queueMicrotask(() => resolvePromise({ value: chunk, done: false }));
              },
              _closeSteps: () => {
                this._ongoingPromise = void 0;
                this._isFinished = true;
                ReadableStreamReaderGenericRelease(reader);
                resolvePromise({ value: void 0, done: true });
              },
              _errorSteps: (reason) => {
                this._ongoingPromise = void 0;
                this._isFinished = true;
                ReadableStreamReaderGenericRelease(reader);
                rejectPromise(reason);
              }
            };
            ReadableStreamDefaultReaderRead(reader, readRequest);
            return promise;
          }
          _returnSteps(value) {
            if (this._isFinished) {
              return Promise.resolve({ value, done: true });
            }
            this._isFinished = true;
            const reader = this._reader;
            if (reader._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("finish iterating"));
            }
            if (!this._preventCancel) {
              const result = ReadableStreamReaderGenericCancel(reader, value);
              ReadableStreamReaderGenericRelease(reader);
              return transformPromiseWith(result, () => ({ value, done: true }));
            }
            ReadableStreamReaderGenericRelease(reader);
            return promiseResolvedWith({ value, done: true });
          }
        }
        const ReadableStreamAsyncIteratorPrototype = {
          next() {
            if (!IsReadableStreamAsyncIterator(this)) {
              return promiseRejectedWith(streamAsyncIteratorBrandCheckException("next"));
            }
            return this._asyncIteratorImpl.next();
          },
          return(value) {
            if (!IsReadableStreamAsyncIterator(this)) {
              return promiseRejectedWith(streamAsyncIteratorBrandCheckException("return"));
            }
            return this._asyncIteratorImpl.return(value);
          }
        };
        if (AsyncIteratorPrototype !== void 0) {
          Object.setPrototypeOf(ReadableStreamAsyncIteratorPrototype, AsyncIteratorPrototype);
        }
        function AcquireReadableStreamAsyncIterator(stream, preventCancel) {
          const reader = AcquireReadableStreamDefaultReader(stream);
          const impl = new ReadableStreamAsyncIteratorImpl(reader, preventCancel);
          const iterator = Object.create(ReadableStreamAsyncIteratorPrototype);
          iterator._asyncIteratorImpl = impl;
          return iterator;
        }
        function IsReadableStreamAsyncIterator(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_asyncIteratorImpl")) {
            return false;
          }
          try {
            return x._asyncIteratorImpl instanceof ReadableStreamAsyncIteratorImpl;
          } catch (_a) {
            return false;
          }
        }
        function streamAsyncIteratorBrandCheckException(name) {
          return new TypeError(`ReadableStreamAsyncIterator.${name} can only be used on a ReadableSteamAsyncIterator`);
        }
        const NumberIsNaN = Number.isNaN || function(x) {
          return x !== x;
        };
        function CreateArrayFromList(elements) {
          return elements.slice();
        }
        function CopyDataBlockBytes(dest, destOffset, src2, srcOffset, n) {
          new Uint8Array(dest).set(new Uint8Array(src2, srcOffset, n), destOffset);
        }
        function TransferArrayBuffer(O) {
          return O;
        }
        function IsDetachedBuffer(O) {
          return false;
        }
        function ArrayBufferSlice(buffer, begin, end) {
          if (buffer.slice) {
            return buffer.slice(begin, end);
          }
          const length = end - begin;
          const slice = new ArrayBuffer(length);
          CopyDataBlockBytes(slice, 0, buffer, begin, length);
          return slice;
        }
        function IsNonNegativeNumber(v) {
          if (typeof v !== "number") {
            return false;
          }
          if (NumberIsNaN(v)) {
            return false;
          }
          if (v < 0) {
            return false;
          }
          return true;
        }
        function CloneAsUint8Array(O) {
          const buffer = ArrayBufferSlice(O.buffer, O.byteOffset, O.byteOffset + O.byteLength);
          return new Uint8Array(buffer);
        }
        function DequeueValue(container) {
          const pair = container._queue.shift();
          container._queueTotalSize -= pair.size;
          if (container._queueTotalSize < 0) {
            container._queueTotalSize = 0;
          }
          return pair.value;
        }
        function EnqueueValueWithSize(container, value, size) {
          if (!IsNonNegativeNumber(size) || size === Infinity) {
            throw new RangeError("Size must be a finite, non-NaN, non-negative number.");
          }
          container._queue.push({ value, size });
          container._queueTotalSize += size;
        }
        function PeekQueueValue(container) {
          const pair = container._queue.peek();
          return pair.value;
        }
        function ResetQueue(container) {
          container._queue = new SimpleQueue();
          container._queueTotalSize = 0;
        }
        class ReadableStreamBYOBRequest {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get view() {
            if (!IsReadableStreamBYOBRequest(this)) {
              throw byobRequestBrandCheckException("view");
            }
            return this._view;
          }
          respond(bytesWritten) {
            if (!IsReadableStreamBYOBRequest(this)) {
              throw byobRequestBrandCheckException("respond");
            }
            assertRequiredArgument(bytesWritten, 1, "respond");
            bytesWritten = convertUnsignedLongLongWithEnforceRange(bytesWritten, "First parameter");
            if (this._associatedReadableByteStreamController === void 0) {
              throw new TypeError("This BYOB request has been invalidated");
            }
            if (IsDetachedBuffer(this._view.buffer))
              ;
            ReadableByteStreamControllerRespond(this._associatedReadableByteStreamController, bytesWritten);
          }
          respondWithNewView(view) {
            if (!IsReadableStreamBYOBRequest(this)) {
              throw byobRequestBrandCheckException("respondWithNewView");
            }
            assertRequiredArgument(view, 1, "respondWithNewView");
            if (!ArrayBuffer.isView(view)) {
              throw new TypeError("You can only respond with array buffer views");
            }
            if (this._associatedReadableByteStreamController === void 0) {
              throw new TypeError("This BYOB request has been invalidated");
            }
            if (IsDetachedBuffer(view.buffer))
              ;
            ReadableByteStreamControllerRespondWithNewView(this._associatedReadableByteStreamController, view);
          }
        }
        Object.defineProperties(ReadableStreamBYOBRequest.prototype, {
          respond: { enumerable: true },
          respondWithNewView: { enumerable: true },
          view: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamBYOBRequest.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamBYOBRequest",
            configurable: true
          });
        }
        class ReadableByteStreamController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get byobRequest() {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("byobRequest");
            }
            return ReadableByteStreamControllerGetBYOBRequest(this);
          }
          get desiredSize() {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("desiredSize");
            }
            return ReadableByteStreamControllerGetDesiredSize(this);
          }
          close() {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("close");
            }
            if (this._closeRequested) {
              throw new TypeError("The stream has already been closed; do not close it again!");
            }
            const state = this._controlledReadableByteStream._state;
            if (state !== "readable") {
              throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be closed`);
            }
            ReadableByteStreamControllerClose(this);
          }
          enqueue(chunk) {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("enqueue");
            }
            assertRequiredArgument(chunk, 1, "enqueue");
            if (!ArrayBuffer.isView(chunk)) {
              throw new TypeError("chunk must be an array buffer view");
            }
            if (chunk.byteLength === 0) {
              throw new TypeError("chunk must have non-zero byteLength");
            }
            if (chunk.buffer.byteLength === 0) {
              throw new TypeError(`chunk's buffer must have non-zero byteLength`);
            }
            if (this._closeRequested) {
              throw new TypeError("stream is closed or draining");
            }
            const state = this._controlledReadableByteStream._state;
            if (state !== "readable") {
              throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be enqueued to`);
            }
            ReadableByteStreamControllerEnqueue(this, chunk);
          }
          error(e = void 0) {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("error");
            }
            ReadableByteStreamControllerError(this, e);
          }
          [CancelSteps](reason) {
            ReadableByteStreamControllerClearPendingPullIntos(this);
            ResetQueue(this);
            const result = this._cancelAlgorithm(reason);
            ReadableByteStreamControllerClearAlgorithms(this);
            return result;
          }
          [PullSteps](readRequest) {
            const stream = this._controlledReadableByteStream;
            if (this._queueTotalSize > 0) {
              const entry = this._queue.shift();
              this._queueTotalSize -= entry.byteLength;
              ReadableByteStreamControllerHandleQueueDrain(this);
              const view = new Uint8Array(entry.buffer, entry.byteOffset, entry.byteLength);
              readRequest._chunkSteps(view);
              return;
            }
            const autoAllocateChunkSize = this._autoAllocateChunkSize;
            if (autoAllocateChunkSize !== void 0) {
              let buffer;
              try {
                buffer = new ArrayBuffer(autoAllocateChunkSize);
              } catch (bufferE) {
                readRequest._errorSteps(bufferE);
                return;
              }
              const pullIntoDescriptor = {
                buffer,
                bufferByteLength: autoAllocateChunkSize,
                byteOffset: 0,
                byteLength: autoAllocateChunkSize,
                bytesFilled: 0,
                elementSize: 1,
                viewConstructor: Uint8Array,
                readerType: "default"
              };
              this._pendingPullIntos.push(pullIntoDescriptor);
            }
            ReadableStreamAddReadRequest(stream, readRequest);
            ReadableByteStreamControllerCallPullIfNeeded(this);
          }
        }
        Object.defineProperties(ReadableByteStreamController.prototype, {
          close: { enumerable: true },
          enqueue: { enumerable: true },
          error: { enumerable: true },
          byobRequest: { enumerable: true },
          desiredSize: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableByteStreamController.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableByteStreamController",
            configurable: true
          });
        }
        function IsReadableByteStreamController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledReadableByteStream")) {
            return false;
          }
          return x instanceof ReadableByteStreamController;
        }
        function IsReadableStreamBYOBRequest(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_associatedReadableByteStreamController")) {
            return false;
          }
          return x instanceof ReadableStreamBYOBRequest;
        }
        function ReadableByteStreamControllerCallPullIfNeeded(controller) {
          const shouldPull = ReadableByteStreamControllerShouldCallPull(controller);
          if (!shouldPull) {
            return;
          }
          if (controller._pulling) {
            controller._pullAgain = true;
            return;
          }
          controller._pulling = true;
          const pullPromise = controller._pullAlgorithm();
          uponPromise(pullPromise, () => {
            controller._pulling = false;
            if (controller._pullAgain) {
              controller._pullAgain = false;
              ReadableByteStreamControllerCallPullIfNeeded(controller);
            }
          }, (e) => {
            ReadableByteStreamControllerError(controller, e);
          });
        }
        function ReadableByteStreamControllerClearPendingPullIntos(controller) {
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          controller._pendingPullIntos = new SimpleQueue();
        }
        function ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor) {
          let done = false;
          if (stream._state === "closed") {
            done = true;
          }
          const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
          if (pullIntoDescriptor.readerType === "default") {
            ReadableStreamFulfillReadRequest(stream, filledView, done);
          } else {
            ReadableStreamFulfillReadIntoRequest(stream, filledView, done);
          }
        }
        function ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor) {
          const bytesFilled = pullIntoDescriptor.bytesFilled;
          const elementSize = pullIntoDescriptor.elementSize;
          return new pullIntoDescriptor.viewConstructor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, bytesFilled / elementSize);
        }
        function ReadableByteStreamControllerEnqueueChunkToQueue(controller, buffer, byteOffset, byteLength) {
          controller._queue.push({ buffer, byteOffset, byteLength });
          controller._queueTotalSize += byteLength;
        }
        function ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor) {
          const elementSize = pullIntoDescriptor.elementSize;
          const currentAlignedBytes = pullIntoDescriptor.bytesFilled - pullIntoDescriptor.bytesFilled % elementSize;
          const maxBytesToCopy = Math.min(controller._queueTotalSize, pullIntoDescriptor.byteLength - pullIntoDescriptor.bytesFilled);
          const maxBytesFilled = pullIntoDescriptor.bytesFilled + maxBytesToCopy;
          const maxAlignedBytes = maxBytesFilled - maxBytesFilled % elementSize;
          let totalBytesToCopyRemaining = maxBytesToCopy;
          let ready = false;
          if (maxAlignedBytes > currentAlignedBytes) {
            totalBytesToCopyRemaining = maxAlignedBytes - pullIntoDescriptor.bytesFilled;
            ready = true;
          }
          const queue = controller._queue;
          while (totalBytesToCopyRemaining > 0) {
            const headOfQueue = queue.peek();
            const bytesToCopy = Math.min(totalBytesToCopyRemaining, headOfQueue.byteLength);
            const destStart = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
            CopyDataBlockBytes(pullIntoDescriptor.buffer, destStart, headOfQueue.buffer, headOfQueue.byteOffset, bytesToCopy);
            if (headOfQueue.byteLength === bytesToCopy) {
              queue.shift();
            } else {
              headOfQueue.byteOffset += bytesToCopy;
              headOfQueue.byteLength -= bytesToCopy;
            }
            controller._queueTotalSize -= bytesToCopy;
            ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesToCopy, pullIntoDescriptor);
            totalBytesToCopyRemaining -= bytesToCopy;
          }
          return ready;
        }
        function ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, size, pullIntoDescriptor) {
          pullIntoDescriptor.bytesFilled += size;
        }
        function ReadableByteStreamControllerHandleQueueDrain(controller) {
          if (controller._queueTotalSize === 0 && controller._closeRequested) {
            ReadableByteStreamControllerClearAlgorithms(controller);
            ReadableStreamClose(controller._controlledReadableByteStream);
          } else {
            ReadableByteStreamControllerCallPullIfNeeded(controller);
          }
        }
        function ReadableByteStreamControllerInvalidateBYOBRequest(controller) {
          if (controller._byobRequest === null) {
            return;
          }
          controller._byobRequest._associatedReadableByteStreamController = void 0;
          controller._byobRequest._view = null;
          controller._byobRequest = null;
        }
        function ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller) {
          while (controller._pendingPullIntos.length > 0) {
            if (controller._queueTotalSize === 0) {
              return;
            }
            const pullIntoDescriptor = controller._pendingPullIntos.peek();
            if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
              ReadableByteStreamControllerShiftPendingPullInto(controller);
              ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
            }
          }
        }
        function ReadableByteStreamControllerPullInto(controller, view, readIntoRequest) {
          const stream = controller._controlledReadableByteStream;
          let elementSize = 1;
          if (view.constructor !== DataView) {
            elementSize = view.constructor.BYTES_PER_ELEMENT;
          }
          const ctor = view.constructor;
          const buffer = TransferArrayBuffer(view.buffer);
          const pullIntoDescriptor = {
            buffer,
            bufferByteLength: buffer.byteLength,
            byteOffset: view.byteOffset,
            byteLength: view.byteLength,
            bytesFilled: 0,
            elementSize,
            viewConstructor: ctor,
            readerType: "byob"
          };
          if (controller._pendingPullIntos.length > 0) {
            controller._pendingPullIntos.push(pullIntoDescriptor);
            ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
            return;
          }
          if (stream._state === "closed") {
            const emptyView = new ctor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, 0);
            readIntoRequest._closeSteps(emptyView);
            return;
          }
          if (controller._queueTotalSize > 0) {
            if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
              const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
              ReadableByteStreamControllerHandleQueueDrain(controller);
              readIntoRequest._chunkSteps(filledView);
              return;
            }
            if (controller._closeRequested) {
              const e = new TypeError("Insufficient bytes to fill elements in the given buffer");
              ReadableByteStreamControllerError(controller, e);
              readIntoRequest._errorSteps(e);
              return;
            }
          }
          controller._pendingPullIntos.push(pullIntoDescriptor);
          ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        function ReadableByteStreamControllerRespondInClosedState(controller, firstDescriptor) {
          const stream = controller._controlledReadableByteStream;
          if (ReadableStreamHasBYOBReader(stream)) {
            while (ReadableStreamGetNumReadIntoRequests(stream) > 0) {
              const pullIntoDescriptor = ReadableByteStreamControllerShiftPendingPullInto(controller);
              ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor);
            }
          }
        }
        function ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, pullIntoDescriptor) {
          ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesWritten, pullIntoDescriptor);
          if (pullIntoDescriptor.bytesFilled < pullIntoDescriptor.elementSize) {
            return;
          }
          ReadableByteStreamControllerShiftPendingPullInto(controller);
          const remainderSize = pullIntoDescriptor.bytesFilled % pullIntoDescriptor.elementSize;
          if (remainderSize > 0) {
            const end = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
            const remainder = ArrayBufferSlice(pullIntoDescriptor.buffer, end - remainderSize, end);
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, remainder, 0, remainder.byteLength);
          }
          pullIntoDescriptor.bytesFilled -= remainderSize;
          ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
          ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
        }
        function ReadableByteStreamControllerRespondInternal(controller, bytesWritten) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          const state = controller._controlledReadableByteStream._state;
          if (state === "closed") {
            ReadableByteStreamControllerRespondInClosedState(controller);
          } else {
            ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, firstDescriptor);
          }
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        function ReadableByteStreamControllerShiftPendingPullInto(controller) {
          const descriptor = controller._pendingPullIntos.shift();
          return descriptor;
        }
        function ReadableByteStreamControllerShouldCallPull(controller) {
          const stream = controller._controlledReadableByteStream;
          if (stream._state !== "readable") {
            return false;
          }
          if (controller._closeRequested) {
            return false;
          }
          if (!controller._started) {
            return false;
          }
          if (ReadableStreamHasDefaultReader(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
            return true;
          }
          if (ReadableStreamHasBYOBReader(stream) && ReadableStreamGetNumReadIntoRequests(stream) > 0) {
            return true;
          }
          const desiredSize = ReadableByteStreamControllerGetDesiredSize(controller);
          if (desiredSize > 0) {
            return true;
          }
          return false;
        }
        function ReadableByteStreamControllerClearAlgorithms(controller) {
          controller._pullAlgorithm = void 0;
          controller._cancelAlgorithm = void 0;
        }
        function ReadableByteStreamControllerClose(controller) {
          const stream = controller._controlledReadableByteStream;
          if (controller._closeRequested || stream._state !== "readable") {
            return;
          }
          if (controller._queueTotalSize > 0) {
            controller._closeRequested = true;
            return;
          }
          if (controller._pendingPullIntos.length > 0) {
            const firstPendingPullInto = controller._pendingPullIntos.peek();
            if (firstPendingPullInto.bytesFilled > 0) {
              const e = new TypeError("Insufficient bytes to fill elements in the given buffer");
              ReadableByteStreamControllerError(controller, e);
              throw e;
            }
          }
          ReadableByteStreamControllerClearAlgorithms(controller);
          ReadableStreamClose(stream);
        }
        function ReadableByteStreamControllerEnqueue(controller, chunk) {
          const stream = controller._controlledReadableByteStream;
          if (controller._closeRequested || stream._state !== "readable") {
            return;
          }
          const buffer = chunk.buffer;
          const byteOffset = chunk.byteOffset;
          const byteLength = chunk.byteLength;
          const transferredBuffer = TransferArrayBuffer(buffer);
          if (controller._pendingPullIntos.length > 0) {
            const firstPendingPullInto = controller._pendingPullIntos.peek();
            if (IsDetachedBuffer(firstPendingPullInto.buffer))
              ;
            firstPendingPullInto.buffer = TransferArrayBuffer(firstPendingPullInto.buffer);
          }
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          if (ReadableStreamHasDefaultReader(stream)) {
            if (ReadableStreamGetNumReadRequests(stream) === 0) {
              ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
            } else {
              const transferredView = new Uint8Array(transferredBuffer, byteOffset, byteLength);
              ReadableStreamFulfillReadRequest(stream, transferredView, false);
            }
          } else if (ReadableStreamHasBYOBReader(stream)) {
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
            ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
          } else {
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
          }
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        function ReadableByteStreamControllerError(controller, e) {
          const stream = controller._controlledReadableByteStream;
          if (stream._state !== "readable") {
            return;
          }
          ReadableByteStreamControllerClearPendingPullIntos(controller);
          ResetQueue(controller);
          ReadableByteStreamControllerClearAlgorithms(controller);
          ReadableStreamError(stream, e);
        }
        function ReadableByteStreamControllerGetBYOBRequest(controller) {
          if (controller._byobRequest === null && controller._pendingPullIntos.length > 0) {
            const firstDescriptor = controller._pendingPullIntos.peek();
            const view = new Uint8Array(firstDescriptor.buffer, firstDescriptor.byteOffset + firstDescriptor.bytesFilled, firstDescriptor.byteLength - firstDescriptor.bytesFilled);
            const byobRequest = Object.create(ReadableStreamBYOBRequest.prototype);
            SetUpReadableStreamBYOBRequest(byobRequest, controller, view);
            controller._byobRequest = byobRequest;
          }
          return controller._byobRequest;
        }
        function ReadableByteStreamControllerGetDesiredSize(controller) {
          const state = controller._controlledReadableByteStream._state;
          if (state === "errored") {
            return null;
          }
          if (state === "closed") {
            return 0;
          }
          return controller._strategyHWM - controller._queueTotalSize;
        }
        function ReadableByteStreamControllerRespond(controller, bytesWritten) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          const state = controller._controlledReadableByteStream._state;
          if (state === "closed") {
            if (bytesWritten !== 0) {
              throw new TypeError("bytesWritten must be 0 when calling respond() on a closed stream");
            }
          } else {
            if (bytesWritten === 0) {
              throw new TypeError("bytesWritten must be greater than 0 when calling respond() on a readable stream");
            }
            if (firstDescriptor.bytesFilled + bytesWritten > firstDescriptor.byteLength) {
              throw new RangeError("bytesWritten out of range");
            }
          }
          firstDescriptor.buffer = TransferArrayBuffer(firstDescriptor.buffer);
          ReadableByteStreamControllerRespondInternal(controller, bytesWritten);
        }
        function ReadableByteStreamControllerRespondWithNewView(controller, view) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          const state = controller._controlledReadableByteStream._state;
          if (state === "closed") {
            if (view.byteLength !== 0) {
              throw new TypeError("The view's length must be 0 when calling respondWithNewView() on a closed stream");
            }
          } else {
            if (view.byteLength === 0) {
              throw new TypeError("The view's length must be greater than 0 when calling respondWithNewView() on a readable stream");
            }
          }
          if (firstDescriptor.byteOffset + firstDescriptor.bytesFilled !== view.byteOffset) {
            throw new RangeError("The region specified by view does not match byobRequest");
          }
          if (firstDescriptor.bufferByteLength !== view.buffer.byteLength) {
            throw new RangeError("The buffer of view has different capacity than byobRequest");
          }
          if (firstDescriptor.bytesFilled + view.byteLength > firstDescriptor.byteLength) {
            throw new RangeError("The region specified by view is larger than byobRequest");
          }
          firstDescriptor.buffer = TransferArrayBuffer(view.buffer);
          ReadableByteStreamControllerRespondInternal(controller, view.byteLength);
        }
        function SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize) {
          controller._controlledReadableByteStream = stream;
          controller._pullAgain = false;
          controller._pulling = false;
          controller._byobRequest = null;
          controller._queue = controller._queueTotalSize = void 0;
          ResetQueue(controller);
          controller._closeRequested = false;
          controller._started = false;
          controller._strategyHWM = highWaterMark;
          controller._pullAlgorithm = pullAlgorithm;
          controller._cancelAlgorithm = cancelAlgorithm;
          controller._autoAllocateChunkSize = autoAllocateChunkSize;
          controller._pendingPullIntos = new SimpleQueue();
          stream._readableStreamController = controller;
          const startResult = startAlgorithm();
          uponPromise(promiseResolvedWith(startResult), () => {
            controller._started = true;
            ReadableByteStreamControllerCallPullIfNeeded(controller);
          }, (r) => {
            ReadableByteStreamControllerError(controller, r);
          });
        }
        function SetUpReadableByteStreamControllerFromUnderlyingSource(stream, underlyingByteSource, highWaterMark) {
          const controller = Object.create(ReadableByteStreamController.prototype);
          let startAlgorithm = () => void 0;
          let pullAlgorithm = () => promiseResolvedWith(void 0);
          let cancelAlgorithm = () => promiseResolvedWith(void 0);
          if (underlyingByteSource.start !== void 0) {
            startAlgorithm = () => underlyingByteSource.start(controller);
          }
          if (underlyingByteSource.pull !== void 0) {
            pullAlgorithm = () => underlyingByteSource.pull(controller);
          }
          if (underlyingByteSource.cancel !== void 0) {
            cancelAlgorithm = (reason) => underlyingByteSource.cancel(reason);
          }
          const autoAllocateChunkSize = underlyingByteSource.autoAllocateChunkSize;
          if (autoAllocateChunkSize === 0) {
            throw new TypeError("autoAllocateChunkSize must be greater than 0");
          }
          SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize);
        }
        function SetUpReadableStreamBYOBRequest(request, controller, view) {
          request._associatedReadableByteStreamController = controller;
          request._view = view;
        }
        function byobRequestBrandCheckException(name) {
          return new TypeError(`ReadableStreamBYOBRequest.prototype.${name} can only be used on a ReadableStreamBYOBRequest`);
        }
        function byteStreamControllerBrandCheckException(name) {
          return new TypeError(`ReadableByteStreamController.prototype.${name} can only be used on a ReadableByteStreamController`);
        }
        function AcquireReadableStreamBYOBReader(stream) {
          return new ReadableStreamBYOBReader(stream);
        }
        function ReadableStreamAddReadIntoRequest(stream, readIntoRequest) {
          stream._reader._readIntoRequests.push(readIntoRequest);
        }
        function ReadableStreamFulfillReadIntoRequest(stream, chunk, done) {
          const reader = stream._reader;
          const readIntoRequest = reader._readIntoRequests.shift();
          if (done) {
            readIntoRequest._closeSteps(chunk);
          } else {
            readIntoRequest._chunkSteps(chunk);
          }
        }
        function ReadableStreamGetNumReadIntoRequests(stream) {
          return stream._reader._readIntoRequests.length;
        }
        function ReadableStreamHasBYOBReader(stream) {
          const reader = stream._reader;
          if (reader === void 0) {
            return false;
          }
          if (!IsReadableStreamBYOBReader(reader)) {
            return false;
          }
          return true;
        }
        class ReadableStreamBYOBReader {
          constructor(stream) {
            assertRequiredArgument(stream, 1, "ReadableStreamBYOBReader");
            assertReadableStream(stream, "First parameter");
            if (IsReadableStreamLocked(stream)) {
              throw new TypeError("This stream has already been locked for exclusive reading by another reader");
            }
            if (!IsReadableByteStreamController(stream._readableStreamController)) {
              throw new TypeError("Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte source");
            }
            ReadableStreamReaderGenericInitialize(this, stream);
            this._readIntoRequests = new SimpleQueue();
          }
          get closed() {
            if (!IsReadableStreamBYOBReader(this)) {
              return promiseRejectedWith(byobReaderBrandCheckException("closed"));
            }
            return this._closedPromise;
          }
          cancel(reason = void 0) {
            if (!IsReadableStreamBYOBReader(this)) {
              return promiseRejectedWith(byobReaderBrandCheckException("cancel"));
            }
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("cancel"));
            }
            return ReadableStreamReaderGenericCancel(this, reason);
          }
          read(view) {
            if (!IsReadableStreamBYOBReader(this)) {
              return promiseRejectedWith(byobReaderBrandCheckException("read"));
            }
            if (!ArrayBuffer.isView(view)) {
              return promiseRejectedWith(new TypeError("view must be an array buffer view"));
            }
            if (view.byteLength === 0) {
              return promiseRejectedWith(new TypeError("view must have non-zero byteLength"));
            }
            if (view.buffer.byteLength === 0) {
              return promiseRejectedWith(new TypeError(`view's buffer must have non-zero byteLength`));
            }
            if (IsDetachedBuffer(view.buffer))
              ;
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("read from"));
            }
            let resolvePromise;
            let rejectPromise;
            const promise = newPromise((resolve2, reject) => {
              resolvePromise = resolve2;
              rejectPromise = reject;
            });
            const readIntoRequest = {
              _chunkSteps: (chunk) => resolvePromise({ value: chunk, done: false }),
              _closeSteps: (chunk) => resolvePromise({ value: chunk, done: true }),
              _errorSteps: (e) => rejectPromise(e)
            };
            ReadableStreamBYOBReaderRead(this, view, readIntoRequest);
            return promise;
          }
          releaseLock() {
            if (!IsReadableStreamBYOBReader(this)) {
              throw byobReaderBrandCheckException("releaseLock");
            }
            if (this._ownerReadableStream === void 0) {
              return;
            }
            if (this._readIntoRequests.length > 0) {
              throw new TypeError("Tried to release a reader lock when that reader has pending read() calls un-settled");
            }
            ReadableStreamReaderGenericRelease(this);
          }
        }
        Object.defineProperties(ReadableStreamBYOBReader.prototype, {
          cancel: { enumerable: true },
          read: { enumerable: true },
          releaseLock: { enumerable: true },
          closed: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamBYOBReader.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamBYOBReader",
            configurable: true
          });
        }
        function IsReadableStreamBYOBReader(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_readIntoRequests")) {
            return false;
          }
          return x instanceof ReadableStreamBYOBReader;
        }
        function ReadableStreamBYOBReaderRead(reader, view, readIntoRequest) {
          const stream = reader._ownerReadableStream;
          stream._disturbed = true;
          if (stream._state === "errored") {
            readIntoRequest._errorSteps(stream._storedError);
          } else {
            ReadableByteStreamControllerPullInto(stream._readableStreamController, view, readIntoRequest);
          }
        }
        function byobReaderBrandCheckException(name) {
          return new TypeError(`ReadableStreamBYOBReader.prototype.${name} can only be used on a ReadableStreamBYOBReader`);
        }
        function ExtractHighWaterMark(strategy, defaultHWM) {
          const { highWaterMark } = strategy;
          if (highWaterMark === void 0) {
            return defaultHWM;
          }
          if (NumberIsNaN(highWaterMark) || highWaterMark < 0) {
            throw new RangeError("Invalid highWaterMark");
          }
          return highWaterMark;
        }
        function ExtractSizeAlgorithm(strategy) {
          const { size } = strategy;
          if (!size) {
            return () => 1;
          }
          return size;
        }
        function convertQueuingStrategy(init2, context) {
          assertDictionary(init2, context);
          const highWaterMark = init2 === null || init2 === void 0 ? void 0 : init2.highWaterMark;
          const size = init2 === null || init2 === void 0 ? void 0 : init2.size;
          return {
            highWaterMark: highWaterMark === void 0 ? void 0 : convertUnrestrictedDouble(highWaterMark),
            size: size === void 0 ? void 0 : convertQueuingStrategySize(size, `${context} has member 'size' that`)
          };
        }
        function convertQueuingStrategySize(fn, context) {
          assertFunction(fn, context);
          return (chunk) => convertUnrestrictedDouble(fn(chunk));
        }
        function convertUnderlyingSink(original, context) {
          assertDictionary(original, context);
          const abort = original === null || original === void 0 ? void 0 : original.abort;
          const close = original === null || original === void 0 ? void 0 : original.close;
          const start = original === null || original === void 0 ? void 0 : original.start;
          const type = original === null || original === void 0 ? void 0 : original.type;
          const write = original === null || original === void 0 ? void 0 : original.write;
          return {
            abort: abort === void 0 ? void 0 : convertUnderlyingSinkAbortCallback(abort, original, `${context} has member 'abort' that`),
            close: close === void 0 ? void 0 : convertUnderlyingSinkCloseCallback(close, original, `${context} has member 'close' that`),
            start: start === void 0 ? void 0 : convertUnderlyingSinkStartCallback(start, original, `${context} has member 'start' that`),
            write: write === void 0 ? void 0 : convertUnderlyingSinkWriteCallback(write, original, `${context} has member 'write' that`),
            type
          };
        }
        function convertUnderlyingSinkAbortCallback(fn, original, context) {
          assertFunction(fn, context);
          return (reason) => promiseCall(fn, original, [reason]);
        }
        function convertUnderlyingSinkCloseCallback(fn, original, context) {
          assertFunction(fn, context);
          return () => promiseCall(fn, original, []);
        }
        function convertUnderlyingSinkStartCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => reflectCall(fn, original, [controller]);
        }
        function convertUnderlyingSinkWriteCallback(fn, original, context) {
          assertFunction(fn, context);
          return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
        }
        function assertWritableStream(x, context) {
          if (!IsWritableStream(x)) {
            throw new TypeError(`${context} is not a WritableStream.`);
          }
        }
        function isAbortSignal2(value) {
          if (typeof value !== "object" || value === null) {
            return false;
          }
          try {
            return typeof value.aborted === "boolean";
          } catch (_a) {
            return false;
          }
        }
        const supportsAbortController = typeof AbortController === "function";
        function createAbortController() {
          if (supportsAbortController) {
            return new AbortController();
          }
          return void 0;
        }
        class WritableStream {
          constructor(rawUnderlyingSink = {}, rawStrategy = {}) {
            if (rawUnderlyingSink === void 0) {
              rawUnderlyingSink = null;
            } else {
              assertObject(rawUnderlyingSink, "First parameter");
            }
            const strategy = convertQueuingStrategy(rawStrategy, "Second parameter");
            const underlyingSink = convertUnderlyingSink(rawUnderlyingSink, "First parameter");
            InitializeWritableStream(this);
            const type = underlyingSink.type;
            if (type !== void 0) {
              throw new RangeError("Invalid type is specified");
            }
            const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
            const highWaterMark = ExtractHighWaterMark(strategy, 1);
            SetUpWritableStreamDefaultControllerFromUnderlyingSink(this, underlyingSink, highWaterMark, sizeAlgorithm);
          }
          get locked() {
            if (!IsWritableStream(this)) {
              throw streamBrandCheckException$2("locked");
            }
            return IsWritableStreamLocked(this);
          }
          abort(reason = void 0) {
            if (!IsWritableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$2("abort"));
            }
            if (IsWritableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("Cannot abort a stream that already has a writer"));
            }
            return WritableStreamAbort(this, reason);
          }
          close() {
            if (!IsWritableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$2("close"));
            }
            if (IsWritableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("Cannot close a stream that already has a writer"));
            }
            if (WritableStreamCloseQueuedOrInFlight(this)) {
              return promiseRejectedWith(new TypeError("Cannot close an already-closing stream"));
            }
            return WritableStreamClose(this);
          }
          getWriter() {
            if (!IsWritableStream(this)) {
              throw streamBrandCheckException$2("getWriter");
            }
            return AcquireWritableStreamDefaultWriter(this);
          }
        }
        Object.defineProperties(WritableStream.prototype, {
          abort: { enumerable: true },
          close: { enumerable: true },
          getWriter: { enumerable: true },
          locked: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(WritableStream.prototype, SymbolPolyfill.toStringTag, {
            value: "WritableStream",
            configurable: true
          });
        }
        function AcquireWritableStreamDefaultWriter(stream) {
          return new WritableStreamDefaultWriter(stream);
        }
        function CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
          const stream = Object.create(WritableStream.prototype);
          InitializeWritableStream(stream);
          const controller = Object.create(WritableStreamDefaultController.prototype);
          SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
          return stream;
        }
        function InitializeWritableStream(stream) {
          stream._state = "writable";
          stream._storedError = void 0;
          stream._writer = void 0;
          stream._writableStreamController = void 0;
          stream._writeRequests = new SimpleQueue();
          stream._inFlightWriteRequest = void 0;
          stream._closeRequest = void 0;
          stream._inFlightCloseRequest = void 0;
          stream._pendingAbortRequest = void 0;
          stream._backpressure = false;
        }
        function IsWritableStream(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_writableStreamController")) {
            return false;
          }
          return x instanceof WritableStream;
        }
        function IsWritableStreamLocked(stream) {
          if (stream._writer === void 0) {
            return false;
          }
          return true;
        }
        function WritableStreamAbort(stream, reason) {
          var _a;
          if (stream._state === "closed" || stream._state === "errored") {
            return promiseResolvedWith(void 0);
          }
          stream._writableStreamController._abortReason = reason;
          (_a = stream._writableStreamController._abortController) === null || _a === void 0 ? void 0 : _a.abort();
          const state = stream._state;
          if (state === "closed" || state === "errored") {
            return promiseResolvedWith(void 0);
          }
          if (stream._pendingAbortRequest !== void 0) {
            return stream._pendingAbortRequest._promise;
          }
          let wasAlreadyErroring = false;
          if (state === "erroring") {
            wasAlreadyErroring = true;
            reason = void 0;
          }
          const promise = newPromise((resolve2, reject) => {
            stream._pendingAbortRequest = {
              _promise: void 0,
              _resolve: resolve2,
              _reject: reject,
              _reason: reason,
              _wasAlreadyErroring: wasAlreadyErroring
            };
          });
          stream._pendingAbortRequest._promise = promise;
          if (!wasAlreadyErroring) {
            WritableStreamStartErroring(stream, reason);
          }
          return promise;
        }
        function WritableStreamClose(stream) {
          const state = stream._state;
          if (state === "closed" || state === "errored") {
            return promiseRejectedWith(new TypeError(`The stream (in ${state} state) is not in the writable state and cannot be closed`));
          }
          const promise = newPromise((resolve2, reject) => {
            const closeRequest = {
              _resolve: resolve2,
              _reject: reject
            };
            stream._closeRequest = closeRequest;
          });
          const writer = stream._writer;
          if (writer !== void 0 && stream._backpressure && state === "writable") {
            defaultWriterReadyPromiseResolve(writer);
          }
          WritableStreamDefaultControllerClose(stream._writableStreamController);
          return promise;
        }
        function WritableStreamAddWriteRequest(stream) {
          const promise = newPromise((resolve2, reject) => {
            const writeRequest = {
              _resolve: resolve2,
              _reject: reject
            };
            stream._writeRequests.push(writeRequest);
          });
          return promise;
        }
        function WritableStreamDealWithRejection(stream, error2) {
          const state = stream._state;
          if (state === "writable") {
            WritableStreamStartErroring(stream, error2);
            return;
          }
          WritableStreamFinishErroring(stream);
        }
        function WritableStreamStartErroring(stream, reason) {
          const controller = stream._writableStreamController;
          stream._state = "erroring";
          stream._storedError = reason;
          const writer = stream._writer;
          if (writer !== void 0) {
            WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, reason);
          }
          if (!WritableStreamHasOperationMarkedInFlight(stream) && controller._started) {
            WritableStreamFinishErroring(stream);
          }
        }
        function WritableStreamFinishErroring(stream) {
          stream._state = "errored";
          stream._writableStreamController[ErrorSteps]();
          const storedError = stream._storedError;
          stream._writeRequests.forEach((writeRequest) => {
            writeRequest._reject(storedError);
          });
          stream._writeRequests = new SimpleQueue();
          if (stream._pendingAbortRequest === void 0) {
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
            return;
          }
          const abortRequest = stream._pendingAbortRequest;
          stream._pendingAbortRequest = void 0;
          if (abortRequest._wasAlreadyErroring) {
            abortRequest._reject(storedError);
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
            return;
          }
          const promise = stream._writableStreamController[AbortSteps](abortRequest._reason);
          uponPromise(promise, () => {
            abortRequest._resolve();
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
          }, (reason) => {
            abortRequest._reject(reason);
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
          });
        }
        function WritableStreamFinishInFlightWrite(stream) {
          stream._inFlightWriteRequest._resolve(void 0);
          stream._inFlightWriteRequest = void 0;
        }
        function WritableStreamFinishInFlightWriteWithError(stream, error2) {
          stream._inFlightWriteRequest._reject(error2);
          stream._inFlightWriteRequest = void 0;
          WritableStreamDealWithRejection(stream, error2);
        }
        function WritableStreamFinishInFlightClose(stream) {
          stream._inFlightCloseRequest._resolve(void 0);
          stream._inFlightCloseRequest = void 0;
          const state = stream._state;
          if (state === "erroring") {
            stream._storedError = void 0;
            if (stream._pendingAbortRequest !== void 0) {
              stream._pendingAbortRequest._resolve();
              stream._pendingAbortRequest = void 0;
            }
          }
          stream._state = "closed";
          const writer = stream._writer;
          if (writer !== void 0) {
            defaultWriterClosedPromiseResolve(writer);
          }
        }
        function WritableStreamFinishInFlightCloseWithError(stream, error2) {
          stream._inFlightCloseRequest._reject(error2);
          stream._inFlightCloseRequest = void 0;
          if (stream._pendingAbortRequest !== void 0) {
            stream._pendingAbortRequest._reject(error2);
            stream._pendingAbortRequest = void 0;
          }
          WritableStreamDealWithRejection(stream, error2);
        }
        function WritableStreamCloseQueuedOrInFlight(stream) {
          if (stream._closeRequest === void 0 && stream._inFlightCloseRequest === void 0) {
            return false;
          }
          return true;
        }
        function WritableStreamHasOperationMarkedInFlight(stream) {
          if (stream._inFlightWriteRequest === void 0 && stream._inFlightCloseRequest === void 0) {
            return false;
          }
          return true;
        }
        function WritableStreamMarkCloseRequestInFlight(stream) {
          stream._inFlightCloseRequest = stream._closeRequest;
          stream._closeRequest = void 0;
        }
        function WritableStreamMarkFirstWriteRequestInFlight(stream) {
          stream._inFlightWriteRequest = stream._writeRequests.shift();
        }
        function WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream) {
          if (stream._closeRequest !== void 0) {
            stream._closeRequest._reject(stream._storedError);
            stream._closeRequest = void 0;
          }
          const writer = stream._writer;
          if (writer !== void 0) {
            defaultWriterClosedPromiseReject(writer, stream._storedError);
          }
        }
        function WritableStreamUpdateBackpressure(stream, backpressure) {
          const writer = stream._writer;
          if (writer !== void 0 && backpressure !== stream._backpressure) {
            if (backpressure) {
              defaultWriterReadyPromiseReset(writer);
            } else {
              defaultWriterReadyPromiseResolve(writer);
            }
          }
          stream._backpressure = backpressure;
        }
        class WritableStreamDefaultWriter {
          constructor(stream) {
            assertRequiredArgument(stream, 1, "WritableStreamDefaultWriter");
            assertWritableStream(stream, "First parameter");
            if (IsWritableStreamLocked(stream)) {
              throw new TypeError("This stream has already been locked for exclusive writing by another writer");
            }
            this._ownerWritableStream = stream;
            stream._writer = this;
            const state = stream._state;
            if (state === "writable") {
              if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._backpressure) {
                defaultWriterReadyPromiseInitialize(this);
              } else {
                defaultWriterReadyPromiseInitializeAsResolved(this);
              }
              defaultWriterClosedPromiseInitialize(this);
            } else if (state === "erroring") {
              defaultWriterReadyPromiseInitializeAsRejected(this, stream._storedError);
              defaultWriterClosedPromiseInitialize(this);
            } else if (state === "closed") {
              defaultWriterReadyPromiseInitializeAsResolved(this);
              defaultWriterClosedPromiseInitializeAsResolved(this);
            } else {
              const storedError = stream._storedError;
              defaultWriterReadyPromiseInitializeAsRejected(this, storedError);
              defaultWriterClosedPromiseInitializeAsRejected(this, storedError);
            }
          }
          get closed() {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("closed"));
            }
            return this._closedPromise;
          }
          get desiredSize() {
            if (!IsWritableStreamDefaultWriter(this)) {
              throw defaultWriterBrandCheckException("desiredSize");
            }
            if (this._ownerWritableStream === void 0) {
              throw defaultWriterLockException("desiredSize");
            }
            return WritableStreamDefaultWriterGetDesiredSize(this);
          }
          get ready() {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("ready"));
            }
            return this._readyPromise;
          }
          abort(reason = void 0) {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("abort"));
            }
            if (this._ownerWritableStream === void 0) {
              return promiseRejectedWith(defaultWriterLockException("abort"));
            }
            return WritableStreamDefaultWriterAbort(this, reason);
          }
          close() {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("close"));
            }
            const stream = this._ownerWritableStream;
            if (stream === void 0) {
              return promiseRejectedWith(defaultWriterLockException("close"));
            }
            if (WritableStreamCloseQueuedOrInFlight(stream)) {
              return promiseRejectedWith(new TypeError("Cannot close an already-closing stream"));
            }
            return WritableStreamDefaultWriterClose(this);
          }
          releaseLock() {
            if (!IsWritableStreamDefaultWriter(this)) {
              throw defaultWriterBrandCheckException("releaseLock");
            }
            const stream = this._ownerWritableStream;
            if (stream === void 0) {
              return;
            }
            WritableStreamDefaultWriterRelease(this);
          }
          write(chunk = void 0) {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("write"));
            }
            if (this._ownerWritableStream === void 0) {
              return promiseRejectedWith(defaultWriterLockException("write to"));
            }
            return WritableStreamDefaultWriterWrite(this, chunk);
          }
        }
        Object.defineProperties(WritableStreamDefaultWriter.prototype, {
          abort: { enumerable: true },
          close: { enumerable: true },
          releaseLock: { enumerable: true },
          write: { enumerable: true },
          closed: { enumerable: true },
          desiredSize: { enumerable: true },
          ready: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(WritableStreamDefaultWriter.prototype, SymbolPolyfill.toStringTag, {
            value: "WritableStreamDefaultWriter",
            configurable: true
          });
        }
        function IsWritableStreamDefaultWriter(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_ownerWritableStream")) {
            return false;
          }
          return x instanceof WritableStreamDefaultWriter;
        }
        function WritableStreamDefaultWriterAbort(writer, reason) {
          const stream = writer._ownerWritableStream;
          return WritableStreamAbort(stream, reason);
        }
        function WritableStreamDefaultWriterClose(writer) {
          const stream = writer._ownerWritableStream;
          return WritableStreamClose(stream);
        }
        function WritableStreamDefaultWriterCloseWithErrorPropagation(writer) {
          const stream = writer._ownerWritableStream;
          const state = stream._state;
          if (WritableStreamCloseQueuedOrInFlight(stream) || state === "closed") {
            return promiseResolvedWith(void 0);
          }
          if (state === "errored") {
            return promiseRejectedWith(stream._storedError);
          }
          return WritableStreamDefaultWriterClose(writer);
        }
        function WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, error2) {
          if (writer._closedPromiseState === "pending") {
            defaultWriterClosedPromiseReject(writer, error2);
          } else {
            defaultWriterClosedPromiseResetToRejected(writer, error2);
          }
        }
        function WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, error2) {
          if (writer._readyPromiseState === "pending") {
            defaultWriterReadyPromiseReject(writer, error2);
          } else {
            defaultWriterReadyPromiseResetToRejected(writer, error2);
          }
        }
        function WritableStreamDefaultWriterGetDesiredSize(writer) {
          const stream = writer._ownerWritableStream;
          const state = stream._state;
          if (state === "errored" || state === "erroring") {
            return null;
          }
          if (state === "closed") {
            return 0;
          }
          return WritableStreamDefaultControllerGetDesiredSize(stream._writableStreamController);
        }
        function WritableStreamDefaultWriterRelease(writer) {
          const stream = writer._ownerWritableStream;
          const releasedError = new TypeError(`Writer was released and can no longer be used to monitor the stream's closedness`);
          WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, releasedError);
          WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, releasedError);
          stream._writer = void 0;
          writer._ownerWritableStream = void 0;
        }
        function WritableStreamDefaultWriterWrite(writer, chunk) {
          const stream = writer._ownerWritableStream;
          const controller = stream._writableStreamController;
          const chunkSize = WritableStreamDefaultControllerGetChunkSize(controller, chunk);
          if (stream !== writer._ownerWritableStream) {
            return promiseRejectedWith(defaultWriterLockException("write to"));
          }
          const state = stream._state;
          if (state === "errored") {
            return promiseRejectedWith(stream._storedError);
          }
          if (WritableStreamCloseQueuedOrInFlight(stream) || state === "closed") {
            return promiseRejectedWith(new TypeError("The stream is closing or closed and cannot be written to"));
          }
          if (state === "erroring") {
            return promiseRejectedWith(stream._storedError);
          }
          const promise = WritableStreamAddWriteRequest(stream);
          WritableStreamDefaultControllerWrite(controller, chunk, chunkSize);
          return promise;
        }
        const closeSentinel = {};
        class WritableStreamDefaultController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get abortReason() {
            if (!IsWritableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$2("abortReason");
            }
            return this._abortReason;
          }
          get signal() {
            if (!IsWritableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$2("signal");
            }
            if (this._abortController === void 0) {
              throw new TypeError("WritableStreamDefaultController.prototype.signal is not supported");
            }
            return this._abortController.signal;
          }
          error(e = void 0) {
            if (!IsWritableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$2("error");
            }
            const state = this._controlledWritableStream._state;
            if (state !== "writable") {
              return;
            }
            WritableStreamDefaultControllerError(this, e);
          }
          [AbortSteps](reason) {
            const result = this._abortAlgorithm(reason);
            WritableStreamDefaultControllerClearAlgorithms(this);
            return result;
          }
          [ErrorSteps]() {
            ResetQueue(this);
          }
        }
        Object.defineProperties(WritableStreamDefaultController.prototype, {
          error: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(WritableStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
            value: "WritableStreamDefaultController",
            configurable: true
          });
        }
        function IsWritableStreamDefaultController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledWritableStream")) {
            return false;
          }
          return x instanceof WritableStreamDefaultController;
        }
        function SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm) {
          controller._controlledWritableStream = stream;
          stream._writableStreamController = controller;
          controller._queue = void 0;
          controller._queueTotalSize = void 0;
          ResetQueue(controller);
          controller._abortReason = void 0;
          controller._abortController = createAbortController();
          controller._started = false;
          controller._strategySizeAlgorithm = sizeAlgorithm;
          controller._strategyHWM = highWaterMark;
          controller._writeAlgorithm = writeAlgorithm;
          controller._closeAlgorithm = closeAlgorithm;
          controller._abortAlgorithm = abortAlgorithm;
          const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
          WritableStreamUpdateBackpressure(stream, backpressure);
          const startResult = startAlgorithm();
          const startPromise = promiseResolvedWith(startResult);
          uponPromise(startPromise, () => {
            controller._started = true;
            WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
          }, (r) => {
            controller._started = true;
            WritableStreamDealWithRejection(stream, r);
          });
        }
        function SetUpWritableStreamDefaultControllerFromUnderlyingSink(stream, underlyingSink, highWaterMark, sizeAlgorithm) {
          const controller = Object.create(WritableStreamDefaultController.prototype);
          let startAlgorithm = () => void 0;
          let writeAlgorithm = () => promiseResolvedWith(void 0);
          let closeAlgorithm = () => promiseResolvedWith(void 0);
          let abortAlgorithm = () => promiseResolvedWith(void 0);
          if (underlyingSink.start !== void 0) {
            startAlgorithm = () => underlyingSink.start(controller);
          }
          if (underlyingSink.write !== void 0) {
            writeAlgorithm = (chunk) => underlyingSink.write(chunk, controller);
          }
          if (underlyingSink.close !== void 0) {
            closeAlgorithm = () => underlyingSink.close();
          }
          if (underlyingSink.abort !== void 0) {
            abortAlgorithm = (reason) => underlyingSink.abort(reason);
          }
          SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
        }
        function WritableStreamDefaultControllerClearAlgorithms(controller) {
          controller._writeAlgorithm = void 0;
          controller._closeAlgorithm = void 0;
          controller._abortAlgorithm = void 0;
          controller._strategySizeAlgorithm = void 0;
        }
        function WritableStreamDefaultControllerClose(controller) {
          EnqueueValueWithSize(controller, closeSentinel, 0);
          WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
        }
        function WritableStreamDefaultControllerGetChunkSize(controller, chunk) {
          try {
            return controller._strategySizeAlgorithm(chunk);
          } catch (chunkSizeE) {
            WritableStreamDefaultControllerErrorIfNeeded(controller, chunkSizeE);
            return 1;
          }
        }
        function WritableStreamDefaultControllerGetDesiredSize(controller) {
          return controller._strategyHWM - controller._queueTotalSize;
        }
        function WritableStreamDefaultControllerWrite(controller, chunk, chunkSize) {
          try {
            EnqueueValueWithSize(controller, chunk, chunkSize);
          } catch (enqueueE) {
            WritableStreamDefaultControllerErrorIfNeeded(controller, enqueueE);
            return;
          }
          const stream = controller._controlledWritableStream;
          if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._state === "writable") {
            const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
            WritableStreamUpdateBackpressure(stream, backpressure);
          }
          WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
        }
        function WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller) {
          const stream = controller._controlledWritableStream;
          if (!controller._started) {
            return;
          }
          if (stream._inFlightWriteRequest !== void 0) {
            return;
          }
          const state = stream._state;
          if (state === "erroring") {
            WritableStreamFinishErroring(stream);
            return;
          }
          if (controller._queue.length === 0) {
            return;
          }
          const value = PeekQueueValue(controller);
          if (value === closeSentinel) {
            WritableStreamDefaultControllerProcessClose(controller);
          } else {
            WritableStreamDefaultControllerProcessWrite(controller, value);
          }
        }
        function WritableStreamDefaultControllerErrorIfNeeded(controller, error2) {
          if (controller._controlledWritableStream._state === "writable") {
            WritableStreamDefaultControllerError(controller, error2);
          }
        }
        function WritableStreamDefaultControllerProcessClose(controller) {
          const stream = controller._controlledWritableStream;
          WritableStreamMarkCloseRequestInFlight(stream);
          DequeueValue(controller);
          const sinkClosePromise = controller._closeAlgorithm();
          WritableStreamDefaultControllerClearAlgorithms(controller);
          uponPromise(sinkClosePromise, () => {
            WritableStreamFinishInFlightClose(stream);
          }, (reason) => {
            WritableStreamFinishInFlightCloseWithError(stream, reason);
          });
        }
        function WritableStreamDefaultControllerProcessWrite(controller, chunk) {
          const stream = controller._controlledWritableStream;
          WritableStreamMarkFirstWriteRequestInFlight(stream);
          const sinkWritePromise = controller._writeAlgorithm(chunk);
          uponPromise(sinkWritePromise, () => {
            WritableStreamFinishInFlightWrite(stream);
            const state = stream._state;
            DequeueValue(controller);
            if (!WritableStreamCloseQueuedOrInFlight(stream) && state === "writable") {
              const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
              WritableStreamUpdateBackpressure(stream, backpressure);
            }
            WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
          }, (reason) => {
            if (stream._state === "writable") {
              WritableStreamDefaultControllerClearAlgorithms(controller);
            }
            WritableStreamFinishInFlightWriteWithError(stream, reason);
          });
        }
        function WritableStreamDefaultControllerGetBackpressure(controller) {
          const desiredSize = WritableStreamDefaultControllerGetDesiredSize(controller);
          return desiredSize <= 0;
        }
        function WritableStreamDefaultControllerError(controller, error2) {
          const stream = controller._controlledWritableStream;
          WritableStreamDefaultControllerClearAlgorithms(controller);
          WritableStreamStartErroring(stream, error2);
        }
        function streamBrandCheckException$2(name) {
          return new TypeError(`WritableStream.prototype.${name} can only be used on a WritableStream`);
        }
        function defaultControllerBrandCheckException$2(name) {
          return new TypeError(`WritableStreamDefaultController.prototype.${name} can only be used on a WritableStreamDefaultController`);
        }
        function defaultWriterBrandCheckException(name) {
          return new TypeError(`WritableStreamDefaultWriter.prototype.${name} can only be used on a WritableStreamDefaultWriter`);
        }
        function defaultWriterLockException(name) {
          return new TypeError("Cannot " + name + " a stream using a released writer");
        }
        function defaultWriterClosedPromiseInitialize(writer) {
          writer._closedPromise = newPromise((resolve2, reject) => {
            writer._closedPromise_resolve = resolve2;
            writer._closedPromise_reject = reject;
            writer._closedPromiseState = "pending";
          });
        }
        function defaultWriterClosedPromiseInitializeAsRejected(writer, reason) {
          defaultWriterClosedPromiseInitialize(writer);
          defaultWriterClosedPromiseReject(writer, reason);
        }
        function defaultWriterClosedPromiseInitializeAsResolved(writer) {
          defaultWriterClosedPromiseInitialize(writer);
          defaultWriterClosedPromiseResolve(writer);
        }
        function defaultWriterClosedPromiseReject(writer, reason) {
          if (writer._closedPromise_reject === void 0) {
            return;
          }
          setPromiseIsHandledToTrue(writer._closedPromise);
          writer._closedPromise_reject(reason);
          writer._closedPromise_resolve = void 0;
          writer._closedPromise_reject = void 0;
          writer._closedPromiseState = "rejected";
        }
        function defaultWriterClosedPromiseResetToRejected(writer, reason) {
          defaultWriterClosedPromiseInitializeAsRejected(writer, reason);
        }
        function defaultWriterClosedPromiseResolve(writer) {
          if (writer._closedPromise_resolve === void 0) {
            return;
          }
          writer._closedPromise_resolve(void 0);
          writer._closedPromise_resolve = void 0;
          writer._closedPromise_reject = void 0;
          writer._closedPromiseState = "resolved";
        }
        function defaultWriterReadyPromiseInitialize(writer) {
          writer._readyPromise = newPromise((resolve2, reject) => {
            writer._readyPromise_resolve = resolve2;
            writer._readyPromise_reject = reject;
          });
          writer._readyPromiseState = "pending";
        }
        function defaultWriterReadyPromiseInitializeAsRejected(writer, reason) {
          defaultWriterReadyPromiseInitialize(writer);
          defaultWriterReadyPromiseReject(writer, reason);
        }
        function defaultWriterReadyPromiseInitializeAsResolved(writer) {
          defaultWriterReadyPromiseInitialize(writer);
          defaultWriterReadyPromiseResolve(writer);
        }
        function defaultWriterReadyPromiseReject(writer, reason) {
          if (writer._readyPromise_reject === void 0) {
            return;
          }
          setPromiseIsHandledToTrue(writer._readyPromise);
          writer._readyPromise_reject(reason);
          writer._readyPromise_resolve = void 0;
          writer._readyPromise_reject = void 0;
          writer._readyPromiseState = "rejected";
        }
        function defaultWriterReadyPromiseReset(writer) {
          defaultWriterReadyPromiseInitialize(writer);
        }
        function defaultWriterReadyPromiseResetToRejected(writer, reason) {
          defaultWriterReadyPromiseInitializeAsRejected(writer, reason);
        }
        function defaultWriterReadyPromiseResolve(writer) {
          if (writer._readyPromise_resolve === void 0) {
            return;
          }
          writer._readyPromise_resolve(void 0);
          writer._readyPromise_resolve = void 0;
          writer._readyPromise_reject = void 0;
          writer._readyPromiseState = "fulfilled";
        }
        const NativeDOMException = typeof DOMException !== "undefined" ? DOMException : void 0;
        function isDOMExceptionConstructor(ctor) {
          if (!(typeof ctor === "function" || typeof ctor === "object")) {
            return false;
          }
          try {
            new ctor();
            return true;
          } catch (_a) {
            return false;
          }
        }
        function createDOMExceptionPolyfill() {
          const ctor = function DOMException2(message, name) {
            this.message = message || "";
            this.name = name || "Error";
            if (Error.captureStackTrace) {
              Error.captureStackTrace(this, this.constructor);
            }
          };
          ctor.prototype = Object.create(Error.prototype);
          Object.defineProperty(ctor.prototype, "constructor", { value: ctor, writable: true, configurable: true });
          return ctor;
        }
        const DOMException$1 = isDOMExceptionConstructor(NativeDOMException) ? NativeDOMException : createDOMExceptionPolyfill();
        function ReadableStreamPipeTo(source, dest, preventClose, preventAbort, preventCancel, signal) {
          const reader = AcquireReadableStreamDefaultReader(source);
          const writer = AcquireWritableStreamDefaultWriter(dest);
          source._disturbed = true;
          let shuttingDown = false;
          let currentWrite = promiseResolvedWith(void 0);
          return newPromise((resolve2, reject) => {
            let abortAlgorithm;
            if (signal !== void 0) {
              abortAlgorithm = () => {
                const error2 = new DOMException$1("Aborted", "AbortError");
                const actions = [];
                if (!preventAbort) {
                  actions.push(() => {
                    if (dest._state === "writable") {
                      return WritableStreamAbort(dest, error2);
                    }
                    return promiseResolvedWith(void 0);
                  });
                }
                if (!preventCancel) {
                  actions.push(() => {
                    if (source._state === "readable") {
                      return ReadableStreamCancel(source, error2);
                    }
                    return promiseResolvedWith(void 0);
                  });
                }
                shutdownWithAction(() => Promise.all(actions.map((action) => action())), true, error2);
              };
              if (signal.aborted) {
                abortAlgorithm();
                return;
              }
              signal.addEventListener("abort", abortAlgorithm);
            }
            function pipeLoop() {
              return newPromise((resolveLoop, rejectLoop) => {
                function next(done) {
                  if (done) {
                    resolveLoop();
                  } else {
                    PerformPromiseThen(pipeStep(), next, rejectLoop);
                  }
                }
                next(false);
              });
            }
            function pipeStep() {
              if (shuttingDown) {
                return promiseResolvedWith(true);
              }
              return PerformPromiseThen(writer._readyPromise, () => {
                return newPromise((resolveRead, rejectRead) => {
                  ReadableStreamDefaultReaderRead(reader, {
                    _chunkSteps: (chunk) => {
                      currentWrite = PerformPromiseThen(WritableStreamDefaultWriterWrite(writer, chunk), void 0, noop2);
                      resolveRead(false);
                    },
                    _closeSteps: () => resolveRead(true),
                    _errorSteps: rejectRead
                  });
                });
              });
            }
            isOrBecomesErrored(source, reader._closedPromise, (storedError) => {
              if (!preventAbort) {
                shutdownWithAction(() => WritableStreamAbort(dest, storedError), true, storedError);
              } else {
                shutdown(true, storedError);
              }
            });
            isOrBecomesErrored(dest, writer._closedPromise, (storedError) => {
              if (!preventCancel) {
                shutdownWithAction(() => ReadableStreamCancel(source, storedError), true, storedError);
              } else {
                shutdown(true, storedError);
              }
            });
            isOrBecomesClosed(source, reader._closedPromise, () => {
              if (!preventClose) {
                shutdownWithAction(() => WritableStreamDefaultWriterCloseWithErrorPropagation(writer));
              } else {
                shutdown();
              }
            });
            if (WritableStreamCloseQueuedOrInFlight(dest) || dest._state === "closed") {
              const destClosed = new TypeError("the destination writable stream closed before all data could be piped to it");
              if (!preventCancel) {
                shutdownWithAction(() => ReadableStreamCancel(source, destClosed), true, destClosed);
              } else {
                shutdown(true, destClosed);
              }
            }
            setPromiseIsHandledToTrue(pipeLoop());
            function waitForWritesToFinish() {
              const oldCurrentWrite = currentWrite;
              return PerformPromiseThen(currentWrite, () => oldCurrentWrite !== currentWrite ? waitForWritesToFinish() : void 0);
            }
            function isOrBecomesErrored(stream, promise, action) {
              if (stream._state === "errored") {
                action(stream._storedError);
              } else {
                uponRejection(promise, action);
              }
            }
            function isOrBecomesClosed(stream, promise, action) {
              if (stream._state === "closed") {
                action();
              } else {
                uponFulfillment(promise, action);
              }
            }
            function shutdownWithAction(action, originalIsError, originalError) {
              if (shuttingDown) {
                return;
              }
              shuttingDown = true;
              if (dest._state === "writable" && !WritableStreamCloseQueuedOrInFlight(dest)) {
                uponFulfillment(waitForWritesToFinish(), doTheRest);
              } else {
                doTheRest();
              }
              function doTheRest() {
                uponPromise(action(), () => finalize(originalIsError, originalError), (newError) => finalize(true, newError));
              }
            }
            function shutdown(isError, error2) {
              if (shuttingDown) {
                return;
              }
              shuttingDown = true;
              if (dest._state === "writable" && !WritableStreamCloseQueuedOrInFlight(dest)) {
                uponFulfillment(waitForWritesToFinish(), () => finalize(isError, error2));
              } else {
                finalize(isError, error2);
              }
            }
            function finalize(isError, error2) {
              WritableStreamDefaultWriterRelease(writer);
              ReadableStreamReaderGenericRelease(reader);
              if (signal !== void 0) {
                signal.removeEventListener("abort", abortAlgorithm);
              }
              if (isError) {
                reject(error2);
              } else {
                resolve2(void 0);
              }
            }
          });
        }
        class ReadableStreamDefaultController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get desiredSize() {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("desiredSize");
            }
            return ReadableStreamDefaultControllerGetDesiredSize(this);
          }
          close() {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("close");
            }
            if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
              throw new TypeError("The stream is not in a state that permits close");
            }
            ReadableStreamDefaultControllerClose(this);
          }
          enqueue(chunk = void 0) {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("enqueue");
            }
            if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
              throw new TypeError("The stream is not in a state that permits enqueue");
            }
            return ReadableStreamDefaultControllerEnqueue(this, chunk);
          }
          error(e = void 0) {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("error");
            }
            ReadableStreamDefaultControllerError(this, e);
          }
          [CancelSteps](reason) {
            ResetQueue(this);
            const result = this._cancelAlgorithm(reason);
            ReadableStreamDefaultControllerClearAlgorithms(this);
            return result;
          }
          [PullSteps](readRequest) {
            const stream = this._controlledReadableStream;
            if (this._queue.length > 0) {
              const chunk = DequeueValue(this);
              if (this._closeRequested && this._queue.length === 0) {
                ReadableStreamDefaultControllerClearAlgorithms(this);
                ReadableStreamClose(stream);
              } else {
                ReadableStreamDefaultControllerCallPullIfNeeded(this);
              }
              readRequest._chunkSteps(chunk);
            } else {
              ReadableStreamAddReadRequest(stream, readRequest);
              ReadableStreamDefaultControllerCallPullIfNeeded(this);
            }
          }
        }
        Object.defineProperties(ReadableStreamDefaultController.prototype, {
          close: { enumerable: true },
          enqueue: { enumerable: true },
          error: { enumerable: true },
          desiredSize: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamDefaultController",
            configurable: true
          });
        }
        function IsReadableStreamDefaultController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledReadableStream")) {
            return false;
          }
          return x instanceof ReadableStreamDefaultController;
        }
        function ReadableStreamDefaultControllerCallPullIfNeeded(controller) {
          const shouldPull = ReadableStreamDefaultControllerShouldCallPull(controller);
          if (!shouldPull) {
            return;
          }
          if (controller._pulling) {
            controller._pullAgain = true;
            return;
          }
          controller._pulling = true;
          const pullPromise = controller._pullAlgorithm();
          uponPromise(pullPromise, () => {
            controller._pulling = false;
            if (controller._pullAgain) {
              controller._pullAgain = false;
              ReadableStreamDefaultControllerCallPullIfNeeded(controller);
            }
          }, (e) => {
            ReadableStreamDefaultControllerError(controller, e);
          });
        }
        function ReadableStreamDefaultControllerShouldCallPull(controller) {
          const stream = controller._controlledReadableStream;
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
            return false;
          }
          if (!controller._started) {
            return false;
          }
          if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
            return true;
          }
          const desiredSize = ReadableStreamDefaultControllerGetDesiredSize(controller);
          if (desiredSize > 0) {
            return true;
          }
          return false;
        }
        function ReadableStreamDefaultControllerClearAlgorithms(controller) {
          controller._pullAlgorithm = void 0;
          controller._cancelAlgorithm = void 0;
          controller._strategySizeAlgorithm = void 0;
        }
        function ReadableStreamDefaultControllerClose(controller) {
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
            return;
          }
          const stream = controller._controlledReadableStream;
          controller._closeRequested = true;
          if (controller._queue.length === 0) {
            ReadableStreamDefaultControllerClearAlgorithms(controller);
            ReadableStreamClose(stream);
          }
        }
        function ReadableStreamDefaultControllerEnqueue(controller, chunk) {
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
            return;
          }
          const stream = controller._controlledReadableStream;
          if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
            ReadableStreamFulfillReadRequest(stream, chunk, false);
          } else {
            let chunkSize;
            try {
              chunkSize = controller._strategySizeAlgorithm(chunk);
            } catch (chunkSizeE) {
              ReadableStreamDefaultControllerError(controller, chunkSizeE);
              throw chunkSizeE;
            }
            try {
              EnqueueValueWithSize(controller, chunk, chunkSize);
            } catch (enqueueE) {
              ReadableStreamDefaultControllerError(controller, enqueueE);
              throw enqueueE;
            }
          }
          ReadableStreamDefaultControllerCallPullIfNeeded(controller);
        }
        function ReadableStreamDefaultControllerError(controller, e) {
          const stream = controller._controlledReadableStream;
          if (stream._state !== "readable") {
            return;
          }
          ResetQueue(controller);
          ReadableStreamDefaultControllerClearAlgorithms(controller);
          ReadableStreamError(stream, e);
        }
        function ReadableStreamDefaultControllerGetDesiredSize(controller) {
          const state = controller._controlledReadableStream._state;
          if (state === "errored") {
            return null;
          }
          if (state === "closed") {
            return 0;
          }
          return controller._strategyHWM - controller._queueTotalSize;
        }
        function ReadableStreamDefaultControllerHasBackpressure(controller) {
          if (ReadableStreamDefaultControllerShouldCallPull(controller)) {
            return false;
          }
          return true;
        }
        function ReadableStreamDefaultControllerCanCloseOrEnqueue(controller) {
          const state = controller._controlledReadableStream._state;
          if (!controller._closeRequested && state === "readable") {
            return true;
          }
          return false;
        }
        function SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm) {
          controller._controlledReadableStream = stream;
          controller._queue = void 0;
          controller._queueTotalSize = void 0;
          ResetQueue(controller);
          controller._started = false;
          controller._closeRequested = false;
          controller._pullAgain = false;
          controller._pulling = false;
          controller._strategySizeAlgorithm = sizeAlgorithm;
          controller._strategyHWM = highWaterMark;
          controller._pullAlgorithm = pullAlgorithm;
          controller._cancelAlgorithm = cancelAlgorithm;
          stream._readableStreamController = controller;
          const startResult = startAlgorithm();
          uponPromise(promiseResolvedWith(startResult), () => {
            controller._started = true;
            ReadableStreamDefaultControllerCallPullIfNeeded(controller);
          }, (r) => {
            ReadableStreamDefaultControllerError(controller, r);
          });
        }
        function SetUpReadableStreamDefaultControllerFromUnderlyingSource(stream, underlyingSource, highWaterMark, sizeAlgorithm) {
          const controller = Object.create(ReadableStreamDefaultController.prototype);
          let startAlgorithm = () => void 0;
          let pullAlgorithm = () => promiseResolvedWith(void 0);
          let cancelAlgorithm = () => promiseResolvedWith(void 0);
          if (underlyingSource.start !== void 0) {
            startAlgorithm = () => underlyingSource.start(controller);
          }
          if (underlyingSource.pull !== void 0) {
            pullAlgorithm = () => underlyingSource.pull(controller);
          }
          if (underlyingSource.cancel !== void 0) {
            cancelAlgorithm = (reason) => underlyingSource.cancel(reason);
          }
          SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
        }
        function defaultControllerBrandCheckException$1(name) {
          return new TypeError(`ReadableStreamDefaultController.prototype.${name} can only be used on a ReadableStreamDefaultController`);
        }
        function ReadableStreamTee(stream, cloneForBranch2) {
          if (IsReadableByteStreamController(stream._readableStreamController)) {
            return ReadableByteStreamTee(stream);
          }
          return ReadableStreamDefaultTee(stream);
        }
        function ReadableStreamDefaultTee(stream, cloneForBranch2) {
          const reader = AcquireReadableStreamDefaultReader(stream);
          let reading = false;
          let canceled1 = false;
          let canceled2 = false;
          let reason1;
          let reason2;
          let branch1;
          let branch2;
          let resolveCancelPromise;
          const cancelPromise = newPromise((resolve2) => {
            resolveCancelPromise = resolve2;
          });
          function pullAlgorithm() {
            if (reading) {
              return promiseResolvedWith(void 0);
            }
            reading = true;
            const readRequest = {
              _chunkSteps: (chunk) => {
                queueMicrotask(() => {
                  reading = false;
                  const chunk1 = chunk;
                  const chunk2 = chunk;
                  if (!canceled1) {
                    ReadableStreamDefaultControllerEnqueue(branch1._readableStreamController, chunk1);
                  }
                  if (!canceled2) {
                    ReadableStreamDefaultControllerEnqueue(branch2._readableStreamController, chunk2);
                  }
                });
              },
              _closeSteps: () => {
                reading = false;
                if (!canceled1) {
                  ReadableStreamDefaultControllerClose(branch1._readableStreamController);
                }
                if (!canceled2) {
                  ReadableStreamDefaultControllerClose(branch2._readableStreamController);
                }
                if (!canceled1 || !canceled2) {
                  resolveCancelPromise(void 0);
                }
              },
              _errorSteps: () => {
                reading = false;
              }
            };
            ReadableStreamDefaultReaderRead(reader, readRequest);
            return promiseResolvedWith(void 0);
          }
          function cancel1Algorithm(reason) {
            canceled1 = true;
            reason1 = reason;
            if (canceled2) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function cancel2Algorithm(reason) {
            canceled2 = true;
            reason2 = reason;
            if (canceled1) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function startAlgorithm() {
          }
          branch1 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel1Algorithm);
          branch2 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel2Algorithm);
          uponRejection(reader._closedPromise, (r) => {
            ReadableStreamDefaultControllerError(branch1._readableStreamController, r);
            ReadableStreamDefaultControllerError(branch2._readableStreamController, r);
            if (!canceled1 || !canceled2) {
              resolveCancelPromise(void 0);
            }
          });
          return [branch1, branch2];
        }
        function ReadableByteStreamTee(stream) {
          let reader = AcquireReadableStreamDefaultReader(stream);
          let reading = false;
          let canceled1 = false;
          let canceled2 = false;
          let reason1;
          let reason2;
          let branch1;
          let branch2;
          let resolveCancelPromise;
          const cancelPromise = newPromise((resolve2) => {
            resolveCancelPromise = resolve2;
          });
          function forwardReaderError(thisReader) {
            uponRejection(thisReader._closedPromise, (r) => {
              if (thisReader !== reader) {
                return;
              }
              ReadableByteStreamControllerError(branch1._readableStreamController, r);
              ReadableByteStreamControllerError(branch2._readableStreamController, r);
              if (!canceled1 || !canceled2) {
                resolveCancelPromise(void 0);
              }
            });
          }
          function pullWithDefaultReader() {
            if (IsReadableStreamBYOBReader(reader)) {
              ReadableStreamReaderGenericRelease(reader);
              reader = AcquireReadableStreamDefaultReader(stream);
              forwardReaderError(reader);
            }
            const readRequest = {
              _chunkSteps: (chunk) => {
                queueMicrotask(() => {
                  reading = false;
                  const chunk1 = chunk;
                  let chunk2 = chunk;
                  if (!canceled1 && !canceled2) {
                    try {
                      chunk2 = CloneAsUint8Array(chunk);
                    } catch (cloneE) {
                      ReadableByteStreamControllerError(branch1._readableStreamController, cloneE);
                      ReadableByteStreamControllerError(branch2._readableStreamController, cloneE);
                      resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
                      return;
                    }
                  }
                  if (!canceled1) {
                    ReadableByteStreamControllerEnqueue(branch1._readableStreamController, chunk1);
                  }
                  if (!canceled2) {
                    ReadableByteStreamControllerEnqueue(branch2._readableStreamController, chunk2);
                  }
                });
              },
              _closeSteps: () => {
                reading = false;
                if (!canceled1) {
                  ReadableByteStreamControllerClose(branch1._readableStreamController);
                }
                if (!canceled2) {
                  ReadableByteStreamControllerClose(branch2._readableStreamController);
                }
                if (branch1._readableStreamController._pendingPullIntos.length > 0) {
                  ReadableByteStreamControllerRespond(branch1._readableStreamController, 0);
                }
                if (branch2._readableStreamController._pendingPullIntos.length > 0) {
                  ReadableByteStreamControllerRespond(branch2._readableStreamController, 0);
                }
                if (!canceled1 || !canceled2) {
                  resolveCancelPromise(void 0);
                }
              },
              _errorSteps: () => {
                reading = false;
              }
            };
            ReadableStreamDefaultReaderRead(reader, readRequest);
          }
          function pullWithBYOBReader(view, forBranch2) {
            if (IsReadableStreamDefaultReader(reader)) {
              ReadableStreamReaderGenericRelease(reader);
              reader = AcquireReadableStreamBYOBReader(stream);
              forwardReaderError(reader);
            }
            const byobBranch = forBranch2 ? branch2 : branch1;
            const otherBranch = forBranch2 ? branch1 : branch2;
            const readIntoRequest = {
              _chunkSteps: (chunk) => {
                queueMicrotask(() => {
                  reading = false;
                  const byobCanceled = forBranch2 ? canceled2 : canceled1;
                  const otherCanceled = forBranch2 ? canceled1 : canceled2;
                  if (!otherCanceled) {
                    let clonedChunk;
                    try {
                      clonedChunk = CloneAsUint8Array(chunk);
                    } catch (cloneE) {
                      ReadableByteStreamControllerError(byobBranch._readableStreamController, cloneE);
                      ReadableByteStreamControllerError(otherBranch._readableStreamController, cloneE);
                      resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
                      return;
                    }
                    if (!byobCanceled) {
                      ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                    }
                    ReadableByteStreamControllerEnqueue(otherBranch._readableStreamController, clonedChunk);
                  } else if (!byobCanceled) {
                    ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                  }
                });
              },
              _closeSteps: (chunk) => {
                reading = false;
                const byobCanceled = forBranch2 ? canceled2 : canceled1;
                const otherCanceled = forBranch2 ? canceled1 : canceled2;
                if (!byobCanceled) {
                  ReadableByteStreamControllerClose(byobBranch._readableStreamController);
                }
                if (!otherCanceled) {
                  ReadableByteStreamControllerClose(otherBranch._readableStreamController);
                }
                if (chunk !== void 0) {
                  if (!byobCanceled) {
                    ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                  }
                  if (!otherCanceled && otherBranch._readableStreamController._pendingPullIntos.length > 0) {
                    ReadableByteStreamControllerRespond(otherBranch._readableStreamController, 0);
                  }
                }
                if (!byobCanceled || !otherCanceled) {
                  resolveCancelPromise(void 0);
                }
              },
              _errorSteps: () => {
                reading = false;
              }
            };
            ReadableStreamBYOBReaderRead(reader, view, readIntoRequest);
          }
          function pull1Algorithm() {
            if (reading) {
              return promiseResolvedWith(void 0);
            }
            reading = true;
            const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch1._readableStreamController);
            if (byobRequest === null) {
              pullWithDefaultReader();
            } else {
              pullWithBYOBReader(byobRequest._view, false);
            }
            return promiseResolvedWith(void 0);
          }
          function pull2Algorithm() {
            if (reading) {
              return promiseResolvedWith(void 0);
            }
            reading = true;
            const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch2._readableStreamController);
            if (byobRequest === null) {
              pullWithDefaultReader();
            } else {
              pullWithBYOBReader(byobRequest._view, true);
            }
            return promiseResolvedWith(void 0);
          }
          function cancel1Algorithm(reason) {
            canceled1 = true;
            reason1 = reason;
            if (canceled2) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function cancel2Algorithm(reason) {
            canceled2 = true;
            reason2 = reason;
            if (canceled1) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function startAlgorithm() {
            return;
          }
          branch1 = CreateReadableByteStream(startAlgorithm, pull1Algorithm, cancel1Algorithm);
          branch2 = CreateReadableByteStream(startAlgorithm, pull2Algorithm, cancel2Algorithm);
          forwardReaderError(reader);
          return [branch1, branch2];
        }
        function convertUnderlyingDefaultOrByteSource(source, context) {
          assertDictionary(source, context);
          const original = source;
          const autoAllocateChunkSize = original === null || original === void 0 ? void 0 : original.autoAllocateChunkSize;
          const cancel = original === null || original === void 0 ? void 0 : original.cancel;
          const pull = original === null || original === void 0 ? void 0 : original.pull;
          const start = original === null || original === void 0 ? void 0 : original.start;
          const type = original === null || original === void 0 ? void 0 : original.type;
          return {
            autoAllocateChunkSize: autoAllocateChunkSize === void 0 ? void 0 : convertUnsignedLongLongWithEnforceRange(autoAllocateChunkSize, `${context} has member 'autoAllocateChunkSize' that`),
            cancel: cancel === void 0 ? void 0 : convertUnderlyingSourceCancelCallback(cancel, original, `${context} has member 'cancel' that`),
            pull: pull === void 0 ? void 0 : convertUnderlyingSourcePullCallback(pull, original, `${context} has member 'pull' that`),
            start: start === void 0 ? void 0 : convertUnderlyingSourceStartCallback(start, original, `${context} has member 'start' that`),
            type: type === void 0 ? void 0 : convertReadableStreamType(type, `${context} has member 'type' that`)
          };
        }
        function convertUnderlyingSourceCancelCallback(fn, original, context) {
          assertFunction(fn, context);
          return (reason) => promiseCall(fn, original, [reason]);
        }
        function convertUnderlyingSourcePullCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => promiseCall(fn, original, [controller]);
        }
        function convertUnderlyingSourceStartCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => reflectCall(fn, original, [controller]);
        }
        function convertReadableStreamType(type, context) {
          type = `${type}`;
          if (type !== "bytes") {
            throw new TypeError(`${context} '${type}' is not a valid enumeration value for ReadableStreamType`);
          }
          return type;
        }
        function convertReaderOptions(options2, context) {
          assertDictionary(options2, context);
          const mode = options2 === null || options2 === void 0 ? void 0 : options2.mode;
          return {
            mode: mode === void 0 ? void 0 : convertReadableStreamReaderMode(mode, `${context} has member 'mode' that`)
          };
        }
        function convertReadableStreamReaderMode(mode, context) {
          mode = `${mode}`;
          if (mode !== "byob") {
            throw new TypeError(`${context} '${mode}' is not a valid enumeration value for ReadableStreamReaderMode`);
          }
          return mode;
        }
        function convertIteratorOptions(options2, context) {
          assertDictionary(options2, context);
          const preventCancel = options2 === null || options2 === void 0 ? void 0 : options2.preventCancel;
          return { preventCancel: Boolean(preventCancel) };
        }
        function convertPipeOptions(options2, context) {
          assertDictionary(options2, context);
          const preventAbort = options2 === null || options2 === void 0 ? void 0 : options2.preventAbort;
          const preventCancel = options2 === null || options2 === void 0 ? void 0 : options2.preventCancel;
          const preventClose = options2 === null || options2 === void 0 ? void 0 : options2.preventClose;
          const signal = options2 === null || options2 === void 0 ? void 0 : options2.signal;
          if (signal !== void 0) {
            assertAbortSignal(signal, `${context} has member 'signal' that`);
          }
          return {
            preventAbort: Boolean(preventAbort),
            preventCancel: Boolean(preventCancel),
            preventClose: Boolean(preventClose),
            signal
          };
        }
        function assertAbortSignal(signal, context) {
          if (!isAbortSignal2(signal)) {
            throw new TypeError(`${context} is not an AbortSignal.`);
          }
        }
        function convertReadableWritablePair(pair, context) {
          assertDictionary(pair, context);
          const readable = pair === null || pair === void 0 ? void 0 : pair.readable;
          assertRequiredField(readable, "readable", "ReadableWritablePair");
          assertReadableStream(readable, `${context} has member 'readable' that`);
          const writable2 = pair === null || pair === void 0 ? void 0 : pair.writable;
          assertRequiredField(writable2, "writable", "ReadableWritablePair");
          assertWritableStream(writable2, `${context} has member 'writable' that`);
          return { readable, writable: writable2 };
        }
        class ReadableStream2 {
          constructor(rawUnderlyingSource = {}, rawStrategy = {}) {
            if (rawUnderlyingSource === void 0) {
              rawUnderlyingSource = null;
            } else {
              assertObject(rawUnderlyingSource, "First parameter");
            }
            const strategy = convertQueuingStrategy(rawStrategy, "Second parameter");
            const underlyingSource = convertUnderlyingDefaultOrByteSource(rawUnderlyingSource, "First parameter");
            InitializeReadableStream(this);
            if (underlyingSource.type === "bytes") {
              if (strategy.size !== void 0) {
                throw new RangeError("The strategy for a byte stream cannot have a size function");
              }
              const highWaterMark = ExtractHighWaterMark(strategy, 0);
              SetUpReadableByteStreamControllerFromUnderlyingSource(this, underlyingSource, highWaterMark);
            } else {
              const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
              const highWaterMark = ExtractHighWaterMark(strategy, 1);
              SetUpReadableStreamDefaultControllerFromUnderlyingSource(this, underlyingSource, highWaterMark, sizeAlgorithm);
            }
          }
          get locked() {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("locked");
            }
            return IsReadableStreamLocked(this);
          }
          cancel(reason = void 0) {
            if (!IsReadableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$1("cancel"));
            }
            if (IsReadableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("Cannot cancel a stream that already has a reader"));
            }
            return ReadableStreamCancel(this, reason);
          }
          getReader(rawOptions = void 0) {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("getReader");
            }
            const options2 = convertReaderOptions(rawOptions, "First parameter");
            if (options2.mode === void 0) {
              return AcquireReadableStreamDefaultReader(this);
            }
            return AcquireReadableStreamBYOBReader(this);
          }
          pipeThrough(rawTransform, rawOptions = {}) {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("pipeThrough");
            }
            assertRequiredArgument(rawTransform, 1, "pipeThrough");
            const transform = convertReadableWritablePair(rawTransform, "First parameter");
            const options2 = convertPipeOptions(rawOptions, "Second parameter");
            if (IsReadableStreamLocked(this)) {
              throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked ReadableStream");
            }
            if (IsWritableStreamLocked(transform.writable)) {
              throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked WritableStream");
            }
            const promise = ReadableStreamPipeTo(this, transform.writable, options2.preventClose, options2.preventAbort, options2.preventCancel, options2.signal);
            setPromiseIsHandledToTrue(promise);
            return transform.readable;
          }
          pipeTo(destination, rawOptions = {}) {
            if (!IsReadableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$1("pipeTo"));
            }
            if (destination === void 0) {
              return promiseRejectedWith(`Parameter 1 is required in 'pipeTo'.`);
            }
            if (!IsWritableStream(destination)) {
              return promiseRejectedWith(new TypeError(`ReadableStream.prototype.pipeTo's first argument must be a WritableStream`));
            }
            let options2;
            try {
              options2 = convertPipeOptions(rawOptions, "Second parameter");
            } catch (e) {
              return promiseRejectedWith(e);
            }
            if (IsReadableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream"));
            }
            if (IsWritableStreamLocked(destination)) {
              return promiseRejectedWith(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream"));
            }
            return ReadableStreamPipeTo(this, destination, options2.preventClose, options2.preventAbort, options2.preventCancel, options2.signal);
          }
          tee() {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("tee");
            }
            const branches = ReadableStreamTee(this);
            return CreateArrayFromList(branches);
          }
          values(rawOptions = void 0) {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("values");
            }
            const options2 = convertIteratorOptions(rawOptions, "First parameter");
            return AcquireReadableStreamAsyncIterator(this, options2.preventCancel);
          }
        }
        Object.defineProperties(ReadableStream2.prototype, {
          cancel: { enumerable: true },
          getReader: { enumerable: true },
          pipeThrough: { enumerable: true },
          pipeTo: { enumerable: true },
          tee: { enumerable: true },
          values: { enumerable: true },
          locked: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStream2.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStream",
            configurable: true
          });
        }
        if (typeof SymbolPolyfill.asyncIterator === "symbol") {
          Object.defineProperty(ReadableStream2.prototype, SymbolPolyfill.asyncIterator, {
            value: ReadableStream2.prototype.values,
            writable: true,
            configurable: true
          });
        }
        function CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
          const stream = Object.create(ReadableStream2.prototype);
          InitializeReadableStream(stream);
          const controller = Object.create(ReadableStreamDefaultController.prototype);
          SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
          return stream;
        }
        function CreateReadableByteStream(startAlgorithm, pullAlgorithm, cancelAlgorithm) {
          const stream = Object.create(ReadableStream2.prototype);
          InitializeReadableStream(stream);
          const controller = Object.create(ReadableByteStreamController.prototype);
          SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, 0, void 0);
          return stream;
        }
        function InitializeReadableStream(stream) {
          stream._state = "readable";
          stream._reader = void 0;
          stream._storedError = void 0;
          stream._disturbed = false;
        }
        function IsReadableStream(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_readableStreamController")) {
            return false;
          }
          return x instanceof ReadableStream2;
        }
        function IsReadableStreamLocked(stream) {
          if (stream._reader === void 0) {
            return false;
          }
          return true;
        }
        function ReadableStreamCancel(stream, reason) {
          stream._disturbed = true;
          if (stream._state === "closed") {
            return promiseResolvedWith(void 0);
          }
          if (stream._state === "errored") {
            return promiseRejectedWith(stream._storedError);
          }
          ReadableStreamClose(stream);
          const reader = stream._reader;
          if (reader !== void 0 && IsReadableStreamBYOBReader(reader)) {
            reader._readIntoRequests.forEach((readIntoRequest) => {
              readIntoRequest._closeSteps(void 0);
            });
            reader._readIntoRequests = new SimpleQueue();
          }
          const sourceCancelPromise = stream._readableStreamController[CancelSteps](reason);
          return transformPromiseWith(sourceCancelPromise, noop2);
        }
        function ReadableStreamClose(stream) {
          stream._state = "closed";
          const reader = stream._reader;
          if (reader === void 0) {
            return;
          }
          defaultReaderClosedPromiseResolve(reader);
          if (IsReadableStreamDefaultReader(reader)) {
            reader._readRequests.forEach((readRequest) => {
              readRequest._closeSteps();
            });
            reader._readRequests = new SimpleQueue();
          }
        }
        function ReadableStreamError(stream, e) {
          stream._state = "errored";
          stream._storedError = e;
          const reader = stream._reader;
          if (reader === void 0) {
            return;
          }
          defaultReaderClosedPromiseReject(reader, e);
          if (IsReadableStreamDefaultReader(reader)) {
            reader._readRequests.forEach((readRequest) => {
              readRequest._errorSteps(e);
            });
            reader._readRequests = new SimpleQueue();
          } else {
            reader._readIntoRequests.forEach((readIntoRequest) => {
              readIntoRequest._errorSteps(e);
            });
            reader._readIntoRequests = new SimpleQueue();
          }
        }
        function streamBrandCheckException$1(name) {
          return new TypeError(`ReadableStream.prototype.${name} can only be used on a ReadableStream`);
        }
        function convertQueuingStrategyInit(init2, context) {
          assertDictionary(init2, context);
          const highWaterMark = init2 === null || init2 === void 0 ? void 0 : init2.highWaterMark;
          assertRequiredField(highWaterMark, "highWaterMark", "QueuingStrategyInit");
          return {
            highWaterMark: convertUnrestrictedDouble(highWaterMark)
          };
        }
        const byteLengthSizeFunction = (chunk) => {
          return chunk.byteLength;
        };
        Object.defineProperty(byteLengthSizeFunction, "name", {
          value: "size",
          configurable: true
        });
        class ByteLengthQueuingStrategy {
          constructor(options2) {
            assertRequiredArgument(options2, 1, "ByteLengthQueuingStrategy");
            options2 = convertQueuingStrategyInit(options2, "First parameter");
            this._byteLengthQueuingStrategyHighWaterMark = options2.highWaterMark;
          }
          get highWaterMark() {
            if (!IsByteLengthQueuingStrategy(this)) {
              throw byteLengthBrandCheckException("highWaterMark");
            }
            return this._byteLengthQueuingStrategyHighWaterMark;
          }
          get size() {
            if (!IsByteLengthQueuingStrategy(this)) {
              throw byteLengthBrandCheckException("size");
            }
            return byteLengthSizeFunction;
          }
        }
        Object.defineProperties(ByteLengthQueuingStrategy.prototype, {
          highWaterMark: { enumerable: true },
          size: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ByteLengthQueuingStrategy.prototype, SymbolPolyfill.toStringTag, {
            value: "ByteLengthQueuingStrategy",
            configurable: true
          });
        }
        function byteLengthBrandCheckException(name) {
          return new TypeError(`ByteLengthQueuingStrategy.prototype.${name} can only be used on a ByteLengthQueuingStrategy`);
        }
        function IsByteLengthQueuingStrategy(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_byteLengthQueuingStrategyHighWaterMark")) {
            return false;
          }
          return x instanceof ByteLengthQueuingStrategy;
        }
        const countSizeFunction = () => {
          return 1;
        };
        Object.defineProperty(countSizeFunction, "name", {
          value: "size",
          configurable: true
        });
        class CountQueuingStrategy {
          constructor(options2) {
            assertRequiredArgument(options2, 1, "CountQueuingStrategy");
            options2 = convertQueuingStrategyInit(options2, "First parameter");
            this._countQueuingStrategyHighWaterMark = options2.highWaterMark;
          }
          get highWaterMark() {
            if (!IsCountQueuingStrategy(this)) {
              throw countBrandCheckException("highWaterMark");
            }
            return this._countQueuingStrategyHighWaterMark;
          }
          get size() {
            if (!IsCountQueuingStrategy(this)) {
              throw countBrandCheckException("size");
            }
            return countSizeFunction;
          }
        }
        Object.defineProperties(CountQueuingStrategy.prototype, {
          highWaterMark: { enumerable: true },
          size: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(CountQueuingStrategy.prototype, SymbolPolyfill.toStringTag, {
            value: "CountQueuingStrategy",
            configurable: true
          });
        }
        function countBrandCheckException(name) {
          return new TypeError(`CountQueuingStrategy.prototype.${name} can only be used on a CountQueuingStrategy`);
        }
        function IsCountQueuingStrategy(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_countQueuingStrategyHighWaterMark")) {
            return false;
          }
          return x instanceof CountQueuingStrategy;
        }
        function convertTransformer(original, context) {
          assertDictionary(original, context);
          const flush = original === null || original === void 0 ? void 0 : original.flush;
          const readableType = original === null || original === void 0 ? void 0 : original.readableType;
          const start = original === null || original === void 0 ? void 0 : original.start;
          const transform = original === null || original === void 0 ? void 0 : original.transform;
          const writableType = original === null || original === void 0 ? void 0 : original.writableType;
          return {
            flush: flush === void 0 ? void 0 : convertTransformerFlushCallback(flush, original, `${context} has member 'flush' that`),
            readableType,
            start: start === void 0 ? void 0 : convertTransformerStartCallback(start, original, `${context} has member 'start' that`),
            transform: transform === void 0 ? void 0 : convertTransformerTransformCallback(transform, original, `${context} has member 'transform' that`),
            writableType
          };
        }
        function convertTransformerFlushCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => promiseCall(fn, original, [controller]);
        }
        function convertTransformerStartCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => reflectCall(fn, original, [controller]);
        }
        function convertTransformerTransformCallback(fn, original, context) {
          assertFunction(fn, context);
          return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
        }
        class TransformStream {
          constructor(rawTransformer = {}, rawWritableStrategy = {}, rawReadableStrategy = {}) {
            if (rawTransformer === void 0) {
              rawTransformer = null;
            }
            const writableStrategy = convertQueuingStrategy(rawWritableStrategy, "Second parameter");
            const readableStrategy = convertQueuingStrategy(rawReadableStrategy, "Third parameter");
            const transformer = convertTransformer(rawTransformer, "First parameter");
            if (transformer.readableType !== void 0) {
              throw new RangeError("Invalid readableType specified");
            }
            if (transformer.writableType !== void 0) {
              throw new RangeError("Invalid writableType specified");
            }
            const readableHighWaterMark = ExtractHighWaterMark(readableStrategy, 0);
            const readableSizeAlgorithm = ExtractSizeAlgorithm(readableStrategy);
            const writableHighWaterMark = ExtractHighWaterMark(writableStrategy, 1);
            const writableSizeAlgorithm = ExtractSizeAlgorithm(writableStrategy);
            let startPromise_resolve;
            const startPromise = newPromise((resolve2) => {
              startPromise_resolve = resolve2;
            });
            InitializeTransformStream(this, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
            SetUpTransformStreamDefaultControllerFromTransformer(this, transformer);
            if (transformer.start !== void 0) {
              startPromise_resolve(transformer.start(this._transformStreamController));
            } else {
              startPromise_resolve(void 0);
            }
          }
          get readable() {
            if (!IsTransformStream(this)) {
              throw streamBrandCheckException("readable");
            }
            return this._readable;
          }
          get writable() {
            if (!IsTransformStream(this)) {
              throw streamBrandCheckException("writable");
            }
            return this._writable;
          }
        }
        Object.defineProperties(TransformStream.prototype, {
          readable: { enumerable: true },
          writable: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(TransformStream.prototype, SymbolPolyfill.toStringTag, {
            value: "TransformStream",
            configurable: true
          });
        }
        function InitializeTransformStream(stream, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm) {
          function startAlgorithm() {
            return startPromise;
          }
          function writeAlgorithm(chunk) {
            return TransformStreamDefaultSinkWriteAlgorithm(stream, chunk);
          }
          function abortAlgorithm(reason) {
            return TransformStreamDefaultSinkAbortAlgorithm(stream, reason);
          }
          function closeAlgorithm() {
            return TransformStreamDefaultSinkCloseAlgorithm(stream);
          }
          stream._writable = CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, writableHighWaterMark, writableSizeAlgorithm);
          function pullAlgorithm() {
            return TransformStreamDefaultSourcePullAlgorithm(stream);
          }
          function cancelAlgorithm(reason) {
            TransformStreamErrorWritableAndUnblockWrite(stream, reason);
            return promiseResolvedWith(void 0);
          }
          stream._readable = CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
          stream._backpressure = void 0;
          stream._backpressureChangePromise = void 0;
          stream._backpressureChangePromise_resolve = void 0;
          TransformStreamSetBackpressure(stream, true);
          stream._transformStreamController = void 0;
        }
        function IsTransformStream(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_transformStreamController")) {
            return false;
          }
          return x instanceof TransformStream;
        }
        function TransformStreamError(stream, e) {
          ReadableStreamDefaultControllerError(stream._readable._readableStreamController, e);
          TransformStreamErrorWritableAndUnblockWrite(stream, e);
        }
        function TransformStreamErrorWritableAndUnblockWrite(stream, e) {
          TransformStreamDefaultControllerClearAlgorithms(stream._transformStreamController);
          WritableStreamDefaultControllerErrorIfNeeded(stream._writable._writableStreamController, e);
          if (stream._backpressure) {
            TransformStreamSetBackpressure(stream, false);
          }
        }
        function TransformStreamSetBackpressure(stream, backpressure) {
          if (stream._backpressureChangePromise !== void 0) {
            stream._backpressureChangePromise_resolve();
          }
          stream._backpressureChangePromise = newPromise((resolve2) => {
            stream._backpressureChangePromise_resolve = resolve2;
          });
          stream._backpressure = backpressure;
        }
        class TransformStreamDefaultController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get desiredSize() {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("desiredSize");
            }
            const readableController = this._controlledTransformStream._readable._readableStreamController;
            return ReadableStreamDefaultControllerGetDesiredSize(readableController);
          }
          enqueue(chunk = void 0) {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("enqueue");
            }
            TransformStreamDefaultControllerEnqueue(this, chunk);
          }
          error(reason = void 0) {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("error");
            }
            TransformStreamDefaultControllerError(this, reason);
          }
          terminate() {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("terminate");
            }
            TransformStreamDefaultControllerTerminate(this);
          }
        }
        Object.defineProperties(TransformStreamDefaultController.prototype, {
          enqueue: { enumerable: true },
          error: { enumerable: true },
          terminate: { enumerable: true },
          desiredSize: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(TransformStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
            value: "TransformStreamDefaultController",
            configurable: true
          });
        }
        function IsTransformStreamDefaultController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledTransformStream")) {
            return false;
          }
          return x instanceof TransformStreamDefaultController;
        }
        function SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm) {
          controller._controlledTransformStream = stream;
          stream._transformStreamController = controller;
          controller._transformAlgorithm = transformAlgorithm;
          controller._flushAlgorithm = flushAlgorithm;
        }
        function SetUpTransformStreamDefaultControllerFromTransformer(stream, transformer) {
          const controller = Object.create(TransformStreamDefaultController.prototype);
          let transformAlgorithm = (chunk) => {
            try {
              TransformStreamDefaultControllerEnqueue(controller, chunk);
              return promiseResolvedWith(void 0);
            } catch (transformResultE) {
              return promiseRejectedWith(transformResultE);
            }
          };
          let flushAlgorithm = () => promiseResolvedWith(void 0);
          if (transformer.transform !== void 0) {
            transformAlgorithm = (chunk) => transformer.transform(chunk, controller);
          }
          if (transformer.flush !== void 0) {
            flushAlgorithm = () => transformer.flush(controller);
          }
          SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm);
        }
        function TransformStreamDefaultControllerClearAlgorithms(controller) {
          controller._transformAlgorithm = void 0;
          controller._flushAlgorithm = void 0;
        }
        function TransformStreamDefaultControllerEnqueue(controller, chunk) {
          const stream = controller._controlledTransformStream;
          const readableController = stream._readable._readableStreamController;
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(readableController)) {
            throw new TypeError("Readable side is not in a state that permits enqueue");
          }
          try {
            ReadableStreamDefaultControllerEnqueue(readableController, chunk);
          } catch (e) {
            TransformStreamErrorWritableAndUnblockWrite(stream, e);
            throw stream._readable._storedError;
          }
          const backpressure = ReadableStreamDefaultControllerHasBackpressure(readableController);
          if (backpressure !== stream._backpressure) {
            TransformStreamSetBackpressure(stream, true);
          }
        }
        function TransformStreamDefaultControllerError(controller, e) {
          TransformStreamError(controller._controlledTransformStream, e);
        }
        function TransformStreamDefaultControllerPerformTransform(controller, chunk) {
          const transformPromise = controller._transformAlgorithm(chunk);
          return transformPromiseWith(transformPromise, void 0, (r) => {
            TransformStreamError(controller._controlledTransformStream, r);
            throw r;
          });
        }
        function TransformStreamDefaultControllerTerminate(controller) {
          const stream = controller._controlledTransformStream;
          const readableController = stream._readable._readableStreamController;
          ReadableStreamDefaultControllerClose(readableController);
          const error2 = new TypeError("TransformStream terminated");
          TransformStreamErrorWritableAndUnblockWrite(stream, error2);
        }
        function TransformStreamDefaultSinkWriteAlgorithm(stream, chunk) {
          const controller = stream._transformStreamController;
          if (stream._backpressure) {
            const backpressureChangePromise = stream._backpressureChangePromise;
            return transformPromiseWith(backpressureChangePromise, () => {
              const writable2 = stream._writable;
              const state = writable2._state;
              if (state === "erroring") {
                throw writable2._storedError;
              }
              return TransformStreamDefaultControllerPerformTransform(controller, chunk);
            });
          }
          return TransformStreamDefaultControllerPerformTransform(controller, chunk);
        }
        function TransformStreamDefaultSinkAbortAlgorithm(stream, reason) {
          TransformStreamError(stream, reason);
          return promiseResolvedWith(void 0);
        }
        function TransformStreamDefaultSinkCloseAlgorithm(stream) {
          const readable = stream._readable;
          const controller = stream._transformStreamController;
          const flushPromise = controller._flushAlgorithm();
          TransformStreamDefaultControllerClearAlgorithms(controller);
          return transformPromiseWith(flushPromise, () => {
            if (readable._state === "errored") {
              throw readable._storedError;
            }
            ReadableStreamDefaultControllerClose(readable._readableStreamController);
          }, (r) => {
            TransformStreamError(stream, r);
            throw readable._storedError;
          });
        }
        function TransformStreamDefaultSourcePullAlgorithm(stream) {
          TransformStreamSetBackpressure(stream, false);
          return stream._backpressureChangePromise;
        }
        function defaultControllerBrandCheckException(name) {
          return new TypeError(`TransformStreamDefaultController.prototype.${name} can only be used on a TransformStreamDefaultController`);
        }
        function streamBrandCheckException(name) {
          return new TypeError(`TransformStream.prototype.${name} can only be used on a TransformStream`);
        }
        exports2.ByteLengthQueuingStrategy = ByteLengthQueuingStrategy;
        exports2.CountQueuingStrategy = CountQueuingStrategy;
        exports2.ReadableByteStreamController = ReadableByteStreamController;
        exports2.ReadableStream = ReadableStream2;
        exports2.ReadableStreamBYOBReader = ReadableStreamBYOBReader;
        exports2.ReadableStreamBYOBRequest = ReadableStreamBYOBRequest;
        exports2.ReadableStreamDefaultController = ReadableStreamDefaultController;
        exports2.ReadableStreamDefaultReader = ReadableStreamDefaultReader;
        exports2.TransformStream = TransformStream;
        exports2.TransformStreamDefaultController = TransformStreamDefaultController;
        exports2.WritableStream = WritableStream;
        exports2.WritableStreamDefaultController = WritableStreamDefaultController;
        exports2.WritableStreamDefaultWriter = WritableStreamDefaultWriter;
        Object.defineProperty(exports2, "__esModule", { value: true });
      });
    })(ponyfill_es2018, ponyfill_es2018.exports);
    POOL_SIZE$1 = 65536;
    if (!globalThis.ReadableStream) {
      try {
        Object.assign(globalThis, require("stream/web"));
      } catch (error2) {
        Object.assign(globalThis, ponyfill_es2018.exports);
      }
    }
    try {
      const { Blob: Blob3 } = require("buffer");
      if (Blob3 && !Blob3.prototype.stream) {
        Blob3.prototype.stream = function name(params) {
          let position = 0;
          const blob = this;
          return new ReadableStream({
            type: "bytes",
            async pull(ctrl) {
              const chunk = blob.slice(position, Math.min(blob.size, position + POOL_SIZE$1));
              const buffer = await chunk.arrayBuffer();
              position += buffer.byteLength;
              ctrl.enqueue(new Uint8Array(buffer));
              if (position === blob.size) {
                ctrl.close();
              }
            }
          });
        };
      }
    } catch (error2) {
    }
    POOL_SIZE = 65536;
    _Blob = class Blob {
      #parts = [];
      #type = "";
      #size = 0;
      constructor(blobParts = [], options2 = {}) {
        let size = 0;
        const parts = blobParts.map((element) => {
          let part;
          if (ArrayBuffer.isView(element)) {
            part = new Uint8Array(element.buffer.slice(element.byteOffset, element.byteOffset + element.byteLength));
          } else if (element instanceof ArrayBuffer) {
            part = new Uint8Array(element.slice(0));
          } else if (element instanceof Blob) {
            part = element;
          } else {
            part = new TextEncoder().encode(element);
          }
          size += ArrayBuffer.isView(part) ? part.byteLength : part.size;
          return part;
        });
        const type = options2.type === void 0 ? "" : String(options2.type);
        this.#type = /[^\u0020-\u007E]/.test(type) ? "" : type;
        this.#size = size;
        this.#parts = parts;
      }
      get size() {
        return this.#size;
      }
      get type() {
        return this.#type;
      }
      async text() {
        const decoder = new TextDecoder();
        let str = "";
        for await (let part of toIterator(this.#parts, false)) {
          str += decoder.decode(part, { stream: true });
        }
        str += decoder.decode();
        return str;
      }
      async arrayBuffer() {
        const data = new Uint8Array(this.size);
        let offset = 0;
        for await (const chunk of toIterator(this.#parts, false)) {
          data.set(chunk, offset);
          offset += chunk.length;
        }
        return data.buffer;
      }
      stream() {
        const it = toIterator(this.#parts, true);
        return new ReadableStream({
          type: "bytes",
          async pull(ctrl) {
            const chunk = await it.next();
            chunk.done ? ctrl.close() : ctrl.enqueue(chunk.value);
          }
        });
      }
      slice(start = 0, end = this.size, type = "") {
        const { size } = this;
        let relativeStart = start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
        let relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);
        const span = Math.max(relativeEnd - relativeStart, 0);
        const parts = this.#parts;
        const blobParts = [];
        let added = 0;
        for (const part of parts) {
          if (added >= span) {
            break;
          }
          const size2 = ArrayBuffer.isView(part) ? part.byteLength : part.size;
          if (relativeStart && size2 <= relativeStart) {
            relativeStart -= size2;
            relativeEnd -= size2;
          } else {
            let chunk;
            if (ArrayBuffer.isView(part)) {
              chunk = part.subarray(relativeStart, Math.min(size2, relativeEnd));
              added += chunk.byteLength;
            } else {
              chunk = part.slice(relativeStart, Math.min(size2, relativeEnd));
              added += chunk.size;
            }
            blobParts.push(chunk);
            relativeStart = 0;
          }
        }
        const blob = new Blob([], { type: String(type).toLowerCase() });
        blob.#size = span;
        blob.#parts = blobParts;
        return blob;
      }
      get [Symbol.toStringTag]() {
        return "Blob";
      }
      static [Symbol.hasInstance](object) {
        return object && typeof object === "object" && typeof object.constructor === "function" && (typeof object.stream === "function" || typeof object.arrayBuffer === "function") && /^(Blob|File)$/.test(object[Symbol.toStringTag]);
      }
    };
    Object.defineProperties(_Blob.prototype, {
      size: { enumerable: true },
      type: { enumerable: true },
      slice: { enumerable: true }
    });
    Blob2 = _Blob;
    Blob$1 = Blob2;
    FetchBaseError = class extends Error {
      constructor(message, type) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.type = type;
      }
      get name() {
        return this.constructor.name;
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
    };
    FetchError = class extends FetchBaseError {
      constructor(message, type, systemError) {
        super(message, type);
        if (systemError) {
          this.code = this.errno = systemError.code;
          this.erroredSysCall = systemError.syscall;
        }
      }
    };
    NAME = Symbol.toStringTag;
    isURLSearchParameters = (object) => {
      return typeof object === "object" && typeof object.append === "function" && typeof object.delete === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.has === "function" && typeof object.set === "function" && typeof object.sort === "function" && object[NAME] === "URLSearchParams";
    };
    isBlob = (object) => {
      return typeof object === "object" && typeof object.arrayBuffer === "function" && typeof object.type === "string" && typeof object.stream === "function" && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[NAME]);
    };
    isAbortSignal = (object) => {
      return typeof object === "object" && (object[NAME] === "AbortSignal" || object[NAME] === "EventTarget");
    };
    carriage = "\r\n";
    dashes = "-".repeat(2);
    carriageLength = Buffer.byteLength(carriage);
    getFooter = (boundary) => `${dashes}${boundary}${dashes}${carriage.repeat(2)}`;
    getBoundary = () => (0, import_crypto.randomBytes)(8).toString("hex");
    INTERNALS$2 = Symbol("Body internals");
    Body = class {
      constructor(body, {
        size = 0
      } = {}) {
        let boundary = null;
        if (body === null) {
          body = null;
        } else if (isURLSearchParameters(body)) {
          body = Buffer.from(body.toString());
        } else if (isBlob(body))
          ;
        else if (Buffer.isBuffer(body))
          ;
        else if (import_util.types.isAnyArrayBuffer(body)) {
          body = Buffer.from(body);
        } else if (ArrayBuffer.isView(body)) {
          body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
        } else if (body instanceof import_stream.default)
          ;
        else if (isFormData(body)) {
          boundary = `NodeFetchFormDataBoundary${getBoundary()}`;
          body = import_stream.default.Readable.from(formDataIterator(body, boundary));
        } else {
          body = Buffer.from(String(body));
        }
        this[INTERNALS$2] = {
          body,
          boundary,
          disturbed: false,
          error: null
        };
        this.size = size;
        if (body instanceof import_stream.default) {
          body.on("error", (error_) => {
            const error2 = error_ instanceof FetchBaseError ? error_ : new FetchError(`Invalid response body while trying to fetch ${this.url}: ${error_.message}`, "system", error_);
            this[INTERNALS$2].error = error2;
          });
        }
      }
      get body() {
        return this[INTERNALS$2].body;
      }
      get bodyUsed() {
        return this[INTERNALS$2].disturbed;
      }
      async arrayBuffer() {
        const { buffer, byteOffset, byteLength } = await consumeBody(this);
        return buffer.slice(byteOffset, byteOffset + byteLength);
      }
      async blob() {
        const ct = this.headers && this.headers.get("content-type") || this[INTERNALS$2].body && this[INTERNALS$2].body.type || "";
        const buf = await this.buffer();
        return new Blob$1([buf], {
          type: ct
        });
      }
      async json() {
        const buffer = await consumeBody(this);
        return JSON.parse(buffer.toString());
      }
      async text() {
        const buffer = await consumeBody(this);
        return buffer.toString();
      }
      buffer() {
        return consumeBody(this);
      }
    };
    Object.defineProperties(Body.prototype, {
      body: { enumerable: true },
      bodyUsed: { enumerable: true },
      arrayBuffer: { enumerable: true },
      blob: { enumerable: true },
      json: { enumerable: true },
      text: { enumerable: true }
    });
    clone = (instance, highWaterMark) => {
      let p1;
      let p2;
      let { body } = instance;
      if (instance.bodyUsed) {
        throw new Error("cannot clone body after it is used");
      }
      if (body instanceof import_stream.default && typeof body.getBoundary !== "function") {
        p1 = new import_stream.PassThrough({ highWaterMark });
        p2 = new import_stream.PassThrough({ highWaterMark });
        body.pipe(p1);
        body.pipe(p2);
        instance[INTERNALS$2].body = p1;
        body = p2;
      }
      return body;
    };
    extractContentType = (body, request) => {
      if (body === null) {
        return null;
      }
      if (typeof body === "string") {
        return "text/plain;charset=UTF-8";
      }
      if (isURLSearchParameters(body)) {
        return "application/x-www-form-urlencoded;charset=UTF-8";
      }
      if (isBlob(body)) {
        return body.type || null;
      }
      if (Buffer.isBuffer(body) || import_util.types.isAnyArrayBuffer(body) || ArrayBuffer.isView(body)) {
        return null;
      }
      if (body && typeof body.getBoundary === "function") {
        return `multipart/form-data;boundary=${body.getBoundary()}`;
      }
      if (isFormData(body)) {
        return `multipart/form-data; boundary=${request[INTERNALS$2].boundary}`;
      }
      if (body instanceof import_stream.default) {
        return null;
      }
      return "text/plain;charset=UTF-8";
    };
    getTotalBytes = (request) => {
      const { body } = request;
      if (body === null) {
        return 0;
      }
      if (isBlob(body)) {
        return body.size;
      }
      if (Buffer.isBuffer(body)) {
        return body.length;
      }
      if (body && typeof body.getLengthSync === "function") {
        return body.hasKnownLength && body.hasKnownLength() ? body.getLengthSync() : null;
      }
      if (isFormData(body)) {
        return getFormDataLength(request[INTERNALS$2].boundary);
      }
      return null;
    };
    writeToStream = (dest, { body }) => {
      if (body === null) {
        dest.end();
      } else if (isBlob(body)) {
        import_stream.default.Readable.from(body.stream()).pipe(dest);
      } else if (Buffer.isBuffer(body)) {
        dest.write(body);
        dest.end();
      } else {
        body.pipe(dest);
      }
    };
    validateHeaderName = typeof import_http.default.validateHeaderName === "function" ? import_http.default.validateHeaderName : (name) => {
      if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
        const error2 = new TypeError(`Header name must be a valid HTTP token [${name}]`);
        Object.defineProperty(error2, "code", { value: "ERR_INVALID_HTTP_TOKEN" });
        throw error2;
      }
    };
    validateHeaderValue = typeof import_http.default.validateHeaderValue === "function" ? import_http.default.validateHeaderValue : (name, value) => {
      if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
        const error2 = new TypeError(`Invalid character in header content ["${name}"]`);
        Object.defineProperty(error2, "code", { value: "ERR_INVALID_CHAR" });
        throw error2;
      }
    };
    Headers = class extends URLSearchParams {
      constructor(init2) {
        let result = [];
        if (init2 instanceof Headers) {
          const raw = init2.raw();
          for (const [name, values] of Object.entries(raw)) {
            result.push(...values.map((value) => [name, value]));
          }
        } else if (init2 == null)
          ;
        else if (typeof init2 === "object" && !import_util.types.isBoxedPrimitive(init2)) {
          const method = init2[Symbol.iterator];
          if (method == null) {
            result.push(...Object.entries(init2));
          } else {
            if (typeof method !== "function") {
              throw new TypeError("Header pairs must be iterable");
            }
            result = [...init2].map((pair) => {
              if (typeof pair !== "object" || import_util.types.isBoxedPrimitive(pair)) {
                throw new TypeError("Each header pair must be an iterable object");
              }
              return [...pair];
            }).map((pair) => {
              if (pair.length !== 2) {
                throw new TypeError("Each header pair must be a name/value tuple");
              }
              return [...pair];
            });
          }
        } else {
          throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
        }
        result = result.length > 0 ? result.map(([name, value]) => {
          validateHeaderName(name);
          validateHeaderValue(name, String(value));
          return [String(name).toLowerCase(), String(value)];
        }) : void 0;
        super(result);
        return new Proxy(this, {
          get(target, p, receiver) {
            switch (p) {
              case "append":
              case "set":
                return (name, value) => {
                  validateHeaderName(name);
                  validateHeaderValue(name, String(value));
                  return URLSearchParams.prototype[p].call(target, String(name).toLowerCase(), String(value));
                };
              case "delete":
              case "has":
              case "getAll":
                return (name) => {
                  validateHeaderName(name);
                  return URLSearchParams.prototype[p].call(target, String(name).toLowerCase());
                };
              case "keys":
                return () => {
                  target.sort();
                  return new Set(URLSearchParams.prototype.keys.call(target)).keys();
                };
              default:
                return Reflect.get(target, p, receiver);
            }
          }
        });
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
      toString() {
        return Object.prototype.toString.call(this);
      }
      get(name) {
        const values = this.getAll(name);
        if (values.length === 0) {
          return null;
        }
        let value = values.join(", ");
        if (/^content-encoding$/i.test(name)) {
          value = value.toLowerCase();
        }
        return value;
      }
      forEach(callback, thisArg = void 0) {
        for (const name of this.keys()) {
          Reflect.apply(callback, thisArg, [this.get(name), name, this]);
        }
      }
      *values() {
        for (const name of this.keys()) {
          yield this.get(name);
        }
      }
      *entries() {
        for (const name of this.keys()) {
          yield [name, this.get(name)];
        }
      }
      [Symbol.iterator]() {
        return this.entries();
      }
      raw() {
        return [...this.keys()].reduce((result, key) => {
          result[key] = this.getAll(key);
          return result;
        }, {});
      }
      [Symbol.for("nodejs.util.inspect.custom")]() {
        return [...this.keys()].reduce((result, key) => {
          const values = this.getAll(key);
          if (key === "host") {
            result[key] = values[0];
          } else {
            result[key] = values.length > 1 ? values : values[0];
          }
          return result;
        }, {});
      }
    };
    Object.defineProperties(Headers.prototype, ["get", "entries", "forEach", "values"].reduce((result, property) => {
      result[property] = { enumerable: true };
      return result;
    }, {}));
    redirectStatus = new Set([301, 302, 303, 307, 308]);
    isRedirect = (code) => {
      return redirectStatus.has(code);
    };
    INTERNALS$1 = Symbol("Response internals");
    Response = class extends Body {
      constructor(body = null, options2 = {}) {
        super(body, options2);
        const status = options2.status != null ? options2.status : 200;
        const headers = new Headers(options2.headers);
        if (body !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(body);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        this[INTERNALS$1] = {
          type: "default",
          url: options2.url,
          status,
          statusText: options2.statusText || "",
          headers,
          counter: options2.counter,
          highWaterMark: options2.highWaterMark
        };
      }
      get type() {
        return this[INTERNALS$1].type;
      }
      get url() {
        return this[INTERNALS$1].url || "";
      }
      get status() {
        return this[INTERNALS$1].status;
      }
      get ok() {
        return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
      }
      get redirected() {
        return this[INTERNALS$1].counter > 0;
      }
      get statusText() {
        return this[INTERNALS$1].statusText;
      }
      get headers() {
        return this[INTERNALS$1].headers;
      }
      get highWaterMark() {
        return this[INTERNALS$1].highWaterMark;
      }
      clone() {
        return new Response(clone(this, this.highWaterMark), {
          type: this.type,
          url: this.url,
          status: this.status,
          statusText: this.statusText,
          headers: this.headers,
          ok: this.ok,
          redirected: this.redirected,
          size: this.size
        });
      }
      static redirect(url, status = 302) {
        if (!isRedirect(status)) {
          throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
        }
        return new Response(null, {
          headers: {
            location: new URL(url).toString()
          },
          status
        });
      }
      static error() {
        const response = new Response(null, { status: 0, statusText: "" });
        response[INTERNALS$1].type = "error";
        return response;
      }
      get [Symbol.toStringTag]() {
        return "Response";
      }
    };
    Object.defineProperties(Response.prototype, {
      type: { enumerable: true },
      url: { enumerable: true },
      status: { enumerable: true },
      ok: { enumerable: true },
      redirected: { enumerable: true },
      statusText: { enumerable: true },
      headers: { enumerable: true },
      clone: { enumerable: true }
    });
    getSearch = (parsedURL) => {
      if (parsedURL.search) {
        return parsedURL.search;
      }
      const lastOffset = parsedURL.href.length - 1;
      const hash2 = parsedURL.hash || (parsedURL.href[lastOffset] === "#" ? "#" : "");
      return parsedURL.href[lastOffset - hash2.length] === "?" ? "?" : "";
    };
    INTERNALS = Symbol("Request internals");
    isRequest = (object) => {
      return typeof object === "object" && typeof object[INTERNALS] === "object";
    };
    Request = class extends Body {
      constructor(input, init2 = {}) {
        let parsedURL;
        if (isRequest(input)) {
          parsedURL = new URL(input.url);
        } else {
          parsedURL = new URL(input);
          input = {};
        }
        let method = init2.method || input.method || "GET";
        method = method.toUpperCase();
        if ((init2.body != null || isRequest(input)) && input.body !== null && (method === "GET" || method === "HEAD")) {
          throw new TypeError("Request with GET/HEAD method cannot have body");
        }
        const inputBody = init2.body ? init2.body : isRequest(input) && input.body !== null ? clone(input) : null;
        super(inputBody, {
          size: init2.size || input.size || 0
        });
        const headers = new Headers(init2.headers || input.headers || {});
        if (inputBody !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(inputBody, this);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        let signal = isRequest(input) ? input.signal : null;
        if ("signal" in init2) {
          signal = init2.signal;
        }
        if (signal != null && !isAbortSignal(signal)) {
          throw new TypeError("Expected signal to be an instanceof AbortSignal or EventTarget");
        }
        this[INTERNALS] = {
          method,
          redirect: init2.redirect || input.redirect || "follow",
          headers,
          parsedURL,
          signal
        };
        this.follow = init2.follow === void 0 ? input.follow === void 0 ? 20 : input.follow : init2.follow;
        this.compress = init2.compress === void 0 ? input.compress === void 0 ? true : input.compress : init2.compress;
        this.counter = init2.counter || input.counter || 0;
        this.agent = init2.agent || input.agent;
        this.highWaterMark = init2.highWaterMark || input.highWaterMark || 16384;
        this.insecureHTTPParser = init2.insecureHTTPParser || input.insecureHTTPParser || false;
      }
      get method() {
        return this[INTERNALS].method;
      }
      get url() {
        return (0, import_url.format)(this[INTERNALS].parsedURL);
      }
      get headers() {
        return this[INTERNALS].headers;
      }
      get redirect() {
        return this[INTERNALS].redirect;
      }
      get signal() {
        return this[INTERNALS].signal;
      }
      clone() {
        return new Request(this);
      }
      get [Symbol.toStringTag]() {
        return "Request";
      }
    };
    Object.defineProperties(Request.prototype, {
      method: { enumerable: true },
      url: { enumerable: true },
      headers: { enumerable: true },
      redirect: { enumerable: true },
      clone: { enumerable: true },
      signal: { enumerable: true }
    });
    getNodeRequestOptions = (request) => {
      const { parsedURL } = request[INTERNALS];
      const headers = new Headers(request[INTERNALS].headers);
      if (!headers.has("Accept")) {
        headers.set("Accept", "*/*");
      }
      let contentLengthValue = null;
      if (request.body === null && /^(post|put)$/i.test(request.method)) {
        contentLengthValue = "0";
      }
      if (request.body !== null) {
        const totalBytes = getTotalBytes(request);
        if (typeof totalBytes === "number" && !Number.isNaN(totalBytes)) {
          contentLengthValue = String(totalBytes);
        }
      }
      if (contentLengthValue) {
        headers.set("Content-Length", contentLengthValue);
      }
      if (!headers.has("User-Agent")) {
        headers.set("User-Agent", "node-fetch");
      }
      if (request.compress && !headers.has("Accept-Encoding")) {
        headers.set("Accept-Encoding", "gzip,deflate,br");
      }
      let { agent } = request;
      if (typeof agent === "function") {
        agent = agent(parsedURL);
      }
      if (!headers.has("Connection") && !agent) {
        headers.set("Connection", "close");
      }
      const search = getSearch(parsedURL);
      const requestOptions = {
        path: parsedURL.pathname + search,
        pathname: parsedURL.pathname,
        hostname: parsedURL.hostname,
        protocol: parsedURL.protocol,
        port: parsedURL.port,
        hash: parsedURL.hash,
        search: parsedURL.search,
        query: parsedURL.query,
        href: parsedURL.href,
        method: request.method,
        headers: headers[Symbol.for("nodejs.util.inspect.custom")](),
        insecureHTTPParser: request.insecureHTTPParser,
        agent
      };
      return requestOptions;
    };
    AbortError = class extends FetchBaseError {
      constructor(message, type = "aborted") {
        super(message, type);
      }
    };
    supportedSchemas = new Set(["data:", "http:", "https:"]);
  }
});

// node_modules/@sveltejs/adapter-netlify/files/shims.js
var init_shims = __esm({
  "node_modules/@sveltejs/adapter-netlify/files/shims.js"() {
    init_install_fetch();
  }
});

// node_modules/yaml/dist/PlainValue-ec8e588e.js
var require_PlainValue_ec8e588e = __commonJS({
  "node_modules/yaml/dist/PlainValue-ec8e588e.js"(exports) {
    init_shims();
    "use strict";
    var Char = {
      ANCHOR: "&",
      COMMENT: "#",
      TAG: "!",
      DIRECTIVES_END: "-",
      DOCUMENT_END: "."
    };
    var Type = {
      ALIAS: "ALIAS",
      BLANK_LINE: "BLANK_LINE",
      BLOCK_FOLDED: "BLOCK_FOLDED",
      BLOCK_LITERAL: "BLOCK_LITERAL",
      COMMENT: "COMMENT",
      DIRECTIVE: "DIRECTIVE",
      DOCUMENT: "DOCUMENT",
      FLOW_MAP: "FLOW_MAP",
      FLOW_SEQ: "FLOW_SEQ",
      MAP: "MAP",
      MAP_KEY: "MAP_KEY",
      MAP_VALUE: "MAP_VALUE",
      PLAIN: "PLAIN",
      QUOTE_DOUBLE: "QUOTE_DOUBLE",
      QUOTE_SINGLE: "QUOTE_SINGLE",
      SEQ: "SEQ",
      SEQ_ITEM: "SEQ_ITEM"
    };
    var defaultTagPrefix = "tag:yaml.org,2002:";
    var defaultTags = {
      MAP: "tag:yaml.org,2002:map",
      SEQ: "tag:yaml.org,2002:seq",
      STR: "tag:yaml.org,2002:str"
    };
    function findLineStarts(src2) {
      const ls = [0];
      let offset = src2.indexOf("\n");
      while (offset !== -1) {
        offset += 1;
        ls.push(offset);
        offset = src2.indexOf("\n", offset);
      }
      return ls;
    }
    function getSrcInfo(cst) {
      let lineStarts, src2;
      if (typeof cst === "string") {
        lineStarts = findLineStarts(cst);
        src2 = cst;
      } else {
        if (Array.isArray(cst))
          cst = cst[0];
        if (cst && cst.context) {
          if (!cst.lineStarts)
            cst.lineStarts = findLineStarts(cst.context.src);
          lineStarts = cst.lineStarts;
          src2 = cst.context.src;
        }
      }
      return {
        lineStarts,
        src: src2
      };
    }
    function getLinePos(offset, cst) {
      if (typeof offset !== "number" || offset < 0)
        return null;
      const {
        lineStarts,
        src: src2
      } = getSrcInfo(cst);
      if (!lineStarts || !src2 || offset > src2.length)
        return null;
      for (let i = 0; i < lineStarts.length; ++i) {
        const start = lineStarts[i];
        if (offset < start) {
          return {
            line: i,
            col: offset - lineStarts[i - 1] + 1
          };
        }
        if (offset === start)
          return {
            line: i + 1,
            col: 1
          };
      }
      const line = lineStarts.length;
      return {
        line,
        col: offset - lineStarts[line - 1] + 1
      };
    }
    function getLine(line, cst) {
      const {
        lineStarts,
        src: src2
      } = getSrcInfo(cst);
      if (!lineStarts || !(line >= 1) || line > lineStarts.length)
        return null;
      const start = lineStarts[line - 1];
      let end = lineStarts[line];
      while (end && end > start && src2[end - 1] === "\n")
        --end;
      return src2.slice(start, end);
    }
    function getPrettyContext({
      start,
      end
    }, cst, maxWidth = 80) {
      let src2 = getLine(start.line, cst);
      if (!src2)
        return null;
      let {
        col
      } = start;
      if (src2.length > maxWidth) {
        if (col <= maxWidth - 10) {
          src2 = src2.substr(0, maxWidth - 1) + "\u2026";
        } else {
          const halfWidth = Math.round(maxWidth / 2);
          if (src2.length > col + halfWidth)
            src2 = src2.substr(0, col + halfWidth - 1) + "\u2026";
          col -= src2.length - maxWidth;
          src2 = "\u2026" + src2.substr(1 - maxWidth);
        }
      }
      let errLen = 1;
      let errEnd = "";
      if (end) {
        if (end.line === start.line && col + (end.col - start.col) <= maxWidth + 1) {
          errLen = end.col - start.col;
        } else {
          errLen = Math.min(src2.length + 1, maxWidth) - col;
          errEnd = "\u2026";
        }
      }
      const offset = col > 1 ? " ".repeat(col - 1) : "";
      const err = "^".repeat(errLen);
      return `${src2}
${offset}${err}${errEnd}`;
    }
    var Range = class {
      static copy(orig) {
        return new Range(orig.start, orig.end);
      }
      constructor(start, end) {
        this.start = start;
        this.end = end || start;
      }
      isEmpty() {
        return typeof this.start !== "number" || !this.end || this.end <= this.start;
      }
      setOrigRange(cr, offset) {
        const {
          start,
          end
        } = this;
        if (cr.length === 0 || end <= cr[0]) {
          this.origStart = start;
          this.origEnd = end;
          return offset;
        }
        let i = offset;
        while (i < cr.length) {
          if (cr[i] > start)
            break;
          else
            ++i;
        }
        this.origStart = start + i;
        const nextOffset = i;
        while (i < cr.length) {
          if (cr[i] >= end)
            break;
          else
            ++i;
        }
        this.origEnd = end + i;
        return nextOffset;
      }
    };
    var Node = class {
      static addStringTerminator(src2, offset, str) {
        if (str[str.length - 1] === "\n")
          return str;
        const next = Node.endOfWhiteSpace(src2, offset);
        return next >= src2.length || src2[next] === "\n" ? str + "\n" : str;
      }
      static atDocumentBoundary(src2, offset, sep) {
        const ch0 = src2[offset];
        if (!ch0)
          return true;
        const prev = src2[offset - 1];
        if (prev && prev !== "\n")
          return false;
        if (sep) {
          if (ch0 !== sep)
            return false;
        } else {
          if (ch0 !== Char.DIRECTIVES_END && ch0 !== Char.DOCUMENT_END)
            return false;
        }
        const ch1 = src2[offset + 1];
        const ch2 = src2[offset + 2];
        if (ch1 !== ch0 || ch2 !== ch0)
          return false;
        const ch3 = src2[offset + 3];
        return !ch3 || ch3 === "\n" || ch3 === "	" || ch3 === " ";
      }
      static endOfIdentifier(src2, offset) {
        let ch = src2[offset];
        const isVerbatim = ch === "<";
        const notOk = isVerbatim ? ["\n", "	", " ", ">"] : ["\n", "	", " ", "[", "]", "{", "}", ","];
        while (ch && notOk.indexOf(ch) === -1)
          ch = src2[offset += 1];
        if (isVerbatim && ch === ">")
          offset += 1;
        return offset;
      }
      static endOfIndent(src2, offset) {
        let ch = src2[offset];
        while (ch === " ")
          ch = src2[offset += 1];
        return offset;
      }
      static endOfLine(src2, offset) {
        let ch = src2[offset];
        while (ch && ch !== "\n")
          ch = src2[offset += 1];
        return offset;
      }
      static endOfWhiteSpace(src2, offset) {
        let ch = src2[offset];
        while (ch === "	" || ch === " ")
          ch = src2[offset += 1];
        return offset;
      }
      static startOfLine(src2, offset) {
        let ch = src2[offset - 1];
        if (ch === "\n")
          return offset;
        while (ch && ch !== "\n")
          ch = src2[offset -= 1];
        return offset + 1;
      }
      static endOfBlockIndent(src2, indent, lineStart) {
        const inEnd = Node.endOfIndent(src2, lineStart);
        if (inEnd > lineStart + indent) {
          return inEnd;
        } else {
          const wsEnd = Node.endOfWhiteSpace(src2, inEnd);
          const ch = src2[wsEnd];
          if (!ch || ch === "\n")
            return wsEnd;
        }
        return null;
      }
      static atBlank(src2, offset, endAsBlank) {
        const ch = src2[offset];
        return ch === "\n" || ch === "	" || ch === " " || endAsBlank && !ch;
      }
      static nextNodeIsIndented(ch, indentDiff, indicatorAsIndent) {
        if (!ch || indentDiff < 0)
          return false;
        if (indentDiff > 0)
          return true;
        return indicatorAsIndent && ch === "-";
      }
      static normalizeOffset(src2, offset) {
        const ch = src2[offset];
        return !ch ? offset : ch !== "\n" && src2[offset - 1] === "\n" ? offset - 1 : Node.endOfWhiteSpace(src2, offset);
      }
      static foldNewline(src2, offset, indent) {
        let inCount = 0;
        let error2 = false;
        let fold = "";
        let ch = src2[offset + 1];
        while (ch === " " || ch === "	" || ch === "\n") {
          switch (ch) {
            case "\n":
              inCount = 0;
              offset += 1;
              fold += "\n";
              break;
            case "	":
              if (inCount <= indent)
                error2 = true;
              offset = Node.endOfWhiteSpace(src2, offset + 2) - 1;
              break;
            case " ":
              inCount += 1;
              offset += 1;
              break;
          }
          ch = src2[offset + 1];
        }
        if (!fold)
          fold = " ";
        if (ch && inCount <= indent)
          error2 = true;
        return {
          fold,
          offset,
          error: error2
        };
      }
      constructor(type, props, context) {
        Object.defineProperty(this, "context", {
          value: context || null,
          writable: true
        });
        this.error = null;
        this.range = null;
        this.valueRange = null;
        this.props = props || [];
        this.type = type;
        this.value = null;
      }
      getPropValue(idx, key, skipKey) {
        if (!this.context)
          return null;
        const {
          src: src2
        } = this.context;
        const prop = this.props[idx];
        return prop && src2[prop.start] === key ? src2.slice(prop.start + (skipKey ? 1 : 0), prop.end) : null;
      }
      get anchor() {
        for (let i = 0; i < this.props.length; ++i) {
          const anchor = this.getPropValue(i, Char.ANCHOR, true);
          if (anchor != null)
            return anchor;
        }
        return null;
      }
      get comment() {
        const comments = [];
        for (let i = 0; i < this.props.length; ++i) {
          const comment = this.getPropValue(i, Char.COMMENT, true);
          if (comment != null)
            comments.push(comment);
        }
        return comments.length > 0 ? comments.join("\n") : null;
      }
      commentHasRequiredWhitespace(start) {
        const {
          src: src2
        } = this.context;
        if (this.header && start === this.header.end)
          return false;
        if (!this.valueRange)
          return false;
        const {
          end
        } = this.valueRange;
        return start !== end || Node.atBlank(src2, end - 1);
      }
      get hasComment() {
        if (this.context) {
          const {
            src: src2
          } = this.context;
          for (let i = 0; i < this.props.length; ++i) {
            if (src2[this.props[i].start] === Char.COMMENT)
              return true;
          }
        }
        return false;
      }
      get hasProps() {
        if (this.context) {
          const {
            src: src2
          } = this.context;
          for (let i = 0; i < this.props.length; ++i) {
            if (src2[this.props[i].start] !== Char.COMMENT)
              return true;
          }
        }
        return false;
      }
      get includesTrailingLines() {
        return false;
      }
      get jsonLike() {
        const jsonLikeTypes = [Type.FLOW_MAP, Type.FLOW_SEQ, Type.QUOTE_DOUBLE, Type.QUOTE_SINGLE];
        return jsonLikeTypes.indexOf(this.type) !== -1;
      }
      get rangeAsLinePos() {
        if (!this.range || !this.context)
          return void 0;
        const start = getLinePos(this.range.start, this.context.root);
        if (!start)
          return void 0;
        const end = getLinePos(this.range.end, this.context.root);
        return {
          start,
          end
        };
      }
      get rawValue() {
        if (!this.valueRange || !this.context)
          return null;
        const {
          start,
          end
        } = this.valueRange;
        return this.context.src.slice(start, end);
      }
      get tag() {
        for (let i = 0; i < this.props.length; ++i) {
          const tag = this.getPropValue(i, Char.TAG, false);
          if (tag != null) {
            if (tag[1] === "<") {
              return {
                verbatim: tag.slice(2, -1)
              };
            } else {
              const [_, handle, suffix] = tag.match(/^(.*!)([^!]*)$/);
              return {
                handle,
                suffix
              };
            }
          }
        }
        return null;
      }
      get valueRangeContainsNewline() {
        if (!this.valueRange || !this.context)
          return false;
        const {
          start,
          end
        } = this.valueRange;
        const {
          src: src2
        } = this.context;
        for (let i = start; i < end; ++i) {
          if (src2[i] === "\n")
            return true;
        }
        return false;
      }
      parseComment(start) {
        const {
          src: src2
        } = this.context;
        if (src2[start] === Char.COMMENT) {
          const end = Node.endOfLine(src2, start + 1);
          const commentRange = new Range(start, end);
          this.props.push(commentRange);
          return end;
        }
        return start;
      }
      setOrigRanges(cr, offset) {
        if (this.range)
          offset = this.range.setOrigRange(cr, offset);
        if (this.valueRange)
          this.valueRange.setOrigRange(cr, offset);
        this.props.forEach((prop) => prop.setOrigRange(cr, offset));
        return offset;
      }
      toString() {
        const {
          context: {
            src: src2
          },
          range: range2,
          value
        } = this;
        if (value != null)
          return value;
        const str = src2.slice(range2.start, range2.end);
        return Node.addStringTerminator(src2, range2.end, str);
      }
    };
    var YAMLError = class extends Error {
      constructor(name, source, message) {
        if (!message || !(source instanceof Node))
          throw new Error(`Invalid arguments for new ${name}`);
        super();
        this.name = name;
        this.message = message;
        this.source = source;
      }
      makePretty() {
        if (!this.source)
          return;
        this.nodeType = this.source.type;
        const cst = this.source.context && this.source.context.root;
        if (typeof this.offset === "number") {
          this.range = new Range(this.offset, this.offset + 1);
          const start = cst && getLinePos(this.offset, cst);
          if (start) {
            const end = {
              line: start.line,
              col: start.col + 1
            };
            this.linePos = {
              start,
              end
            };
          }
          delete this.offset;
        } else {
          this.range = this.source.range;
          this.linePos = this.source.rangeAsLinePos;
        }
        if (this.linePos) {
          const {
            line,
            col
          } = this.linePos.start;
          this.message += ` at line ${line}, column ${col}`;
          const ctx = cst && getPrettyContext(this.linePos, cst);
          if (ctx)
            this.message += `:

${ctx}
`;
        }
        delete this.source;
      }
    };
    var YAMLReferenceError = class extends YAMLError {
      constructor(source, message) {
        super("YAMLReferenceError", source, message);
      }
    };
    var YAMLSemanticError = class extends YAMLError {
      constructor(source, message) {
        super("YAMLSemanticError", source, message);
      }
    };
    var YAMLSyntaxError = class extends YAMLError {
      constructor(source, message) {
        super("YAMLSyntaxError", source, message);
      }
    };
    var YAMLWarning = class extends YAMLError {
      constructor(source, message) {
        super("YAMLWarning", source, message);
      }
    };
    function _defineProperty(obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }
      return obj;
    }
    var PlainValue = class extends Node {
      static endOfLine(src2, start, inFlow) {
        let ch = src2[start];
        let offset = start;
        while (ch && ch !== "\n") {
          if (inFlow && (ch === "[" || ch === "]" || ch === "{" || ch === "}" || ch === ","))
            break;
          const next = src2[offset + 1];
          if (ch === ":" && (!next || next === "\n" || next === "	" || next === " " || inFlow && next === ","))
            break;
          if ((ch === " " || ch === "	") && next === "#")
            break;
          offset += 1;
          ch = next;
        }
        return offset;
      }
      get strValue() {
        if (!this.valueRange || !this.context)
          return null;
        let {
          start,
          end
        } = this.valueRange;
        const {
          src: src2
        } = this.context;
        let ch = src2[end - 1];
        while (start < end && (ch === "\n" || ch === "	" || ch === " "))
          ch = src2[--end - 1];
        let str = "";
        for (let i = start; i < end; ++i) {
          const ch2 = src2[i];
          if (ch2 === "\n") {
            const {
              fold,
              offset
            } = Node.foldNewline(src2, i, -1);
            str += fold;
            i = offset;
          } else if (ch2 === " " || ch2 === "	") {
            const wsStart = i;
            let next = src2[i + 1];
            while (i < end && (next === " " || next === "	")) {
              i += 1;
              next = src2[i + 1];
            }
            if (next !== "\n")
              str += i > wsStart ? src2.slice(wsStart, i + 1) : ch2;
          } else {
            str += ch2;
          }
        }
        const ch0 = src2[start];
        switch (ch0) {
          case "	": {
            const msg = "Plain value cannot start with a tab character";
            const errors = [new YAMLSemanticError(this, msg)];
            return {
              errors,
              str
            };
          }
          case "@":
          case "`": {
            const msg = `Plain value cannot start with reserved character ${ch0}`;
            const errors = [new YAMLSemanticError(this, msg)];
            return {
              errors,
              str
            };
          }
          default:
            return str;
        }
      }
      parseBlockValue(start) {
        const {
          indent,
          inFlow,
          src: src2
        } = this.context;
        let offset = start;
        let valueEnd = start;
        for (let ch = src2[offset]; ch === "\n"; ch = src2[offset]) {
          if (Node.atDocumentBoundary(src2, offset + 1))
            break;
          const end = Node.endOfBlockIndent(src2, indent, offset + 1);
          if (end === null || src2[end] === "#")
            break;
          if (src2[end] === "\n") {
            offset = end;
          } else {
            valueEnd = PlainValue.endOfLine(src2, end, inFlow);
            offset = valueEnd;
          }
        }
        if (this.valueRange.isEmpty())
          this.valueRange.start = start;
        this.valueRange.end = valueEnd;
        return valueEnd;
      }
      parse(context, start) {
        this.context = context;
        const {
          inFlow,
          src: src2
        } = context;
        let offset = start;
        const ch = src2[offset];
        if (ch && ch !== "#" && ch !== "\n") {
          offset = PlainValue.endOfLine(src2, start, inFlow);
        }
        this.valueRange = new Range(start, offset);
        offset = Node.endOfWhiteSpace(src2, offset);
        offset = this.parseComment(offset);
        if (!this.hasComment || this.valueRange.isEmpty()) {
          offset = this.parseBlockValue(offset);
        }
        return offset;
      }
    };
    exports.Char = Char;
    exports.Node = Node;
    exports.PlainValue = PlainValue;
    exports.Range = Range;
    exports.Type = Type;
    exports.YAMLError = YAMLError;
    exports.YAMLReferenceError = YAMLReferenceError;
    exports.YAMLSemanticError = YAMLSemanticError;
    exports.YAMLSyntaxError = YAMLSyntaxError;
    exports.YAMLWarning = YAMLWarning;
    exports._defineProperty = _defineProperty;
    exports.defaultTagPrefix = defaultTagPrefix;
    exports.defaultTags = defaultTags;
  }
});

// node_modules/yaml/dist/parse-cst.js
var require_parse_cst = __commonJS({
  "node_modules/yaml/dist/parse-cst.js"(exports) {
    init_shims();
    "use strict";
    var PlainValue = require_PlainValue_ec8e588e();
    var BlankLine = class extends PlainValue.Node {
      constructor() {
        super(PlainValue.Type.BLANK_LINE);
      }
      get includesTrailingLines() {
        return true;
      }
      parse(context, start) {
        this.context = context;
        this.range = new PlainValue.Range(start, start + 1);
        return start + 1;
      }
    };
    var CollectionItem = class extends PlainValue.Node {
      constructor(type, props) {
        super(type, props);
        this.node = null;
      }
      get includesTrailingLines() {
        return !!this.node && this.node.includesTrailingLines;
      }
      parse(context, start) {
        this.context = context;
        const {
          parseNode,
          src: src2
        } = context;
        let {
          atLineStart,
          lineStart
        } = context;
        if (!atLineStart && this.type === PlainValue.Type.SEQ_ITEM)
          this.error = new PlainValue.YAMLSemanticError(this, "Sequence items must not have preceding content on the same line");
        const indent = atLineStart ? start - lineStart : context.indent;
        let offset = PlainValue.Node.endOfWhiteSpace(src2, start + 1);
        let ch = src2[offset];
        const inlineComment = ch === "#";
        const comments = [];
        let blankLine = null;
        while (ch === "\n" || ch === "#") {
          if (ch === "#") {
            const end2 = PlainValue.Node.endOfLine(src2, offset + 1);
            comments.push(new PlainValue.Range(offset, end2));
            offset = end2;
          } else {
            atLineStart = true;
            lineStart = offset + 1;
            const wsEnd = PlainValue.Node.endOfWhiteSpace(src2, lineStart);
            if (src2[wsEnd] === "\n" && comments.length === 0) {
              blankLine = new BlankLine();
              lineStart = blankLine.parse({
                src: src2
              }, lineStart);
            }
            offset = PlainValue.Node.endOfIndent(src2, lineStart);
          }
          ch = src2[offset];
        }
        if (PlainValue.Node.nextNodeIsIndented(ch, offset - (lineStart + indent), this.type !== PlainValue.Type.SEQ_ITEM)) {
          this.node = parseNode({
            atLineStart,
            inCollection: false,
            indent,
            lineStart,
            parent: this
          }, offset);
        } else if (ch && lineStart > start + 1) {
          offset = lineStart - 1;
        }
        if (this.node) {
          if (blankLine) {
            const items = context.parent.items || context.parent.contents;
            if (items)
              items.push(blankLine);
          }
          if (comments.length)
            Array.prototype.push.apply(this.props, comments);
          offset = this.node.range.end;
        } else {
          if (inlineComment) {
            const c = comments[0];
            this.props.push(c);
            offset = c.end;
          } else {
            offset = PlainValue.Node.endOfLine(src2, start + 1);
          }
        }
        const end = this.node ? this.node.valueRange.end : offset;
        this.valueRange = new PlainValue.Range(start, end);
        return offset;
      }
      setOrigRanges(cr, offset) {
        offset = super.setOrigRanges(cr, offset);
        return this.node ? this.node.setOrigRanges(cr, offset) : offset;
      }
      toString() {
        const {
          context: {
            src: src2
          },
          node,
          range: range2,
          value
        } = this;
        if (value != null)
          return value;
        const str = node ? src2.slice(range2.start, node.range.start) + String(node) : src2.slice(range2.start, range2.end);
        return PlainValue.Node.addStringTerminator(src2, range2.end, str);
      }
    };
    var Comment = class extends PlainValue.Node {
      constructor() {
        super(PlainValue.Type.COMMENT);
      }
      parse(context, start) {
        this.context = context;
        const offset = this.parseComment(start);
        this.range = new PlainValue.Range(start, offset);
        return offset;
      }
    };
    function grabCollectionEndComments(node) {
      let cnode = node;
      while (cnode instanceof CollectionItem)
        cnode = cnode.node;
      if (!(cnode instanceof Collection))
        return null;
      const len = cnode.items.length;
      let ci = -1;
      for (let i = len - 1; i >= 0; --i) {
        const n = cnode.items[i];
        if (n.type === PlainValue.Type.COMMENT) {
          const {
            indent,
            lineStart
          } = n.context;
          if (indent > 0 && n.range.start >= lineStart + indent)
            break;
          ci = i;
        } else if (n.type === PlainValue.Type.BLANK_LINE)
          ci = i;
        else
          break;
      }
      if (ci === -1)
        return null;
      const ca = cnode.items.splice(ci, len - ci);
      const prevEnd = ca[0].range.start;
      while (true) {
        cnode.range.end = prevEnd;
        if (cnode.valueRange && cnode.valueRange.end > prevEnd)
          cnode.valueRange.end = prevEnd;
        if (cnode === node)
          break;
        cnode = cnode.context.parent;
      }
      return ca;
    }
    var Collection = class extends PlainValue.Node {
      static nextContentHasIndent(src2, offset, indent) {
        const lineStart = PlainValue.Node.endOfLine(src2, offset) + 1;
        offset = PlainValue.Node.endOfWhiteSpace(src2, lineStart);
        const ch = src2[offset];
        if (!ch)
          return false;
        if (offset >= lineStart + indent)
          return true;
        if (ch !== "#" && ch !== "\n")
          return false;
        return Collection.nextContentHasIndent(src2, offset, indent);
      }
      constructor(firstItem) {
        super(firstItem.type === PlainValue.Type.SEQ_ITEM ? PlainValue.Type.SEQ : PlainValue.Type.MAP);
        for (let i = firstItem.props.length - 1; i >= 0; --i) {
          if (firstItem.props[i].start < firstItem.context.lineStart) {
            this.props = firstItem.props.slice(0, i + 1);
            firstItem.props = firstItem.props.slice(i + 1);
            const itemRange = firstItem.props[0] || firstItem.valueRange;
            firstItem.range.start = itemRange.start;
            break;
          }
        }
        this.items = [firstItem];
        const ec = grabCollectionEndComments(firstItem);
        if (ec)
          Array.prototype.push.apply(this.items, ec);
      }
      get includesTrailingLines() {
        return this.items.length > 0;
      }
      parse(context, start) {
        this.context = context;
        const {
          parseNode,
          src: src2
        } = context;
        let lineStart = PlainValue.Node.startOfLine(src2, start);
        const firstItem = this.items[0];
        firstItem.context.parent = this;
        this.valueRange = PlainValue.Range.copy(firstItem.valueRange);
        const indent = firstItem.range.start - firstItem.context.lineStart;
        let offset = start;
        offset = PlainValue.Node.normalizeOffset(src2, offset);
        let ch = src2[offset];
        let atLineStart = PlainValue.Node.endOfWhiteSpace(src2, lineStart) === offset;
        let prevIncludesTrailingLines = false;
        while (ch) {
          while (ch === "\n" || ch === "#") {
            if (atLineStart && ch === "\n" && !prevIncludesTrailingLines) {
              const blankLine = new BlankLine();
              offset = blankLine.parse({
                src: src2
              }, offset);
              this.valueRange.end = offset;
              if (offset >= src2.length) {
                ch = null;
                break;
              }
              this.items.push(blankLine);
              offset -= 1;
            } else if (ch === "#") {
              if (offset < lineStart + indent && !Collection.nextContentHasIndent(src2, offset, indent)) {
                return offset;
              }
              const comment = new Comment();
              offset = comment.parse({
                indent,
                lineStart,
                src: src2
              }, offset);
              this.items.push(comment);
              this.valueRange.end = offset;
              if (offset >= src2.length) {
                ch = null;
                break;
              }
            }
            lineStart = offset + 1;
            offset = PlainValue.Node.endOfIndent(src2, lineStart);
            if (PlainValue.Node.atBlank(src2, offset)) {
              const wsEnd = PlainValue.Node.endOfWhiteSpace(src2, offset);
              const next = src2[wsEnd];
              if (!next || next === "\n" || next === "#") {
                offset = wsEnd;
              }
            }
            ch = src2[offset];
            atLineStart = true;
          }
          if (!ch) {
            break;
          }
          if (offset !== lineStart + indent && (atLineStart || ch !== ":")) {
            if (offset < lineStart + indent) {
              if (lineStart > start)
                offset = lineStart;
              break;
            } else if (!this.error) {
              const msg = "All collection items must start at the same column";
              this.error = new PlainValue.YAMLSyntaxError(this, msg);
            }
          }
          if (firstItem.type === PlainValue.Type.SEQ_ITEM) {
            if (ch !== "-") {
              if (lineStart > start)
                offset = lineStart;
              break;
            }
          } else if (ch === "-" && !this.error) {
            const next = src2[offset + 1];
            if (!next || next === "\n" || next === "	" || next === " ") {
              const msg = "A collection cannot be both a mapping and a sequence";
              this.error = new PlainValue.YAMLSyntaxError(this, msg);
            }
          }
          const node = parseNode({
            atLineStart,
            inCollection: true,
            indent,
            lineStart,
            parent: this
          }, offset);
          if (!node)
            return offset;
          this.items.push(node);
          this.valueRange.end = node.valueRange.end;
          offset = PlainValue.Node.normalizeOffset(src2, node.range.end);
          ch = src2[offset];
          atLineStart = false;
          prevIncludesTrailingLines = node.includesTrailingLines;
          if (ch) {
            let ls = offset - 1;
            let prev = src2[ls];
            while (prev === " " || prev === "	")
              prev = src2[--ls];
            if (prev === "\n") {
              lineStart = ls + 1;
              atLineStart = true;
            }
          }
          const ec = grabCollectionEndComments(node);
          if (ec)
            Array.prototype.push.apply(this.items, ec);
        }
        return offset;
      }
      setOrigRanges(cr, offset) {
        offset = super.setOrigRanges(cr, offset);
        this.items.forEach((node) => {
          offset = node.setOrigRanges(cr, offset);
        });
        return offset;
      }
      toString() {
        const {
          context: {
            src: src2
          },
          items,
          range: range2,
          value
        } = this;
        if (value != null)
          return value;
        let str = src2.slice(range2.start, items[0].range.start) + String(items[0]);
        for (let i = 1; i < items.length; ++i) {
          const item = items[i];
          const {
            atLineStart,
            indent
          } = item.context;
          if (atLineStart)
            for (let i2 = 0; i2 < indent; ++i2)
              str += " ";
          str += String(item);
        }
        return PlainValue.Node.addStringTerminator(src2, range2.end, str);
      }
    };
    var Directive = class extends PlainValue.Node {
      constructor() {
        super(PlainValue.Type.DIRECTIVE);
        this.name = null;
      }
      get parameters() {
        const raw = this.rawValue;
        return raw ? raw.trim().split(/[ \t]+/) : [];
      }
      parseName(start) {
        const {
          src: src2
        } = this.context;
        let offset = start;
        let ch = src2[offset];
        while (ch && ch !== "\n" && ch !== "	" && ch !== " ")
          ch = src2[offset += 1];
        this.name = src2.slice(start, offset);
        return offset;
      }
      parseParameters(start) {
        const {
          src: src2
        } = this.context;
        let offset = start;
        let ch = src2[offset];
        while (ch && ch !== "\n" && ch !== "#")
          ch = src2[offset += 1];
        this.valueRange = new PlainValue.Range(start, offset);
        return offset;
      }
      parse(context, start) {
        this.context = context;
        let offset = this.parseName(start + 1);
        offset = this.parseParameters(offset);
        offset = this.parseComment(offset);
        this.range = new PlainValue.Range(start, offset);
        return offset;
      }
    };
    var Document = class extends PlainValue.Node {
      static startCommentOrEndBlankLine(src2, start) {
        const offset = PlainValue.Node.endOfWhiteSpace(src2, start);
        const ch = src2[offset];
        return ch === "#" || ch === "\n" ? offset : start;
      }
      constructor() {
        super(PlainValue.Type.DOCUMENT);
        this.directives = null;
        this.contents = null;
        this.directivesEndMarker = null;
        this.documentEndMarker = null;
      }
      parseDirectives(start) {
        const {
          src: src2
        } = this.context;
        this.directives = [];
        let atLineStart = true;
        let hasDirectives = false;
        let offset = start;
        while (!PlainValue.Node.atDocumentBoundary(src2, offset, PlainValue.Char.DIRECTIVES_END)) {
          offset = Document.startCommentOrEndBlankLine(src2, offset);
          switch (src2[offset]) {
            case "\n":
              if (atLineStart) {
                const blankLine = new BlankLine();
                offset = blankLine.parse({
                  src: src2
                }, offset);
                if (offset < src2.length) {
                  this.directives.push(blankLine);
                }
              } else {
                offset += 1;
                atLineStart = true;
              }
              break;
            case "#":
              {
                const comment = new Comment();
                offset = comment.parse({
                  src: src2
                }, offset);
                this.directives.push(comment);
                atLineStart = false;
              }
              break;
            case "%":
              {
                const directive = new Directive();
                offset = directive.parse({
                  parent: this,
                  src: src2
                }, offset);
                this.directives.push(directive);
                hasDirectives = true;
                atLineStart = false;
              }
              break;
            default:
              if (hasDirectives) {
                this.error = new PlainValue.YAMLSemanticError(this, "Missing directives-end indicator line");
              } else if (this.directives.length > 0) {
                this.contents = this.directives;
                this.directives = [];
              }
              return offset;
          }
        }
        if (src2[offset]) {
          this.directivesEndMarker = new PlainValue.Range(offset, offset + 3);
          return offset + 3;
        }
        if (hasDirectives) {
          this.error = new PlainValue.YAMLSemanticError(this, "Missing directives-end indicator line");
        } else if (this.directives.length > 0) {
          this.contents = this.directives;
          this.directives = [];
        }
        return offset;
      }
      parseContents(start) {
        const {
          parseNode,
          src: src2
        } = this.context;
        if (!this.contents)
          this.contents = [];
        let lineStart = start;
        while (src2[lineStart - 1] === "-")
          lineStart -= 1;
        let offset = PlainValue.Node.endOfWhiteSpace(src2, start);
        let atLineStart = lineStart === start;
        this.valueRange = new PlainValue.Range(offset);
        while (!PlainValue.Node.atDocumentBoundary(src2, offset, PlainValue.Char.DOCUMENT_END)) {
          switch (src2[offset]) {
            case "\n":
              if (atLineStart) {
                const blankLine = new BlankLine();
                offset = blankLine.parse({
                  src: src2
                }, offset);
                if (offset < src2.length) {
                  this.contents.push(blankLine);
                }
              } else {
                offset += 1;
                atLineStart = true;
              }
              lineStart = offset;
              break;
            case "#":
              {
                const comment = new Comment();
                offset = comment.parse({
                  src: src2
                }, offset);
                this.contents.push(comment);
                atLineStart = false;
              }
              break;
            default: {
              const iEnd = PlainValue.Node.endOfIndent(src2, offset);
              const context = {
                atLineStart,
                indent: -1,
                inFlow: false,
                inCollection: false,
                lineStart,
                parent: this
              };
              const node = parseNode(context, iEnd);
              if (!node)
                return this.valueRange.end = iEnd;
              this.contents.push(node);
              offset = node.range.end;
              atLineStart = false;
              const ec = grabCollectionEndComments(node);
              if (ec)
                Array.prototype.push.apply(this.contents, ec);
            }
          }
          offset = Document.startCommentOrEndBlankLine(src2, offset);
        }
        this.valueRange.end = offset;
        if (src2[offset]) {
          this.documentEndMarker = new PlainValue.Range(offset, offset + 3);
          offset += 3;
          if (src2[offset]) {
            offset = PlainValue.Node.endOfWhiteSpace(src2, offset);
            if (src2[offset] === "#") {
              const comment = new Comment();
              offset = comment.parse({
                src: src2
              }, offset);
              this.contents.push(comment);
            }
            switch (src2[offset]) {
              case "\n":
                offset += 1;
                break;
              case void 0:
                break;
              default:
                this.error = new PlainValue.YAMLSyntaxError(this, "Document end marker line cannot have a non-comment suffix");
            }
          }
        }
        return offset;
      }
      parse(context, start) {
        context.root = this;
        this.context = context;
        const {
          src: src2
        } = context;
        let offset = src2.charCodeAt(start) === 65279 ? start + 1 : start;
        offset = this.parseDirectives(offset);
        offset = this.parseContents(offset);
        return offset;
      }
      setOrigRanges(cr, offset) {
        offset = super.setOrigRanges(cr, offset);
        this.directives.forEach((node) => {
          offset = node.setOrigRanges(cr, offset);
        });
        if (this.directivesEndMarker)
          offset = this.directivesEndMarker.setOrigRange(cr, offset);
        this.contents.forEach((node) => {
          offset = node.setOrigRanges(cr, offset);
        });
        if (this.documentEndMarker)
          offset = this.documentEndMarker.setOrigRange(cr, offset);
        return offset;
      }
      toString() {
        const {
          contents,
          directives,
          value
        } = this;
        if (value != null)
          return value;
        let str = directives.join("");
        if (contents.length > 0) {
          if (directives.length > 0 || contents[0].type === PlainValue.Type.COMMENT)
            str += "---\n";
          str += contents.join("");
        }
        if (str[str.length - 1] !== "\n")
          str += "\n";
        return str;
      }
    };
    var Alias = class extends PlainValue.Node {
      parse(context, start) {
        this.context = context;
        const {
          src: src2
        } = context;
        let offset = PlainValue.Node.endOfIdentifier(src2, start + 1);
        this.valueRange = new PlainValue.Range(start + 1, offset);
        offset = PlainValue.Node.endOfWhiteSpace(src2, offset);
        offset = this.parseComment(offset);
        return offset;
      }
    };
    var Chomp = {
      CLIP: "CLIP",
      KEEP: "KEEP",
      STRIP: "STRIP"
    };
    var BlockValue = class extends PlainValue.Node {
      constructor(type, props) {
        super(type, props);
        this.blockIndent = null;
        this.chomping = Chomp.CLIP;
        this.header = null;
      }
      get includesTrailingLines() {
        return this.chomping === Chomp.KEEP;
      }
      get strValue() {
        if (!this.valueRange || !this.context)
          return null;
        let {
          start,
          end
        } = this.valueRange;
        const {
          indent,
          src: src2
        } = this.context;
        if (this.valueRange.isEmpty())
          return "";
        let lastNewLine = null;
        let ch = src2[end - 1];
        while (ch === "\n" || ch === "	" || ch === " ") {
          end -= 1;
          if (end <= start) {
            if (this.chomping === Chomp.KEEP)
              break;
            else
              return "";
          }
          if (ch === "\n")
            lastNewLine = end;
          ch = src2[end - 1];
        }
        let keepStart = end + 1;
        if (lastNewLine) {
          if (this.chomping === Chomp.KEEP) {
            keepStart = lastNewLine;
            end = this.valueRange.end;
          } else {
            end = lastNewLine;
          }
        }
        const bi = indent + this.blockIndent;
        const folded = this.type === PlainValue.Type.BLOCK_FOLDED;
        let atStart = true;
        let str = "";
        let sep = "";
        let prevMoreIndented = false;
        for (let i = start; i < end; ++i) {
          for (let j = 0; j < bi; ++j) {
            if (src2[i] !== " ")
              break;
            i += 1;
          }
          const ch2 = src2[i];
          if (ch2 === "\n") {
            if (sep === "\n")
              str += "\n";
            else
              sep = "\n";
          } else {
            const lineEnd = PlainValue.Node.endOfLine(src2, i);
            const line = src2.slice(i, lineEnd);
            i = lineEnd;
            if (folded && (ch2 === " " || ch2 === "	") && i < keepStart) {
              if (sep === " ")
                sep = "\n";
              else if (!prevMoreIndented && !atStart && sep === "\n")
                sep = "\n\n";
              str += sep + line;
              sep = lineEnd < end && src2[lineEnd] || "";
              prevMoreIndented = true;
            } else {
              str += sep + line;
              sep = folded && i < keepStart ? " " : "\n";
              prevMoreIndented = false;
            }
            if (atStart && line !== "")
              atStart = false;
          }
        }
        return this.chomping === Chomp.STRIP ? str : str + "\n";
      }
      parseBlockHeader(start) {
        const {
          src: src2
        } = this.context;
        let offset = start + 1;
        let bi = "";
        while (true) {
          const ch = src2[offset];
          switch (ch) {
            case "-":
              this.chomping = Chomp.STRIP;
              break;
            case "+":
              this.chomping = Chomp.KEEP;
              break;
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
              bi += ch;
              break;
            default:
              this.blockIndent = Number(bi) || null;
              this.header = new PlainValue.Range(start, offset);
              return offset;
          }
          offset += 1;
        }
      }
      parseBlockValue(start) {
        const {
          indent,
          src: src2
        } = this.context;
        const explicit = !!this.blockIndent;
        let offset = start;
        let valueEnd = start;
        let minBlockIndent = 1;
        for (let ch = src2[offset]; ch === "\n"; ch = src2[offset]) {
          offset += 1;
          if (PlainValue.Node.atDocumentBoundary(src2, offset))
            break;
          const end = PlainValue.Node.endOfBlockIndent(src2, indent, offset);
          if (end === null)
            break;
          const ch2 = src2[end];
          const lineIndent = end - (offset + indent);
          if (!this.blockIndent) {
            if (src2[end] !== "\n") {
              if (lineIndent < minBlockIndent) {
                const msg = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
                this.error = new PlainValue.YAMLSemanticError(this, msg);
              }
              this.blockIndent = lineIndent;
            } else if (lineIndent > minBlockIndent) {
              minBlockIndent = lineIndent;
            }
          } else if (ch2 && ch2 !== "\n" && lineIndent < this.blockIndent) {
            if (src2[end] === "#")
              break;
            if (!this.error) {
              const src3 = explicit ? "explicit indentation indicator" : "first line";
              const msg = `Block scalars must not be less indented than their ${src3}`;
              this.error = new PlainValue.YAMLSemanticError(this, msg);
            }
          }
          if (src2[end] === "\n") {
            offset = end;
          } else {
            offset = valueEnd = PlainValue.Node.endOfLine(src2, end);
          }
        }
        if (this.chomping !== Chomp.KEEP) {
          offset = src2[valueEnd] ? valueEnd + 1 : valueEnd;
        }
        this.valueRange = new PlainValue.Range(start + 1, offset);
        return offset;
      }
      parse(context, start) {
        this.context = context;
        const {
          src: src2
        } = context;
        let offset = this.parseBlockHeader(start);
        offset = PlainValue.Node.endOfWhiteSpace(src2, offset);
        offset = this.parseComment(offset);
        offset = this.parseBlockValue(offset);
        return offset;
      }
      setOrigRanges(cr, offset) {
        offset = super.setOrigRanges(cr, offset);
        return this.header ? this.header.setOrigRange(cr, offset) : offset;
      }
    };
    var FlowCollection = class extends PlainValue.Node {
      constructor(type, props) {
        super(type, props);
        this.items = null;
      }
      prevNodeIsJsonLike(idx = this.items.length) {
        const node = this.items[idx - 1];
        return !!node && (node.jsonLike || node.type === PlainValue.Type.COMMENT && this.prevNodeIsJsonLike(idx - 1));
      }
      parse(context, start) {
        this.context = context;
        const {
          parseNode,
          src: src2
        } = context;
        let {
          indent,
          lineStart
        } = context;
        let char = src2[start];
        this.items = [{
          char,
          offset: start
        }];
        let offset = PlainValue.Node.endOfWhiteSpace(src2, start + 1);
        char = src2[offset];
        while (char && char !== "]" && char !== "}") {
          switch (char) {
            case "\n":
              {
                lineStart = offset + 1;
                const wsEnd = PlainValue.Node.endOfWhiteSpace(src2, lineStart);
                if (src2[wsEnd] === "\n") {
                  const blankLine = new BlankLine();
                  lineStart = blankLine.parse({
                    src: src2
                  }, lineStart);
                  this.items.push(blankLine);
                }
                offset = PlainValue.Node.endOfIndent(src2, lineStart);
                if (offset <= lineStart + indent) {
                  char = src2[offset];
                  if (offset < lineStart + indent || char !== "]" && char !== "}") {
                    const msg = "Insufficient indentation in flow collection";
                    this.error = new PlainValue.YAMLSemanticError(this, msg);
                  }
                }
              }
              break;
            case ",":
              {
                this.items.push({
                  char,
                  offset
                });
                offset += 1;
              }
              break;
            case "#":
              {
                const comment = new Comment();
                offset = comment.parse({
                  src: src2
                }, offset);
                this.items.push(comment);
              }
              break;
            case "?":
            case ":": {
              const next = src2[offset + 1];
              if (next === "\n" || next === "	" || next === " " || next === "," || char === ":" && this.prevNodeIsJsonLike()) {
                this.items.push({
                  char,
                  offset
                });
                offset += 1;
                break;
              }
            }
            default: {
              const node = parseNode({
                atLineStart: false,
                inCollection: false,
                inFlow: true,
                indent: -1,
                lineStart,
                parent: this
              }, offset);
              if (!node) {
                this.valueRange = new PlainValue.Range(start, offset);
                return offset;
              }
              this.items.push(node);
              offset = PlainValue.Node.normalizeOffset(src2, node.range.end);
            }
          }
          offset = PlainValue.Node.endOfWhiteSpace(src2, offset);
          char = src2[offset];
        }
        this.valueRange = new PlainValue.Range(start, offset + 1);
        if (char) {
          this.items.push({
            char,
            offset
          });
          offset = PlainValue.Node.endOfWhiteSpace(src2, offset + 1);
          offset = this.parseComment(offset);
        }
        return offset;
      }
      setOrigRanges(cr, offset) {
        offset = super.setOrigRanges(cr, offset);
        this.items.forEach((node) => {
          if (node instanceof PlainValue.Node) {
            offset = node.setOrigRanges(cr, offset);
          } else if (cr.length === 0) {
            node.origOffset = node.offset;
          } else {
            let i = offset;
            while (i < cr.length) {
              if (cr[i] > node.offset)
                break;
              else
                ++i;
            }
            node.origOffset = node.offset + i;
            offset = i;
          }
        });
        return offset;
      }
      toString() {
        const {
          context: {
            src: src2
          },
          items,
          range: range2,
          value
        } = this;
        if (value != null)
          return value;
        const nodes = items.filter((item) => item instanceof PlainValue.Node);
        let str = "";
        let prevEnd = range2.start;
        nodes.forEach((node) => {
          const prefix = src2.slice(prevEnd, node.range.start);
          prevEnd = node.range.end;
          str += prefix + String(node);
          if (str[str.length - 1] === "\n" && src2[prevEnd - 1] !== "\n" && src2[prevEnd] === "\n") {
            prevEnd += 1;
          }
        });
        str += src2.slice(prevEnd, range2.end);
        return PlainValue.Node.addStringTerminator(src2, range2.end, str);
      }
    };
    var QuoteDouble = class extends PlainValue.Node {
      static endOfQuote(src2, offset) {
        let ch = src2[offset];
        while (ch && ch !== '"') {
          offset += ch === "\\" ? 2 : 1;
          ch = src2[offset];
        }
        return offset + 1;
      }
      get strValue() {
        if (!this.valueRange || !this.context)
          return null;
        const errors = [];
        const {
          start,
          end
        } = this.valueRange;
        const {
          indent,
          src: src2
        } = this.context;
        if (src2[end - 1] !== '"')
          errors.push(new PlainValue.YAMLSyntaxError(this, 'Missing closing "quote'));
        let str = "";
        for (let i = start + 1; i < end - 1; ++i) {
          const ch = src2[i];
          if (ch === "\n") {
            if (PlainValue.Node.atDocumentBoundary(src2, i + 1))
              errors.push(new PlainValue.YAMLSemanticError(this, "Document boundary indicators are not allowed within string values"));
            const {
              fold,
              offset,
              error: error2
            } = PlainValue.Node.foldNewline(src2, i, indent);
            str += fold;
            i = offset;
            if (error2)
              errors.push(new PlainValue.YAMLSemanticError(this, "Multi-line double-quoted string needs to be sufficiently indented"));
          } else if (ch === "\\") {
            i += 1;
            switch (src2[i]) {
              case "0":
                str += "\0";
                break;
              case "a":
                str += "\x07";
                break;
              case "b":
                str += "\b";
                break;
              case "e":
                str += "";
                break;
              case "f":
                str += "\f";
                break;
              case "n":
                str += "\n";
                break;
              case "r":
                str += "\r";
                break;
              case "t":
                str += "	";
                break;
              case "v":
                str += "\v";
                break;
              case "N":
                str += "\x85";
                break;
              case "_":
                str += "\xA0";
                break;
              case "L":
                str += "\u2028";
                break;
              case "P":
                str += "\u2029";
                break;
              case " ":
                str += " ";
                break;
              case '"':
                str += '"';
                break;
              case "/":
                str += "/";
                break;
              case "\\":
                str += "\\";
                break;
              case "	":
                str += "	";
                break;
              case "x":
                str += this.parseCharCode(i + 1, 2, errors);
                i += 2;
                break;
              case "u":
                str += this.parseCharCode(i + 1, 4, errors);
                i += 4;
                break;
              case "U":
                str += this.parseCharCode(i + 1, 8, errors);
                i += 8;
                break;
              case "\n":
                while (src2[i + 1] === " " || src2[i + 1] === "	")
                  i += 1;
                break;
              default:
                errors.push(new PlainValue.YAMLSyntaxError(this, `Invalid escape sequence ${src2.substr(i - 1, 2)}`));
                str += "\\" + src2[i];
            }
          } else if (ch === " " || ch === "	") {
            const wsStart = i;
            let next = src2[i + 1];
            while (next === " " || next === "	") {
              i += 1;
              next = src2[i + 1];
            }
            if (next !== "\n")
              str += i > wsStart ? src2.slice(wsStart, i + 1) : ch;
          } else {
            str += ch;
          }
        }
        return errors.length > 0 ? {
          errors,
          str
        } : str;
      }
      parseCharCode(offset, length, errors) {
        const {
          src: src2
        } = this.context;
        const cc = src2.substr(offset, length);
        const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
        const code = ok ? parseInt(cc, 16) : NaN;
        if (isNaN(code)) {
          errors.push(new PlainValue.YAMLSyntaxError(this, `Invalid escape sequence ${src2.substr(offset - 2, length + 2)}`));
          return src2.substr(offset - 2, length + 2);
        }
        return String.fromCodePoint(code);
      }
      parse(context, start) {
        this.context = context;
        const {
          src: src2
        } = context;
        let offset = QuoteDouble.endOfQuote(src2, start + 1);
        this.valueRange = new PlainValue.Range(start, offset);
        offset = PlainValue.Node.endOfWhiteSpace(src2, offset);
        offset = this.parseComment(offset);
        return offset;
      }
    };
    var QuoteSingle = class extends PlainValue.Node {
      static endOfQuote(src2, offset) {
        let ch = src2[offset];
        while (ch) {
          if (ch === "'") {
            if (src2[offset + 1] !== "'")
              break;
            ch = src2[offset += 2];
          } else {
            ch = src2[offset += 1];
          }
        }
        return offset + 1;
      }
      get strValue() {
        if (!this.valueRange || !this.context)
          return null;
        const errors = [];
        const {
          start,
          end
        } = this.valueRange;
        const {
          indent,
          src: src2
        } = this.context;
        if (src2[end - 1] !== "'")
          errors.push(new PlainValue.YAMLSyntaxError(this, "Missing closing 'quote"));
        let str = "";
        for (let i = start + 1; i < end - 1; ++i) {
          const ch = src2[i];
          if (ch === "\n") {
            if (PlainValue.Node.atDocumentBoundary(src2, i + 1))
              errors.push(new PlainValue.YAMLSemanticError(this, "Document boundary indicators are not allowed within string values"));
            const {
              fold,
              offset,
              error: error2
            } = PlainValue.Node.foldNewline(src2, i, indent);
            str += fold;
            i = offset;
            if (error2)
              errors.push(new PlainValue.YAMLSemanticError(this, "Multi-line single-quoted string needs to be sufficiently indented"));
          } else if (ch === "'") {
            str += ch;
            i += 1;
            if (src2[i] !== "'")
              errors.push(new PlainValue.YAMLSyntaxError(this, "Unescaped single quote? This should not happen."));
          } else if (ch === " " || ch === "	") {
            const wsStart = i;
            let next = src2[i + 1];
            while (next === " " || next === "	") {
              i += 1;
              next = src2[i + 1];
            }
            if (next !== "\n")
              str += i > wsStart ? src2.slice(wsStart, i + 1) : ch;
          } else {
            str += ch;
          }
        }
        return errors.length > 0 ? {
          errors,
          str
        } : str;
      }
      parse(context, start) {
        this.context = context;
        const {
          src: src2
        } = context;
        let offset = QuoteSingle.endOfQuote(src2, start + 1);
        this.valueRange = new PlainValue.Range(start, offset);
        offset = PlainValue.Node.endOfWhiteSpace(src2, offset);
        offset = this.parseComment(offset);
        return offset;
      }
    };
    function createNewNode(type, props) {
      switch (type) {
        case PlainValue.Type.ALIAS:
          return new Alias(type, props);
        case PlainValue.Type.BLOCK_FOLDED:
        case PlainValue.Type.BLOCK_LITERAL:
          return new BlockValue(type, props);
        case PlainValue.Type.FLOW_MAP:
        case PlainValue.Type.FLOW_SEQ:
          return new FlowCollection(type, props);
        case PlainValue.Type.MAP_KEY:
        case PlainValue.Type.MAP_VALUE:
        case PlainValue.Type.SEQ_ITEM:
          return new CollectionItem(type, props);
        case PlainValue.Type.COMMENT:
        case PlainValue.Type.PLAIN:
          return new PlainValue.PlainValue(type, props);
        case PlainValue.Type.QUOTE_DOUBLE:
          return new QuoteDouble(type, props);
        case PlainValue.Type.QUOTE_SINGLE:
          return new QuoteSingle(type, props);
        default:
          return null;
      }
    }
    var ParseContext = class {
      static parseType(src2, offset, inFlow) {
        switch (src2[offset]) {
          case "*":
            return PlainValue.Type.ALIAS;
          case ">":
            return PlainValue.Type.BLOCK_FOLDED;
          case "|":
            return PlainValue.Type.BLOCK_LITERAL;
          case "{":
            return PlainValue.Type.FLOW_MAP;
          case "[":
            return PlainValue.Type.FLOW_SEQ;
          case "?":
            return !inFlow && PlainValue.Node.atBlank(src2, offset + 1, true) ? PlainValue.Type.MAP_KEY : PlainValue.Type.PLAIN;
          case ":":
            return !inFlow && PlainValue.Node.atBlank(src2, offset + 1, true) ? PlainValue.Type.MAP_VALUE : PlainValue.Type.PLAIN;
          case "-":
            return !inFlow && PlainValue.Node.atBlank(src2, offset + 1, true) ? PlainValue.Type.SEQ_ITEM : PlainValue.Type.PLAIN;
          case '"':
            return PlainValue.Type.QUOTE_DOUBLE;
          case "'":
            return PlainValue.Type.QUOTE_SINGLE;
          default:
            return PlainValue.Type.PLAIN;
        }
      }
      constructor(orig = {}, {
        atLineStart,
        inCollection,
        inFlow,
        indent,
        lineStart,
        parent
      } = {}) {
        PlainValue._defineProperty(this, "parseNode", (overlay, start) => {
          if (PlainValue.Node.atDocumentBoundary(this.src, start))
            return null;
          const context = new ParseContext(this, overlay);
          const {
            props,
            type,
            valueStart
          } = context.parseProps(start);
          const node = createNewNode(type, props);
          let offset = node.parse(context, valueStart);
          node.range = new PlainValue.Range(start, offset);
          if (offset <= start) {
            node.error = new Error(`Node#parse consumed no characters`);
            node.error.parseEnd = offset;
            node.error.source = node;
            node.range.end = start + 1;
          }
          if (context.nodeStartsCollection(node)) {
            if (!node.error && !context.atLineStart && context.parent.type === PlainValue.Type.DOCUMENT) {
              node.error = new PlainValue.YAMLSyntaxError(node, "Block collection must not have preceding content here (e.g. directives-end indicator)");
            }
            const collection = new Collection(node);
            offset = collection.parse(new ParseContext(context), offset);
            collection.range = new PlainValue.Range(start, offset);
            return collection;
          }
          return node;
        });
        this.atLineStart = atLineStart != null ? atLineStart : orig.atLineStart || false;
        this.inCollection = inCollection != null ? inCollection : orig.inCollection || false;
        this.inFlow = inFlow != null ? inFlow : orig.inFlow || false;
        this.indent = indent != null ? indent : orig.indent;
        this.lineStart = lineStart != null ? lineStart : orig.lineStart;
        this.parent = parent != null ? parent : orig.parent || {};
        this.root = orig.root;
        this.src = orig.src;
      }
      nodeStartsCollection(node) {
        const {
          inCollection,
          inFlow,
          src: src2
        } = this;
        if (inCollection || inFlow)
          return false;
        if (node instanceof CollectionItem)
          return true;
        let offset = node.range.end;
        if (src2[offset] === "\n" || src2[offset - 1] === "\n")
          return false;
        offset = PlainValue.Node.endOfWhiteSpace(src2, offset);
        return src2[offset] === ":";
      }
      parseProps(offset) {
        const {
          inFlow,
          parent,
          src: src2
        } = this;
        const props = [];
        let lineHasProps = false;
        offset = this.atLineStart ? PlainValue.Node.endOfIndent(src2, offset) : PlainValue.Node.endOfWhiteSpace(src2, offset);
        let ch = src2[offset];
        while (ch === PlainValue.Char.ANCHOR || ch === PlainValue.Char.COMMENT || ch === PlainValue.Char.TAG || ch === "\n") {
          if (ch === "\n") {
            let inEnd = offset;
            let lineStart;
            do {
              lineStart = inEnd + 1;
              inEnd = PlainValue.Node.endOfIndent(src2, lineStart);
            } while (src2[inEnd] === "\n");
            const indentDiff = inEnd - (lineStart + this.indent);
            const noIndicatorAsIndent = parent.type === PlainValue.Type.SEQ_ITEM && parent.context.atLineStart;
            if (src2[inEnd] !== "#" && !PlainValue.Node.nextNodeIsIndented(src2[inEnd], indentDiff, !noIndicatorAsIndent))
              break;
            this.atLineStart = true;
            this.lineStart = lineStart;
            lineHasProps = false;
            offset = inEnd;
          } else if (ch === PlainValue.Char.COMMENT) {
            const end = PlainValue.Node.endOfLine(src2, offset + 1);
            props.push(new PlainValue.Range(offset, end));
            offset = end;
          } else {
            let end = PlainValue.Node.endOfIdentifier(src2, offset + 1);
            if (ch === PlainValue.Char.TAG && src2[end] === "," && /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+,\d\d\d\d(-\d\d){0,2}\/\S/.test(src2.slice(offset + 1, end + 13))) {
              end = PlainValue.Node.endOfIdentifier(src2, end + 5);
            }
            props.push(new PlainValue.Range(offset, end));
            lineHasProps = true;
            offset = PlainValue.Node.endOfWhiteSpace(src2, end);
          }
          ch = src2[offset];
        }
        if (lineHasProps && ch === ":" && PlainValue.Node.atBlank(src2, offset + 1, true))
          offset -= 1;
        const type = ParseContext.parseType(src2, offset, inFlow);
        return {
          props,
          type,
          valueStart: offset
        };
      }
    };
    function parse(src2) {
      const cr = [];
      if (src2.indexOf("\r") !== -1) {
        src2 = src2.replace(/\r\n?/g, (match, offset2) => {
          if (match.length > 1)
            cr.push(offset2);
          return "\n";
        });
      }
      const documents = [];
      let offset = 0;
      do {
        const doc = new Document();
        const context = new ParseContext({
          src: src2
        });
        offset = doc.parse(context, offset);
        documents.push(doc);
      } while (offset < src2.length);
      documents.setOrigRanges = () => {
        if (cr.length === 0)
          return false;
        for (let i = 1; i < cr.length; ++i)
          cr[i] -= i;
        let crOffset = 0;
        for (let i = 0; i < documents.length; ++i) {
          crOffset = documents[i].setOrigRanges(cr, crOffset);
        }
        cr.splice(0, cr.length);
        return true;
      };
      documents.toString = () => documents.join("...\n");
      return documents;
    }
    exports.parse = parse;
  }
});

// node_modules/yaml/dist/resolveSeq-d03cb037.js
var require_resolveSeq_d03cb037 = __commonJS({
  "node_modules/yaml/dist/resolveSeq-d03cb037.js"(exports) {
    init_shims();
    "use strict";
    var PlainValue = require_PlainValue_ec8e588e();
    function addCommentBefore(str, indent, comment) {
      if (!comment)
        return str;
      const cc = comment.replace(/[\s\S]^/gm, `$&${indent}#`);
      return `#${cc}
${indent}${str}`;
    }
    function addComment(str, indent, comment) {
      return !comment ? str : comment.indexOf("\n") === -1 ? `${str} #${comment}` : `${str}
` + comment.replace(/^/gm, `${indent || ""}#`);
    }
    var Node = class {
    };
    function toJSON(value, arg, ctx) {
      if (Array.isArray(value))
        return value.map((v, i) => toJSON(v, String(i), ctx));
      if (value && typeof value.toJSON === "function") {
        const anchor = ctx && ctx.anchors && ctx.anchors.get(value);
        if (anchor)
          ctx.onCreate = (res2) => {
            anchor.res = res2;
            delete ctx.onCreate;
          };
        const res = value.toJSON(arg, ctx);
        if (anchor && ctx.onCreate)
          ctx.onCreate(res);
        return res;
      }
      if ((!ctx || !ctx.keep) && typeof value === "bigint")
        return Number(value);
      return value;
    }
    var Scalar = class extends Node {
      constructor(value) {
        super();
        this.value = value;
      }
      toJSON(arg, ctx) {
        return ctx && ctx.keep ? this.value : toJSON(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    function collectionFromPath(schema, path2, value) {
      let v = value;
      for (let i = path2.length - 1; i >= 0; --i) {
        const k = path2[i];
        if (Number.isInteger(k) && k >= 0) {
          const a = [];
          a[k] = v;
          v = a;
        } else {
          const o = {};
          Object.defineProperty(o, k, {
            value: v,
            writable: true,
            enumerable: true,
            configurable: true
          });
          v = o;
        }
      }
      return schema.createNode(v, false);
    }
    var isEmptyPath = (path2) => path2 == null || typeof path2 === "object" && path2[Symbol.iterator]().next().done;
    var Collection = class extends Node {
      constructor(schema) {
        super();
        PlainValue._defineProperty(this, "items", []);
        this.schema = schema;
      }
      addIn(path2, value) {
        if (isEmptyPath(path2))
          this.add(value);
        else {
          const [key, ...rest] = path2;
          const node = this.get(key, true);
          if (node instanceof Collection)
            node.addIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      deleteIn([key, ...rest]) {
        if (rest.length === 0)
          return this.delete(key);
        const node = this.get(key, true);
        if (node instanceof Collection)
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
      getIn([key, ...rest], keepScalar) {
        const node = this.get(key, true);
        if (rest.length === 0)
          return !keepScalar && node instanceof Scalar ? node.value : node;
        else
          return node instanceof Collection ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues() {
        return this.items.every((node) => {
          if (!node || node.type !== "PAIR")
            return false;
          const n = node.value;
          return n == null || n instanceof Scalar && n.value == null && !n.commentBefore && !n.comment && !n.tag;
        });
      }
      hasIn([key, ...rest]) {
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return node instanceof Collection ? node.hasIn(rest) : false;
      }
      setIn([key, ...rest], value) {
        if (rest.length === 0) {
          this.set(key, value);
        } else {
          const node = this.get(key, true);
          if (node instanceof Collection)
            node.setIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      toJSON() {
        return null;
      }
      toString(ctx, {
        blockItem,
        flowChars,
        isMap,
        itemIndent
      }, onComment, onChompKeep) {
        const {
          indent,
          indentStep,
          stringify
        } = ctx;
        const inFlow = this.type === PlainValue.Type.FLOW_MAP || this.type === PlainValue.Type.FLOW_SEQ || ctx.inFlow;
        if (inFlow)
          itemIndent += indentStep;
        const allNullValues = isMap && this.hasAllNullValues();
        ctx = Object.assign({}, ctx, {
          allNullValues,
          indent: itemIndent,
          inFlow,
          type: null
        });
        let chompKeep = false;
        let hasItemWithNewLine = false;
        const nodes = this.items.reduce((nodes2, item, i) => {
          let comment;
          if (item) {
            if (!chompKeep && item.spaceBefore)
              nodes2.push({
                type: "comment",
                str: ""
              });
            if (item.commentBefore)
              item.commentBefore.match(/^.*$/gm).forEach((line) => {
                nodes2.push({
                  type: "comment",
                  str: `#${line}`
                });
              });
            if (item.comment)
              comment = item.comment;
            if (inFlow && (!chompKeep && item.spaceBefore || item.commentBefore || item.comment || item.key && (item.key.commentBefore || item.key.comment) || item.value && (item.value.commentBefore || item.value.comment)))
              hasItemWithNewLine = true;
          }
          chompKeep = false;
          let str2 = stringify(item, ctx, () => comment = null, () => chompKeep = true);
          if (inFlow && !hasItemWithNewLine && str2.includes("\n"))
            hasItemWithNewLine = true;
          if (inFlow && i < this.items.length - 1)
            str2 += ",";
          str2 = addComment(str2, itemIndent, comment);
          if (chompKeep && (comment || inFlow))
            chompKeep = false;
          nodes2.push({
            type: "item",
            str: str2
          });
          return nodes2;
        }, []);
        let str;
        if (nodes.length === 0) {
          str = flowChars.start + flowChars.end;
        } else if (inFlow) {
          const {
            start,
            end
          } = flowChars;
          const strings = nodes.map((n) => n.str);
          if (hasItemWithNewLine || strings.reduce((sum, str2) => sum + str2.length + 2, 2) > Collection.maxFlowStringSingleLineLength) {
            str = start;
            for (const s2 of strings) {
              str += s2 ? `
${indentStep}${indent}${s2}` : "\n";
            }
            str += `
${indent}${end}`;
          } else {
            str = `${start} ${strings.join(" ")} ${end}`;
          }
        } else {
          const strings = nodes.map(blockItem);
          str = strings.shift();
          for (const s2 of strings)
            str += s2 ? `
${indent}${s2}` : "\n";
        }
        if (this.comment) {
          str += "\n" + this.comment.replace(/^/gm, `${indent}#`);
          if (onComment)
            onComment();
        } else if (chompKeep && onChompKeep)
          onChompKeep();
        return str;
      }
    };
    PlainValue._defineProperty(Collection, "maxFlowStringSingleLineLength", 60);
    function asItemIndex(key) {
      let idx = key instanceof Scalar ? key.value : key;
      if (idx && typeof idx === "string")
        idx = Number(idx);
      return Number.isInteger(idx) && idx >= 0 ? idx : null;
    }
    var YAMLSeq = class extends Collection {
      add(value) {
        this.items.push(value);
      }
      delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && it instanceof Scalar ? it.value : it;
      }
      has(key) {
        const idx = asItemIndex(key);
        return typeof idx === "number" && idx < this.items.length;
      }
      set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key}.`);
        this.items[idx] = value;
      }
      toJSON(_, ctx) {
        const seq = [];
        if (ctx && ctx.onCreate)
          ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
          seq.push(toJSON(item, String(i++), ctx));
        return seq;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return super.toString(ctx, {
          blockItem: (n) => n.type === "comment" ? n.str : `- ${n.str}`,
          flowChars: {
            start: "[",
            end: "]"
          },
          isMap: false,
          itemIndent: (ctx.indent || "") + "  "
        }, onComment, onChompKeep);
      }
    };
    var stringifyKey = (key, jsKey, ctx) => {
      if (jsKey === null)
        return "";
      if (typeof jsKey !== "object")
        return String(jsKey);
      if (key instanceof Node && ctx && ctx.doc)
        return key.toString({
          anchors: Object.create(null),
          doc: ctx.doc,
          indent: "",
          indentStep: ctx.indentStep,
          inFlow: true,
          inStringifyKey: true,
          stringify: ctx.stringify
        });
      return JSON.stringify(jsKey);
    };
    var Pair = class extends Node {
      constructor(key, value = null) {
        super();
        this.key = key;
        this.value = value;
        this.type = Pair.Type.PAIR;
      }
      get commentBefore() {
        return this.key instanceof Node ? this.key.commentBefore : void 0;
      }
      set commentBefore(cb) {
        if (this.key == null)
          this.key = new Scalar(null);
        if (this.key instanceof Node)
          this.key.commentBefore = cb;
        else {
          const msg = "Pair.commentBefore is an alias for Pair.key.commentBefore. To set it, the key must be a Node.";
          throw new Error(msg);
        }
      }
      addToJSMap(ctx, map) {
        const key = toJSON(this.key, "", ctx);
        if (map instanceof Map) {
          const value = toJSON(this.value, key, ctx);
          map.set(key, value);
        } else if (map instanceof Set) {
          map.add(key);
        } else {
          const stringKey = stringifyKey(this.key, key, ctx);
          const value = toJSON(this.value, stringKey, ctx);
          if (stringKey in map)
            Object.defineProperty(map, stringKey, {
              value,
              writable: true,
              enumerable: true,
              configurable: true
            });
          else
            map[stringKey] = value;
        }
        return map;
      }
      toJSON(_, ctx) {
        const pair = ctx && ctx.mapAsMap ? new Map() : {};
        return this.addToJSMap(ctx, pair);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx || !ctx.doc)
          return JSON.stringify(this);
        const {
          indent: indentSize,
          indentSeq,
          simpleKeys
        } = ctx.doc.options;
        let {
          key,
          value
        } = this;
        let keyComment = key instanceof Node && key.comment;
        if (simpleKeys) {
          if (keyComment) {
            throw new Error("With simple keys, key nodes cannot have comments");
          }
          if (key instanceof Collection) {
            const msg = "With simple keys, collection cannot be used as a key value";
            throw new Error(msg);
          }
        }
        let explicitKey = !simpleKeys && (!key || keyComment || (key instanceof Node ? key instanceof Collection || key.type === PlainValue.Type.BLOCK_FOLDED || key.type === PlainValue.Type.BLOCK_LITERAL : typeof key === "object"));
        const {
          doc,
          indent,
          indentStep,
          stringify
        } = ctx;
        ctx = Object.assign({}, ctx, {
          implicitKey: !explicitKey,
          indent: indent + indentStep
        });
        let chompKeep = false;
        let str = stringify(key, ctx, () => keyComment = null, () => chompKeep = true);
        str = addComment(str, ctx.indent, keyComment);
        if (!explicitKey && str.length > 1024) {
          if (simpleKeys)
            throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
          explicitKey = true;
        }
        if (ctx.allNullValues && !simpleKeys) {
          if (this.comment) {
            str = addComment(str, ctx.indent, this.comment);
            if (onComment)
              onComment();
          } else if (chompKeep && !keyComment && onChompKeep)
            onChompKeep();
          return ctx.inFlow && !explicitKey ? str : `? ${str}`;
        }
        str = explicitKey ? `? ${str}
${indent}:` : `${str}:`;
        if (this.comment) {
          str = addComment(str, ctx.indent, this.comment);
          if (onComment)
            onComment();
        }
        let vcb = "";
        let valueComment = null;
        if (value instanceof Node) {
          if (value.spaceBefore)
            vcb = "\n";
          if (value.commentBefore) {
            const cs = value.commentBefore.replace(/^/gm, `${ctx.indent}#`);
            vcb += `
${cs}`;
          }
          valueComment = value.comment;
        } else if (value && typeof value === "object") {
          value = doc.schema.createNode(value, true);
        }
        ctx.implicitKey = false;
        if (!explicitKey && !this.comment && value instanceof Scalar)
          ctx.indentAtStart = str.length + 1;
        chompKeep = false;
        if (!indentSeq && indentSize >= 2 && !ctx.inFlow && !explicitKey && value instanceof YAMLSeq && value.type !== PlainValue.Type.FLOW_SEQ && !value.tag && !doc.anchors.getName(value)) {
          ctx.indent = ctx.indent.substr(2);
        }
        const valueStr = stringify(value, ctx, () => valueComment = null, () => chompKeep = true);
        let ws = " ";
        if (vcb || this.comment) {
          ws = `${vcb}
${ctx.indent}`;
        } else if (!explicitKey && value instanceof Collection) {
          const flow = valueStr[0] === "[" || valueStr[0] === "{";
          if (!flow || valueStr.includes("\n"))
            ws = `
${ctx.indent}`;
        } else if (valueStr[0] === "\n")
          ws = "";
        if (chompKeep && !valueComment && onChompKeep)
          onChompKeep();
        return addComment(str + ws + valueStr, ctx.indent, valueComment);
      }
    };
    PlainValue._defineProperty(Pair, "Type", {
      PAIR: "PAIR",
      MERGE_PAIR: "MERGE_PAIR"
    });
    var getAliasCount = (node, anchors) => {
      if (node instanceof Alias) {
        const anchor = anchors.get(node.source);
        return anchor.count * anchor.aliasCount;
      } else if (node instanceof Collection) {
        let count = 0;
        for (const item of node.items) {
          const c = getAliasCount(item, anchors);
          if (c > count)
            count = c;
        }
        return count;
      } else if (node instanceof Pair) {
        const kc = getAliasCount(node.key, anchors);
        const vc = getAliasCount(node.value, anchors);
        return Math.max(kc, vc);
      }
      return 1;
    };
    var Alias = class extends Node {
      static stringify({
        range: range2,
        source
      }, {
        anchors,
        doc,
        implicitKey,
        inStringifyKey
      }) {
        let anchor = Object.keys(anchors).find((a) => anchors[a] === source);
        if (!anchor && inStringifyKey)
          anchor = doc.anchors.getName(source) || doc.anchors.newName();
        if (anchor)
          return `*${anchor}${implicitKey ? " " : ""}`;
        const msg = doc.anchors.getName(source) ? "Alias node must be after source node" : "Source node not found for alias node";
        throw new Error(`${msg} [${range2}]`);
      }
      constructor(source) {
        super();
        this.source = source;
        this.type = PlainValue.Type.ALIAS;
      }
      set tag(t) {
        throw new Error("Alias nodes cannot have tags");
      }
      toJSON(arg, ctx) {
        if (!ctx)
          return toJSON(this.source, arg, ctx);
        const {
          anchors,
          maxAliasCount
        } = ctx;
        const anchor = anchors.get(this.source);
        if (!anchor || anchor.res === void 0) {
          const msg = "This should not happen: Alias anchor was not resolved?";
          if (this.cstNode)
            throw new PlainValue.YAMLReferenceError(this.cstNode, msg);
          else
            throw new ReferenceError(msg);
        }
        if (maxAliasCount >= 0) {
          anchor.count += 1;
          if (anchor.aliasCount === 0)
            anchor.aliasCount = getAliasCount(this.source, anchors);
          if (anchor.count * anchor.aliasCount > maxAliasCount) {
            const msg = "Excessive alias count indicates a resource exhaustion attack";
            if (this.cstNode)
              throw new PlainValue.YAMLReferenceError(this.cstNode, msg);
            else
              throw new ReferenceError(msg);
          }
        }
        return anchor.res;
      }
      toString(ctx) {
        return Alias.stringify(this, ctx);
      }
    };
    PlainValue._defineProperty(Alias, "default", true);
    function findPair(items, key) {
      const k = key instanceof Scalar ? key.value : key;
      for (const it of items) {
        if (it instanceof Pair) {
          if (it.key === key || it.key === k)
            return it;
          if (it.key && it.key.value === k)
            return it;
        }
      }
      return void 0;
    }
    var YAMLMap = class extends Collection {
      add(pair, overwrite) {
        if (!pair)
          pair = new Pair(pair);
        else if (!(pair instanceof Pair))
          pair = new Pair(pair.key || pair, pair.value);
        const prev = findPair(this.items, pair.key);
        const sortEntries = this.schema && this.schema.sortMapEntries;
        if (prev) {
          if (overwrite)
            prev.value = pair.value;
          else
            throw new Error(`Key ${pair.key} already set`);
        } else if (sortEntries) {
          const i = this.items.findIndex((item) => sortEntries(pair, item) < 0);
          if (i === -1)
            this.items.push(pair);
          else
            this.items.splice(i, 0, pair);
        } else {
          this.items.push(pair);
        }
      }
      delete(key) {
        const it = findPair(this.items, key);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it && it.value;
        return !keepScalar && node instanceof Scalar ? node.value : node;
      }
      has(key) {
        return !!findPair(this.items, key);
      }
      set(key, value) {
        this.add(new Pair(key, value), true);
      }
      toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx && ctx.mapAsMap ? new Map() : {};
        if (ctx && ctx.onCreate)
          ctx.onCreate(map);
        for (const item of this.items)
          item.addToJSMap(ctx, map);
        return map;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item of this.items) {
          if (!(item instanceof Pair))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        return super.toString(ctx, {
          blockItem: (n) => n.str,
          flowChars: {
            start: "{",
            end: "}"
          },
          isMap: true,
          itemIndent: ctx.indent || ""
        }, onComment, onChompKeep);
      }
    };
    var MERGE_KEY = "<<";
    var Merge = class extends Pair {
      constructor(pair) {
        if (pair instanceof Pair) {
          let seq = pair.value;
          if (!(seq instanceof YAMLSeq)) {
            seq = new YAMLSeq();
            seq.items.push(pair.value);
            seq.range = pair.value.range;
          }
          super(pair.key, seq);
          this.range = pair.range;
        } else {
          super(new Scalar(MERGE_KEY), new YAMLSeq());
        }
        this.type = Pair.Type.MERGE_PAIR;
      }
      addToJSMap(ctx, map) {
        for (const {
          source
        } of this.value.items) {
          if (!(source instanceof YAMLMap))
            throw new Error("Merge sources must be maps");
          const srcMap = source.toJSON(null, ctx, Map);
          for (const [key, value] of srcMap) {
            if (map instanceof Map) {
              if (!map.has(key))
                map.set(key, value);
            } else if (map instanceof Set) {
              map.add(key);
            } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
              Object.defineProperty(map, key, {
                value,
                writable: true,
                enumerable: true,
                configurable: true
              });
            }
          }
        }
        return map;
      }
      toString(ctx, onComment) {
        const seq = this.value;
        if (seq.items.length > 1)
          return super.toString(ctx, onComment);
        this.value = seq.items[0];
        const str = super.toString(ctx, onComment);
        this.value = seq;
        return str;
      }
    };
    var binaryOptions = {
      defaultType: PlainValue.Type.BLOCK_LITERAL,
      lineWidth: 76
    };
    var boolOptions = {
      trueStr: "true",
      falseStr: "false"
    };
    var intOptions = {
      asBigInt: false
    };
    var nullOptions = {
      nullStr: "null"
    };
    var strOptions = {
      defaultType: PlainValue.Type.PLAIN,
      doubleQuoted: {
        jsonEncoding: false,
        minMultiLineLength: 40
      },
      fold: {
        lineWidth: 80,
        minContentWidth: 20
      }
    };
    function resolveScalar(str, tags, scalarFallback) {
      for (const {
        format: format2,
        test,
        resolve: resolve2
      } of tags) {
        if (test) {
          const match = str.match(test);
          if (match) {
            let res = resolve2.apply(null, match);
            if (!(res instanceof Scalar))
              res = new Scalar(res);
            if (format2)
              res.format = format2;
            return res;
          }
        }
      }
      if (scalarFallback)
        str = scalarFallback(str);
      return new Scalar(str);
    }
    var FOLD_FLOW = "flow";
    var FOLD_BLOCK = "block";
    var FOLD_QUOTED = "quoted";
    var consumeMoreIndentedLines = (text, i) => {
      let ch = text[i + 1];
      while (ch === " " || ch === "	") {
        do {
          ch = text[i += 1];
        } while (ch && ch !== "\n");
        ch = text[i + 1];
      }
      return i;
    };
    function foldFlowLines(text, indent, mode, {
      indentAtStart,
      lineWidth = 80,
      minContentWidth = 20,
      onFold,
      onOverflow
    }) {
      if (!lineWidth || lineWidth < 0)
        return text;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text.length <= endStep)
        return text;
      const folds = [];
      const escapedFolds = {};
      let end = lineWidth - indent.length;
      if (typeof indentAtStart === "number") {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
          folds.push(0);
        else
          end = lineWidth - indentAtStart;
      }
      let split = void 0;
      let prev = void 0;
      let overflow = false;
      let i = -1;
      let escStart = -1;
      let escEnd = -1;
      if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text, i);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text[i + 1]) {
            case "x":
              i += 3;
              break;
            case "u":
              i += 5;
              break;
            case "U":
              i += 9;
              break;
            default:
              i += 1;
          }
          escEnd = i;
        }
        if (ch === "\n") {
          if (mode === FOLD_BLOCK)
            i = consumeMoreIndentedLines(text, i);
          end = i + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text[i + 1];
            if (next && next !== " " && next !== "\n" && next !== "	")
              split = i;
          }
          if (i >= end) {
            if (split) {
              folds.push(split);
              end = split + endStep;
              split = void 0;
            } else if (mode === FOLD_QUOTED) {
              while (prev === " " || prev === "	") {
                prev = ch;
                ch = text[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text;
              folds.push(j);
              escapedFolds[j] = true;
              end = j + endStep;
              split = void 0;
            } else {
              overflow = true;
            }
          }
        }
        prev = ch;
      }
      if (overflow && onOverflow)
        onOverflow();
      if (folds.length === 0)
        return text;
      if (onFold)
        onFold();
      let res = text.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text.length;
        if (fold === 0)
          res = `
${indent}${text.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text[fold]}\\`;
          res += `
${indent}${text.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    var getFoldOptions = ({
      indentAtStart
    }) => indentAtStart ? Object.assign({
      indentAtStart
    }, strOptions.fold) : strOptions.fold;
    var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
    function lineLengthOverLimit(str, lineWidth, indentLength) {
      if (!lineWidth || lineWidth < 0)
        return false;
      const limit = lineWidth - indentLength;
      const strLen = str.length;
      if (strLen <= limit)
        return false;
      for (let i = 0, start = 0; i < strLen; ++i) {
        if (str[i] === "\n") {
          if (i - start > limit)
            return true;
          start = i + 1;
          if (strLen - start <= limit)
            return false;
        }
      }
      return true;
    }
    function doubleQuotedString(value, ctx) {
      const {
        implicitKey
      } = ctx;
      const {
        jsonEncoding,
        minMultiLineLength
      } = strOptions.doubleQuoted;
      const json = JSON.stringify(value);
      if (jsonEncoding)
        return json;
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      let str = "";
      let start = 0;
      for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
          str += json.slice(start, i) + "\\ ";
          i += 1;
          start = i;
          ch = "\\";
        }
        if (ch === "\\")
          switch (json[i + 1]) {
            case "u":
              {
                str += json.slice(start, i);
                const code = json.substr(i + 2, 4);
                switch (code) {
                  case "0000":
                    str += "\\0";
                    break;
                  case "0007":
                    str += "\\a";
                    break;
                  case "000b":
                    str += "\\v";
                    break;
                  case "001b":
                    str += "\\e";
                    break;
                  case "0085":
                    str += "\\N";
                    break;
                  case "00a0":
                    str += "\\_";
                    break;
                  case "2028":
                    str += "\\L";
                    break;
                  case "2029":
                    str += "\\P";
                    break;
                  default:
                    if (code.substr(0, 2) === "00")
                      str += "\\x" + code.substr(2);
                    else
                      str += json.substr(i, 6);
                }
                i += 5;
                start = i + 1;
              }
              break;
            case "n":
              if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
                i += 1;
              } else {
                str += json.slice(start, i) + "\n\n";
                while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                  str += "\n";
                  i += 2;
                }
                str += indent;
                if (json[i + 2] === " ")
                  str += "\\";
                i += 1;
                start = i + 1;
              }
              break;
            default:
              i += 1;
          }
      }
      str = start ? str + json.slice(start) : json;
      return implicitKey ? str : foldFlowLines(str, indent, FOLD_QUOTED, getFoldOptions(ctx));
    }
    function singleQuotedString(value, ctx) {
      if (ctx.implicitKey) {
        if (/\n/.test(value))
          return doubleQuotedString(value, ctx);
      } else {
        if (/[ \t]\n|\n[ \t]/.test(value))
          return doubleQuotedString(value, ctx);
      }
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
      return ctx.implicitKey ? res : foldFlowLines(res, indent, FOLD_FLOW, getFoldOptions(ctx));
    }
    function blockString({
      comment,
      type,
      value
    }, ctx, onComment, onChompKeep) {
      if (/\n[\t ]+$/.test(value) || /^\s*$/.test(value)) {
        return doubleQuotedString(value, ctx);
      }
      const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
      const indentSize = indent ? "2" : "1";
      const literal = type === PlainValue.Type.BLOCK_FOLDED ? false : type === PlainValue.Type.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, strOptions.fold.lineWidth, indent.length);
      let header = literal ? "|" : ">";
      if (!value)
        return header + "\n";
      let wsStart = "";
      let wsEnd = "";
      value = value.replace(/[\n\t ]*$/, (ws) => {
        const n = ws.indexOf("\n");
        if (n === -1) {
          header += "-";
        } else if (value === ws || n !== ws.length - 1) {
          header += "+";
          if (onChompKeep)
            onChompKeep();
        }
        wsEnd = ws.replace(/\n$/, "");
        return "";
      }).replace(/^[\n ]*/, (ws) => {
        if (ws.indexOf(" ") !== -1)
          header += indentSize;
        const m = ws.match(/ +$/);
        if (m) {
          wsStart = ws.slice(0, -m[0].length);
          return m[0];
        } else {
          wsStart = ws;
          return "";
        }
      });
      if (wsEnd)
        wsEnd = wsEnd.replace(/\n+(?!\n|$)/g, `$&${indent}`);
      if (wsStart)
        wsStart = wsStart.replace(/\n+/g, `$&${indent}`);
      if (comment) {
        header += " #" + comment.replace(/ ?[\r\n]+/g, " ");
        if (onComment)
          onComment();
      }
      if (!value)
        return `${header}${indentSize}
${indent}${wsEnd}`;
      if (literal) {
        value = value.replace(/\n+/g, `$&${indent}`);
        return `${header}
${indent}${wsStart}${value}${wsEnd}`;
      }
      value = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
      const body = foldFlowLines(`${wsStart}${value}${wsEnd}`, indent, FOLD_BLOCK, strOptions.fold);
      return `${header}
${indent}${body}`;
    }
    function plainString(item, ctx, onComment, onChompKeep) {
      const {
        comment,
        type,
        value
      } = item;
      const {
        actualString,
        implicitKey,
        indent,
        inFlow
      } = ctx;
      if (implicitKey && /[\n[\]{},]/.test(value) || inFlow && /[[\]{},]/.test(value)) {
        return doubleQuotedString(value, ctx);
      }
      if (!value || /^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        return implicitKey || inFlow || value.indexOf("\n") === -1 ? value.indexOf('"') !== -1 && value.indexOf("'") === -1 ? singleQuotedString(value, ctx) : doubleQuotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
      }
      if (!implicitKey && !inFlow && type !== PlainValue.Type.PLAIN && value.indexOf("\n") !== -1) {
        return blockString(item, ctx, onComment, onChompKeep);
      }
      if (indent === "" && containsDocumentMarker(value)) {
        ctx.forceBlockIndent = true;
        return blockString(item, ctx, onComment, onChompKeep);
      }
      const str = value.replace(/\n+/g, `$&
${indent}`);
      if (actualString) {
        const {
          tags
        } = ctx.doc.schema;
        const resolved = resolveScalar(str, tags, tags.scalarFallback).value;
        if (typeof resolved !== "string")
          return doubleQuotedString(value, ctx);
      }
      const body = implicitKey ? str : foldFlowLines(str, indent, FOLD_FLOW, getFoldOptions(ctx));
      if (comment && !inFlow && (body.indexOf("\n") !== -1 || comment.indexOf("\n") !== -1)) {
        if (onComment)
          onComment();
        return addCommentBefore(body, indent, comment);
      }
      return body;
    }
    function stringifyString2(item, ctx, onComment, onChompKeep) {
      const {
        defaultType
      } = strOptions;
      const {
        implicitKey,
        inFlow
      } = ctx;
      let {
        type,
        value
      } = item;
      if (typeof value !== "string") {
        value = String(value);
        item = Object.assign({}, item, {
          value
        });
      }
      const _stringify = (_type) => {
        switch (_type) {
          case PlainValue.Type.BLOCK_FOLDED:
          case PlainValue.Type.BLOCK_LITERAL:
            return blockString(item, ctx, onComment, onChompKeep);
          case PlainValue.Type.QUOTE_DOUBLE:
            return doubleQuotedString(value, ctx);
          case PlainValue.Type.QUOTE_SINGLE:
            return singleQuotedString(value, ctx);
          case PlainValue.Type.PLAIN:
            return plainString(item, ctx, onComment, onChompKeep);
          default:
            return null;
        }
      };
      if (type !== PlainValue.Type.QUOTE_DOUBLE && /[\x00-\x08\x0b-\x1f\x7f-\x9f]/.test(value)) {
        type = PlainValue.Type.QUOTE_DOUBLE;
      } else if ((implicitKey || inFlow) && (type === PlainValue.Type.BLOCK_FOLDED || type === PlainValue.Type.BLOCK_LITERAL)) {
        type = PlainValue.Type.QUOTE_DOUBLE;
      }
      let res = _stringify(type);
      if (res === null) {
        res = _stringify(defaultType);
        if (res === null)
          throw new Error(`Unsupported default string type ${defaultType}`);
      }
      return res;
    }
    function stringifyNumber({
      format: format2,
      minFractionDigits,
      tag,
      value
    }) {
      if (typeof value === "bigint")
        return String(value);
      if (!isFinite(value))
        return isNaN(value) ? ".nan" : value < 0 ? "-.inf" : ".inf";
      let n = JSON.stringify(value);
      if (!format2 && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^\d/.test(n)) {
        let i = n.indexOf(".");
        if (i < 0) {
          i = n.length;
          n += ".";
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
          n += "0";
      }
      return n;
    }
    function checkFlowCollectionEnd(errors, cst) {
      let char, name;
      switch (cst.type) {
        case PlainValue.Type.FLOW_MAP:
          char = "}";
          name = "flow map";
          break;
        case PlainValue.Type.FLOW_SEQ:
          char = "]";
          name = "flow sequence";
          break;
        default:
          errors.push(new PlainValue.YAMLSemanticError(cst, "Not a flow collection!?"));
          return;
      }
      let lastItem;
      for (let i = cst.items.length - 1; i >= 0; --i) {
        const item = cst.items[i];
        if (!item || item.type !== PlainValue.Type.COMMENT) {
          lastItem = item;
          break;
        }
      }
      if (lastItem && lastItem.char !== char) {
        const msg = `Expected ${name} to end with ${char}`;
        let err;
        if (typeof lastItem.offset === "number") {
          err = new PlainValue.YAMLSemanticError(cst, msg);
          err.offset = lastItem.offset + 1;
        } else {
          err = new PlainValue.YAMLSemanticError(lastItem, msg);
          if (lastItem.range && lastItem.range.end)
            err.offset = lastItem.range.end - lastItem.range.start;
        }
        errors.push(err);
      }
    }
    function checkFlowCommentSpace(errors, comment) {
      const prev = comment.context.src[comment.range.start - 1];
      if (prev !== "\n" && prev !== "	" && prev !== " ") {
        const msg = "Comments must be separated from other tokens by white space characters";
        errors.push(new PlainValue.YAMLSemanticError(comment, msg));
      }
    }
    function getLongKeyError(source, key) {
      const sk = String(key);
      const k = sk.substr(0, 8) + "..." + sk.substr(-8);
      return new PlainValue.YAMLSemanticError(source, `The "${k}" key is too long`);
    }
    function resolveComments(collection, comments) {
      for (const {
        afterKey,
        before,
        comment
      } of comments) {
        let item = collection.items[before];
        if (!item) {
          if (comment !== void 0) {
            if (collection.comment)
              collection.comment += "\n" + comment;
            else
              collection.comment = comment;
          }
        } else {
          if (afterKey && item.value)
            item = item.value;
          if (comment === void 0) {
            if (afterKey || !item.commentBefore)
              item.spaceBefore = true;
          } else {
            if (item.commentBefore)
              item.commentBefore += "\n" + comment;
            else
              item.commentBefore = comment;
          }
        }
      }
    }
    function resolveString(doc, node) {
      const res = node.strValue;
      if (!res)
        return "";
      if (typeof res === "string")
        return res;
      res.errors.forEach((error2) => {
        if (!error2.source)
          error2.source = node;
        doc.errors.push(error2);
      });
      return res.str;
    }
    function resolveTagHandle(doc, node) {
      const {
        handle,
        suffix
      } = node.tag;
      let prefix = doc.tagPrefixes.find((p) => p.handle === handle);
      if (!prefix) {
        const dtp = doc.getDefaults().tagPrefixes;
        if (dtp)
          prefix = dtp.find((p) => p.handle === handle);
        if (!prefix)
          throw new PlainValue.YAMLSemanticError(node, `The ${handle} tag handle is non-default and was not declared.`);
      }
      if (!suffix)
        throw new PlainValue.YAMLSemanticError(node, `The ${handle} tag has no suffix.`);
      if (handle === "!" && (doc.version || doc.options.version) === "1.0") {
        if (suffix[0] === "^") {
          doc.warnings.push(new PlainValue.YAMLWarning(node, "YAML 1.0 ^ tag expansion is not supported"));
          return suffix;
        }
        if (/[:/]/.test(suffix)) {
          const vocab = suffix.match(/^([a-z0-9-]+)\/(.*)/i);
          return vocab ? `tag:${vocab[1]}.yaml.org,2002:${vocab[2]}` : `tag:${suffix}`;
        }
      }
      return prefix.prefix + decodeURIComponent(suffix);
    }
    function resolveTagName(doc, node) {
      const {
        tag,
        type
      } = node;
      let nonSpecific = false;
      if (tag) {
        const {
          handle,
          suffix,
          verbatim
        } = tag;
        if (verbatim) {
          if (verbatim !== "!" && verbatim !== "!!")
            return verbatim;
          const msg = `Verbatim tags aren't resolved, so ${verbatim} is invalid.`;
          doc.errors.push(new PlainValue.YAMLSemanticError(node, msg));
        } else if (handle === "!" && !suffix) {
          nonSpecific = true;
        } else {
          try {
            return resolveTagHandle(doc, node);
          } catch (error2) {
            doc.errors.push(error2);
          }
        }
      }
      switch (type) {
        case PlainValue.Type.BLOCK_FOLDED:
        case PlainValue.Type.BLOCK_LITERAL:
        case PlainValue.Type.QUOTE_DOUBLE:
        case PlainValue.Type.QUOTE_SINGLE:
          return PlainValue.defaultTags.STR;
        case PlainValue.Type.FLOW_MAP:
        case PlainValue.Type.MAP:
          return PlainValue.defaultTags.MAP;
        case PlainValue.Type.FLOW_SEQ:
        case PlainValue.Type.SEQ:
          return PlainValue.defaultTags.SEQ;
        case PlainValue.Type.PLAIN:
          return nonSpecific ? PlainValue.defaultTags.STR : null;
        default:
          return null;
      }
    }
    function resolveByTagName(doc, node, tagName) {
      const {
        tags
      } = doc.schema;
      const matchWithTest = [];
      for (const tag of tags) {
        if (tag.tag === tagName) {
          if (tag.test)
            matchWithTest.push(tag);
          else {
            const res = tag.resolve(doc, node);
            return res instanceof Collection ? res : new Scalar(res);
          }
        }
      }
      const str = resolveString(doc, node);
      if (typeof str === "string" && matchWithTest.length > 0)
        return resolveScalar(str, matchWithTest, tags.scalarFallback);
      return null;
    }
    function getFallbackTagName({
      type
    }) {
      switch (type) {
        case PlainValue.Type.FLOW_MAP:
        case PlainValue.Type.MAP:
          return PlainValue.defaultTags.MAP;
        case PlainValue.Type.FLOW_SEQ:
        case PlainValue.Type.SEQ:
          return PlainValue.defaultTags.SEQ;
        default:
          return PlainValue.defaultTags.STR;
      }
    }
    function resolveTag(doc, node, tagName) {
      try {
        const res = resolveByTagName(doc, node, tagName);
        if (res) {
          if (tagName && node.tag)
            res.tag = tagName;
          return res;
        }
      } catch (error2) {
        if (!error2.source)
          error2.source = node;
        doc.errors.push(error2);
        return null;
      }
      try {
        const fallback = getFallbackTagName(node);
        if (!fallback)
          throw new Error(`The tag ${tagName} is unavailable`);
        const msg = `The tag ${tagName} is unavailable, falling back to ${fallback}`;
        doc.warnings.push(new PlainValue.YAMLWarning(node, msg));
        const res = resolveByTagName(doc, node, fallback);
        res.tag = tagName;
        return res;
      } catch (error2) {
        const refError = new PlainValue.YAMLReferenceError(node, error2.message);
        refError.stack = error2.stack;
        doc.errors.push(refError);
        return null;
      }
    }
    var isCollectionItem = (node) => {
      if (!node)
        return false;
      const {
        type
      } = node;
      return type === PlainValue.Type.MAP_KEY || type === PlainValue.Type.MAP_VALUE || type === PlainValue.Type.SEQ_ITEM;
    };
    function resolveNodeProps(errors, node) {
      const comments = {
        before: [],
        after: []
      };
      let hasAnchor = false;
      let hasTag = false;
      const props = isCollectionItem(node.context.parent) ? node.context.parent.props.concat(node.props) : node.props;
      for (const {
        start,
        end
      } of props) {
        switch (node.context.src[start]) {
          case PlainValue.Char.COMMENT: {
            if (!node.commentHasRequiredWhitespace(start)) {
              const msg = "Comments must be separated from other tokens by white space characters";
              errors.push(new PlainValue.YAMLSemanticError(node, msg));
            }
            const {
              header,
              valueRange
            } = node;
            const cc = valueRange && (start > valueRange.start || header && start > header.start) ? comments.after : comments.before;
            cc.push(node.context.src.slice(start + 1, end));
            break;
          }
          case PlainValue.Char.ANCHOR:
            if (hasAnchor) {
              const msg = "A node can have at most one anchor";
              errors.push(new PlainValue.YAMLSemanticError(node, msg));
            }
            hasAnchor = true;
            break;
          case PlainValue.Char.TAG:
            if (hasTag) {
              const msg = "A node can have at most one tag";
              errors.push(new PlainValue.YAMLSemanticError(node, msg));
            }
            hasTag = true;
            break;
        }
      }
      return {
        comments,
        hasAnchor,
        hasTag
      };
    }
    function resolveNodeValue(doc, node) {
      const {
        anchors,
        errors,
        schema
      } = doc;
      if (node.type === PlainValue.Type.ALIAS) {
        const name = node.rawValue;
        const src2 = anchors.getNode(name);
        if (!src2) {
          const msg = `Aliased anchor not found: ${name}`;
          errors.push(new PlainValue.YAMLReferenceError(node, msg));
          return null;
        }
        const res = new Alias(src2);
        anchors._cstAliases.push(res);
        return res;
      }
      const tagName = resolveTagName(doc, node);
      if (tagName)
        return resolveTag(doc, node, tagName);
      if (node.type !== PlainValue.Type.PLAIN) {
        const msg = `Failed to resolve ${node.type} node here`;
        errors.push(new PlainValue.YAMLSyntaxError(node, msg));
        return null;
      }
      try {
        const str = resolveString(doc, node);
        return resolveScalar(str, schema.tags, schema.tags.scalarFallback);
      } catch (error2) {
        if (!error2.source)
          error2.source = node;
        errors.push(error2);
        return null;
      }
    }
    function resolveNode(doc, node) {
      if (!node)
        return null;
      if (node.error)
        doc.errors.push(node.error);
      const {
        comments,
        hasAnchor,
        hasTag
      } = resolveNodeProps(doc.errors, node);
      if (hasAnchor) {
        const {
          anchors
        } = doc;
        const name = node.anchor;
        const prev = anchors.getNode(name);
        if (prev)
          anchors.map[anchors.newName(name)] = prev;
        anchors.map[name] = node;
      }
      if (node.type === PlainValue.Type.ALIAS && (hasAnchor || hasTag)) {
        const msg = "An alias node must not specify any properties";
        doc.errors.push(new PlainValue.YAMLSemanticError(node, msg));
      }
      const res = resolveNodeValue(doc, node);
      if (res) {
        res.range = [node.range.start, node.range.end];
        if (doc.options.keepCstNodes)
          res.cstNode = node;
        if (doc.options.keepNodeTypes)
          res.type = node.type;
        const cb = comments.before.join("\n");
        if (cb) {
          res.commentBefore = res.commentBefore ? `${res.commentBefore}
${cb}` : cb;
        }
        const ca = comments.after.join("\n");
        if (ca)
          res.comment = res.comment ? `${res.comment}
${ca}` : ca;
      }
      return node.resolved = res;
    }
    function resolveMap(doc, cst) {
      if (cst.type !== PlainValue.Type.MAP && cst.type !== PlainValue.Type.FLOW_MAP) {
        const msg = `A ${cst.type} node cannot be resolved as a mapping`;
        doc.errors.push(new PlainValue.YAMLSyntaxError(cst, msg));
        return null;
      }
      const {
        comments,
        items
      } = cst.type === PlainValue.Type.FLOW_MAP ? resolveFlowMapItems(doc, cst) : resolveBlockMapItems(doc, cst);
      const map = new YAMLMap();
      map.items = items;
      resolveComments(map, comments);
      let hasCollectionKey = false;
      for (let i = 0; i < items.length; ++i) {
        const {
          key: iKey
        } = items[i];
        if (iKey instanceof Collection)
          hasCollectionKey = true;
        if (doc.schema.merge && iKey && iKey.value === MERGE_KEY) {
          items[i] = new Merge(items[i]);
          const sources = items[i].value.items;
          let error2 = null;
          sources.some((node) => {
            if (node instanceof Alias) {
              const {
                type
              } = node.source;
              if (type === PlainValue.Type.MAP || type === PlainValue.Type.FLOW_MAP)
                return false;
              return error2 = "Merge nodes aliases can only point to maps";
            }
            return error2 = "Merge nodes can only have Alias nodes as values";
          });
          if (error2)
            doc.errors.push(new PlainValue.YAMLSemanticError(cst, error2));
        } else {
          for (let j = i + 1; j < items.length; ++j) {
            const {
              key: jKey
            } = items[j];
            if (iKey === jKey || iKey && jKey && Object.prototype.hasOwnProperty.call(iKey, "value") && iKey.value === jKey.value) {
              const msg = `Map keys must be unique; "${iKey}" is repeated`;
              doc.errors.push(new PlainValue.YAMLSemanticError(cst, msg));
              break;
            }
          }
        }
      }
      if (hasCollectionKey && !doc.options.mapAsMap) {
        const warn = "Keys with collection values will be stringified as YAML due to JS Object restrictions. Use mapAsMap: true to avoid this.";
        doc.warnings.push(new PlainValue.YAMLWarning(cst, warn));
      }
      cst.resolved = map;
      return map;
    }
    var valueHasPairComment = ({
      context: {
        lineStart,
        node,
        src: src2
      },
      props
    }) => {
      if (props.length === 0)
        return false;
      const {
        start
      } = props[0];
      if (node && start > node.valueRange.start)
        return false;
      if (src2[start] !== PlainValue.Char.COMMENT)
        return false;
      for (let i = lineStart; i < start; ++i)
        if (src2[i] === "\n")
          return false;
      return true;
    };
    function resolvePairComment(item, pair) {
      if (!valueHasPairComment(item))
        return;
      const comment = item.getPropValue(0, PlainValue.Char.COMMENT, true);
      let found = false;
      const cb = pair.value.commentBefore;
      if (cb && cb.startsWith(comment)) {
        pair.value.commentBefore = cb.substr(comment.length + 1);
        found = true;
      } else {
        const cc = pair.value.comment;
        if (!item.node && cc && cc.startsWith(comment)) {
          pair.value.comment = cc.substr(comment.length + 1);
          found = true;
        }
      }
      if (found)
        pair.comment = comment;
    }
    function resolveBlockMapItems(doc, cst) {
      const comments = [];
      const items = [];
      let key = void 0;
      let keyStart = null;
      for (let i = 0; i < cst.items.length; ++i) {
        const item = cst.items[i];
        switch (item.type) {
          case PlainValue.Type.BLANK_LINE:
            comments.push({
              afterKey: !!key,
              before: items.length
            });
            break;
          case PlainValue.Type.COMMENT:
            comments.push({
              afterKey: !!key,
              before: items.length,
              comment: item.comment
            });
            break;
          case PlainValue.Type.MAP_KEY:
            if (key !== void 0)
              items.push(new Pair(key));
            if (item.error)
              doc.errors.push(item.error);
            key = resolveNode(doc, item.node);
            keyStart = null;
            break;
          case PlainValue.Type.MAP_VALUE:
            {
              if (key === void 0)
                key = null;
              if (item.error)
                doc.errors.push(item.error);
              if (!item.context.atLineStart && item.node && item.node.type === PlainValue.Type.MAP && !item.node.context.atLineStart) {
                const msg = "Nested mappings are not allowed in compact mappings";
                doc.errors.push(new PlainValue.YAMLSemanticError(item.node, msg));
              }
              let valueNode = item.node;
              if (!valueNode && item.props.length > 0) {
                valueNode = new PlainValue.PlainValue(PlainValue.Type.PLAIN, []);
                valueNode.context = {
                  parent: item,
                  src: item.context.src
                };
                const pos = item.range.start + 1;
                valueNode.range = {
                  start: pos,
                  end: pos
                };
                valueNode.valueRange = {
                  start: pos,
                  end: pos
                };
                if (typeof item.range.origStart === "number") {
                  const origPos = item.range.origStart + 1;
                  valueNode.range.origStart = valueNode.range.origEnd = origPos;
                  valueNode.valueRange.origStart = valueNode.valueRange.origEnd = origPos;
                }
              }
              const pair = new Pair(key, resolveNode(doc, valueNode));
              resolvePairComment(item, pair);
              items.push(pair);
              if (key && typeof keyStart === "number") {
                if (item.range.start > keyStart + 1024)
                  doc.errors.push(getLongKeyError(cst, key));
              }
              key = void 0;
              keyStart = null;
            }
            break;
          default:
            if (key !== void 0)
              items.push(new Pair(key));
            key = resolveNode(doc, item);
            keyStart = item.range.start;
            if (item.error)
              doc.errors.push(item.error);
            next:
              for (let j = i + 1; ; ++j) {
                const nextItem = cst.items[j];
                switch (nextItem && nextItem.type) {
                  case PlainValue.Type.BLANK_LINE:
                  case PlainValue.Type.COMMENT:
                    continue next;
                  case PlainValue.Type.MAP_VALUE:
                    break next;
                  default: {
                    const msg = "Implicit map keys need to be followed by map values";
                    doc.errors.push(new PlainValue.YAMLSemanticError(item, msg));
                    break next;
                  }
                }
              }
            if (item.valueRangeContainsNewline) {
              const msg = "Implicit map keys need to be on a single line";
              doc.errors.push(new PlainValue.YAMLSemanticError(item, msg));
            }
        }
      }
      if (key !== void 0)
        items.push(new Pair(key));
      return {
        comments,
        items
      };
    }
    function resolveFlowMapItems(doc, cst) {
      const comments = [];
      const items = [];
      let key = void 0;
      let explicitKey = false;
      let next = "{";
      for (let i = 0; i < cst.items.length; ++i) {
        const item = cst.items[i];
        if (typeof item.char === "string") {
          const {
            char,
            offset
          } = item;
          if (char === "?" && key === void 0 && !explicitKey) {
            explicitKey = true;
            next = ":";
            continue;
          }
          if (char === ":") {
            if (key === void 0)
              key = null;
            if (next === ":") {
              next = ",";
              continue;
            }
          } else {
            if (explicitKey) {
              if (key === void 0 && char !== ",")
                key = null;
              explicitKey = false;
            }
            if (key !== void 0) {
              items.push(new Pair(key));
              key = void 0;
              if (char === ",") {
                next = ":";
                continue;
              }
            }
          }
          if (char === "}") {
            if (i === cst.items.length - 1)
              continue;
          } else if (char === next) {
            next = ":";
            continue;
          }
          const msg = `Flow map contains an unexpected ${char}`;
          const err = new PlainValue.YAMLSyntaxError(cst, msg);
          err.offset = offset;
          doc.errors.push(err);
        } else if (item.type === PlainValue.Type.BLANK_LINE) {
          comments.push({
            afterKey: !!key,
            before: items.length
          });
        } else if (item.type === PlainValue.Type.COMMENT) {
          checkFlowCommentSpace(doc.errors, item);
          comments.push({
            afterKey: !!key,
            before: items.length,
            comment: item.comment
          });
        } else if (key === void 0) {
          if (next === ",")
            doc.errors.push(new PlainValue.YAMLSemanticError(item, "Separator , missing in flow map"));
          key = resolveNode(doc, item);
        } else {
          if (next !== ",")
            doc.errors.push(new PlainValue.YAMLSemanticError(item, "Indicator : missing in flow map entry"));
          items.push(new Pair(key, resolveNode(doc, item)));
          key = void 0;
          explicitKey = false;
        }
      }
      checkFlowCollectionEnd(doc.errors, cst);
      if (key !== void 0)
        items.push(new Pair(key));
      return {
        comments,
        items
      };
    }
    function resolveSeq(doc, cst) {
      if (cst.type !== PlainValue.Type.SEQ && cst.type !== PlainValue.Type.FLOW_SEQ) {
        const msg = `A ${cst.type} node cannot be resolved as a sequence`;
        doc.errors.push(new PlainValue.YAMLSyntaxError(cst, msg));
        return null;
      }
      const {
        comments,
        items
      } = cst.type === PlainValue.Type.FLOW_SEQ ? resolveFlowSeqItems(doc, cst) : resolveBlockSeqItems(doc, cst);
      const seq = new YAMLSeq();
      seq.items = items;
      resolveComments(seq, comments);
      if (!doc.options.mapAsMap && items.some((it) => it instanceof Pair && it.key instanceof Collection)) {
        const warn = "Keys with collection values will be stringified as YAML due to JS Object restrictions. Use mapAsMap: true to avoid this.";
        doc.warnings.push(new PlainValue.YAMLWarning(cst, warn));
      }
      cst.resolved = seq;
      return seq;
    }
    function resolveBlockSeqItems(doc, cst) {
      const comments = [];
      const items = [];
      for (let i = 0; i < cst.items.length; ++i) {
        const item = cst.items[i];
        switch (item.type) {
          case PlainValue.Type.BLANK_LINE:
            comments.push({
              before: items.length
            });
            break;
          case PlainValue.Type.COMMENT:
            comments.push({
              comment: item.comment,
              before: items.length
            });
            break;
          case PlainValue.Type.SEQ_ITEM:
            if (item.error)
              doc.errors.push(item.error);
            items.push(resolveNode(doc, item.node));
            if (item.hasProps) {
              const msg = "Sequence items cannot have tags or anchors before the - indicator";
              doc.errors.push(new PlainValue.YAMLSemanticError(item, msg));
            }
            break;
          default:
            if (item.error)
              doc.errors.push(item.error);
            doc.errors.push(new PlainValue.YAMLSyntaxError(item, `Unexpected ${item.type} node in sequence`));
        }
      }
      return {
        comments,
        items
      };
    }
    function resolveFlowSeqItems(doc, cst) {
      const comments = [];
      const items = [];
      let explicitKey = false;
      let key = void 0;
      let keyStart = null;
      let next = "[";
      let prevItem = null;
      for (let i = 0; i < cst.items.length; ++i) {
        const item = cst.items[i];
        if (typeof item.char === "string") {
          const {
            char,
            offset
          } = item;
          if (char !== ":" && (explicitKey || key !== void 0)) {
            if (explicitKey && key === void 0)
              key = next ? items.pop() : null;
            items.push(new Pair(key));
            explicitKey = false;
            key = void 0;
            keyStart = null;
          }
          if (char === next) {
            next = null;
          } else if (!next && char === "?") {
            explicitKey = true;
          } else if (next !== "[" && char === ":" && key === void 0) {
            if (next === ",") {
              key = items.pop();
              if (key instanceof Pair) {
                const msg = "Chaining flow sequence pairs is invalid";
                const err = new PlainValue.YAMLSemanticError(cst, msg);
                err.offset = offset;
                doc.errors.push(err);
              }
              if (!explicitKey && typeof keyStart === "number") {
                const keyEnd = item.range ? item.range.start : item.offset;
                if (keyEnd > keyStart + 1024)
                  doc.errors.push(getLongKeyError(cst, key));
                const {
                  src: src2
                } = prevItem.context;
                for (let i2 = keyStart; i2 < keyEnd; ++i2)
                  if (src2[i2] === "\n") {
                    const msg = "Implicit keys of flow sequence pairs need to be on a single line";
                    doc.errors.push(new PlainValue.YAMLSemanticError(prevItem, msg));
                    break;
                  }
              }
            } else {
              key = null;
            }
            keyStart = null;
            explicitKey = false;
            next = null;
          } else if (next === "[" || char !== "]" || i < cst.items.length - 1) {
            const msg = `Flow sequence contains an unexpected ${char}`;
            const err = new PlainValue.YAMLSyntaxError(cst, msg);
            err.offset = offset;
            doc.errors.push(err);
          }
        } else if (item.type === PlainValue.Type.BLANK_LINE) {
          comments.push({
            before: items.length
          });
        } else if (item.type === PlainValue.Type.COMMENT) {
          checkFlowCommentSpace(doc.errors, item);
          comments.push({
            comment: item.comment,
            before: items.length
          });
        } else {
          if (next) {
            const msg = `Expected a ${next} in flow sequence`;
            doc.errors.push(new PlainValue.YAMLSemanticError(item, msg));
          }
          const value = resolveNode(doc, item);
          if (key === void 0) {
            items.push(value);
            prevItem = item;
          } else {
            items.push(new Pair(key, value));
            key = void 0;
          }
          keyStart = item.range.start;
          next = ",";
        }
      }
      checkFlowCollectionEnd(doc.errors, cst);
      if (key !== void 0)
        items.push(new Pair(key));
      return {
        comments,
        items
      };
    }
    exports.Alias = Alias;
    exports.Collection = Collection;
    exports.Merge = Merge;
    exports.Node = Node;
    exports.Pair = Pair;
    exports.Scalar = Scalar;
    exports.YAMLMap = YAMLMap;
    exports.YAMLSeq = YAMLSeq;
    exports.addComment = addComment;
    exports.binaryOptions = binaryOptions;
    exports.boolOptions = boolOptions;
    exports.findPair = findPair;
    exports.intOptions = intOptions;
    exports.isEmptyPath = isEmptyPath;
    exports.nullOptions = nullOptions;
    exports.resolveMap = resolveMap;
    exports.resolveNode = resolveNode;
    exports.resolveSeq = resolveSeq;
    exports.resolveString = resolveString;
    exports.strOptions = strOptions;
    exports.stringifyNumber = stringifyNumber;
    exports.stringifyString = stringifyString2;
    exports.toJSON = toJSON;
  }
});

// node_modules/yaml/dist/warnings-1000a372.js
var require_warnings_1000a372 = __commonJS({
  "node_modules/yaml/dist/warnings-1000a372.js"(exports) {
    init_shims();
    "use strict";
    var PlainValue = require_PlainValue_ec8e588e();
    var resolveSeq = require_resolveSeq_d03cb037();
    var binary = {
      identify: (value) => value instanceof Uint8Array,
      default: false,
      tag: "tag:yaml.org,2002:binary",
      resolve: (doc, node) => {
        const src2 = resolveSeq.resolveString(doc, node);
        if (typeof Buffer === "function") {
          return Buffer.from(src2, "base64");
        } else if (typeof atob === "function") {
          const str = atob(src2.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str.length);
          for (let i = 0; i < str.length; ++i)
            buffer[i] = str.charCodeAt(i);
          return buffer;
        } else {
          const msg = "This environment does not support reading binary tags; either Buffer or atob is required";
          doc.errors.push(new PlainValue.YAMLReferenceError(node, msg));
          return null;
        }
      },
      options: resolveSeq.binaryOptions,
      stringify: ({
        comment,
        type,
        value
      }, ctx, onComment, onChompKeep) => {
        let src2;
        if (typeof Buffer === "function") {
          src2 = value instanceof Buffer ? value.toString("base64") : Buffer.from(value.buffer).toString("base64");
        } else if (typeof btoa === "function") {
          let s2 = "";
          for (let i = 0; i < value.length; ++i)
            s2 += String.fromCharCode(value[i]);
          src2 = btoa(s2);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        if (!type)
          type = resolveSeq.binaryOptions.defaultType;
        if (type === PlainValue.Type.QUOTE_DOUBLE) {
          value = src2;
        } else {
          const {
            lineWidth
          } = resolveSeq.binaryOptions;
          const n = Math.ceil(src2.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
            lines[i] = src2.substr(o, lineWidth);
          }
          value = lines.join(type === PlainValue.Type.BLOCK_LITERAL ? "\n" : " ");
        }
        return resolveSeq.stringifyString({
          comment,
          type,
          value
        }, ctx, onComment, onChompKeep);
      }
    };
    function parsePairs(doc, cst) {
      const seq = resolveSeq.resolveSeq(doc, cst);
      for (let i = 0; i < seq.items.length; ++i) {
        let item = seq.items[i];
        if (item instanceof resolveSeq.Pair)
          continue;
        else if (item instanceof resolveSeq.YAMLMap) {
          if (item.items.length > 1) {
            const msg = "Each pair must have its own sequence indicator";
            throw new PlainValue.YAMLSemanticError(cst, msg);
          }
          const pair = item.items[0] || new resolveSeq.Pair();
          if (item.commentBefore)
            pair.commentBefore = pair.commentBefore ? `${item.commentBefore}
${pair.commentBefore}` : item.commentBefore;
          if (item.comment)
            pair.comment = pair.comment ? `${item.comment}
${pair.comment}` : item.comment;
          item = pair;
        }
        seq.items[i] = item instanceof resolveSeq.Pair ? item : new resolveSeq.Pair(item);
      }
      return seq;
    }
    function createPairs(schema, iterable, ctx) {
      const pairs2 = new resolveSeq.YAMLSeq(schema);
      pairs2.tag = "tag:yaml.org,2002:pairs";
      for (const it of iterable) {
        let key, value;
        if (Array.isArray(it)) {
          if (it.length === 2) {
            key = it[0];
            value = it[1];
          } else
            throw new TypeError(`Expected [key, value] tuple: ${it}`);
        } else if (it && it instanceof Object) {
          const keys = Object.keys(it);
          if (keys.length === 1) {
            key = keys[0];
            value = it[key];
          } else
            throw new TypeError(`Expected { key: value } tuple: ${it}`);
        } else {
          key = it;
        }
        const pair = schema.createPair(key, value, ctx);
        pairs2.items.push(pair);
      }
      return pairs2;
    }
    var pairs = {
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: parsePairs,
      createNode: createPairs
    };
    var YAMLOMap = class extends resolveSeq.YAMLSeq {
      constructor() {
        super();
        PlainValue._defineProperty(this, "add", resolveSeq.YAMLMap.prototype.add.bind(this));
        PlainValue._defineProperty(this, "delete", resolveSeq.YAMLMap.prototype.delete.bind(this));
        PlainValue._defineProperty(this, "get", resolveSeq.YAMLMap.prototype.get.bind(this));
        PlainValue._defineProperty(this, "has", resolveSeq.YAMLMap.prototype.has.bind(this));
        PlainValue._defineProperty(this, "set", resolveSeq.YAMLMap.prototype.set.bind(this));
        this.tag = YAMLOMap.tag;
      }
      toJSON(_, ctx) {
        const map = new Map();
        if (ctx && ctx.onCreate)
          ctx.onCreate(map);
        for (const pair of this.items) {
          let key, value;
          if (pair instanceof resolveSeq.Pair) {
            key = resolveSeq.toJSON(pair.key, "", ctx);
            value = resolveSeq.toJSON(pair.value, key, ctx);
          } else {
            key = resolveSeq.toJSON(pair, "", ctx);
          }
          if (map.has(key))
            throw new Error("Ordered maps must not include duplicate keys");
          map.set(key, value);
        }
        return map;
      }
    };
    PlainValue._defineProperty(YAMLOMap, "tag", "tag:yaml.org,2002:omap");
    function parseOMap(doc, cst) {
      const pairs2 = parsePairs(doc, cst);
      const seenKeys = [];
      for (const {
        key
      } of pairs2.items) {
        if (key instanceof resolveSeq.Scalar) {
          if (seenKeys.includes(key.value)) {
            const msg = "Ordered maps must not include duplicate keys";
            throw new PlainValue.YAMLSemanticError(cst, msg);
          } else {
            seenKeys.push(key.value);
          }
        }
      }
      return Object.assign(new YAMLOMap(), pairs2);
    }
    function createOMap(schema, iterable, ctx) {
      const pairs2 = createPairs(schema, iterable, ctx);
      const omap2 = new YAMLOMap();
      omap2.items = pairs2.items;
      return omap2;
    }
    var omap = {
      identify: (value) => value instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve: parseOMap,
      createNode: createOMap
    };
    var YAMLSet = class extends resolveSeq.YAMLMap {
      constructor() {
        super();
        this.tag = YAMLSet.tag;
      }
      add(key) {
        const pair = key instanceof resolveSeq.Pair ? key : new resolveSeq.Pair(key);
        const prev = resolveSeq.findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      get(key, keepPair) {
        const pair = resolveSeq.findPair(this.items, key);
        return !keepPair && pair instanceof resolveSeq.Pair ? pair.key instanceof resolveSeq.Scalar ? pair.key.value : pair.key : pair;
      }
      set(key, value) {
        if (typeof value !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = resolveSeq.findPair(this.items, key);
        if (prev && !value) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value) {
          this.items.push(new resolveSeq.Pair(key));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues())
          return super.toString(ctx, onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
    };
    PlainValue._defineProperty(YAMLSet, "tag", "tag:yaml.org,2002:set");
    function parseSet(doc, cst) {
      const map = resolveSeq.resolveMap(doc, cst);
      if (!map.hasAllNullValues())
        throw new PlainValue.YAMLSemanticError(cst, "Set items must all have null values");
      return Object.assign(new YAMLSet(), map);
    }
    function createSet(schema, iterable, ctx) {
      const set2 = new YAMLSet();
      for (const value of iterable)
        set2.items.push(schema.createPair(value, null, ctx));
      return set2;
    }
    var set = {
      identify: (value) => value instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      resolve: parseSet,
      createNode: createSet
    };
    var parseSexagesimal = (sign, parts) => {
      const n = parts.split(":").reduce((n2, p) => n2 * 60 + Number(p), 0);
      return sign === "-" ? -n : n;
    };
    var stringifySexagesimal = ({
      value
    }) => {
      if (isNaN(value) || !isFinite(value))
        return resolveSeq.stringifyNumber(value);
      let sign = "";
      if (value < 0) {
        sign = "-";
        value = Math.abs(value);
      }
      const parts = [value % 60];
      if (value < 60) {
        parts.unshift(0);
      } else {
        value = Math.round((value - parts[0]) / 60);
        parts.unshift(value % 60);
        if (value >= 60) {
          value = Math.round((value - parts[0]) / 60);
          parts.unshift(value);
        }
      }
      return sign + parts.map((n) => n < 10 ? "0" + String(n) : String(n)).join(":").replace(/000000\d*$/, "");
    };
    var intTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^([-+]?)([0-9][0-9_]*(?::[0-5]?[0-9])+)$/,
      resolve: (str, sign, parts) => parseSexagesimal(sign, parts.replace(/_/g, "")),
      stringify: stringifySexagesimal
    };
    var floatTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^([-+]?)([0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*)$/,
      resolve: (str, sign, parts) => parseSexagesimal(sign, parts.replace(/_/g, "")),
      stringify: stringifySexagesimal
    };
    var timestamp = {
      identify: (value) => value instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      test: RegExp("^(?:([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?)$"),
      resolve: (str, year, month, day, hour, minute, second, millisec, tz) => {
        if (millisec)
          millisec = (millisec + "00").substr(1, 3);
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec || 0);
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz[0], tz.slice(1));
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({
        value
      }) => value.toISOString().replace(/((T00:00)?:00)?\.000Z$/, "")
    };
    function shouldWarn(deprecation) {
      const env = typeof process !== "undefined" && process.env || {};
      if (deprecation) {
        if (typeof YAML_SILENCE_DEPRECATION_WARNINGS !== "undefined")
          return !YAML_SILENCE_DEPRECATION_WARNINGS;
        return !env.YAML_SILENCE_DEPRECATION_WARNINGS;
      }
      if (typeof YAML_SILENCE_WARNINGS !== "undefined")
        return !YAML_SILENCE_WARNINGS;
      return !env.YAML_SILENCE_WARNINGS;
    }
    function warn(warning, type) {
      if (shouldWarn(false)) {
        const emit = typeof process !== "undefined" && process.emitWarning;
        if (emit)
          emit(warning, type);
        else {
          console.warn(type ? `${type}: ${warning}` : warning);
        }
      }
    }
    function warnFileDeprecation(filename) {
      if (shouldWarn(true)) {
        const path2 = filename.replace(/.*yaml[/\\]/i, "").replace(/\.js$/, "").replace(/\\/g, "/");
        warn(`The endpoint 'yaml/${path2}' will be removed in a future release.`, "DeprecationWarning");
      }
    }
    var warned = {};
    function warnOptionDeprecation(name, alternative) {
      if (!warned[name] && shouldWarn(true)) {
        warned[name] = true;
        let msg = `The option '${name}' will be removed in a future release`;
        msg += alternative ? `, use '${alternative}' instead.` : ".";
        warn(msg, "DeprecationWarning");
      }
    }
    exports.binary = binary;
    exports.floatTime = floatTime;
    exports.intTime = intTime;
    exports.omap = omap;
    exports.pairs = pairs;
    exports.set = set;
    exports.timestamp = timestamp;
    exports.warn = warn;
    exports.warnFileDeprecation = warnFileDeprecation;
    exports.warnOptionDeprecation = warnOptionDeprecation;
  }
});

// node_modules/yaml/dist/Schema-88e323a7.js
var require_Schema_88e323a7 = __commonJS({
  "node_modules/yaml/dist/Schema-88e323a7.js"(exports) {
    init_shims();
    "use strict";
    var PlainValue = require_PlainValue_ec8e588e();
    var resolveSeq = require_resolveSeq_d03cb037();
    var warnings = require_warnings_1000a372();
    function createMap(schema, obj, ctx) {
      const map2 = new resolveSeq.YAMLMap(schema);
      if (obj instanceof Map) {
        for (const [key, value] of obj)
          map2.items.push(schema.createPair(key, value, ctx));
      } else if (obj && typeof obj === "object") {
        for (const key of Object.keys(obj))
          map2.items.push(schema.createPair(key, obj[key], ctx));
      }
      if (typeof schema.sortMapEntries === "function") {
        map2.items.sort(schema.sortMapEntries);
      }
      return map2;
    }
    var map = {
      createNode: createMap,
      default: true,
      nodeClass: resolveSeq.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve: resolveSeq.resolveMap
    };
    function createSeq(schema, obj, ctx) {
      const seq2 = new resolveSeq.YAMLSeq(schema);
      if (obj && obj[Symbol.iterator]) {
        for (const it of obj) {
          const v = schema.createNode(it, ctx.wrapScalars, null, ctx);
          seq2.items.push(v);
        }
      }
      return seq2;
    }
    var seq = {
      createNode: createSeq,
      default: true,
      nodeClass: resolveSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve: resolveSeq.resolveSeq
    };
    var string = {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: resolveSeq.resolveString,
      stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({
          actualString: true
        }, ctx);
        return resolveSeq.stringifyString(item, ctx, onComment, onChompKeep);
      },
      options: resolveSeq.strOptions
    };
    var failsafe = [map, seq, string];
    var intIdentify$2 = (value) => typeof value === "bigint" || Number.isInteger(value);
    var intResolve$1 = (src2, part, radix) => resolveSeq.intOptions.asBigInt ? BigInt(src2) : parseInt(part, radix);
    function intStringify$1(node, radix, prefix) {
      const {
        value
      } = node;
      if (intIdentify$2(value) && value >= 0)
        return prefix + value.toString(radix);
      return resolveSeq.stringifyNumber(node);
    }
    var nullObj = {
      identify: (value) => value == null,
      createNode: (schema, value, ctx) => ctx.wrapScalars ? new resolveSeq.Scalar(null) : null,
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => null,
      options: resolveSeq.nullOptions,
      stringify: () => resolveSeq.nullOptions.nullStr
    };
    var boolObj = {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str) => str[0] === "t" || str[0] === "T",
      options: resolveSeq.boolOptions,
      stringify: ({
        value
      }) => value ? resolveSeq.boolOptions.trueStr : resolveSeq.boolOptions.falseStr
    };
    var octObj = {
      identify: (value) => intIdentify$2(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o([0-7]+)$/,
      resolve: (str, oct) => intResolve$1(str, oct, 8),
      options: resolveSeq.intOptions,
      stringify: (node) => intStringify$1(node, 8, "0o")
    };
    var intObj = {
      identify: intIdentify$2,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str) => intResolve$1(str, str, 10),
      options: resolveSeq.intOptions,
      stringify: resolveSeq.stringifyNumber
    };
    var hexObj = {
      identify: (value) => intIdentify$2(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x([0-9a-fA-F]+)$/,
      resolve: (str, hex) => intResolve$1(str, hex, 16),
      options: resolveSeq.intOptions,
      stringify: (node) => intStringify$1(node, 16, "0x")
    };
    var nanObj = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.inf|(\.nan))$/i,
      resolve: (str, nan) => nan ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: resolveSeq.stringifyNumber
    };
    var expObj = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str),
      stringify: ({
        value
      }) => Number(value).toExponential()
    };
    var floatObj = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.([0-9]+)|[0-9]+\.([0-9]*))$/,
      resolve(str, frac1, frac2) {
        const frac = frac1 || frac2;
        const node = new resolveSeq.Scalar(parseFloat(str));
        if (frac && frac[frac.length - 1] === "0")
          node.minFractionDigits = frac.length;
        return node;
      },
      stringify: resolveSeq.stringifyNumber
    };
    var core = failsafe.concat([nullObj, boolObj, octObj, intObj, hexObj, nanObj, expObj, floatObj]);
    var intIdentify$1 = (value) => typeof value === "bigint" || Number.isInteger(value);
    var stringifyJSON = ({
      value
    }) => JSON.stringify(value);
    var json = [map, seq, {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: resolveSeq.resolveString,
      stringify: stringifyJSON
    }, {
      identify: (value) => value == null,
      createNode: (schema, value, ctx) => ctx.wrapScalars ? new resolveSeq.Scalar(null) : null,
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^null$/,
      resolve: () => null,
      stringify: stringifyJSON
    }, {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^true|false$/,
      resolve: (str) => str === "true",
      stringify: stringifyJSON
    }, {
      identify: intIdentify$1,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^-?(?:0|[1-9][0-9]*)$/,
      resolve: (str) => resolveSeq.intOptions.asBigInt ? BigInt(str) : parseInt(str, 10),
      stringify: ({
        value
      }) => intIdentify$1(value) ? value.toString() : JSON.stringify(value)
    }, {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
      resolve: (str) => parseFloat(str),
      stringify: stringifyJSON
    }];
    json.scalarFallback = (str) => {
      throw new SyntaxError(`Unresolved plain scalar ${JSON.stringify(str)}`);
    };
    var boolStringify = ({
      value
    }) => value ? resolveSeq.boolOptions.trueStr : resolveSeq.boolOptions.falseStr;
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    function intResolve(sign, src2, radix) {
      let str = src2.replace(/_/g, "");
      if (resolveSeq.intOptions.asBigInt) {
        switch (radix) {
          case 2:
            str = `0b${str}`;
            break;
          case 8:
            str = `0o${str}`;
            break;
          case 16:
            str = `0x${str}`;
            break;
        }
        const n2 = BigInt(str);
        return sign === "-" ? BigInt(-1) * n2 : n2;
      }
      const n = parseInt(str, radix);
      return sign === "-" ? -1 * n : n;
    }
    function intStringify(node, radix, prefix) {
      const {
        value
      } = node;
      if (intIdentify(value)) {
        const str = value.toString(radix);
        return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
      }
      return resolveSeq.stringifyNumber(node);
    }
    var yaml11 = failsafe.concat([{
      identify: (value) => value == null,
      createNode: (schema, value, ctx) => ctx.wrapScalars ? new resolveSeq.Scalar(null) : null,
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => null,
      options: resolveSeq.nullOptions,
      stringify: () => resolveSeq.nullOptions.nullStr
    }, {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => true,
      options: resolveSeq.boolOptions,
      stringify: boolStringify
    }, {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/i,
      resolve: () => false,
      options: resolveSeq.boolOptions,
      stringify: boolStringify
    }, {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^([-+]?)0b([0-1_]+)$/,
      resolve: (str, sign, bin) => intResolve(sign, bin, 2),
      stringify: (node) => intStringify(node, 2, "0b")
    }, {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^([-+]?)0([0-7_]+)$/,
      resolve: (str, sign, oct) => intResolve(sign, oct, 8),
      stringify: (node) => intStringify(node, 8, "0")
    }, {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^([-+]?)([0-9][0-9_]*)$/,
      resolve: (str, sign, abs) => intResolve(sign, abs, 10),
      stringify: resolveSeq.stringifyNumber
    }, {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^([-+]?)0x([0-9a-fA-F_]+)$/,
      resolve: (str, sign, hex) => intResolve(sign, hex, 16),
      stringify: (node) => intStringify(node, 16, "0x")
    }, {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.inf|(\.nan))$/i,
      resolve: (str, nan) => nan ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: resolveSeq.stringifyNumber
    }, {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?([0-9][0-9_]*)?(\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str.replace(/_/g, "")),
      stringify: ({
        value
      }) => Number(value).toExponential()
    }, {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.([0-9_]*)$/,
      resolve(str, frac) {
        const node = new resolveSeq.Scalar(parseFloat(str.replace(/_/g, "")));
        if (frac) {
          const f = frac.replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: resolveSeq.stringifyNumber
    }], warnings.binary, warnings.omap, warnings.pairs, warnings.set, warnings.intTime, warnings.floatTime, warnings.timestamp);
    var schemas = {
      core,
      failsafe,
      json,
      yaml11
    };
    var tags = {
      binary: warnings.binary,
      bool: boolObj,
      float: floatObj,
      floatExp: expObj,
      floatNaN: nanObj,
      floatTime: warnings.floatTime,
      int: intObj,
      intHex: hexObj,
      intOct: octObj,
      intTime: warnings.intTime,
      map,
      null: nullObj,
      omap: warnings.omap,
      pairs: warnings.pairs,
      seq,
      set: warnings.set,
      timestamp: warnings.timestamp
    };
    function findTagObject(value, tagName, tags2) {
      if (tagName) {
        const match = tags2.filter((t) => t.tag === tagName);
        const tagObj = match.find((t) => !t.format) || match[0];
        if (!tagObj)
          throw new Error(`Tag ${tagName} not found`);
        return tagObj;
      }
      return tags2.find((t) => (t.identify && t.identify(value) || t.class && value instanceof t.class) && !t.format);
    }
    function createNode(value, tagName, ctx) {
      if (value instanceof resolveSeq.Node)
        return value;
      const {
        defaultPrefix,
        onTagObj,
        prevObjects,
        schema,
        wrapScalars
      } = ctx;
      if (tagName && tagName.startsWith("!!"))
        tagName = defaultPrefix + tagName.slice(2);
      let tagObj = findTagObject(value, tagName, schema.tags);
      if (!tagObj) {
        if (typeof value.toJSON === "function")
          value = value.toJSON();
        if (!value || typeof value !== "object")
          return wrapScalars ? new resolveSeq.Scalar(value) : value;
        tagObj = value instanceof Map ? map : value[Symbol.iterator] ? seq : map;
      }
      if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
      }
      const obj = {
        value: void 0,
        node: void 0
      };
      if (value && typeof value === "object" && prevObjects) {
        const prev = prevObjects.get(value);
        if (prev) {
          const alias = new resolveSeq.Alias(prev);
          ctx.aliasNodes.push(alias);
          return alias;
        }
        obj.value = value;
        prevObjects.set(value, obj);
      }
      obj.node = tagObj.createNode ? tagObj.createNode(ctx.schema, value, ctx) : wrapScalars ? new resolveSeq.Scalar(value) : value;
      if (tagName && obj.node instanceof resolveSeq.Node)
        obj.node.tag = tagName;
      return obj.node;
    }
    function getSchemaTags(schemas2, knownTags, customTags, schemaId) {
      let tags2 = schemas2[schemaId.replace(/\W/g, "")];
      if (!tags2) {
        const keys = Object.keys(schemas2).map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown schema "${schemaId}"; use one of ${keys}`);
      }
      if (Array.isArray(customTags)) {
        for (const tag of customTags)
          tags2 = tags2.concat(tag);
      } else if (typeof customTags === "function") {
        tags2 = customTags(tags2.slice());
      }
      for (let i = 0; i < tags2.length; ++i) {
        const tag = tags2[i];
        if (typeof tag === "string") {
          const tagObj = knownTags[tag];
          if (!tagObj) {
            const keys = Object.keys(knownTags).map((key) => JSON.stringify(key)).join(", ");
            throw new Error(`Unknown custom tag "${tag}"; use one of ${keys}`);
          }
          tags2[i] = tagObj;
        }
      }
      return tags2;
    }
    var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    var Schema = class {
      constructor({
        customTags,
        merge,
        schema,
        sortMapEntries,
        tags: deprecatedCustomTags
      }) {
        this.merge = !!merge;
        this.name = schema;
        this.sortMapEntries = sortMapEntries === true ? sortMapEntriesByKey : sortMapEntries || null;
        if (!customTags && deprecatedCustomTags)
          warnings.warnOptionDeprecation("tags", "customTags");
        this.tags = getSchemaTags(schemas, tags, customTags || deprecatedCustomTags, schema);
      }
      createNode(value, wrapScalars, tagName, ctx) {
        const baseCtx = {
          defaultPrefix: Schema.defaultPrefix,
          schema: this,
          wrapScalars
        };
        const createCtx = ctx ? Object.assign(ctx, baseCtx) : baseCtx;
        return createNode(value, tagName, createCtx);
      }
      createPair(key, value, ctx) {
        if (!ctx)
          ctx = {
            wrapScalars: true
          };
        const k = this.createNode(key, ctx.wrapScalars, null, ctx);
        const v = this.createNode(value, ctx.wrapScalars, null, ctx);
        return new resolveSeq.Pair(k, v);
      }
    };
    PlainValue._defineProperty(Schema, "defaultPrefix", PlainValue.defaultTagPrefix);
    PlainValue._defineProperty(Schema, "defaultTags", PlainValue.defaultTags);
    exports.Schema = Schema;
  }
});

// node_modules/yaml/dist/Document-9b4560a1.js
var require_Document_9b4560a1 = __commonJS({
  "node_modules/yaml/dist/Document-9b4560a1.js"(exports) {
    init_shims();
    "use strict";
    var PlainValue = require_PlainValue_ec8e588e();
    var resolveSeq = require_resolveSeq_d03cb037();
    var Schema = require_Schema_88e323a7();
    var defaultOptions = {
      anchorPrefix: "a",
      customTags: null,
      indent: 2,
      indentSeq: true,
      keepCstNodes: false,
      keepNodeTypes: true,
      keepBlobsInJSON: true,
      mapAsMap: false,
      maxAliasCount: 100,
      prettyErrors: false,
      simpleKeys: false,
      version: "1.2"
    };
    var scalarOptions = {
      get binary() {
        return resolveSeq.binaryOptions;
      },
      set binary(opt) {
        Object.assign(resolveSeq.binaryOptions, opt);
      },
      get bool() {
        return resolveSeq.boolOptions;
      },
      set bool(opt) {
        Object.assign(resolveSeq.boolOptions, opt);
      },
      get int() {
        return resolveSeq.intOptions;
      },
      set int(opt) {
        Object.assign(resolveSeq.intOptions, opt);
      },
      get null() {
        return resolveSeq.nullOptions;
      },
      set null(opt) {
        Object.assign(resolveSeq.nullOptions, opt);
      },
      get str() {
        return resolveSeq.strOptions;
      },
      set str(opt) {
        Object.assign(resolveSeq.strOptions, opt);
      }
    };
    var documentOptions = {
      "1.0": {
        schema: "yaml-1.1",
        merge: true,
        tagPrefixes: [{
          handle: "!",
          prefix: PlainValue.defaultTagPrefix
        }, {
          handle: "!!",
          prefix: "tag:private.yaml.org,2002:"
        }]
      },
      1.1: {
        schema: "yaml-1.1",
        merge: true,
        tagPrefixes: [{
          handle: "!",
          prefix: "!"
        }, {
          handle: "!!",
          prefix: PlainValue.defaultTagPrefix
        }]
      },
      1.2: {
        schema: "core",
        merge: false,
        tagPrefixes: [{
          handle: "!",
          prefix: "!"
        }, {
          handle: "!!",
          prefix: PlainValue.defaultTagPrefix
        }]
      }
    };
    function stringifyTag(doc, tag) {
      if ((doc.version || doc.options.version) === "1.0") {
        const priv = tag.match(/^tag:private\.yaml\.org,2002:([^:/]+)$/);
        if (priv)
          return "!" + priv[1];
        const vocab = tag.match(/^tag:([a-zA-Z0-9-]+)\.yaml\.org,2002:(.*)/);
        return vocab ? `!${vocab[1]}/${vocab[2]}` : `!${tag.replace(/^tag:/, "")}`;
      }
      let p = doc.tagPrefixes.find((p2) => tag.indexOf(p2.prefix) === 0);
      if (!p) {
        const dtp = doc.getDefaults().tagPrefixes;
        p = dtp && dtp.find((p2) => tag.indexOf(p2.prefix) === 0);
      }
      if (!p)
        return tag[0] === "!" ? tag : `!<${tag}>`;
      const suffix = tag.substr(p.prefix.length).replace(/[!,[\]{}]/g, (ch) => ({
        "!": "%21",
        ",": "%2C",
        "[": "%5B",
        "]": "%5D",
        "{": "%7B",
        "}": "%7D"
      })[ch]);
      return p.handle + suffix;
    }
    function getTagObject(tags, item) {
      if (item instanceof resolveSeq.Alias)
        return resolveSeq.Alias;
      if (item.tag) {
        const match = tags.filter((t) => t.tag === item.tag);
        if (match.length > 0)
          return match.find((t) => t.format === item.format) || match[0];
      }
      let tagObj, obj;
      if (item instanceof resolveSeq.Scalar) {
        obj = item.value;
        const match = tags.filter((t) => t.identify && t.identify(obj) || t.class && obj instanceof t.class);
        tagObj = match.find((t) => t.format === item.format) || match.find((t) => !t.format);
      } else {
        obj = item;
        tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name = obj && obj.constructor ? obj.constructor.name : typeof obj;
        throw new Error(`Tag not resolved for ${name} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, {
      anchors,
      doc
    }) {
      const props = [];
      const anchor = doc.anchors.getName(node);
      if (anchor) {
        anchors[anchor] = node;
        props.push(`&${anchor}`);
      }
      if (node.tag) {
        props.push(stringifyTag(doc, node.tag));
      } else if (!tagObj.default) {
        props.push(stringifyTag(doc, tagObj.tag));
      }
      return props.join(" ");
    }
    function stringify(item, ctx, onComment, onChompKeep) {
      const {
        anchors,
        schema
      } = ctx.doc;
      let tagObj;
      if (!(item instanceof resolveSeq.Node)) {
        const createCtx = {
          aliasNodes: [],
          onTagObj: (o) => tagObj = o,
          prevObjects: new Map()
        };
        item = schema.createNode(item, true, null, createCtx);
        for (const alias of createCtx.aliasNodes) {
          alias.source = alias.source.node;
          let name = anchors.getName(alias.source);
          if (!name) {
            name = anchors.newName();
            anchors.map[name] = alias.source;
          }
        }
      }
      if (item instanceof resolveSeq.Pair)
        return item.toString(ctx, onComment, onChompKeep);
      if (!tagObj)
        tagObj = getTagObject(schema.tags, item);
      const props = stringifyProps(item, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart || 0) + props.length + 1;
      const str = typeof tagObj.stringify === "function" ? tagObj.stringify(item, ctx, onComment, onChompKeep) : item instanceof resolveSeq.Scalar ? resolveSeq.stringifyString(item, ctx, onComment, onChompKeep) : item.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str;
      return item instanceof resolveSeq.Scalar || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
    }
    var Anchors = class {
      static validAnchorNode(node) {
        return node instanceof resolveSeq.Scalar || node instanceof resolveSeq.YAMLSeq || node instanceof resolveSeq.YAMLMap;
      }
      constructor(prefix) {
        PlainValue._defineProperty(this, "map", Object.create(null));
        this.prefix = prefix;
      }
      createAlias(node, name) {
        this.setAnchor(node, name);
        return new resolveSeq.Alias(node);
      }
      createMergePair(...sources) {
        const merge = new resolveSeq.Merge();
        merge.value.items = sources.map((s2) => {
          if (s2 instanceof resolveSeq.Alias) {
            if (s2.source instanceof resolveSeq.YAMLMap)
              return s2;
          } else if (s2 instanceof resolveSeq.YAMLMap) {
            return this.createAlias(s2);
          }
          throw new Error("Merge sources must be Map nodes or their Aliases");
        });
        return merge;
      }
      getName(node) {
        const {
          map
        } = this;
        return Object.keys(map).find((a) => map[a] === node);
      }
      getNames() {
        return Object.keys(this.map);
      }
      getNode(name) {
        return this.map[name];
      }
      newName(prefix) {
        if (!prefix)
          prefix = this.prefix;
        const names = Object.keys(this.map);
        for (let i = 1; true; ++i) {
          const name = `${prefix}${i}`;
          if (!names.includes(name))
            return name;
        }
      }
      resolveNodes() {
        const {
          map,
          _cstAliases
        } = this;
        Object.keys(map).forEach((a) => {
          map[a] = map[a].resolved;
        });
        _cstAliases.forEach((a) => {
          a.source = a.source.resolved;
        });
        delete this._cstAliases;
      }
      setAnchor(node, name) {
        if (node != null && !Anchors.validAnchorNode(node)) {
          throw new Error("Anchors may only be set for Scalar, Seq and Map nodes");
        }
        if (name && /[\x00-\x19\s,[\]{}]/.test(name)) {
          throw new Error("Anchor names must not contain whitespace or control characters");
        }
        const {
          map
        } = this;
        const prev = node && Object.keys(map).find((a) => map[a] === node);
        if (prev) {
          if (!name) {
            return prev;
          } else if (prev !== name) {
            delete map[prev];
            map[name] = node;
          }
        } else {
          if (!name) {
            if (!node)
              return null;
            name = this.newName();
          }
          map[name] = node;
        }
        return name;
      }
    };
    var visit = (node, tags) => {
      if (node && typeof node === "object") {
        const {
          tag
        } = node;
        if (node instanceof resolveSeq.Collection) {
          if (tag)
            tags[tag] = true;
          node.items.forEach((n) => visit(n, tags));
        } else if (node instanceof resolveSeq.Pair) {
          visit(node.key, tags);
          visit(node.value, tags);
        } else if (node instanceof resolveSeq.Scalar) {
          if (tag)
            tags[tag] = true;
        }
      }
      return tags;
    };
    var listTagNames = (node) => Object.keys(visit(node, {}));
    function parseContents(doc, contents) {
      const comments = {
        before: [],
        after: []
      };
      let body = void 0;
      let spaceBefore = false;
      for (const node of contents) {
        if (node.valueRange) {
          if (body !== void 0) {
            const msg = "Document contains trailing content not separated by a ... or --- line";
            doc.errors.push(new PlainValue.YAMLSyntaxError(node, msg));
            break;
          }
          const res = resolveSeq.resolveNode(doc, node);
          if (spaceBefore) {
            res.spaceBefore = true;
            spaceBefore = false;
          }
          body = res;
        } else if (node.comment !== null) {
          const cc = body === void 0 ? comments.before : comments.after;
          cc.push(node.comment);
        } else if (node.type === PlainValue.Type.BLANK_LINE) {
          spaceBefore = true;
          if (body === void 0 && comments.before.length > 0 && !doc.commentBefore) {
            doc.commentBefore = comments.before.join("\n");
            comments.before = [];
          }
        }
      }
      doc.contents = body || null;
      if (!body) {
        doc.comment = comments.before.concat(comments.after).join("\n") || null;
      } else {
        const cb = comments.before.join("\n");
        if (cb) {
          const cbNode = body instanceof resolveSeq.Collection && body.items[0] ? body.items[0] : body;
          cbNode.commentBefore = cbNode.commentBefore ? `${cb}
${cbNode.commentBefore}` : cb;
        }
        doc.comment = comments.after.join("\n") || null;
      }
    }
    function resolveTagDirective({
      tagPrefixes
    }, directive) {
      const [handle, prefix] = directive.parameters;
      if (!handle || !prefix) {
        const msg = "Insufficient parameters given for %TAG directive";
        throw new PlainValue.YAMLSemanticError(directive, msg);
      }
      if (tagPrefixes.some((p) => p.handle === handle)) {
        const msg = "The %TAG directive must only be given at most once per handle in the same document.";
        throw new PlainValue.YAMLSemanticError(directive, msg);
      }
      return {
        handle,
        prefix
      };
    }
    function resolveYamlDirective(doc, directive) {
      let [version] = directive.parameters;
      if (directive.name === "YAML:1.0")
        version = "1.0";
      if (!version) {
        const msg = "Insufficient parameters given for %YAML directive";
        throw new PlainValue.YAMLSemanticError(directive, msg);
      }
      if (!documentOptions[version]) {
        const v0 = doc.version || doc.options.version;
        const msg = `Document will be parsed as YAML ${v0} rather than YAML ${version}`;
        doc.warnings.push(new PlainValue.YAMLWarning(directive, msg));
      }
      return version;
    }
    function parseDirectives(doc, directives, prevDoc) {
      const directiveComments = [];
      let hasDirectives = false;
      for (const directive of directives) {
        const {
          comment,
          name
        } = directive;
        switch (name) {
          case "TAG":
            try {
              doc.tagPrefixes.push(resolveTagDirective(doc, directive));
            } catch (error2) {
              doc.errors.push(error2);
            }
            hasDirectives = true;
            break;
          case "YAML":
          case "YAML:1.0":
            if (doc.version) {
              const msg = "The %YAML directive must only be given at most once per document.";
              doc.errors.push(new PlainValue.YAMLSemanticError(directive, msg));
            }
            try {
              doc.version = resolveYamlDirective(doc, directive);
            } catch (error2) {
              doc.errors.push(error2);
            }
            hasDirectives = true;
            break;
          default:
            if (name) {
              const msg = `YAML only supports %TAG and %YAML directives, and not %${name}`;
              doc.warnings.push(new PlainValue.YAMLWarning(directive, msg));
            }
        }
        if (comment)
          directiveComments.push(comment);
      }
      if (prevDoc && !hasDirectives && (doc.version || prevDoc.version || doc.options.version) === "1.1") {
        const copyTagPrefix = ({
          handle,
          prefix
        }) => ({
          handle,
          prefix
        });
        doc.tagPrefixes = prevDoc.tagPrefixes.map(copyTagPrefix);
        doc.version = prevDoc.version;
      }
      doc.commentBefore = directiveComments.join("\n") || null;
    }
    function assertCollection(contents) {
      if (contents instanceof resolveSeq.Collection)
        return true;
      throw new Error("Expected a YAML collection as document contents");
    }
    var Document = class {
      constructor(options2) {
        this.anchors = new Anchors(options2.anchorPrefix);
        this.commentBefore = null;
        this.comment = null;
        this.contents = null;
        this.directivesEndMarker = null;
        this.errors = [];
        this.options = options2;
        this.schema = null;
        this.tagPrefixes = [];
        this.version = null;
        this.warnings = [];
      }
      add(value) {
        assertCollection(this.contents);
        return this.contents.add(value);
      }
      addIn(path2, value) {
        assertCollection(this.contents);
        this.contents.addIn(path2, value);
      }
      delete(key) {
        assertCollection(this.contents);
        return this.contents.delete(key);
      }
      deleteIn(path2) {
        if (resolveSeq.isEmptyPath(path2)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        assertCollection(this.contents);
        return this.contents.deleteIn(path2);
      }
      getDefaults() {
        return Document.defaults[this.version] || Document.defaults[this.options.version] || {};
      }
      get(key, keepScalar) {
        return this.contents instanceof resolveSeq.Collection ? this.contents.get(key, keepScalar) : void 0;
      }
      getIn(path2, keepScalar) {
        if (resolveSeq.isEmptyPath(path2))
          return !keepScalar && this.contents instanceof resolveSeq.Scalar ? this.contents.value : this.contents;
        return this.contents instanceof resolveSeq.Collection ? this.contents.getIn(path2, keepScalar) : void 0;
      }
      has(key) {
        return this.contents instanceof resolveSeq.Collection ? this.contents.has(key) : false;
      }
      hasIn(path2) {
        if (resolveSeq.isEmptyPath(path2))
          return this.contents !== void 0;
        return this.contents instanceof resolveSeq.Collection ? this.contents.hasIn(path2) : false;
      }
      set(key, value) {
        assertCollection(this.contents);
        this.contents.set(key, value);
      }
      setIn(path2, value) {
        if (resolveSeq.isEmptyPath(path2))
          this.contents = value;
        else {
          assertCollection(this.contents);
          this.contents.setIn(path2, value);
        }
      }
      setSchema(id, customTags) {
        if (!id && !customTags && this.schema)
          return;
        if (typeof id === "number")
          id = id.toFixed(1);
        if (id === "1.0" || id === "1.1" || id === "1.2") {
          if (this.version)
            this.version = id;
          else
            this.options.version = id;
          delete this.options.schema;
        } else if (id && typeof id === "string") {
          this.options.schema = id;
        }
        if (Array.isArray(customTags))
          this.options.customTags = customTags;
        const opt = Object.assign({}, this.getDefaults(), this.options);
        this.schema = new Schema.Schema(opt);
      }
      parse(node, prevDoc) {
        if (this.options.keepCstNodes)
          this.cstNode = node;
        if (this.options.keepNodeTypes)
          this.type = "DOCUMENT";
        const {
          directives = [],
          contents = [],
          directivesEndMarker,
          error: error2,
          valueRange
        } = node;
        if (error2) {
          if (!error2.source)
            error2.source = this;
          this.errors.push(error2);
        }
        parseDirectives(this, directives, prevDoc);
        if (directivesEndMarker)
          this.directivesEndMarker = true;
        this.range = valueRange ? [valueRange.start, valueRange.end] : null;
        this.setSchema();
        this.anchors._cstAliases = [];
        parseContents(this, contents);
        this.anchors.resolveNodes();
        if (this.options.prettyErrors) {
          for (const error3 of this.errors)
            if (error3 instanceof PlainValue.YAMLError)
              error3.makePretty();
          for (const warn of this.warnings)
            if (warn instanceof PlainValue.YAMLError)
              warn.makePretty();
        }
        return this;
      }
      listNonDefaultTags() {
        return listTagNames(this.contents).filter((t) => t.indexOf(Schema.Schema.defaultPrefix) !== 0);
      }
      setTagPrefix(handle, prefix) {
        if (handle[0] !== "!" || handle[handle.length - 1] !== "!")
          throw new Error("Handle must start and end with !");
        if (prefix) {
          const prev = this.tagPrefixes.find((p) => p.handle === handle);
          if (prev)
            prev.prefix = prefix;
          else
            this.tagPrefixes.push({
              handle,
              prefix
            });
        } else {
          this.tagPrefixes = this.tagPrefixes.filter((p) => p.handle !== handle);
        }
      }
      toJSON(arg, onAnchor) {
        const {
          keepBlobsInJSON,
          mapAsMap,
          maxAliasCount
        } = this.options;
        const keep = keepBlobsInJSON && (typeof arg !== "string" || !(this.contents instanceof resolveSeq.Scalar));
        const ctx = {
          doc: this,
          indentStep: "  ",
          keep,
          mapAsMap: keep && !!mapAsMap,
          maxAliasCount,
          stringify
        };
        const anchorNames = Object.keys(this.anchors.map);
        if (anchorNames.length > 0)
          ctx.anchors = new Map(anchorNames.map((name) => [this.anchors.map[name], {
            alias: [],
            aliasCount: 0,
            count: 1
          }]));
        const res = resolveSeq.toJSON(this.contents, arg, ctx);
        if (typeof onAnchor === "function" && ctx.anchors)
          for (const {
            count,
            res: res2
          } of ctx.anchors.values())
            onAnchor(res2, count);
        return res;
      }
      toString() {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        const indentSize = this.options.indent;
        if (!Number.isInteger(indentSize) || indentSize <= 0) {
          const s2 = JSON.stringify(indentSize);
          throw new Error(`"indent" option must be a positive integer, not ${s2}`);
        }
        this.setSchema();
        const lines = [];
        let hasDirectives = false;
        if (this.version) {
          let vd = "%YAML 1.2";
          if (this.schema.name === "yaml-1.1") {
            if (this.version === "1.0")
              vd = "%YAML:1.0";
            else if (this.version === "1.1")
              vd = "%YAML 1.1";
          }
          lines.push(vd);
          hasDirectives = true;
        }
        const tagNames = this.listNonDefaultTags();
        this.tagPrefixes.forEach(({
          handle,
          prefix
        }) => {
          if (tagNames.some((t) => t.indexOf(prefix) === 0)) {
            lines.push(`%TAG ${handle} ${prefix}`);
            hasDirectives = true;
          }
        });
        if (hasDirectives || this.directivesEndMarker)
          lines.push("---");
        if (this.commentBefore) {
          if (hasDirectives || !this.directivesEndMarker)
            lines.unshift("");
          lines.unshift(this.commentBefore.replace(/^/gm, "#"));
        }
        const ctx = {
          anchors: Object.create(null),
          doc: this,
          indent: "",
          indentStep: " ".repeat(indentSize),
          stringify
        };
        let chompKeep = false;
        let contentComment = null;
        if (this.contents) {
          if (this.contents instanceof resolveSeq.Node) {
            if (this.contents.spaceBefore && (hasDirectives || this.directivesEndMarker))
              lines.push("");
            if (this.contents.commentBefore)
              lines.push(this.contents.commentBefore.replace(/^/gm, "#"));
            ctx.forceBlockIndent = !!this.comment;
            contentComment = this.contents.comment;
          }
          const onChompKeep = contentComment ? null : () => chompKeep = true;
          const body = stringify(this.contents, ctx, () => contentComment = null, onChompKeep);
          lines.push(resolveSeq.addComment(body, "", contentComment));
        } else if (this.contents !== void 0) {
          lines.push(stringify(this.contents, ctx));
        }
        if (this.comment) {
          if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
            lines.push("");
          lines.push(this.comment.replace(/^/gm, "#"));
        }
        return lines.join("\n") + "\n";
      }
    };
    PlainValue._defineProperty(Document, "defaults", documentOptions);
    exports.Document = Document;
    exports.defaultOptions = defaultOptions;
    exports.scalarOptions = scalarOptions;
  }
});

// node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "node_modules/yaml/dist/index.js"(exports) {
    init_shims();
    "use strict";
    var parseCst = require_parse_cst();
    var Document$1 = require_Document_9b4560a1();
    var Schema = require_Schema_88e323a7();
    var PlainValue = require_PlainValue_ec8e588e();
    var warnings = require_warnings_1000a372();
    require_resolveSeq_d03cb037();
    function createNode(value, wrapScalars = true, tag) {
      if (tag === void 0 && typeof wrapScalars === "string") {
        tag = wrapScalars;
        wrapScalars = true;
      }
      const options2 = Object.assign({}, Document$1.Document.defaults[Document$1.defaultOptions.version], Document$1.defaultOptions);
      const schema = new Schema.Schema(options2);
      return schema.createNode(value, wrapScalars, tag);
    }
    var Document = class extends Document$1.Document {
      constructor(options2) {
        super(Object.assign({}, Document$1.defaultOptions, options2));
      }
    };
    function parseAllDocuments(src2, options2) {
      const stream = [];
      let prev;
      for (const cstDoc of parseCst.parse(src2)) {
        const doc = new Document(options2);
        doc.parse(cstDoc, prev);
        stream.push(doc);
        prev = doc;
      }
      return stream;
    }
    function parseDocument(src2, options2) {
      const cst = parseCst.parse(src2);
      const doc = new Document(options2).parse(cst[0]);
      if (cst.length > 1) {
        const errMsg = "Source contains multiple documents; please use YAML.parseAllDocuments()";
        doc.errors.unshift(new PlainValue.YAMLSemanticError(cst[1], errMsg));
      }
      return doc;
    }
    function parse(src2, options2) {
      const doc = parseDocument(src2, options2);
      doc.warnings.forEach((warning) => warnings.warn(warning));
      if (doc.errors.length > 0)
        throw doc.errors[0];
      return doc.toJSON();
    }
    function stringify(value, options2) {
      const doc = new Document(options2);
      doc.contents = value;
      return String(doc);
    }
    var YAML2 = {
      createNode,
      defaultOptions: Document$1.defaultOptions,
      Document,
      parse,
      parseAllDocuments,
      parseCST: parseCst.parse,
      parseDocument,
      scalarOptions: Document$1.scalarOptions,
      stringify
    };
    exports.YAML = YAML2;
  }
});

// node_modules/yaml/index.js
var require_yaml = __commonJS({
  "node_modules/yaml/index.js"(exports, module2) {
    init_shims();
    module2.exports = require_dist().YAML;
  }
});

// .svelte-kit/netlify/entry.js
__export(exports, {
  handler: () => handler
});
init_shims();

// .svelte-kit/output/server/app.js
init_shims();
var import_path = __toModule(require("path"));
var import_fs = __toModule(require("fs"));
var import_yaml = __toModule(require_yaml());
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _map;
function get_single_valued_header(headers, key) {
  const value = headers[key];
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return void 0;
    }
    if (value.length > 1) {
      throw new Error(`Multiple headers provided for ${key}. Multiple may be provided only for set-cookie`);
    }
    return value[0];
  }
  return value;
}
function coalesce_to_error(err) {
  return err instanceof Error || err && err.name && err.message ? err : new Error(JSON.stringify(err));
}
function lowercase_keys(obj) {
  const clone2 = {};
  for (const key in obj) {
    clone2[key.toLowerCase()] = obj[key];
  }
  return clone2;
}
function error$1(body) {
  return {
    status: 500,
    body,
    headers: {}
  };
}
function is_string(s2) {
  return typeof s2 === "string" || s2 instanceof String;
}
function is_content_type_textual(content_type) {
  if (!content_type)
    return true;
  const [type] = content_type.split(";");
  return type === "text/plain" || type === "application/json" || type === "application/x-www-form-urlencoded" || type === "multipart/form-data";
}
async function render_endpoint(request, route, match) {
  const mod = await route.load();
  const handler2 = mod[request.method.toLowerCase().replace("delete", "del")];
  if (!handler2) {
    return;
  }
  const params = route.params(match);
  const response = await handler2({ ...request, params });
  const preface = `Invalid response from route ${request.path}`;
  if (!response) {
    return;
  }
  if (typeof response !== "object") {
    return error$1(`${preface}: expected an object, got ${typeof response}`);
  }
  let { status = 200, body, headers = {} } = response;
  headers = lowercase_keys(headers);
  const type = get_single_valued_header(headers, "content-type");
  const is_type_textual = is_content_type_textual(type);
  if (!is_type_textual && !(body instanceof Uint8Array || is_string(body))) {
    return error$1(`${preface}: body must be an instance of string or Uint8Array if content-type is not a supported textual content-type`);
  }
  let normalized_body;
  if ((typeof body === "object" || typeof body === "undefined") && !(body instanceof Uint8Array) && (!type || type.startsWith("application/json"))) {
    headers = { ...headers, "content-type": "application/json; charset=utf-8" };
    normalized_body = JSON.stringify(typeof body === "undefined" ? {} : body);
  } else {
    normalized_body = body;
  }
  return { status, body: normalized_body, headers };
}
var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
var unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
var reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
var escaped$1 = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function devalue(value) {
  var counts = new Map();
  function walk(thing) {
    if (typeof thing === "function") {
      throw new Error("Cannot stringify a function");
    }
    if (counts.has(thing)) {
      counts.set(thing, counts.get(thing) + 1);
      return;
    }
    counts.set(thing, 1);
    if (!isPrimitive(thing)) {
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
          return;
        case "Array":
          thing.forEach(walk);
          break;
        case "Set":
        case "Map":
          Array.from(thing).forEach(walk);
          break;
        default:
          var proto = Object.getPrototypeOf(thing);
          if (proto !== Object.prototype && proto !== null && Object.getOwnPropertyNames(proto).sort().join("\0") !== objectProtoOwnPropertyNames) {
            throw new Error("Cannot stringify arbitrary non-POJOs");
          }
          if (Object.getOwnPropertySymbols(thing).length > 0) {
            throw new Error("Cannot stringify POJOs with symbolic keys");
          }
          Object.keys(thing).forEach(function(key) {
            return walk(thing[key]);
          });
      }
    }
  }
  walk(value);
  var names = new Map();
  Array.from(counts).filter(function(entry) {
    return entry[1] > 1;
  }).sort(function(a, b) {
    return b[1] - a[1];
  }).forEach(function(entry, i) {
    names.set(entry[0], getName(i));
  });
  function stringify(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (isPrimitive(thing)) {
      return stringifyPrimitive(thing);
    }
    var type = getType(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return "Object(" + stringify(thing.valueOf()) + ")";
      case "RegExp":
        return "new RegExp(" + stringifyString(thing.source) + ', "' + thing.flags + '")';
      case "Date":
        return "new Date(" + thing.getTime() + ")";
      case "Array":
        var members = thing.map(function(v, i) {
          return i in thing ? stringify(v) : "";
        });
        var tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return "[" + members.join(",") + tail + "]";
      case "Set":
      case "Map":
        return "new " + type + "([" + Array.from(thing).map(stringify).join(",") + "])";
      default:
        var obj = "{" + Object.keys(thing).map(function(key) {
          return safeKey(key) + ":" + stringify(thing[key]);
        }).join(",") + "}";
        var proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return Object.keys(thing).length > 0 ? "Object.assign(Object.create(null)," + obj + ")" : "Object.create(null)";
        }
        return obj;
    }
  }
  var str = stringify(value);
  if (names.size) {
    var params_1 = [];
    var statements_1 = [];
    var values_1 = [];
    names.forEach(function(name, thing) {
      params_1.push(name);
      if (isPrimitive(thing)) {
        values_1.push(stringifyPrimitive(thing));
        return;
      }
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values_1.push("Object(" + stringify(thing.valueOf()) + ")");
          break;
        case "RegExp":
          values_1.push(thing.toString());
          break;
        case "Date":
          values_1.push("new Date(" + thing.getTime() + ")");
          break;
        case "Array":
          values_1.push("Array(" + thing.length + ")");
          thing.forEach(function(v, i) {
            statements_1.push(name + "[" + i + "]=" + stringify(v));
          });
          break;
        case "Set":
          values_1.push("new Set");
          statements_1.push(name + "." + Array.from(thing).map(function(v) {
            return "add(" + stringify(v) + ")";
          }).join("."));
          break;
        case "Map":
          values_1.push("new Map");
          statements_1.push(name + "." + Array.from(thing).map(function(_a) {
            var k = _a[0], v = _a[1];
            return "set(" + stringify(k) + ", " + stringify(v) + ")";
          }).join("."));
          break;
        default:
          values_1.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach(function(key) {
            statements_1.push("" + name + safeProp(key) + "=" + stringify(thing[key]));
          });
      }
    });
    statements_1.push("return " + str);
    return "(function(" + params_1.join(",") + "){" + statements_1.join(";") + "}(" + values_1.join(",") + "))";
  } else {
    return str;
  }
}
function getName(num) {
  var name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
  return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
  if (typeof thing === "string")
    return stringifyString(thing);
  if (thing === void 0)
    return "void 0";
  if (thing === 0 && 1 / thing < 0)
    return "-0";
  var str = String(thing);
  if (typeof thing === "number")
    return str.replace(/^(-)?0\./, "$1.");
  return str;
}
function getType(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c) {
  return escaped$1[c] || c;
}
function escapeUnsafeChars(str) {
  return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escapeUnsafeChars(JSON.stringify(key));
}
function safeProp(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? "." + key : "[" + escapeUnsafeChars(JSON.stringify(key)) + "]";
}
function stringifyString(str) {
  var result = '"';
  for (var i = 0; i < str.length; i += 1) {
    var char = str.charAt(i);
    var code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$1) {
      result += escaped$1[char];
    } else if (code >= 55296 && code <= 57343) {
      var next = str.charCodeAt(i + 1);
      if (code <= 56319 && (next >= 56320 && next <= 57343)) {
        result += char + str[++i];
      } else {
        result += "\\u" + code.toString(16).toUpperCase();
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
function noop() {
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
Promise.resolve();
var subscriber_queue = [];
function writable(value, start = noop) {
  let stop;
  const subscribers = new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set) || noop;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe };
}
function hash(value) {
  let hash2 = 5381;
  let i = value.length;
  if (typeof value === "string") {
    while (i)
      hash2 = hash2 * 33 ^ value.charCodeAt(--i);
  } else {
    while (i)
      hash2 = hash2 * 33 ^ value[--i];
  }
  return (hash2 >>> 0).toString(36);
}
var escape_json_string_in_html_dict = {
  '"': '\\"',
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
function escape_json_string_in_html(str) {
  return escape$1(str, escape_json_string_in_html_dict, (code) => `\\u${code.toString(16).toUpperCase()}`);
}
var escape_html_attr_dict = {
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;"
};
function escape_html_attr(str) {
  return '"' + escape$1(str, escape_html_attr_dict, (code) => `&#${code};`) + '"';
}
function escape$1(str, dict, unicode_encoder) {
  let result = "";
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charAt(i);
    const code = char.charCodeAt(0);
    if (char in dict) {
      result += dict[char];
    } else if (code >= 55296 && code <= 57343) {
      const next = str.charCodeAt(i + 1);
      if (code <= 56319 && next >= 56320 && next <= 57343) {
        result += char + str[++i];
      } else {
        result += unicode_encoder(code);
      }
    } else {
      result += char;
    }
  }
  return result;
}
var s$1 = JSON.stringify;
async function render_response({
  branch,
  options: options2,
  $session,
  page_config,
  status,
  error: error2,
  page
}) {
  const css2 = new Set(options2.entry.css);
  const js = new Set(options2.entry.js);
  const styles = new Set();
  const serialized_data = [];
  let rendered;
  let is_private = false;
  let maxage;
  if (error2) {
    error2.stack = options2.get_stack(error2);
  }
  if (page_config.ssr) {
    branch.forEach(({ node, loaded, fetched, uses_credentials }) => {
      if (node.css)
        node.css.forEach((url) => css2.add(url));
      if (node.js)
        node.js.forEach((url) => js.add(url));
      if (node.styles)
        node.styles.forEach((content) => styles.add(content));
      if (fetched && page_config.hydrate)
        serialized_data.push(...fetched);
      if (uses_credentials)
        is_private = true;
      maxage = loaded.maxage;
    });
    const session = writable($session);
    const props = {
      stores: {
        page: writable(null),
        navigating: writable(null),
        session
      },
      page,
      components: branch.map(({ node }) => node.module.default)
    };
    for (let i = 0; i < branch.length; i += 1) {
      props[`props_${i}`] = await branch[i].loaded.props;
    }
    let session_tracking_active = false;
    const unsubscribe = session.subscribe(() => {
      if (session_tracking_active)
        is_private = true;
    });
    session_tracking_active = true;
    try {
      rendered = options2.root.render(props);
    } finally {
      unsubscribe();
    }
  } else {
    rendered = { head: "", html: "", css: { code: "", map: null } };
  }
  const include_js = page_config.router || page_config.hydrate;
  if (!include_js)
    js.clear();
  const links = options2.amp ? styles.size > 0 || rendered.css.code.length > 0 ? `<style amp-custom>${Array.from(styles).concat(rendered.css.code).join("\n")}</style>` : "" : [
    ...Array.from(js).map((dep) => `<link rel="modulepreload" href="${dep}">`),
    ...Array.from(css2).map((dep) => `<link rel="stylesheet" href="${dep}">`)
  ].join("\n		");
  let init2 = "";
  if (options2.amp) {
    init2 = `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"><\/script>`;
  } else if (include_js) {
    init2 = `<script type="module">
			import { start } from ${s$1(options2.entry.file)};
			start({
				target: ${options2.target ? `document.querySelector(${s$1(options2.target)})` : "document.body"},
				paths: ${s$1(options2.paths)},
				session: ${try_serialize($session, (error3) => {
      throw new Error(`Failed to serialize session data: ${error3.message}`);
    })},
				host: ${page && page.host ? s$1(page.host) : "location.host"},
				route: ${!!page_config.router},
				spa: ${!page_config.ssr},
				trailing_slash: ${s$1(options2.trailing_slash)},
				hydrate: ${page_config.ssr && page_config.hydrate ? `{
					status: ${status},
					error: ${serialize_error(error2)},
					nodes: [
						${(branch || []).map(({ node }) => `import(${s$1(node.entry)})`).join(",\n						")}
					],
					page: {
						host: ${page && page.host ? s$1(page.host) : "location.host"}, // TODO this is redundant
						path: ${page && page.path ? try_serialize(page.path, (error3) => {
      throw new Error(`Failed to serialize page.path: ${error3.message}`);
    }) : null},
						query: new URLSearchParams(${page && page.query ? s$1(page.query.toString()) : ""}),
						params: ${page && page.params ? try_serialize(page.params, (error3) => {
      throw new Error(`Failed to serialize page.params: ${error3.message}`);
    }) : null}
					}
				}` : "null"}
			});
		<\/script>`;
  }
  if (options2.service_worker) {
    init2 += `<script>
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register('${options2.service_worker}');
			}
		<\/script>`;
  }
  const head = [
    rendered.head,
    styles.size && !options2.amp ? `<style data-svelte>${Array.from(styles).join("\n")}</style>` : "",
    links,
    init2
  ].join("\n\n		");
  const body = options2.amp ? rendered.html : `${rendered.html}

			${serialized_data.map(({ url, body: body2, json }) => {
    let attributes = `type="application/json" data-type="svelte-data" data-url=${escape_html_attr(url)}`;
    if (body2)
      attributes += ` data-body="${hash(body2)}"`;
    return `<script ${attributes}>${json}<\/script>`;
  }).join("\n\n	")}
		`;
  const headers = {
    "content-type": "text/html"
  };
  if (maxage) {
    headers["cache-control"] = `${is_private ? "private" : "public"}, max-age=${maxage}`;
  }
  if (!options2.floc) {
    headers["permissions-policy"] = "interest-cohort=()";
  }
  return {
    status,
    headers,
    body: options2.template({ head, body })
  };
}
function try_serialize(data, fail) {
  try {
    return devalue(data);
  } catch (err) {
    if (fail)
      fail(coalesce_to_error(err));
    return null;
  }
}
function serialize_error(error2) {
  if (!error2)
    return null;
  let serialized = try_serialize(error2);
  if (!serialized) {
    const { name, message, stack } = error2;
    serialized = try_serialize({ ...error2, name, message, stack });
  }
  if (!serialized) {
    serialized = "{}";
  }
  return serialized;
}
function normalize(loaded) {
  const has_error_status = loaded.status && loaded.status >= 400 && loaded.status <= 599 && !loaded.redirect;
  if (loaded.error || has_error_status) {
    const status = loaded.status;
    if (!loaded.error && has_error_status) {
      return {
        status: status || 500,
        error: new Error()
      };
    }
    const error2 = typeof loaded.error === "string" ? new Error(loaded.error) : loaded.error;
    if (!(error2 instanceof Error)) {
      return {
        status: 500,
        error: new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof error2}"`)
      };
    }
    if (!status || status < 400 || status > 599) {
      console.warn('"error" returned from load() without a valid status code \u2014 defaulting to 500');
      return { status: 500, error: error2 };
    }
    return { status, error: error2 };
  }
  if (loaded.redirect) {
    if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')
      };
    }
    if (typeof loaded.redirect !== "string") {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be a string')
      };
    }
  }
  if (loaded.context) {
    throw new Error('You are returning "context" from a load function. "context" was renamed to "stuff", please adjust your code accordingly.');
  }
  return loaded;
}
var s = JSON.stringify;
async function load_node({
  request,
  options: options2,
  state,
  route,
  page,
  node,
  $session,
  stuff,
  prerender_enabled,
  is_leaf,
  is_error,
  status,
  error: error2
}) {
  const { module: module2 } = node;
  let uses_credentials = false;
  const fetched = [];
  let set_cookie_headers = [];
  let loaded;
  const page_proxy = new Proxy(page, {
    get: (target, prop, receiver) => {
      if (prop === "query" && prerender_enabled) {
        throw new Error("Cannot access query on a page with prerendering enabled");
      }
      return Reflect.get(target, prop, receiver);
    }
  });
  if (module2.load) {
    const load_input = {
      page: page_proxy,
      get session() {
        uses_credentials = true;
        return $session;
      },
      fetch: async (resource, opts = {}) => {
        let url;
        if (typeof resource === "string") {
          url = resource;
        } else {
          url = resource.url;
          opts = {
            method: resource.method,
            headers: resource.headers,
            body: resource.body,
            mode: resource.mode,
            credentials: resource.credentials,
            cache: resource.cache,
            redirect: resource.redirect,
            referrer: resource.referrer,
            integrity: resource.integrity,
            ...opts
          };
        }
        const resolved = resolve(request.path, url.split("?")[0]);
        let response;
        const prefix = options2.paths.assets || options2.paths.base;
        const filename = (resolved.startsWith(prefix) ? resolved.slice(prefix.length) : resolved).slice(1);
        const filename_html = `${filename}/index.html`;
        const asset = options2.manifest.assets.find((d) => d.file === filename || d.file === filename_html);
        if (asset) {
          response = options2.read ? new Response(options2.read(asset.file), {
            headers: asset.type ? { "content-type": asset.type } : {}
          }) : await fetch(`http://${page.host}/${asset.file}`, opts);
        } else if (resolved.startsWith("/") && !resolved.startsWith("//")) {
          const relative = resolved;
          const headers = {
            ...opts.headers
          };
          if (opts.credentials !== "omit") {
            uses_credentials = true;
            headers.cookie = request.headers.cookie;
            if (!headers.authorization) {
              headers.authorization = request.headers.authorization;
            }
          }
          if (opts.body && typeof opts.body !== "string") {
            throw new Error("Request body must be a string");
          }
          const search = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
          const rendered = await respond({
            host: request.host,
            method: opts.method || "GET",
            headers,
            path: relative,
            rawBody: opts.body == null ? null : new TextEncoder().encode(opts.body),
            query: new URLSearchParams(search)
          }, options2, {
            fetched: url,
            initiator: route
          });
          if (rendered) {
            if (state.prerender) {
              state.prerender.dependencies.set(relative, rendered);
            }
            response = new Response(rendered.body, {
              status: rendered.status,
              headers: rendered.headers
            });
          }
        } else {
          if (resolved.startsWith("//")) {
            throw new Error(`Cannot request protocol-relative URL (${url}) in server-side fetch`);
          }
          if (typeof request.host !== "undefined") {
            const { hostname: fetch_hostname } = new URL(url);
            const [server_hostname] = request.host.split(":");
            if (`.${fetch_hostname}`.endsWith(`.${server_hostname}`) && opts.credentials !== "omit") {
              uses_credentials = true;
              opts.headers = {
                ...opts.headers,
                cookie: request.headers.cookie
              };
            }
          }
          const external_request = new Request(url, opts);
          response = await options2.hooks.externalFetch.call(null, external_request);
        }
        if (response) {
          const proxy = new Proxy(response, {
            get(response2, key, _receiver) {
              async function text() {
                const body = await response2.text();
                const headers = {};
                for (const [key2, value] of response2.headers) {
                  if (key2 === "set-cookie") {
                    set_cookie_headers = set_cookie_headers.concat(value);
                  } else if (key2 !== "etag") {
                    headers[key2] = value;
                  }
                }
                if (!opts.body || typeof opts.body === "string") {
                  fetched.push({
                    url,
                    body: opts.body,
                    json: `{"status":${response2.status},"statusText":${s(response2.statusText)},"headers":${s(headers)},"body":"${escape_json_string_in_html(body)}"}`
                  });
                }
                return body;
              }
              if (key === "text") {
                return text;
              }
              if (key === "json") {
                return async () => {
                  return JSON.parse(await text());
                };
              }
              return Reflect.get(response2, key, response2);
            }
          });
          return proxy;
        }
        return response || new Response("Not found", {
          status: 404
        });
      },
      stuff: { ...stuff }
    };
    if (is_error) {
      load_input.status = status;
      load_input.error = error2;
    }
    loaded = await module2.load.call(null, load_input);
  } else {
    loaded = {};
  }
  if (!loaded && is_leaf && !is_error)
    return;
  if (!loaded) {
    throw new Error(`${node.entry} - load must return a value except for page fall through`);
  }
  return {
    node,
    loaded: normalize(loaded),
    stuff: loaded.stuff || stuff,
    fetched,
    set_cookie_headers,
    uses_credentials
  };
}
var absolute = /^([a-z]+:)?\/?\//;
function resolve(base2, path2) {
  const base_match = absolute.exec(base2);
  const path_match = absolute.exec(path2);
  if (!base_match) {
    throw new Error(`bad base path: "${base2}"`);
  }
  const baseparts = path_match ? [] : base2.slice(base_match[0].length).split("/");
  const pathparts = path_match ? path2.slice(path_match[0].length).split("/") : path2.split("/");
  baseparts.pop();
  for (let i = 0; i < pathparts.length; i += 1) {
    const part = pathparts[i];
    if (part === ".")
      continue;
    else if (part === "..")
      baseparts.pop();
    else
      baseparts.push(part);
  }
  const prefix = path_match && path_match[0] || base_match && base_match[0] || "";
  return `${prefix}${baseparts.join("/")}`;
}
async function respond_with_error({ request, options: options2, state, $session, status, error: error2 }) {
  const default_layout = await options2.load_component(options2.manifest.layout);
  const default_error = await options2.load_component(options2.manifest.error);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params: {}
  };
  const loaded = await load_node({
    request,
    options: options2,
    state,
    route: null,
    page,
    node: default_layout,
    $session,
    stuff: {},
    prerender_enabled: is_prerender_enabled(options2, default_error, state),
    is_leaf: false,
    is_error: false
  });
  const branch = [
    loaded,
    await load_node({
      request,
      options: options2,
      state,
      route: null,
      page,
      node: default_error,
      $session,
      stuff: loaded ? loaded.stuff : {},
      prerender_enabled: is_prerender_enabled(options2, default_error, state),
      is_leaf: false,
      is_error: true,
      status,
      error: error2
    })
  ];
  try {
    return await render_response({
      options: options2,
      $session,
      page_config: {
        hydrate: options2.hydrate,
        router: options2.router,
        ssr: options2.ssr
      },
      status,
      error: error2,
      branch,
      page
    });
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return {
      status: 500,
      headers: {},
      body: error3.stack
    };
  }
}
function is_prerender_enabled(options2, node, state) {
  return options2.prerender && (!!node.module.prerender || !!state.prerender && state.prerender.all);
}
async function respond$1(opts) {
  const { request, options: options2, state, $session, route } = opts;
  let nodes;
  try {
    nodes = await Promise.all(route.a.map((id) => id ? options2.load_component(id) : void 0));
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 500,
      error: error3
    });
  }
  const leaf = nodes[nodes.length - 1].module;
  let page_config = get_page_config(leaf, options2);
  if (!leaf.prerender && state.prerender && !state.prerender.all) {
    return {
      status: 204,
      headers: {},
      body: ""
    };
  }
  let branch = [];
  let status = 200;
  let error2;
  let set_cookie_headers = [];
  ssr:
    if (page_config.ssr) {
      let stuff = {};
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        let loaded;
        if (node) {
          try {
            loaded = await load_node({
              ...opts,
              node,
              stuff,
              prerender_enabled: is_prerender_enabled(options2, node, state),
              is_leaf: i === nodes.length - 1,
              is_error: false
            });
            if (!loaded)
              return;
            set_cookie_headers = set_cookie_headers.concat(loaded.set_cookie_headers);
            if (loaded.loaded.redirect) {
              return with_cookies({
                status: loaded.loaded.status,
                headers: {
                  location: encodeURI(loaded.loaded.redirect)
                }
              }, set_cookie_headers);
            }
            if (loaded.loaded.error) {
              ({ status, error: error2 } = loaded.loaded);
            }
          } catch (err) {
            const e = coalesce_to_error(err);
            options2.handle_error(e, request);
            status = 500;
            error2 = e;
          }
          if (loaded && !error2) {
            branch.push(loaded);
          }
          if (error2) {
            while (i--) {
              if (route.b[i]) {
                const error_node = await options2.load_component(route.b[i]);
                let node_loaded;
                let j = i;
                while (!(node_loaded = branch[j])) {
                  j -= 1;
                }
                try {
                  const error_loaded = await load_node({
                    ...opts,
                    node: error_node,
                    stuff: node_loaded.stuff,
                    prerender_enabled: is_prerender_enabled(options2, error_node, state),
                    is_leaf: false,
                    is_error: true,
                    status,
                    error: error2
                  });
                  if (error_loaded.loaded.error) {
                    continue;
                  }
                  page_config = get_page_config(error_node.module, options2);
                  branch = branch.slice(0, j + 1).concat(error_loaded);
                  break ssr;
                } catch (err) {
                  const e = coalesce_to_error(err);
                  options2.handle_error(e, request);
                  continue;
                }
              }
            }
            return with_cookies(await respond_with_error({
              request,
              options: options2,
              state,
              $session,
              status,
              error: error2
            }), set_cookie_headers);
          }
        }
        if (loaded && loaded.loaded.stuff) {
          stuff = {
            ...stuff,
            ...loaded.loaded.stuff
          };
        }
      }
    }
  try {
    return with_cookies(await render_response({
      ...opts,
      page_config,
      status,
      error: error2,
      branch: branch.filter(Boolean)
    }), set_cookie_headers);
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return with_cookies(await respond_with_error({
      ...opts,
      status: 500,
      error: error3
    }), set_cookie_headers);
  }
}
function get_page_config(leaf, options2) {
  return {
    ssr: "ssr" in leaf ? !!leaf.ssr : options2.ssr,
    router: "router" in leaf ? !!leaf.router : options2.router,
    hydrate: "hydrate" in leaf ? !!leaf.hydrate : options2.hydrate
  };
}
function with_cookies(response, set_cookie_headers) {
  if (set_cookie_headers.length) {
    response.headers["set-cookie"] = set_cookie_headers;
  }
  return response;
}
async function render_page(request, route, match, options2, state) {
  if (state.initiator === route) {
    return {
      status: 404,
      headers: {},
      body: `Not found: ${request.path}`
    };
  }
  const params = route.params(match);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params
  };
  const $session = await options2.hooks.getSession(request);
  const response = await respond$1({
    request,
    options: options2,
    state,
    $session,
    route,
    page
  });
  if (response) {
    return response;
  }
  if (state.fetched) {
    return {
      status: 500,
      headers: {},
      body: `Bad request in load function: failed to fetch ${state.fetched}`
    };
  }
}
function read_only_form_data() {
  const map = new Map();
  return {
    append(key, value) {
      if (map.has(key)) {
        (map.get(key) || []).push(value);
      } else {
        map.set(key, [value]);
      }
    },
    data: new ReadOnlyFormData(map)
  };
}
var ReadOnlyFormData = class {
  constructor(map) {
    __privateAdd(this, _map, void 0);
    __privateSet(this, _map, map);
  }
  get(key) {
    const value = __privateGet(this, _map).get(key);
    return value && value[0];
  }
  getAll(key) {
    return __privateGet(this, _map).get(key);
  }
  has(key) {
    return __privateGet(this, _map).has(key);
  }
  *[Symbol.iterator]() {
    for (const [key, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *entries() {
    for (const [key, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *keys() {
    for (const [key] of __privateGet(this, _map))
      yield key;
  }
  *values() {
    for (const [, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield value[i];
      }
    }
  }
};
_map = new WeakMap();
function parse_body(raw, headers) {
  if (!raw)
    return raw;
  const content_type = headers["content-type"];
  const [type, ...directives] = content_type ? content_type.split(/;\s*/) : [];
  const text = () => new TextDecoder(headers["content-encoding"] || "utf-8").decode(raw);
  switch (type) {
    case "text/plain":
      return text();
    case "application/json":
      return JSON.parse(text());
    case "application/x-www-form-urlencoded":
      return get_urlencoded(text());
    case "multipart/form-data": {
      const boundary = directives.find((directive) => directive.startsWith("boundary="));
      if (!boundary)
        throw new Error("Missing boundary");
      return get_multipart(text(), boundary.slice("boundary=".length));
    }
    default:
      return raw;
  }
}
function get_urlencoded(text) {
  const { data, append } = read_only_form_data();
  text.replace(/\+/g, " ").split("&").forEach((str) => {
    const [key, value] = str.split("=");
    append(decodeURIComponent(key), decodeURIComponent(value));
  });
  return data;
}
function get_multipart(text, boundary) {
  const parts = text.split(`--${boundary}`);
  if (parts[0] !== "" || parts[parts.length - 1].trim() !== "--") {
    throw new Error("Malformed form data");
  }
  const { data, append } = read_only_form_data();
  parts.slice(1, -1).forEach((part) => {
    const match = /\s*([\s\S]+?)\r\n\r\n([\s\S]*)\s*/.exec(part);
    if (!match) {
      throw new Error("Malformed form data");
    }
    const raw_headers = match[1];
    const body = match[2].trim();
    let key;
    const headers = {};
    raw_headers.split("\r\n").forEach((str) => {
      const [raw_header, ...raw_directives] = str.split("; ");
      let [name, value] = raw_header.split(": ");
      name = name.toLowerCase();
      headers[name] = value;
      const directives = {};
      raw_directives.forEach((raw_directive) => {
        const [name2, value2] = raw_directive.split("=");
        directives[name2] = JSON.parse(value2);
      });
      if (name === "content-disposition") {
        if (value !== "form-data")
          throw new Error("Malformed form data");
        if (directives.filename) {
          throw new Error("File upload is not yet implemented");
        }
        if (directives.name) {
          key = directives.name;
        }
      }
    });
    if (!key)
      throw new Error("Malformed form data");
    append(key, body);
  });
  return data;
}
async function respond(incoming, options2, state = {}) {
  if (incoming.path !== "/" && options2.trailing_slash !== "ignore") {
    const has_trailing_slash = incoming.path.endsWith("/");
    if (has_trailing_slash && options2.trailing_slash === "never" || !has_trailing_slash && options2.trailing_slash === "always" && !(incoming.path.split("/").pop() || "").includes(".")) {
      const path2 = has_trailing_slash ? incoming.path.slice(0, -1) : incoming.path + "/";
      const q = incoming.query.toString();
      return {
        status: 301,
        headers: {
          location: options2.paths.base + path2 + (q ? `?${q}` : "")
        }
      };
    }
  }
  const headers = lowercase_keys(incoming.headers);
  const request = {
    ...incoming,
    headers,
    body: parse_body(incoming.rawBody, headers),
    params: {},
    locals: {}
  };
  try {
    return await options2.hooks.handle({
      request,
      resolve: async (request2) => {
        if (state.prerender && state.prerender.fallback) {
          return await render_response({
            options: options2,
            $session: await options2.hooks.getSession(request2),
            page_config: { ssr: false, router: true, hydrate: true },
            status: 200,
            branch: []
          });
        }
        const decoded = decodeURI(request2.path);
        for (const route of options2.manifest.routes) {
          const match = route.pattern.exec(decoded);
          if (!match)
            continue;
          const response = route.type === "endpoint" ? await render_endpoint(request2, route, match) : await render_page(request2, route, match, options2, state);
          if (response) {
            if (response.status === 200) {
              const cache_control = get_single_valued_header(response.headers, "cache-control");
              if (!cache_control || !/(no-store|immutable)/.test(cache_control)) {
                const etag = `"${hash(response.body || "")}"`;
                if (request2.headers["if-none-match"] === etag) {
                  return {
                    status: 304,
                    headers: {},
                    body: ""
                  };
                }
                response.headers["etag"] = etag;
              }
            }
            return response;
          }
        }
        const $session = await options2.hooks.getSession(request2);
        return await respond_with_error({
          request: request2,
          options: options2,
          state,
          $session,
          status: 404,
          error: new Error(`Not found: ${request2.path}`)
        });
      }
    });
  } catch (err) {
    const e = coalesce_to_error(err);
    options2.handle_error(e, request);
    return {
      status: 500,
      headers: {},
      body: options2.dev ? e.stack : e.message
    };
  }
}
function run(fn) {
  return fn();
}
function blank_object() {
  return Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
var current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component)
    throw new Error("Function called outside component initialization");
  return current_component;
}
function setContext(key, context) {
  get_current_component().$$.context.set(key, context);
}
Promise.resolve();
var escaped = {
  '"': "&quot;",
  "'": "&#39;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};
function escape(html) {
  return String(html).replace(/["'&<>]/g, (match) => escaped[match]);
}
function each(items, fn) {
  let str = "";
  for (let i = 0; i < items.length; i += 1) {
    str += fn(items[i], i);
  }
  return str;
}
var missing_component = {
  $$render: () => ""
};
function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === "svelte:component")
      name += " this={...}";
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
  }
  return component;
}
var on_destroy;
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots, context) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(context || (parent_component ? parent_component.$$.context : [])),
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({ $$ });
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, { $$slots = {}, context = new Map() } = {}) => {
      on_destroy = [];
      const result = { title: "", head: "", css: new Set() };
      const html = $$render(result, props, {}, $$slots, context);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css2) => css2.code).join("\n"),
          map: null
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function add_attribute(name, value, boolean) {
  if (value == null || boolean && !value)
    return "";
  return ` ${name}${value === true ? "" : `=${typeof value === "string" ? JSON.stringify(escape(value)) : `"${value}"`}`}`;
}
function afterUpdate() {
}
var css$q = {
  code: "#svelte-announcer.svelte-u7bl1d{position:absolute;left:0;top:0;clip:rect(0 0 0 0);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}",
  map: null
};
var Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { stores } = $$props;
  let { page } = $$props;
  let { components } = $$props;
  let { props_0 = null } = $$props;
  let { props_1 = null } = $$props;
  let { props_2 = null } = $$props;
  setContext("__svelte__", stores);
  afterUpdate(stores.page.notify);
  if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0)
    $$bindings.stores(stores);
  if ($$props.page === void 0 && $$bindings.page && page !== void 0)
    $$bindings.page(page);
  if ($$props.components === void 0 && $$bindings.components && components !== void 0)
    $$bindings.components(components);
  if ($$props.props_0 === void 0 && $$bindings.props_0 && props_0 !== void 0)
    $$bindings.props_0(props_0);
  if ($$props.props_1 === void 0 && $$bindings.props_1 && props_1 !== void 0)
    $$bindings.props_1(props_1);
  if ($$props.props_2 === void 0 && $$bindings.props_2 && props_2 !== void 0)
    $$bindings.props_2(props_2);
  $$result.css.add(css$q);
  {
    stores.page.set(page);
  }
  return `


${validate_component(components[0] || missing_component, "svelte:component").$$render($$result, Object.assign(props_0 || {}), {}, {
    default: () => `${components[1] ? `${validate_component(components[1] || missing_component, "svelte:component").$$render($$result, Object.assign(props_1 || {}), {}, {
      default: () => `${components[2] ? `${validate_component(components[2] || missing_component, "svelte:component").$$render($$result, Object.assign(props_2 || {}), {}, {})}` : ``}`
    })}` : ``}`
  })}

${``}`;
});
var base = "";
var assets = "";
function set_paths(paths) {
  base = paths.base;
  assets = paths.assets || base;
}
function set_prerendering(value) {
}
var user_hooks = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module"
});
var template = ({ head, body }) => '<!DOCTYPE html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<link rel="icon" href="/favicon.png" />\n		<meta name="viewport" content="width=device-width, initial-scale=1" />\n		' + head + '\n	</head>\n	<body>\n		<div id="svelte">' + body + "</div>\n	</body>\n</html>\n";
var options = null;
var default_settings = { paths: { "base": "", "assets": "" } };
function init(settings = default_settings) {
  set_paths(settings.paths);
  set_prerendering(settings.prerendering || false);
  const hooks = get_hooks(user_hooks);
  options = {
    amp: false,
    dev: false,
    entry: {
      file: assets + "/_app/start-36f142f7.js",
      css: [assets + "/_app/assets/start-808c0b29.css"],
      js: [assets + "/_app/start-36f142f7.js", assets + "/_app/chunks/vendor-5bc0e481.js"]
    },
    fetched: void 0,
    floc: false,
    get_component_path: (id) => assets + "/_app/" + entry_lookup[id],
    get_stack: (error2) => String(error2),
    handle_error: (error2, request) => {
      hooks.handleError({ error: error2, request });
      error2.stack = options.get_stack(error2);
    },
    hooks,
    hydrate: true,
    initiator: void 0,
    load_component,
    manifest,
    paths: settings.paths,
    prerender: true,
    read: settings.read,
    root: Root,
    service_worker: null,
    router: true,
    ssr: true,
    target: "#svelte",
    template,
    trailing_slash: "never"
  };
}
var empty = () => ({});
var manifest = {
  assets: [{ "file": ".DS_Store", "size": 6148, "type": null }, { "file": "favicon.ico", "size": 1976, "type": "image/vnd.microsoft.icon" }, { "file": "favicon.png", "size": 1976, "type": "image/png" }, { "file": "semi-logo.svg", "size": 7359, "type": "image/svg+xml" }, { "file": "videos/alert.mp4", "size": 181409, "type": "video/mp4" }, { "file": "videos/circle.mp4", "size": 138193, "type": "video/mp4" }, { "file": "videos/eclectic.mp4", "size": 747714, "type": "video/mp4" }, { "file": "videos/grid.mp4", "size": 407832, "type": "video/mp4" }, { "file": "videos/hexagon.mp4", "size": 186386, "type": "video/mp4" }, { "file": "videos/line.mp4", "size": 276769, "type": "video/mp4" }, { "file": "videos/y.mp4", "size": 158510, "type": "video/mp4" }],
  layout: "src/routes/__layout.svelte",
  error: ".svelte-kit/build/components/error.svelte",
  routes: [
    {
      type: "page",
      pattern: /^\/$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/index.svelte"],
      b: [".svelte-kit/build/components/error.svelte"]
    },
    {
      type: "endpoint",
      pattern: /^\/options\.json$/,
      params: empty,
      load: () => Promise.resolve().then(function() {
        return options_json;
      })
    },
    {
      type: "page",
      pattern: /^\/spinners\/?$/,
      params: empty,
      a: ["src/routes/spinners/__layout.reset.svelte", "src/routes/spinners/index.svelte"],
      b: []
    },
    {
      type: "page",
      pattern: /^\/preview\/?$/,
      params: empty,
      a: ["src/routes/preview/__layout.reset.svelte", "src/routes/preview/index.svelte"],
      b: []
    }
  ]
};
var get_hooks = (hooks) => ({
  getSession: hooks.getSession || (() => ({})),
  handle: hooks.handle || (({ request, resolve: resolve2 }) => resolve2(request)),
  handleError: hooks.handleError || (({ error: error2 }) => console.error(error2.stack)),
  externalFetch: hooks.externalFetch || fetch
});
var module_lookup = {
  "src/routes/__layout.svelte": () => Promise.resolve().then(function() {
    return __layout;
  }),
  ".svelte-kit/build/components/error.svelte": () => Promise.resolve().then(function() {
    return error;
  }),
  "src/routes/index.svelte": () => Promise.resolve().then(function() {
    return index$2;
  }),
  "src/routes/spinners/__layout.reset.svelte": () => Promise.resolve().then(function() {
    return __layout_reset$1;
  }),
  "src/routes/spinners/index.svelte": () => Promise.resolve().then(function() {
    return index$1;
  }),
  "src/routes/preview/__layout.reset.svelte": () => Promise.resolve().then(function() {
    return __layout_reset;
  }),
  "src/routes/preview/index.svelte": () => Promise.resolve().then(function() {
    return index;
  })
};
var metadata_lookup = { "src/routes/__layout.svelte": { "entry": "pages/__layout.svelte-bc121b59.js", "css": ["assets/pages/__layout.svelte-fd95b7dc.css", "assets/global-4db7817a.css", "assets/Popup-7d85c9fa.css", "assets/Spinner-3d7d3e40.css"], "js": ["pages/__layout.svelte-bc121b59.js", "chunks/vendor-5bc0e481.js", "chunks/Popup-0fc4fff9.js", "chunks/helpers-e7761bd3.js", "chunks/Spinner-2cdf84f5.js"], "styles": [] }, ".svelte-kit/build/components/error.svelte": { "entry": "error.svelte-a4b0491e.js", "css": [], "js": ["error.svelte-a4b0491e.js", "chunks/vendor-5bc0e481.js"], "styles": [] }, "src/routes/index.svelte": { "entry": "pages/index.svelte-06a0e5e1.js", "css": ["assets/pages/index.svelte-89672b79.css", "assets/Popup-7d85c9fa.css"], "js": ["pages/index.svelte-06a0e5e1.js", "chunks/vendor-5bc0e481.js", "chunks/helpers-e7761bd3.js", "chunks/Popup-0fc4fff9.js"], "styles": [] }, "src/routes/spinners/__layout.reset.svelte": { "entry": "pages/spinners/__layout.reset.svelte-fd24f10d.js", "css": ["assets/global-4db7817a.css"], "js": ["pages/spinners/__layout.reset.svelte-fd24f10d.js", "chunks/vendor-5bc0e481.js"], "styles": [] }, "src/routes/spinners/index.svelte": { "entry": "pages/spinners/index.svelte-0b58234d.js", "css": ["assets/pages/spinners/index.svelte-f02e02f4.css"], "js": ["pages/spinners/index.svelte-0b58234d.js", "chunks/vendor-5bc0e481.js", "chunks/helpers-e7761bd3.js"], "styles": [] }, "src/routes/preview/__layout.reset.svelte": { "entry": "pages/preview/__layout.reset.svelte-19f1422e.js", "css": [], "js": ["pages/preview/__layout.reset.svelte-19f1422e.js", "chunks/vendor-5bc0e481.js"], "styles": [] }, "src/routes/preview/index.svelte": { "entry": "pages/preview/index.svelte-19cf5286.js", "css": ["assets/pages/preview/index.svelte-c51049a9.css", "assets/Spinner-3d7d3e40.css"], "js": ["pages/preview/index.svelte-19cf5286.js", "chunks/vendor-5bc0e481.js", "chunks/Spinner-2cdf84f5.js"], "styles": [] } };
async function load_component(file) {
  const { entry, css: css2, js, styles } = metadata_lookup[file];
  return {
    module: await module_lookup[file](),
    entry: assets + "/_app/" + entry,
    css: css2.map((dep) => assets + "/_app/" + dep),
    js: js.map((dep) => assets + "/_app/" + dep),
    styles
  };
}
function render(request, {
  prerender: prerender2
} = {}) {
  const host = request.headers["host"];
  return respond({ ...request, host }, options, { prerender: prerender2 });
}
function randomInt(min = 0, max = 100) {
  return Math.floor(Math.random() * (max - min)) + min;
}
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffleArray(arr) {
  return arr.sort((a, b) => 0.5 - Math.random());
}
function randomColor(colors = false) {
  if (colors === false) {
    colors = [
      "#a546ff",
      "#78FFA8",
      "#FF7E6A"
    ];
  }
  return randomItem(colors);
}
function randomVideo() {
  return randomItem([
    "alert.mp4",
    "circle.mp4",
    "eclectic.mp4",
    "hexagon.mp4",
    "grid.mp4",
    "line.mp4",
    "y.mp4"
  ]);
}
function randomOptions() {
  if (Math.random() < 0.5) {
    return false;
  }
  const type = randomItem([
    "sliders",
    "sliders",
    "video"
  ]);
  switch (type) {
    case "video":
      return {
        type: "video",
        video: randomVideo()
      };
    case "sliders":
      return {
        type: "sliders",
        sliders: defaultFields()
      };
  }
}
function validateField(field, id = void 0) {
  field = {
    ...defaultField(),
    ...field
  };
  if (!("id" in field)) {
    if (id) {
      field.id = id;
    } else {
      field.id = field.label.toLowerCase();
    }
  }
  field.min = 0;
  field.max = 100;
  return field;
}
function validateFields(fields) {
  if (Array.isArray(fields)) {
    return fields.map((field) => validateField(field));
  } else if (Object.prototype.toString.call(fields) === "[object Object]") {
    return Object.entries(fields).map((entry) => validateField(entry[1], entry[0]));
  }
  return [];
}
function defaultField() {
  return {
    label: "Slider",
    type: "slider",
    min: 0,
    max: 100,
    value: randomInt(0, 100),
    width: randomInt(1, 3),
    from: "",
    to: ""
  };
}
function defaultFields() {
  let labels = shuffleArray([
    "Gain",
    "Excess",
    "Path",
    "Control",
    "Level",
    "Depth",
    "Amount",
    "Sigma",
    "Traction",
    "Offset",
    "Detail",
    "Alpha",
    "Semi",
    "Double",
    "Uniqueness",
    "Brightness",
    "Beta",
    "Value",
    "Smooth",
    "Rollover",
    "Size",
    "Connection",
    "Stream",
    "Adjust",
    "X",
    "Y",
    "Z",
    "Space",
    "Opacity",
    "Clearance",
    "Liquidity"
  ]).slice(0, randomInt(1, 4) * 2);
  let fields = [];
  for (const label of labels) {
    fields.push({
      label
    });
  }
  return validateFields(fields);
}
function readFile(fileName) {
  return import_fs.default.readFileSync(import_path.default.resolve("settings/", fileName), "utf-8");
}
async function get({ params }) {
  const file = readFile(`options.yml`);
  let data = import_yaml.default.parse(file);
  const fields = validateFields(data);
  return {
    body: fields
  };
}
var options_json = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  get
});
var css$p = {
  code: ".wrapper.svelte-1vzkq7o{height:2em;width:2em;display:flex;justify-content:center;align-items:center;height:100%}.spinner.svelte-1vzkq7o{height:2em;width:2em;animation:svelte-1vzkq7o-rotate 2s infinite linear}.dot.svelte-1vzkq7o{width:55%;height:55%;display:inline-block;position:absolute;top:0;background-color:#a546ff;border-radius:100%;animation:svelte-1vzkq7o-bounce 2s infinite ease-in-out}@keyframes svelte-1vzkq7o-rotate{100%{transform:rotate(360deg)}}@keyframes svelte-1vzkq7o-bounce{0%,100%{transform:scale(0)}50%{transform:scale(1)}}",
  map: null
};
var duration = 2;
var Spinner = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const range2 = (size, startAt = 0) => [...Array(size).keys()].map((i) => i + startAt);
  $$result.css.add(css$p);
  return `<div class="${"wrapper svelte-1vzkq7o"}"><div class="${"spinner svelte-1vzkq7o"}">${each(range2(2, 0), (version) => `<div class="${"dot svelte-1vzkq7o"}" style="${"animation-delay: " + escape(version === 1 ? `${duration / 2}s` : "0s") + "; bottom: " + escape(version === 1 ? "0" : "") + "; top: " + escape(version === 1 ? "auto" : "") + ";"}"></div>`)}</div>
</div>`;
});
var css$o = {
  code: "header.svelte-1182nsj.svelte-1182nsj{margin:1rem;display:flex;justify-content:space-between;align-items:center}h1.svelte-1182nsj img.svelte-1182nsj{height:2.5rem;width:auto}",
  map: null
};
var _layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$o);
  return `${$$result.head += `<link rel="${"preload"}" href="${"/videos/alert.mp4"}" as="${"video"}" type="${"video/mp4"}" data-svelte="svelte-y15yo9"><link rel="${"preload"}" href="${"/videos/circle.mp4"}" as="${"video"}" type="${"video/mp4"}" data-svelte="svelte-y15yo9"><link rel="${"preload"}" href="${"/videos/eclectic.mp4"}" as="${"video"}" type="${"video/mp4"}" data-svelte="svelte-y15yo9"><link rel="${"preload"}" href="${"/videos/grid.mp4"}" as="${"video"}" type="${"video/mp4"}" data-svelte="svelte-y15yo9"><link rel="${"preload"}" href="${"/videos/hexagon.mp4"}" as="${"video"}" type="${"video/mp4"}" data-svelte="svelte-y15yo9"><link rel="${"preload"}" href="${"/videos/line.mp4"}" as="${"video"}" type="${"video/mp4"}" data-svelte="svelte-y15yo9"><link rel="${"preload"}" href="${"/videos/y.mp4"}" as="${"video"}" type="${"video/mp4"}" data-svelte="svelte-y15yo9"><link rel="${"preconnect"}" href="${"https://fonts.gstatic.com"}" crossorigin data-svelte="svelte-y15yo9"><link href="${"https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;700&display=swap"}" rel="${"stylesheet"}" data-svelte="svelte-y15yo9">`, ""}

<header class="${"svelte-1182nsj"}"><div><h1 class="${"svelte-1182nsj"}"><img src="${"/semi-logo.svg"}" width="${"241"}" height="${"84"}" class="${"svelte-1182nsj"}"></h1></div>
    <div><button>User Guide</button>
        <button>Preview</button></div></header>

${``}

${``}

${slots.default ? slots.default({}) : ``}`;
});
var __layout = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": _layout
});
function load$1({ error: error2, status }) {
  return { props: { error: error2, status } };
}
var Error$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { status } = $$props;
  let { error: error2 } = $$props;
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  if ($$props.error === void 0 && $$bindings.error && error2 !== void 0)
    $$bindings.error(error2);
  return `<h1>${escape(status)}</h1>

<pre>${escape(error2.message)}</pre>



${error2.frame ? `<pre>${escape(error2.frame)}</pre>` : ``}
${error2.stack ? `<pre>${escape(error2.stack)}</pre>` : ``}`;
});
var error = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Error$1,
  load: load$1
});
var css$n = {
  code: '.field.svelte-1vbwk8d.svelte-1vbwk8d.svelte-1vbwk8d{width:100%;padding-top:1rem}.title.svelte-1vbwk8d.svelte-1vbwk8d.svelte-1vbwk8d{display:flex;justify-content:space-between;align-items:top}.title.svelte-1vbwk8d label.svelte-1vbwk8d.svelte-1vbwk8d{font-weight:700}label.svelte-1vbwk8d.svelte-1vbwk8d.svelte-1vbwk8d{white-space:nowrap;text-overflow:ellipsis}.labels.svelte-1vbwk8d.svelte-1vbwk8d.svelte-1vbwk8d{display:flex;justify-content:space-between;white-space:nowrap}.labels.svelte-1vbwk8d label.svelte-1vbwk8d+label.svelte-1vbwk8d{text-align:right}input.svelte-1vbwk8d.svelte-1vbwk8d.svelte-1vbwk8d{-webkit-appearance:none;width:100%;height:0.5rem;margin:0;outline:none;-webkit-transition:0.2s;transition:opacity 0.2s;position:relative;margin:1rem 0}input.svelte-1vbwk8d.svelte-1vbwk8d.svelte-1vbwk8d:after{content:"";position:absolute;top:50%;height:2px;width:100%;background:var(--color1);z-index:-1}input.svelte-1vbwk8d.svelte-1vbwk8d.svelte-1vbwk8d::-webkit-slider-thumb{-webkit-appearance:none;border-radius:2rem;appearance:none;width:3rem;height:3rem;background:#78FFA8;background:radial-gradient(50% 50% at 50% 50%, #78FFA8 10%, rgba(120, 255, 168, 0.6) 30%, rgba(120, 255, 168, 0) 100%);cursor:pointer}input.svelte-1vbwk8d.svelte-1vbwk8d.svelte-1vbwk8d::-moz-range-thumb{width:3rem;height:3rem;border-radius:2rem;background:#78FFA8;background:radial-gradient(50% 50% at 50% 50%, #78FFA8 10%, rgba(120, 255, 168, 0.6) 30%, rgba(120, 255, 168, 0) 100%);cursor:pointer}',
  map: null
};
var Slider = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { id } = $$props;
  let { label = "Slider" } = $$props;
  let { min = 0 } = $$props;
  let { max = 100 } = $$props;
  let { value = 0 } = $$props;
  let { from = "From" } = $$props;
  let { to = "To" } = $$props;
  let { options: options2 = randomOptions() } = $$props;
  let element;
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  if ($$props.min === void 0 && $$bindings.min && min !== void 0)
    $$bindings.min(min);
  if ($$props.max === void 0 && $$bindings.max && max !== void 0)
    $$bindings.max(max);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.from === void 0 && $$bindings.from && from !== void 0)
    $$bindings.from(from);
  if ($$props.to === void 0 && $$bindings.to && to !== void 0)
    $$bindings.to(to);
  if ($$props.options === void 0 && $$bindings.options && options2 !== void 0)
    $$bindings.options(options2);
  $$result.css.add(css$n);
  return `<div class="${"field svelte-1vbwk8d"}"><div class="${"title svelte-1vbwk8d"}"><label${add_attribute("for", id, 0)} class="${"svelte-1vbwk8d"}">${escape(label)}</label>
        ${options2 !== false ? `<button>${`+`}</button>` : ``}</div>

    <input${add_attribute("id", id, 0)} type="${"range"}"${add_attribute("min", min, 0)}${add_attribute("max", max, 0)}${add_attribute("value", value, 0)} step="${"0.1"}" class="${"svelte-1vbwk8d"}"${add_attribute("this", element, 0)}>

    <div class="${"labels svelte-1vbwk8d"}"><label class="${"svelte-1vbwk8d"}">${escape(from)}</label>
        <label class="${"svelte-1vbwk8d"}">${escape(to)}</label></div>

    ${``}

</div>`;
});
var Group = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { options: options2 = [] } = $$props;
  if ($$props.options === void 0 && $$bindings.options && options2 !== void 0)
    $$bindings.options(options2);
  return `<section class="${"grid"}">${each(options2, (option) => `<div class="${"col-" + escape(option.width)}">${validate_component(Slider, "Slider").$$render($$result, Object.assign(option), {}, {})}
        </div>`)}

</section>`;
});
var css$m = {
  code: "main.svelte-zpwf0f{margin-bottom:2rem}",
  map: null
};
var prerender$2 = true;
var ssr$2 = true;
async function load({ page, fetch: fetch2, session, context }) {
  const res = await fetch2("options.json");
  if (res.ok) {
    return { props: { options: await res.json() } };
  }
}
var Routes = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { options: options2 = [] } = $$props;
  if ($$props.options === void 0 && $$bindings.options && options2 !== void 0)
    $$bindings.options(options2);
  $$result.css.add(css$m);
  return `<main class="${"svelte-zpwf0f"}">${validate_component(Group, "Group").$$render($$result, { options: options2 }, {}, {})}
</main>`;
});
var index$2 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Routes,
  prerender: prerender$2,
  ssr: ssr$2,
  load
});
var _layout_reset$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${$$result.head += `<link rel="${"preconnect"}" href="${"https://fonts.googleapis.com"}" data-svelte="svelte-16yv687"><link rel="${"preconnect"}" href="${"https://fonts.gstatic.com"}" crossorigin data-svelte="svelte-16yv687"><link href="${"https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;700&display=swap"}" rel="${"stylesheet"}" data-svelte="svelte-16yv687">`, ""}

${slots.default ? slots.default({}) : ``}`;
});
var __layout_reset$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": _layout_reset$1
});
var css$l = {
  code: ".circle.svelte-yt8dah{height:var(--size);width:var(--size);border-color:var(--color) transparent var(--color) var(--color);border-width:calc(var(--size) / 15);border-style:solid;border-image:initial;border-radius:50%;animation:var(--duration) linear 0s infinite normal none running svelte-yt8dah-rotate}@keyframes svelte-yt8dah-rotate{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}",
  map: null
};
var Circle = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "0.75s" } = $$props;
  let { size = "60" } = $$props;
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$l);
  return `<div class="${"circle svelte-yt8dah"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color) + "; --duration: " + escape(duration2)}"></div>`;
});
var css$k = {
  code: '.circle.svelte-tzmkx0{width:var(--size);height:var(--size);box-sizing:border-box;position:relative;border:3px solid transparent;border-top-color:var(--colorOuter);border-radius:50%;animation:svelte-tzmkx0-circleSpin var(--durationOuter) linear infinite}.circle.svelte-tzmkx0:before,.circle.svelte-tzmkx0:after{content:"";box-sizing:border-box;position:absolute;border:3px solid transparent;border-radius:50%}.circle.svelte-tzmkx0:after{border-top-color:var(--colorInner);top:9px;left:9px;right:9px;bottom:9px;animation:svelte-tzmkx0-circleSpin var(--durationInner) linear infinite}.circle.svelte-tzmkx0:before{border-top-color:var(--colorCenter);top:3px;left:3px;right:3px;bottom:3px;animation:svelte-tzmkx0-circleSpin var(--durationCenter) linear infinite}@keyframes svelte-tzmkx0-circleSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',
  map: null
};
var Circle2 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { size = "60" } = $$props;
  let { unit = "px" } = $$props;
  let { colorOuter = "#FF3E00" } = $$props;
  let { colorCenter = "#40B3FF" } = $$props;
  let { colorInner = "#676778" } = $$props;
  let { durationMultiplier = 1 } = $$props;
  let { durationOuter = `${durationMultiplier * 2}s` } = $$props;
  let { durationInner = `${durationMultiplier * 1.5}s` } = $$props;
  let { durationCenter = `${durationMultiplier * 3}s` } = $$props;
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.colorOuter === void 0 && $$bindings.colorOuter && colorOuter !== void 0)
    $$bindings.colorOuter(colorOuter);
  if ($$props.colorCenter === void 0 && $$bindings.colorCenter && colorCenter !== void 0)
    $$bindings.colorCenter(colorCenter);
  if ($$props.colorInner === void 0 && $$bindings.colorInner && colorInner !== void 0)
    $$bindings.colorInner(colorInner);
  if ($$props.durationMultiplier === void 0 && $$bindings.durationMultiplier && durationMultiplier !== void 0)
    $$bindings.durationMultiplier(durationMultiplier);
  if ($$props.durationOuter === void 0 && $$bindings.durationOuter && durationOuter !== void 0)
    $$bindings.durationOuter(durationOuter);
  if ($$props.durationInner === void 0 && $$bindings.durationInner && durationInner !== void 0)
    $$bindings.durationInner(durationInner);
  if ($$props.durationCenter === void 0 && $$bindings.durationCenter && durationCenter !== void 0)
    $$bindings.durationCenter(durationCenter);
  $$result.css.add(css$k);
  return `<div class="${"circle svelte-tzmkx0"}" style="${"--size: " + escape(size) + escape(unit) + "; --colorInner: " + escape(colorInner) + "; --colorCenter: " + escape(colorCenter) + "; --colorOuter: " + escape(colorOuter) + "; --durationInner: " + escape(durationInner) + "; --durationCenter: " + escape(durationCenter) + "; --durationOuter: " + escape(durationOuter) + ";"}"></div>`;
});
var css$j = {
  code: ".wrapper.svelte-1ff8xh7{width:var(--size);height:var(--size);display:flex;justify-content:center;align-items:center;line-height:0;box-sizing:border-box}.inner.svelte-1ff8xh7{transform:scale(calc(var(--floatSize) / 52))}.ball-container.svelte-1ff8xh7{animation:svelte-1ff8xh7-ballTwo var(--duration) infinite;width:44px;height:44px;flex-shrink:0;position:relative}.single-ball.svelte-1ff8xh7{width:44px;height:44px;position:absolute}.ball.svelte-1ff8xh7{width:20px;height:20px;border-radius:50%;position:absolute;animation:svelte-1ff8xh7-ballOne var(--duration) infinite ease}.ball-top-left.svelte-1ff8xh7{background-color:var(--ballTopLeftColor);top:0;left:0}.ball-top-right.svelte-1ff8xh7{background-color:var(--ballTopRightColor);top:0;left:24px}.ball-bottom-left.svelte-1ff8xh7{background-color:var(--ballBottomLeftColor);top:24px;left:0}.ball-bottom-right.svelte-1ff8xh7{background-color:var(--ballBottomRightColor);top:24px;left:24px}@keyframes svelte-1ff8xh7-ballOne{0%{position:absolute}50%{top:12px;left:12px;position:absolute;opacity:0.5}100%{position:absolute}}@keyframes svelte-1ff8xh7-ballTwo{0%{transform:rotate(0deg) scale(1)}50%{transform:rotate(360deg) scale(1.3)}100%{transform:rotate(720deg) scale(1)}}",
  map: null
};
var Circle3 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { size = "60" } = $$props;
  let { unit = "px" } = $$props;
  let { ballTopLeft = "#FF3E00" } = $$props;
  let { ballTopRight = "#F8B334" } = $$props;
  let { ballBottomLeft = "#40B3FF" } = $$props;
  let { ballBottomRight = "#676778" } = $$props;
  let { duration: duration2 = "1.5s" } = $$props;
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.ballTopLeft === void 0 && $$bindings.ballTopLeft && ballTopLeft !== void 0)
    $$bindings.ballTopLeft(ballTopLeft);
  if ($$props.ballTopRight === void 0 && $$bindings.ballTopRight && ballTopRight !== void 0)
    $$bindings.ballTopRight(ballTopRight);
  if ($$props.ballBottomLeft === void 0 && $$bindings.ballBottomLeft && ballBottomLeft !== void 0)
    $$bindings.ballBottomLeft(ballBottomLeft);
  if ($$props.ballBottomRight === void 0 && $$bindings.ballBottomRight && ballBottomRight !== void 0)
    $$bindings.ballBottomRight(ballBottomRight);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  $$result.css.add(css$j);
  return `<div class="${"wrapper svelte-1ff8xh7"}" style="${"--size: " + escape(size) + escape(unit) + "; --floatSize: " + escape(size) + "; --ballTopLeftColor: " + escape(ballTopLeft) + "; --ballTopRightColor: " + escape(ballTopRight) + "; --ballBottomLeftColor: " + escape(ballBottomLeft) + "; --ballBottomRightColor: " + escape(ballBottomRight) + "; --duration: " + escape(duration2) + ";"}"><div class="${"inner svelte-1ff8xh7"}"><div class="${"ball-container svelte-1ff8xh7"}"><div class="${"single-ball svelte-1ff8xh7"}"><div class="${"ball ball-top-left svelte-1ff8xh7"}">\xA0</div></div>
      <div class="${"contener_mixte"}"><div class="${"ball ball-top-right svelte-1ff8xh7"}">\xA0</div></div>
      <div class="${"contener_mixte"}"><div class="${"ball ball-bottom-left svelte-1ff8xh7"}">\xA0</div></div>
      <div class="${"contener_mixte"}"><div class="${"ball ball-bottom-right svelte-1ff8xh7"}">\xA0</div></div></div></div></div>`;
});
var durationUnitRegex = /[a-zA-Z]/;
var calculateRgba = (color, opacity) => {
  if (color[0] === "#") {
    color = color.slice(1);
  }
  if (color.length === 3) {
    let res = "";
    color.split("").forEach((c) => {
      res += c;
      res += c;
    });
    color = res;
  }
  const rgbValues = (color.match(/.{2}/g) || []).map((hex) => parseInt(hex, 16)).join(", ");
  return `rgba(${rgbValues}, ${opacity})`;
};
var range = (size, startAt = 0) => [...Array(size).keys()].map((i) => i + startAt);
var css$i = {
  code: ".wrapper.svelte-xjh60g{position:relative;width:var(--size);height:var(--size)}.circle.svelte-xjh60g{position:absolute;width:var(--size);height:var(--size);background-color:var(--color);border-radius:100%;opacity:0.6;top:0;left:0;animation-fill-mode:both;animation-name:svelte-xjh60g-bounce !important}@keyframes svelte-xjh60g-bounce{0%,100%{transform:scale(0)}50%{transform:scale(1)}}",
  map: null
};
var DoubleBounce = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "2.1s" } = $$props;
  let { size = "60" } = $$props;
  let durationUnit = duration2.match(durationUnitRegex)[0];
  let durationNum = duration2.replace(durationUnitRegex, "");
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$i);
  return `<div class="${"wrapper svelte-xjh60g"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color)}">${each(range(2, 1), (version) => `<div class="${"circle svelte-xjh60g"}" style="${"animation: " + escape(duration2) + " " + escape(version === 1 ? `${(durationNum - 0.1) / 2}${durationUnit}` : `0s`) + " infinite ease-in-out"}"></div>`)}</div>`;
});
var css$h = {
  code: ".wrapper.svelte-a7tuar{width:var(--size);height:var(--size)}.circle.svelte-a7tuar{width:var(--size);height:var(--size);background-color:var(--color);animation-duration:var(--duration);border-radius:100%;display:inline-block;animation:svelte-a7tuar-scaleOut var(--duration) ease-in-out infinite}@keyframes svelte-a7tuar-scaleOut{0%{transform:scale(0)}100%{transform:scale(1);opacity:0}}",
  map: null
};
var ScaleOut = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "1s" } = $$props;
  let { size = "60" } = $$props;
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$h);
  return `<div class="${"wrapper svelte-a7tuar"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color) + "; --duration: " + escape(duration2) + "; --duration: " + escape(duration2) + ";"}"><div class="${"circle svelte-a7tuar"}"></div></div>`;
});
var css$g = {
  code: ".wrapper.svelte-1qc5fx2{width:var(--size);height:var(--stroke);transform:scale(calc(var(--floatSize) / 75));display:flex;justify-content:center;align-items:center}.line.svelte-1qc5fx2{width:var(--size);height:var(--stroke);background:var(--color);border-radius:var(--stroke);transform-origin:center center;animation:svelte-1qc5fx2-spineLine var(--duration) ease infinite}@keyframes svelte-1qc5fx2-spineLine{0%{transform:rotate(-20deg);height:5px;width:75px}5%{height:5px;width:75px}30%{transform:rotate(380deg);height:5px;width:75px}40%{transform:rotate(360deg);height:5px;width:75px}55%{transform:rotate(0deg);height:5px;width:5px}65%{transform:rotate(0deg);height:5px;width:85px}68%{transform:rotate(0deg);height:5px}75%{transform:rotate(0deg);height:5px;width:1px}78%{height:5px;width:5px}90%{height:5px;width:75px;transform:rotate(0deg)}99%,100%{height:5px;width:75px;transform:rotate(-20deg)}}",
  map: null
};
var SpinLine = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "4s" } = $$props;
  let { size = "60" } = $$props;
  let { stroke = +size / 12 + unit } = $$props;
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.stroke === void 0 && $$bindings.stroke && stroke !== void 0)
    $$bindings.stroke(stroke);
  $$result.css.add(css$g);
  return `<div class="${"wrapper svelte-1qc5fx2"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color) + "; --stroke: " + escape(stroke) + "; --floatSize: " + escape(size) + "; --duration: " + escape(duration2)}"><div class="${"line svelte-1qc5fx2"}"></div></div>`;
});
var css$f = {
  code: ".wrapper.svelte-1yhd21p{height:var(--size);width:var(--size);display:inline-block;text-align:center;font-size:10px}.rect.svelte-1yhd21p{height:100%;width:10%;display:inline-block;margin-right:4px;background-color:var(--color);animation:svelte-1yhd21p-stretch var(--duration) ease-in-out infinite}@keyframes svelte-1yhd21p-stretch{0%,40%,100%{transform:scaleY(0.4)}20%{transform:scaleY(1)}}",
  map: null
};
var Stretch = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "1.2s" } = $$props;
  let { size = "60" } = $$props;
  let durationUnit = duration2.match(durationUnitRegex)[0];
  let durationNum = duration2.replace(durationUnitRegex, "");
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$f);
  return `<div class="${"wrapper svelte-1yhd21p"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color) + "; --duration: " + escape(duration2)}">${each(range(5, 1), (version) => `<div class="${"rect svelte-1yhd21p"}" style="${"animation-delay: " + escape((version - 1) * (+durationNum / 12)) + escape(durationUnit)}"></div>`)}</div>`;
});
var css$e = {
  code: ".wrapper.svelte-1hlc9oa{height:calc(var(--size) / 15);width:calc(var(--size) * 2);background-color:var(--rgba);position:relative;overflow:hidden;background-clip:padding-box}.lines.svelte-1hlc9oa{height:calc(var(--size) / 15);background-color:var(--color)}.small-lines.svelte-1hlc9oa{position:absolute;overflow:hidden;background-clip:padding-box;display:block;border-radius:2px;will-change:left, right;animation-fill-mode:forwards}.small-lines.\\31 .svelte-1hlc9oa{animation:var(--duration) cubic-bezier(0.65, 0.815, 0.735, 0.395) 0s infinite normal none running svelte-1hlc9oa-long}.small-lines.\\32 .svelte-1hlc9oa{animation:var(--duration) cubic-bezier(0.165, 0.84, 0.44, 1) calc((var(--duration) + 0.1) / 2) infinite normal none running svelte-1hlc9oa-short}@keyframes svelte-1hlc9oa-long{0%{left:-35%;right:100%}60%{left:100%;right:-90%}100%{left:100%;right:-90%}}@keyframes svelte-1hlc9oa-short{0%{left:-200%;right:100%}60%{left:107%;right:-8%}100%{left:107%;right:-8%}}",
  map: null
};
var BarLoader = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "2.1s" } = $$props;
  let { size = "60" } = $$props;
  let rgba;
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$e);
  rgba = calculateRgba(color, 0.2);
  return `<div class="${"wrapper svelte-1hlc9oa"}" style="${"--size: " + escape(size) + escape(unit) + "; --rgba:" + escape(rgba)}">${each(range(2, 1), (version) => `<div class="${"lines small-lines " + escape(version) + " svelte-1hlc9oa"}" style="${"--color: " + escape(color) + "; --duration: " + escape(duration2) + ";"}"></div>`)}</div>`;
});
var css$d = {
  code: ".wrapper.svelte-1s3v4dp{width:var(--size);height:var(--size)}.circle.svelte-1s3v4dp{border-radius:100%;animation-fill-mode:both;position:absolute;opacity:0;width:var(--size);height:var(--size);background-color:var(--color);animation:svelte-1s3v4dp-bounce var(--duration) linear infinite}@keyframes svelte-1s3v4dp-bounce{0%{opacity:0;transform:scale(0)}5%{opacity:1}100%{opacity:0;transform:scale(1)}}",
  map: null
};
var Jumper = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "1s" } = $$props;
  let { size = "60" } = $$props;
  let durationUnit = duration2.match(durationUnitRegex)[0];
  let durationNum = duration2.replace(durationUnitRegex, "");
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$d);
  return `<div class="${"wrapper svelte-1s3v4dp"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color) + "; --duration: " + escape(duration2) + ";"}">${each(range(3, 1), (version) => `<div class="${"circle svelte-1s3v4dp"}" style="${"animation-delay: " + escape(durationNum / 3 * (version - 1) + durationUnit) + ";"}"></div>`)}</div>`;
});
var css$c = {
  code: ".wrapper.svelte-165wjfg{position:relative;width:var(--size);height:var(--size)}.border.svelte-165wjfg{border-color:var(--color);position:absolute;top:0px;left:0px;width:var(--size);height:var(--size);opacity:0.4;perspective:800px;border-width:6px;border-style:solid;border-image:initial;border-radius:100%}.border.\\31 .svelte-165wjfg{animation:var(--duration) linear 0s infinite normal none running svelte-165wjfg-ringOne}.border.\\32 .svelte-165wjfg{animation:var(--duration) linear 0s infinite normal none running svelte-165wjfg-ringTwo}@keyframes svelte-165wjfg-ringOne{0%{transform:rotateX(0deg) rotateY(0deg) rotateZ(0deg)}100%{transform:rotateX(360deg) rotateY(180deg) rotateZ(360deg)}}@keyframes svelte-165wjfg-ringTwo{0%{transform:rotateX(0deg) rotateY(0deg) rotateZ(0deg)}100%{transform:rotateX(180deg) rotateY(360deg) rotateZ(360deg)}}",
  map: null
};
var RingLoader = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "2s" } = $$props;
  let { size = "60" } = $$props;
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$c);
  return `<div class="${"wrapper svelte-165wjfg"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color) + "; --duration: " + escape(duration2) + ";"}">${each(range(2, 1), (version) => `<div class="${"border " + escape(version) + " svelte-165wjfg"}"></div>`)}</div>`;
});
var css$b = {
  code: ".wrapper.svelte-1tlfjt3{height:var(--size);width:var(--size);display:flex;align-items:center;justify-content:center}.dot.svelte-1tlfjt3{height:var(--dotSize);width:var(--dotSize);background-color:var(--color);margin:2px;display:inline-block;border-radius:100%;animation:svelte-1tlfjt3-sync var(--duration) ease-in-out infinite alternate both running}@-webkit-keyframes svelte-1tlfjt3-sync{33%{-webkit-transform:translateY(10px);transform:translateY(10px)}66%{-webkit-transform:translateY(-10px);transform:translateY(-10px)}100%{-webkit-transform:translateY(0);transform:translateY(0)}}@keyframes svelte-1tlfjt3-sync{33%{-webkit-transform:translateY(10px);transform:translateY(10px)}66%{-webkit-transform:translateY(-10px);transform:translateY(-10px)}100%{-webkit-transform:translateY(0);transform:translateY(0)}}",
  map: null
};
var SyncLoader = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "0.6s" } = $$props;
  let { size = "60" } = $$props;
  let durationUnit = duration2.match(durationUnitRegex)[0];
  let durationNum = duration2.replace(durationUnitRegex, "");
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$b);
  return `<div class="${"wrapper svelte-1tlfjt3"}" style="${"--size:" + escape(size) + escape(unit) + "; --duration: " + escape(duration2) + ";"}">${each(range(3, 1), (i) => `<div class="${"dot svelte-1tlfjt3"}" style="${"--dotSize:" + escape(+size * 0.25) + escape(unit) + "; --color:" + escape(color) + "; animation-delay: " + escape(i * (+durationNum / 10)) + escape(durationUnit) + ";"}"></div>`)}</div>`;
});
var css$a = {
  code: ".wrapper.svelte-1uwgqip{width:var(--size);height:calc(var(--size) / 2);overflow:hidden}.rainbow.svelte-1uwgqip{width:var(--size);height:var(--size);border-left-color:transparent;border-bottom-color:transparent;border-top-color:var(--color);border-right-color:var(--color);box-sizing:border-box;transform:rotate(-200deg);border-radius:50%;border-style:solid;animation:var(--duration) ease-in-out 0s infinite normal none running svelte-1uwgqip-rotate}@keyframes svelte-1uwgqip-rotate{0%{border-width:10px}25%{border-width:3px}50%{transform:rotate(115deg);border-width:10px}75%{border-width:3px}100%{border-width:10px}}",
  map: null
};
var Rainbow = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "3s" } = $$props;
  let { size = "60" } = $$props;
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$a);
  return `<div class="${"wrapper svelte-1uwgqip"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color) + "; --duration: " + escape(duration2) + ";"}"><div class="${"rainbow svelte-1uwgqip"}"></div></div>`;
});
var css$9 = {
  code: ".wrapper.svelte-19g9d98{position:relative;display:flex;justify-content:center;align-items:center;width:calc(var(--size) * 2.5);height:var(--size);overflow:hidden}.bar.svelte-19g9d98{position:absolute;top:calc(var(--size) / 10);width:calc(var(--size) / 5);height:calc(var(--size) / 10);margin-top:calc(var(--size) - var(--size) / 10);transform:skewY(0deg);background-color:var(--color);animation:svelte-19g9d98-motion var(--duration) ease-in-out infinite}@keyframes svelte-19g9d98-motion{25%{transform:skewY(25deg)}50%{height:100%;margin-top:0}75%{transform:skewY(-25deg)}}",
  map: null
};
var Wave = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "1.25s" } = $$props;
  let { size = "60" } = $$props;
  let durationUnit = duration2.match(durationUnitRegex)[0];
  let durationNum = duration2.replace(durationUnitRegex, "");
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$9);
  return `<div class="${"wrapper svelte-19g9d98"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color) + "; --duration: " + escape(duration2) + ";"}">${each(range(10, 0), (version) => `<div class="${"bar svelte-19g9d98"}" style="${"left: " + escape(version * (+size / 5 + (+size / 15 - +size / 100)) + unit) + "; animation-delay: " + escape(version * (+durationNum / 8.3)) + escape(durationUnit) + ";"}"></div>`)}</div>`;
});
var css$8 = {
  code: ".wrapper.svelte-ig2x43{width:calc(var(--size) * 1.3);height:calc(var(--size) * 1.3);display:flex;justify-content:center;align-items:center}.firework.svelte-ig2x43{border:calc(var(--size) / 10) dotted var(--color);width:var(--size);height:var(--size);border-radius:50%;animation:svelte-ig2x43-fire var(--duration) cubic-bezier(0.165, 0.84, 0.44, 1) infinite}@keyframes svelte-ig2x43-fire{0%{opacity:1;transform:scale(0.1)}25%{opacity:0.85}100%{transform:scale(1);opacity:0}}",
  map: null
};
var Firework = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "1.25s" } = $$props;
  let { size = "60" } = $$props;
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$8);
  return `<div class="${"wrapper svelte-ig2x43"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color) + "; --duration: " + escape(duration2) + ";"}"><div class="${"firework svelte-ig2x43"}"></div></div>`;
});
var css$7 = {
  code: ".wrapper.svelte-12aog78{position:relative;display:flex;justify-content:center;align-items:center;width:var(--size);height:calc(var(--size) / 2.5)}.cube.svelte-12aog78{position:absolute;top:0px;width:calc(var(--size) / 5);height:calc(var(--size) / 2.5);background-color:var(--color);animation:svelte-12aog78-motion var(--duration) cubic-bezier(0.895, 0.03, 0.685, 0.22) infinite}@keyframes svelte-12aog78-motion{0%{opacity:1}50%{opacity:0}100%{opacity:1}}",
  map: null
};
var Pulse = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "1.5s" } = $$props;
  let { size = "60" } = $$props;
  let durationUnit = duration2.match(durationUnitRegex)[0];
  let durationNum = duration2.replace(durationUnitRegex, "");
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$7);
  return `<div class="${"wrapper svelte-12aog78"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color) + "; --duration: " + escape(duration2)}">${each(range(3, 0), (version) => `<div class="${"cube svelte-12aog78"}" style="${"animation-delay: " + escape(version * (+durationNum / 10)) + escape(durationUnit) + "; left: " + escape(version * (+size / 3 + +size / 15) + unit) + ";"}"></div>`)}</div>`;
});
var css$6 = {
  code: ".wrapper.svelte-ny4e18{position:relative;display:flex;justify-content:center;align-items:center;width:var(--size);height:var(--size)}.ring.svelte-ny4e18{position:absolute;border:2px solid var(--color);border-radius:50%;background-color:transparent;animation:svelte-ny4e18-motion var(--duration) ease infinite}@keyframes svelte-ny4e18-motion{0%{transform:translateY(var(--motionOne))}50%{transform:translateY(var(--motionTwo))}100%{transform:translateY(var(--motionThree))}}",
  map: null
};
var Jellyfish = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "2.5s" } = $$props;
  let { size = "60" } = $$props;
  let durationUnit = duration2.match(durationUnitRegex)[0];
  let durationNum = duration2.replace(durationUnitRegex, "");
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$6);
  return `<div class="${"wrapper svelte-ny4e18"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color) + "; --motionOne: " + escape(-size / 5) + escape(unit) + "; --motionTwo: " + escape(+size / 4) + escape(unit) + "; --motionThree: " + escape(-size / 5) + escape(unit) + "; --duration: " + escape(duration2) + ";"}">${each(range(6, 0), (version) => `<div class="${"ring svelte-ny4e18"}" style="${"animation-delay: " + escape(version * (durationNum / 25)) + escape(durationUnit) + "; width: " + escape(version * (+size / 6) + unit) + "; height: " + escape(version * (+size / 6) / 2 + unit) + ";"}"></div>`)}</div>`;
});
var css$5 = {
  code: ".wrapper.svelte-sdtow4{height:var(--size);width:var(--size);display:flex;justify-content:center;align-items:center}.spinner.svelte-sdtow4{height:var(--size);width:var(--size);animation:svelte-sdtow4-rotate var(--duration) infinite linear}.dot.svelte-sdtow4{width:60%;height:60%;display:inline-block;position:absolute;top:0;background-color:var(--color);border-radius:100%;animation:svelte-sdtow4-bounce var(--duration) infinite ease-in-out}@keyframes svelte-sdtow4-rotate{100%{transform:rotate(360deg)}}@keyframes svelte-sdtow4-bounce{0%,100%{transform:scale(0)}50%{transform:scale(1)}}",
  map: null
};
var Chasing = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "2s" } = $$props;
  let { size = "60" } = $$props;
  let durationUnit = duration2.match(durationUnitRegex)[0];
  let durationNum = duration2.replace(durationUnitRegex, "");
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$5);
  return `<div class="${"wrapper svelte-sdtow4"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color) + "; --duration: " + escape(duration2) + ";"}"><div class="${"spinner svelte-sdtow4"}">${each(range(2, 0), (version) => `<div class="${"dot svelte-sdtow4"}" style="${"animation-delay: " + escape(version === 1 ? `${durationNum / 2}${durationUnit}` : "0s") + "; bottom: " + escape(version === 1 ? "0" : "") + "; top: " + escape(version === 1 ? "auto" : "") + ";"}"></div>`)}</div></div>`;
});
var css$4 = {
  code: ".wrapper.svelte-a6rt3q{position:relative;display:flex;justify-content:center;align-items:center;width:var(--size);height:var(--size)}.shadow.svelte-a6rt3q{color:var(--color);font-size:var(--size);overflow:hidden;width:var(--size);height:var(--size);border-radius:50%;margin:28px auto;position:relative;transform:translateZ(0);animation:svelte-a6rt3q-load var(--duration) infinite ease, svelte-a6rt3q-round var(--duration) infinite ease}@keyframes svelte-a6rt3q-load{0%{box-shadow:0 -0.83em 0 -0.4em, 0 -0.83em 0 -0.42em, 0 -0.83em 0 -0.44em, 0 -0.83em 0 -0.46em, 0 -0.83em 0 -0.477em}5%,95%{box-shadow:0 -0.83em 0 -0.4em, 0 -0.83em 0 -0.42em, 0 -0.83em 0 -0.44em, 0 -0.83em 0 -0.46em, 0 -0.83em 0 -0.477em}10%,59%{box-shadow:0 -0.83em 0 -0.4em, -0.087em -0.825em 0 -0.42em, -0.173em -0.812em 0 -0.44em, -0.256em -0.789em 0 -0.46em, -0.297em -0.775em 0 -0.477em}20%{box-shadow:0 -0.83em 0 -0.4em, -0.338em -0.758em 0 -0.42em, -0.555em -0.617em 0 -0.44em, -0.671em -0.488em 0 -0.46em, -0.749em -0.34em 0 -0.477em}38%{box-shadow:0 -0.83em 0 -0.4em, -0.377em -0.74em 0 -0.42em, -0.645em -0.522em 0 -0.44em, -0.775em -0.297em 0 -0.46em, -0.82em -0.09em 0 -0.477em}100%{box-shadow:0 -0.83em 0 -0.4em, 0 -0.83em 0 -0.42em, 0 -0.83em 0 -0.44em, 0 -0.83em 0 -0.46em, 0 -0.83em 0 -0.477em}}@keyframes svelte-a6rt3q-round{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}",
  map: null
};
var Shadow = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "1.7s" } = $$props;
  let { size = "60" } = $$props;
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$4);
  return `<div class="${"wrapper svelte-a6rt3q"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color) + "; --duration: " + escape(duration2) + ";"}"><div class="${"shadow svelte-a6rt3q"}"></div></div>`;
});
var css$3 = {
  code: ".square.svelte-ybl8u5{height:var(--size);width:var(--size);background-color:var(--color);animation:svelte-ybl8u5-squareDelay var(--duration) 0s infinite cubic-bezier(0.09, 0.57, 0.49, 0.9);animation-fill-mode:both;perspective:100px;display:inline-block}@keyframes svelte-ybl8u5-squareDelay{25%{-webkit-transform:rotateX(180deg) rotateY(0);transform:rotateX(180deg) rotateY(0)}50%{-webkit-transform:rotateX(180deg) rotateY(180deg);transform:rotateX(180deg) rotateY(180deg)}75%{-webkit-transform:rotateX(0) rotateY(180deg);transform:rotateX(0) rotateY(180deg)}100%{-webkit-transform:rotateX(0) rotateY(0);transform:rotateX(0) rotateY(0)}}",
  map: null
};
var Square = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "3s" } = $$props;
  let { size = "60" } = $$props;
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$3);
  return `<div class="${"square svelte-ybl8u5"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color) + "; --duration: " + escape(duration2) + ";"}"></div>`;
});
var css$2 = {
  code: ".wrapper.svelte-1jhc57e{height:var(--size);width:var(--size);border-radius:100%;animation:svelte-1jhc57e-moonStretchDelay var(--duration) 0s infinite linear;animation-fill-mode:forwards;position:relative}.circle-one.svelte-1jhc57e{top:var(--moonSize);background-color:var(--color);width:calc(var(--size) / 7);height:calc(var(--size) / 7);border-radius:100%;animation:svelte-1jhc57e-moonStretchDelay var(--duration) 0s infinite linear;animation-fill-mode:forwards;opacity:0.8;position:absolute}.circle-two.svelte-1jhc57e{opacity:0.1;border:calc(var(--size) / 7) solid var(--color);height:var(--size);width:var(--size);border-radius:100%;box-sizing:border-box}@keyframes svelte-1jhc57e-moonStretchDelay{100%{transform:rotate(360deg)}}",
  map: null
};
var Moon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { color = "#FF3E00" } = $$props;
  let { unit = "px" } = $$props;
  let { duration: duration2 = "0.6s" } = $$props;
  let { size = "60" } = $$props;
  let moonSize = +size / 7;
  let top = +size / 2 - moonSize / 2;
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.duration === void 0 && $$bindings.duration && duration2 !== void 0)
    $$bindings.duration(duration2);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  $$result.css.add(css$2);
  return `<div class="${"wrapper svelte-1jhc57e"}" style="${"--size: " + escape(size) + escape(unit) + "; --color: " + escape(color) + "; --moonSize: " + escape(top) + escape(unit) + "; --duration: " + escape(duration2) + ";"}"><div class="${"circle-one svelte-1jhc57e"}"></div>
  <div class="${"circle-two svelte-1jhc57e"}"></div></div>`;
});
var css$1 = {
  code: ".wrapper.svelte-18zlmr3.svelte-18zlmr3{height:100vh;width:100%;display:flex;flex-direction:column;padding:2rem}header.svelte-18zlmr3.svelte-18zlmr3,main.svelte-18zlmr3.svelte-18zlmr3,footer.svelte-18zlmr3.svelte-18zlmr3{padding:1rem;text-align:center}h1.svelte-18zlmr3 img.svelte-18zlmr3{width:40%;height:auto}footer.svelte-18zlmr3.svelte-18zlmr3{font-size:2rem}main.svelte-18zlmr3.svelte-18zlmr3{flex:1;display:flex;align-items:center;justify-content:center;font-size:4rem}",
  map: null
};
var prerender$1 = true;
var ssr$1 = true;
var Spinners = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let spinners = [
    BarLoader,
    Chasing,
    Circle,
    Circle2,
    Circle3,
    DoubleBounce,
    Firework,
    Jellyfish,
    Jumper,
    Pulse,
    Rainbow,
    RingLoader,
    ScaleOut,
    Shadow,
    SpinLine,
    Stretch,
    SyncLoader,
    Wave,
    Square,
    Moon
  ];
  let Spinner2 = randomItem(spinners);
  let color = randomColor();
  $$result.css.add(css$1);
  return `<div class="${"wrapper svelte-18zlmr3"}"><header class="${"svelte-18zlmr3"}"><h1 class="${"svelte-18zlmr3"}"><img src="${"/semi-logo.svg"}" width="${"241"}" height="${"84"}" class="${"svelte-18zlmr3"}"></h1></header>
    <main class="${"svelte-18zlmr3"}">${validate_component(Spinner2 || missing_component, "svelte:component").$$render($$result, { size: "300", unit: "px", color }, {}, {})}</main>
    <footer class="${"svelte-18zlmr3"}"><h3>Live preview is generating...</h3></footer>
</div>`;
});
var index$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Spinners,
  prerender: prerender$1,
  ssr: ssr$1
});
var _layout_reset = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${slots.default ? slots.default({}) : ``}`;
});
var __layout_reset = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": _layout_reset
});
var css = {
  code: ".wrapper.svelte-remgxx{height:100vh;width:100%;display:flex;flex-direction:column;padding:2rem}header.svelte-remgxx,main.svelte-remgxx,footer.svelte-remgxx{padding:1rem;text-align:center}h1.svelte-remgxx{font-size:8rem}footer.svelte-remgxx{font-size:2rem}main.svelte-remgxx{flex:1;display:flex;align-items:center;justify-content:center;font-size:4rem}",
  map: null
};
var prerender = true;
var ssr = true;
var Preview = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css);
  return `<div class="${"wrapper svelte-remgxx"}"><header class="${"svelte-remgxx"}"><h1 class="${"svelte-remgxx"}">SEMI*</h1></header>
    <main class="${"svelte-remgxx"}">${validate_component(Spinner, "Spinner").$$render($$result, {}, {}, {})}</main>
    <footer class="${"svelte-remgxx"}"><h3>Live preivew is generating</h3></footer>
</div>`;
});
var index = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Preview,
  prerender,
  ssr
});

// .svelte-kit/netlify/entry.js
init();
async function handler(event) {
  const { path: path2, httpMethod, headers, rawQuery, body, isBase64Encoded } = event;
  const query = new URLSearchParams(rawQuery);
  const encoding = isBase64Encoded ? "base64" : headers["content-encoding"] || "utf-8";
  const rawBody = typeof body === "string" ? Buffer.from(body, encoding) : body;
  const rendered = await render({
    method: httpMethod,
    headers,
    path: path2,
    query,
    rawBody
  });
  if (!rendered) {
    return {
      statusCode: 404,
      body: "Not found"
    };
  }
  const partial_response = {
    statusCode: rendered.status,
    ...split_headers(rendered.headers)
  };
  if (typeof rendered.body === "string") {
    return {
      ...partial_response,
      body: rendered.body
    };
  }
  return {
    ...partial_response,
    isBase64Encoded: true,
    body: Buffer.from(rendered.body).toString("base64")
  };
}
function split_headers(headers) {
  const h = {};
  const m = {};
  for (const key in headers) {
    const value = headers[key];
    const target = Array.isArray(value) ? m : h;
    target[key] = value;
  }
  return {
    headers: h,
    multiValueHeaders: m
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
