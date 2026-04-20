/**
 * 国内网络下直连 `*.workers.dev` 容易出现握手超时。
 * 一旦命中这类地址，客户端就不再直连 websocket，而是改走主站同域 HTTP bridge。
 */
export function shouldBridgeCoordinatorBaseUrl(baseUrl: string) {
  const host = new URL(baseUrl.replace(/\/+$/, "")).hostname.toLowerCase();
  return host.endsWith(".workers.dev");
}
