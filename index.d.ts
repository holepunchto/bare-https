import { TLSSocket, TLSSocketOptions } from 'bare-tls'
import {
  HTTPAgent,
  HTTPClientRequest,
  HTTPClientRequestOptions,
  HTTPIncomingMessage,
  HTTPServer,
  HTTPServerConnectionOptions,
  HTTPServerResponse
} from 'bare-http1'
import { TCPSocket, TCPSocketOptions, TCPSocketConnectOptions } from 'bare-tcp'

export interface HTTPSSocketOptions
  extends TLSSocketOptions,
    TCPSocketOptions,
    TCPSocketConnectOptions {}

export interface HTTPSSocket extends TLSSocket, TCPSocket {}

class HTTPSSocket extends TLSSocket, TCPSocket {}

export interface HTTPSAgent extends HTTPAgent {
  createConnection(opts?: HTTPSSocketOptions): HTTPSSocket
}

class HTTPSAgent extends HTTPAgent {
  static global: HTTPSAgent
}

export const globalAgent: HTTPSAgent

export { HTTPSAgent as Agent }

export interface HTTPSServerOptions extends HTTPSSocketOptions, HTTPServerConnectionOptions {}

class HTTPSServer extends HTTPServer {
  constructor(
    opts?: HTTPSServerOptions,
    onrequest?: (req: HTTPIncomingMessage, res: HTTPServerResponse) => void
  )

  constructor(onrequest: (req: HTTPIncomingMessage, res: HTTPServerResponse) => void)
}

export { HTTPSServer as Server }

export interface HTTPSClientRequestOptions extends HTTPClientRequestOptions {
  agent?: HTTPSAgent | false
}

export interface HTTPSClientRequest extends HTTPClientRequest {}

class HTTPSClientRequest extends HTTPClientRequest {
  constructor(opts?: HTTPSClientRequestOptions, onresponse?: () => void)

  constructor(onresponse: () => void)
}

export { HTTPClientRequest as ClientRequest }

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
