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
    TCPSocketConnectOptions {
  isServer?: boolean
}

export interface HTTPSSocket extends TLSSocket, TCPSocket {}

export class HTTPSSocket {}

export interface HTTPSAgent extends HTTPAgent {
  createConnection(opts?: HTTPSSocketOptions): HTTPSSocket
}

export class HTTPSAgent {
  static global: HTTPSAgent
}

export { HTTPSAgent as Agent }

export const globalAgent: HTTPSAgent

export interface HTTPSServerOptions
  extends HTTPSSocketOptions,
    HTTPServerConnectionOptions {}

export class HTTPSServer extends HTTPServer {
  constructor(
    opts?: HTTPSServerOptions,
    onrequest?: (req: HTTPIncomingMessage, res: HTTPServerResponse) => void
  )

  constructor(
    onrequest: (req: HTTPIncomingMessage, res: HTTPServerResponse) => void
  )
}

export { HTTPSServer as Server }

export function createServer(
  opts?: HTTPSServerOptions,
  onrequest?: (req: HTTPIncomingMessage, res: HTTPServerResponse) => void
): HTTPSServer

export function createServer(
  onrequest: (req: HTTPIncomingMessage, res: HTTPServerResponse) => void
): HTTPSServer

export interface HTTPSClientRequestOptions extends HTTPClientRequestOptions {
  agent?: HTTPSAgent | false
}

export function request(
  url: URL | string,
  opts?: HTTPSClientRequestOptions,
  onresponse?: (res: HTTPIncomingMessage) => void
): HTTPClientRequest

export function request(
  url: URL | string,
  onresponse: (res: HTTPIncomingMessage) => void
): HTTPClientRequest

export function request(
  opts: HTTPSClientRequestOptions,
  onresponse?: (res: HTTPIncomingMessage) => void
): HTTPClientRequest
