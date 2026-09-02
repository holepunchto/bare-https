import { TLSSocket, TLSSocketEvents, TLSSocketOptions } from 'bare-tls'
import {
  HTTPAgent,
  HTTPClientRequest,
  HTTPClientRequestOptions,
  HTTPIncomingMessage,
  HTTPServer,
  HTTPServerOptions,
  HTTPServerResponse
} from 'bare-http1'
import { TCPSocket, TCPSocketOptions, TCPSocketConnectOptions, TCPSocketEvents } from 'bare-tcp'

/** The events an `HTTPSSocket` emits: those of both `TLSSocket` and `TCPSocket`. */
export interface HTTPSSocketEvents extends TLSSocketEvents, TCPSocketEvents {}

/**
 * Options for `HTTPSSocket`: those of `TLSSocket` combined with `TCPSocket`'s connection options.
 */
export interface HTTPSSocketOptions
  extends TLSSocketOptions, TCPSocketOptions, TCPSocketConnectOptions {}

/**
 * A `TCPSocket` wrapped in TLS, extending both `TLSSocket` and `TCPSocket`. Used as the transport
 * for HTTPS requests and responses.
 */
interface HTTPSSocket<M extends HTTPSSocketEvents = HTTPSSocketEvents>
  extends TLSSocket<M>, TCPSocket<M> {}

declare class HTTPSSocket<M extends HTTPSSocketEvents = HTTPSSocketEvents> extends TLSSocket<M> {}

export { type HTTPSSocket }

/**
 * An `HTTPAgent` that creates `HTTPSSocket` connections over TLS instead of plain `TCPSocket`
 * connections. Defaults `defaultPort` to `443`.
 */
interface HTTPSAgent extends HTTPAgent {
  /**
   * Creates a new `HTTPSSocket` connection wrapping a plain TCP connection in TLS.
   * @param opts - Options for the underlying TCP connection and its TLS wrapper.
   */
  createConnection(opts?: HTTPSSocketOptions): HTTPSSocket
}

declare class HTTPSAgent extends HTTPAgent {}

declare namespace HTTPSAgent {
  /**
   * The agent's own default instance (created with `keepAlive: 1000` and `timeout: 5000`), used as
   * `bare-https`'s `globalAgent`.
   */
  export const global: HTTPSAgent
}

/** The default `HTTPSAgent` used by `request()` when no `agent` option is given. */
export const globalAgent: HTTPSAgent

export { type HTTPSAgent, HTTPSAgent as Agent }

interface HTTPSServerOptions extends HTTPSSocketOptions, HTTPServerOptions {}

declare class HTTPSServer extends HTTPServer {
  /**
   * @param opts - Server options: TLS socket options (for example `cert`, `key`) plus `bare-http1`
   * server connection options.
   * @param onrequest - Added as a `'request'` listener.
   */
  constructor(
    opts?: HTTPSServerOptions,
    onrequest?: (req: HTTPIncomingMessage, res: HTTPServerResponse) => void
  )

  constructor(onrequest: (req: HTTPIncomingMessage, res: HTTPServerResponse) => void)
}

export { type HTTPSServer, HTTPSServer as Server }

interface HTTPSClientRequestOptions extends HTTPClientRequestOptions {
  agent?: HTTPSAgent | false
}

interface HTTPSClientRequest extends HTTPClientRequest {}

declare class HTTPSClientRequest extends HTTPClientRequest {
  /**
   * @param opts - `bare-http1` client request options; `agent` defaults to `HTTPSAgent.global`, or
   * pass `agent: false` to use a fresh `HTTPSAgent`.
   * @param onresponse - Added as a one-time `'response'` listener.
   */
  constructor(opts?: HTTPSClientRequestOptions, onresponse?: () => void)

  constructor(onresponse: () => void)
}

export { type HTTPSClientRequest, HTTPSClientRequest as ClientRequest }

/**
 * Creates an `HTTPSServer`. If `onrequest` is given, it's added as a `'request'` listener.
 * @param opts - Server options: TLS socket options (for example `cert`, `key`) plus `bare-http1`
 * server connection options.
 * @param onrequest - Added as a `'request'` listener.
 */
export function createServer(
  opts?: HTTPSServerOptions,
  onrequest?: (req: HTTPIncomingMessage, res: HTTPServerResponse) => void
): HTTPSServer

export function createServer(
  onrequest: (req: HTTPIncomingMessage, res: HTTPServerResponse) => void
): HTTPSServer

/**
 * Creates an `HTTPSClientRequest` to `url` (a `URL` or a URL string), using TLS. If `onresponse` is
 * given, it's added as a one-time `'response'` listener. Does not send the request until it's
 * ended.
 * @param url - The URL to request, as a `URL` object or a URL string.
 * @param opts - `bare-http1` client request options; `agent` defaults to `globalAgent`, or pass
 * `agent: false` to use a fresh `HTTPSAgent`.
 * @param onresponse - Added as a one-time `'response'` listener.
 */
export function request(
  url: URL | string,
  opts?: HTTPSClientRequestOptions,
  onresponse?: (res: HTTPIncomingMessage) => void
): HTTPSClientRequest

export function request(
  url: URL | string,
  onresponse: (res: HTTPIncomingMessage) => void
): HTTPSClientRequest

export function request(
  opts: HTTPSClientRequestOptions,
  onresponse?: (res: HTTPIncomingMessage) => void
): HTTPSClientRequest

export function get(
  url: URL | string,
  opts?: HTTPSClientRequestOptions,
  onresponse?: (res: HTTPIncomingMessage) => void
): HTTPSClientRequest

export function get(
  url: URL | string,
  onresponse: (res: HTTPIncomingMessage) => void
): HTTPSClientRequest

export function get(
  opts: HTTPSClientRequestOptions,
  onresponse?: (res: HTTPIncomingMessage) => void
): HTTPSClientRequest
