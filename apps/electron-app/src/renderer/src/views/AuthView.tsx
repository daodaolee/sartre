import { KeyRound, LoaderCircle, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import type {
  DesktopAuthResult,
  DesktopAuthState,
  DesktopLoginCommand,
} from "../../../shared/ms1-desktop-contract.js";

interface AuthViewProps {
  readonly state: DesktopAuthState | undefined;
  readonly onLogin: (command: DesktopLoginCommand) => Promise<DesktopAuthResult>;
  readonly onRecover: () => Promise<DesktopAuthResult>;
}

const AUTH_ERROR_TEXT = {
  unauthenticated: "登录信息无效或会话已过期，请重新输入。",
  dependency_unavailable: "Hub 或系统安全存储暂时不可用，请确认本机服务后重试。",
  validation_failed: "请检查公司邮箱格式和密码长度。",
} as const;

export function AuthView({ state, onLogin, onRecover }: AuthViewProps) {
  const [pending, setPending] = useState<"login" | "recover">();
  const [feedback, setFeedback] = useState<string>();
  const emailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailInput.current?.focus();
  }, []);

  if (!state || state.status === "restoring") {
    return (
      <main className="auth-screen" aria-live="polite">
        <section className="auth-panel auth-panel--loading">
          <LoaderCircle className="spin" aria-hidden="true" size={18} />
          <div>
            <h1>正在恢复会话</h1>
            <p>凭据只在 Electron Main 与系统安全存储之间处理。</p>
          </div>
        </section>
      </main>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const passwordInput = form.elements.namedItem("password");
    if (passwordInput instanceof HTMLInputElement) passwordInput.value = "";
    setPending("login");
    setFeedback(undefined);
    try {
      const result = await onLogin({ email, password });
      if (!result.success) setFeedback(result.error.message);
    } catch {
      setFeedback(AUTH_ERROR_TEXT.validation_failed);
    } finally {
      setPending(undefined);
    }
  }

  async function recover(): Promise<void> {
    setPending("recover");
    setFeedback(undefined);
    try {
      const result = await onRecover();
      if (!result.success) setFeedback(result.error.message);
    } catch {
      setFeedback(AUTH_ERROR_TEXT.dependency_unavailable);
    } finally {
      setPending(undefined);
    }
  }

  const recoveryText =
    state.status === "recovery_required"
      ? (AUTH_ERROR_TEXT[state.errorCode as keyof typeof AUTH_ERROR_TEXT] ??
        "当前会话需要恢复，请清除本机受保护会话后重新登录。")
      : undefined;

  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-labelledby="auth-title">
        <header className="auth-panel__header">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <div>
            <p className="eyebrow">SARTRE WORKBENCH</p>
            <h1 id="auth-title">登录本机工作台</h1>
            <p>使用已由运维创建的公司账号。当前不发送邮件，也不连接飞书。</p>
          </div>
        </header>

        {recoveryText ? (
          <div className="inline-alert inline-alert--warning" role="alert">
            <ShieldAlert aria-hidden="true" size={17} />
            <div>
              <strong>需要恢复会话</strong>
              <p>{recoveryText}</p>
              <button
                className="button button--secondary"
                disabled={pending !== undefined}
                onClick={() => void recover()}
                type="button"
              >
                {pending === "recover" ? "正在清理" : "清理本机会话"}
              </button>
            </div>
          </div>
        ) : null}

        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label htmlFor="login-email">公司邮箱</label>
          <input
            autoComplete="username"
            id="login-email"
            maxLength={320}
            name="email"
            placeholder="name@company.com"
            required
            ref={emailInput}
            type="email"
          />

          <div className="field-label-row">
            <label htmlFor="login-password">密码</label>
            <span>至少 12 个字符</span>
          </div>
          <input
            aria-describedby={feedback ? "login-feedback" : undefined}
            autoComplete="current-password"
            id="login-password"
            maxLength={128}
            minLength={12}
            name="password"
            required
            type="password"
          />

          {feedback ? (
            <p className="field-error" id="login-feedback" role="alert">
              {feedback}
            </p>
          ) : null}

          <button
            className="button button--primary button--full"
            disabled={pending !== undefined}
            type="submit"
          >
            {pending === "login" ? (
              <LoaderCircle className="spin" aria-hidden="true" size={15} />
            ) : (
              <KeyRound aria-hidden="true" size={15} />
            )}
            {pending === "login" ? "正在登录" : "登录"}
          </button>
        </form>

        <footer className="auth-panel__footer">
          <span>Refresh Token 使用系统安全存储保护</span>
          <span>Renderer 不可读取凭据</span>
        </footer>
      </section>
    </main>
  );
}
