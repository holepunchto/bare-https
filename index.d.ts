import { TLSSocket, TLSSocketEvents, TLSSocketOptions } from 'bare-tls'
import {
  HTTPAgent,
  HTTPClientRequest,
  HTTPClientRequestOptions,
  HTTPIncomingMessage,
  HTTPServer,
  HTTPServerConnectionOptions,
  HTTPServerResponse
} from 'bare-http1'
import { TCPSocket, TCPSocketOptions, TCPSocketConnectOptions, TCPSocketEvents } from 'bare-tcp'

export interface HTTPSSocketEvents extends TLSSocketEvents, TCPSocketEvents {}

export interface HTTPSSocketOptions
  extends TLSSocketOptions, TCPSocketOptions, TCPSocketConnectOptions {}

interface HTTPSSocket<M extends HTTPSSocketEvents = HTTPSSocketEvents>
  extends TLSSocket<M>, TCPSocket<M> {}

declare class HTTPSSocket<M extends HTTPSSocketEvents = HTTPSSocketEvents> extends TLSSocket<M> {}

export { type HTTPSSocket }

interface HTTPSAgent extends HTTPAgent {
  createConnection(opts?: HTTPSSocketOptions): HTTPSSocket
}

declare class HTTPSAgent extends HTTPAgent {}

declare namespace HTTPSAgent {
  export const global: HTTPSAgent
}

export const globalAgent: HTTPSAgent

export { type HTTPSAgent, HTTPSAgent as Agent }

interface HTTPSServerOptions extends HTTPSSocketOptions, HTTPServerConnectionOptions {}

declare class HTTPSServer extends HTTPServer {
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
  constructor(opts?: HTTPSClientRequestOptions, onresponse?: () => void)

  constructor(onresponse: () => void)
}

export { type HTTPSClientRequest, HTTPSClientRequest as ClientRequest }

export function createServer(
  opts?: HTTPSServerOptions,
  onrequest?: (req: HTTPIncomingMessage, res: HTTPServerResponse) => void
): HTTPSServer

export function createServer(
  onrequest: (req: HTTPIncomingMessage, res: HTTPServerResponse) => void
): HTTPSServer

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
