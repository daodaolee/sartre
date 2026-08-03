import { FeishuOAuthError, type FeishuOAuthPort } from "./ports.js";

const FEISHU_AUTHORIZE_URL = "https://accounts.feishu.cn/open-apis/authen/v1/authorize";
const FEISHU_TOKEN_URL = "https://open.feishu.cn/open-apis/authen/v2/oauth/token";
const FEISHU_USER_INFO_URL = "https://open.feishu.cn/open-apis/authen/v1/user_info";
const MAX_PROVIDER_RESPONSE_BYTES = 65_536;
const OPAQUE_VALUE = /^[A-Za-z0-9_-]{43,128}$/u;
const PKCE_VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/u;
const CLIENT_ID = /^cli_[A-Za-z0-9]{8,128}$/u;
const SCOPE = /^[a-z0-9:._-]{1,128}$/u;

type FetchImplementation = typeof fetch;

type FeishuOAuthHttpAdapterOptions = {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly scopes: readonly string[];
  readonly requestTimeoutMs: number;
  readonly fetchImplementation?: FetchImplementation;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function boundedString(value: unknown, maximum: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= maximum ? value : null;
}

function callbackInputValid(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): boolean {
  if (
    input.code.length < 1 ||
    input.code.length > 2_048 ||
    !PKCE_VERIFIER.test(input.codeVerifier)
  ) {
    return false;
  }
  try {
    return new URL(input.redirectUri).protocol === "https:";
  } catch {
    return false;
  }
}

function providerFailure(response: Response, body: JsonRecord): FeishuOAuthError {
  const code = typeof body.code === "number" ? body.code : null;
  const dependencyFailure =
    response.status === 429 || response.status >= 500 || code === 20050 || code === 20072;
  return new FeishuOAuthError(dependencyFailure ? "dependency_unavailable" : "callback_rejected");
}

async function readBoundedJson(response: Response): Promise<JsonRecord> {
  const contentType = response.headers.get("content-type");
  if (!contentType?.toLowerCase().includes("application/json")) {
    throw new FeishuOAuthError("dependency_unavailable");
  }
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const bytes = Number(declaredLength);
    if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > MAX_PROVIDER_RESPONSE_BYTES) {
      throw new FeishuOAuthError("dependency_unavailable");
    }
  }
  if (!response.body) throw new FeishuOAuthError("dependency_unavailable");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_PROVIDER_RESPONSE_BYTES) {
        await reader.cancel();
        throw new FeishuOAuthError("dependency_unavailable");
      }
      chunks.push(next.value);
    }
  } catch (error) {
    if (error instanceof FeishuOAuthError) throw error;
    throw new FeishuOAuthError("dependency_unavailable");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new FeishuOAuthError("dependency_unavailable");
  }
  const object = record(parsed);
  if (!object) throw new FeishuOAuthError("dependency_unavailable");
  return object;
}

export class FeishuOAuthHttpAdapter implements FeishuOAuthPort {
  private readonly fetchImplementation: FetchImplementation;
  private readonly scopes: readonly string[];

  constructor(private readonly options: FeishuOAuthHttpAdapterOptions) {
    if (
      !CLIENT_ID.test(options.clientId) ||
      options.clientSecret.length < 16 ||
      options.clientSecret.length > 512 ||
      options.requestTimeoutMs < 100 ||
      options.requestTimeoutMs > 30_000 ||
      options.scopes.length > 50 ||
      options.scopes.some((scope) => !SCOPE.test(scope)) ||
      new Set(options.scopes).size !== options.scopes.length
    ) {
      throw new Error("feishu_oauth_config_invalid");
    }
    this.scopes = Object.freeze([...options.scopes]);
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async createAuthorizationUrl(input: {
    state: string;
    codeChallenge: string;
    redirectUri: string;
  }): Promise<string> {
    let redirect: URL;
    try {
      redirect = new URL(input.redirectUri);
    } catch {
      throw new FeishuOAuthError("callback_rejected");
    }
    if (
      !OPAQUE_VALUE.test(input.state) ||
      !OPAQUE_VALUE.test(input.codeChallenge) ||
      redirect.protocol !== "https:"
    ) {
      throw new FeishuOAuthError("callback_rejected");
    }

    const authorization = new URL(FEISHU_AUTHORIZE_URL);
    authorization.searchParams.set("client_id", this.options.clientId);
    authorization.searchParams.set("redirect_uri", input.redirectUri);
    authorization.searchParams.set("state", input.state);
    authorization.searchParams.set("code_challenge", input.codeChallenge);
    authorization.searchParams.set("code_challenge_method", "S256");
    if (this.scopes.length > 0) authorization.searchParams.set("scope", this.scopes.join(" "));
    return authorization.toString();
  }

  async exchangeCode(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<{ subject: string; tenantId: string; displayName: string }> {
    if (!callbackInputValid(input)) throw new FeishuOAuthError("callback_rejected");
    const token = await this.requestJson(FEISHU_TOKEN_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        code: input.code,
        redirect_uri: input.redirectUri,
        code_verifier: input.codeVerifier,
      }),
    });
    const accessToken = boundedString(token.body.access_token, 4_096);
    if (!token.response.ok || token.body.code !== 0) {
      throw providerFailure(token.response, token.body);
    }
    if (!accessToken || token.body.token_type !== "Bearer") {
      throw new FeishuOAuthError("dependency_unavailable");
    }

    const user = await this.requestJson(FEISHU_USER_INFO_URL, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: ["Bearer", accessToken].join(" "),
      },
    });
    if (!user.response.ok || user.body.code !== 0) {
      throw providerFailure(user.response, user.body);
    }
    const data = record(user.body.data);
    const subject = boundedString(data?.open_id, 256);
    const tenantId = boundedString(data?.tenant_key, 256);
    const displayName = boundedString(data?.name, 200);
    if (!subject || !tenantId || !displayName) {
      throw new FeishuOAuthError("dependency_unavailable");
    }
    return { subject, tenantId, displayName };
  }

  private async requestJson(
    url: string,
    init: RequestInit,
  ): Promise<{ response: Response; body: JsonRecord }> {
    let response: Response;
    try {
      response = await this.fetchImplementation(url, {
        ...init,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(this.options.requestTimeoutMs),
      });
    } catch {
      throw new FeishuOAuthError("dependency_unavailable");
    }
    return { response, body: await readBoundedJson(response) };
  }
}
