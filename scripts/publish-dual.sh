#!/usr/bin/env bash
# 双端发布：内网 GitLab + 外网 GitHub
# - 两边 commit 可不同（作者/提交信息），但每次发布的文件快照（tree）一致
# - 工作分支 main → gitlab/main；发布分支 public/main → github/main
#
# 用法:
#   ./scripts/publish-dual.sh setup              # 初始化 git 与 remote（首次）
#   ./scripts/publish-dual.sh -m "提交说明"       # 提交并推送两端（默认暂存区已有改动）
#   ./scripts/publish-dual.sh -m "说明" --all     # git add -A 后提交并推送
#   ./scripts/publish-dual.sh sync               # 不新建提交，仅把 main 的树同步到 GitHub
#   ./scripts/publish-dual.sh verify             # 校验两端最新 tree 是否一致
#   ./scripts/publish-dual.sh -m "说明" --gitlab-only | --github-only

set -euo pipefail

readonly GITLAB_REMOTE="gitlab"
readonly GITHUB_REMOTE="github"
readonly GITLAB_URL="http://gitlab.fireflyfusion.cn/marketing/sartre-agent-workspace.git"
readonly GITHUB_URL="https://github.com/daodaolee/sartre.git"
readonly WORK_BRANCH="main"
readonly PUBLIC_BRANCH="public/main"
readonly GITHUB_UPSTREAM_BRANCH="main"

readonly GITLAB_NAME="li xin"
readonly GITLAB_EMAIL="xin.li@quvideo.com"
readonly GITHUB_NAME="daodaolee"
readonly GITHUB_EMAIL="im@daodaolee.cn"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { printf '→ %s\n' "$*"; }
die() { printf '✗ %s\n' "$*" >&2; exit 1; }

require_git() {
  git rev-parse --git-dir >/dev/null 2>&1 || die "当前目录不是 git 仓库。请先运行: ./scripts/publish-dual.sh setup"
}

ensure_remotes() {
  local current_url

  if ! current_url="$(git remote get-url "$GITLAB_REMOTE" 2>/dev/null)"; then
    git remote add "$GITLAB_REMOTE" "$GITLAB_URL"
    log "已添加 remote: $GITLAB_REMOTE"
  elif [[ "$current_url" != "$GITLAB_URL" ]]; then
    die "remote '$GITLAB_REMOTE' 指向 $current_url，不是期望的 $GITLAB_URL。请人工确认后再修改 remote。"
  fi

  if ! current_url="$(git remote get-url "$GITHUB_REMOTE" 2>/dev/null)"; then
    git remote add "$GITHUB_REMOTE" "$GITHUB_URL"
    log "已添加 remote: $GITHUB_REMOTE"
  elif [[ "$current_url" != "$GITHUB_URL" ]]; then
    die "remote '$GITHUB_REMOTE' 指向 $current_url，不是期望的 $GITHUB_URL。请人工确认后再修改 remote。"
  fi
}

on_work_branch() {
  [[ "$(git branch --show-current)" == "$WORK_BRANCH" ]]
}

require_clean_worktree() {
  [[ -z "$(git status --porcelain)" ]] || die "工作区不干净。请先提交/暂存并发布，或清理无关改动。"
}

git_commit_as() {
  local name="$1" email="$2" message="$3"
  GIT_AUTHOR_NAME="$name" GIT_AUTHOR_EMAIL="$email" \
  GIT_COMMITTER_NAME="$name" GIT_COMMITTER_EMAIL="$email" \
    git commit -m "$message"
}

# 用 main 的 tree 在 public/main 上生成/更新提交（GitHub 身份）
sync_github_branch_from_main() {
  local message="${1:-}"
  local main_tree
  main_tree="$(git rev-parse "${WORK_BRANCH}^{tree}")"
  [[ -n "$message" ]] || message="$(git log -1 --pretty=%s "$WORK_BRANCH")"

  if ! git show-ref --verify --quiet "refs/heads/${PUBLIC_BRANCH}"; then
    log "首次创建 ${PUBLIC_BRANCH}（orphan，避免继承 GitLab 提交作者）"
    git checkout --orphan "$PUBLIC_BRANCH"
    git read-tree --reset -u "$main_tree"
    git_commit_as "$GITHUB_NAME" "$GITHUB_EMAIL" "$message"
    log "GitHub 提交: $(git rev-parse --short HEAD)"
    git checkout "$WORK_BRANCH"
    return 0
  fi

  git checkout "$PUBLIC_BRANCH"
  git read-tree --reset -u "$main_tree"

  if git diff-index --quiet HEAD -- 2>/dev/null; then
    log "GitHub 分支无新改动（tree 已与 main 一致）"
    git checkout "$WORK_BRANCH"
    return 0
  fi

  git_commit_as "$GITHUB_NAME" "$GITHUB_EMAIL" "$message"
  log "已在 ${PUBLIC_BRANCH} 创建 GitHub 提交: $(git rev-parse --short HEAD)"
  git checkout "$WORK_BRANCH"
}

push_gitlab() {
  log "推送到 GitLab (${GITLAB_REMOTE}/${WORK_BRANCH})…"
  git push -u "$GITLAB_REMOTE" "${WORK_BRANCH}:${WORK_BRANCH}"
}

push_github() {
  log "推送到 GitHub (${GITHUB_REMOTE}/${GITHUB_UPSTREAM_BRANCH})…"
  git push -u "$GITHUB_REMOTE" "${PUBLIC_BRANCH}:${GITHUB_UPSTREAM_BRANCH}"
}

verify_trees() {
  require_git
  ensure_remotes
  git fetch "$GITLAB_REMOTE" "$WORK_BRANCH" 2>/dev/null || true
  git fetch "$GITHUB_REMOTE" "$GITHUB_UPSTREAM_BRANCH" 2>/dev/null || true

  local main_tree pub_tree
  main_tree="$(git rev-parse "${WORK_BRANCH}^{tree}" 2>/dev/null)" || die "本地缺少分支 ${WORK_BRANCH}"

  if git show-ref --verify --quiet "refs/heads/$PUBLIC_BRANCH"; then
    pub_tree="$(git rev-parse "${PUBLIC_BRANCH}^{tree}")"
  else
    die "本地缺少分支 ${PUBLIC_BRANCH}，请先执行 publish 或 sync"
  fi

  if [[ "$main_tree" == "$pub_tree" ]]; then
    printf '✓ 本地 tree 一致\n  main:        %s\n  public/main: %s\n' "$main_tree" "$pub_tree"
  else
    printf '✗ 本地 tree 不一致\n  main:        %s\n  public/main: %s\n' "$main_tree" "$pub_tree" >&2
    exit 1
  fi

  if git rev-parse "${GITLAB_REMOTE}/${WORK_BRANCH}^{tree}" >/dev/null 2>&1; then
    local remote_gitlab_tree
    remote_gitlab_tree="$(git rev-parse "${GITLAB_REMOTE}/${WORK_BRANCH}^{tree}")"
    if [[ "$main_tree" == "$remote_gitlab_tree" ]]; then
      log "✓ 与 GitLab 远端 tree 一致"
    else
      printf '⚠ 本地 main 与 GitLab 远端 tree 不同（可能未推送或远端更新）\n' >&2
    fi
  fi

  if git rev-parse "${GITHUB_REMOTE}/${GITHUB_UPSTREAM_BRANCH}^{tree}" >/dev/null 2>&1; then
    local remote_github_tree
    remote_github_tree="$(git rev-parse "${GITHUB_REMOTE}/${GITHUB_UPSTREAM_BRANCH}^{tree}")"
    if [[ "$pub_tree" == "$remote_github_tree" ]]; then
      log "✓ 与 GitHub 远端 tree 一致"
    else
      printf '⚠ public/main 与 GitHub 远端 tree 不同（可能未推送）\n' >&2
    fi
  fi
}

verify_gitlab_remote() {
  require_git
  ensure_remotes
  git fetch "$GITLAB_REMOTE" "$WORK_BRANCH" 2>/dev/null || true

  local main_tree remote_gitlab_tree
  main_tree="$(git rev-parse "${WORK_BRANCH}^{tree}" 2>/dev/null)" || die "本地缺少分支 ${WORK_BRANCH}"

  if git rev-parse "${GITLAB_REMOTE}/${WORK_BRANCH}^{tree}" >/dev/null 2>&1; then
    remote_gitlab_tree="$(git rev-parse "${GITLAB_REMOTE}/${WORK_BRANCH}^{tree}")"
    [[ "$main_tree" == "$remote_gitlab_tree" ]] || die "本地 main 与 GitLab 远端 tree 不一致"
    log "✓ 与 GitLab 远端 tree 一致"
  else
    log "未读取到 GitLab 远端 tree，可能是首次推送或需要认证"
  fi
}

cmd_setup() {
  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    log "初始化 git 仓库…"
    git init -b "$WORK_BRANCH"
  fi

  ensure_remotes

  if ! git rev-parse HEAD >/dev/null 2>&1; then
    log "尚无提交。下一步执行: ./scripts/publish-dual.sh -m \"初始提交\" --all"
    return 0
  fi

  log "setup 完成。remotes:"
  git remote -v
  log "下一步: ./scripts/publish-dual.sh -m \"你的提交说明\" --all"
}

cmd_sync() {
  require_git
  ensure_remotes
  on_work_branch || die "请在分支 ${WORK_BRANCH} 上执行 sync"
  require_clean_worktree

  sync_github_branch_from_main ""
  push_github
  verify_trees
}

cmd_publish() {
  local msg="${MSG:-}"
  local github_msg="${GITHUB_MSG:-}"
  local gitlab_only=0 github_only=0 auto_all=0

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --gitlab-only) gitlab_only=1 ;;
      --github-only) github_only=1 ;;
      --all) auto_all=1 ;;
      *) die "未知参数: $1" ;;
    esac
    shift
  done

  require_git
  ensure_remotes
  on_work_branch || die "请在分支 ${WORK_BRANCH} 上执行 publish（当前: $(git branch --show-current)）"

  if [[ "$gitlab_only" -eq 1 && "$github_only" -eq 1 ]]; then
    die "--gitlab-only 与 --github-only 不能同时使用"
  fi

  if [[ -z "$msg" && "$gitlab_only" -eq 0 && "$github_only" -eq 1 ]]; then
    : # sync-only to github
  elif [[ -z "$msg" ]]; then
    die "请提供 -m \"提交说明\""
  fi

  if [[ "$auto_all" -eq 1 ]]; then
    git add -A
  fi

  if [[ "$github_only" -eq 1 ]]; then
    require_clean_worktree
  fi

  if [[ -n "$msg" && "$github_only" -eq 0 ]]; then
    if ! git diff --cached --quiet; then
      git_commit_as "$GITLAB_NAME" "$GITLAB_EMAIL" "$msg"
      log "GitLab 提交: $(git rev-parse --short HEAD) <${GITLAB_EMAIL}>"
    elif [[ -n "$(git status --porcelain)" ]]; then
      die "有未暂存改动。请先 git add，或加 --all"
    else
      log "无暂存改动，跳过新提交（仅同步/推送）"
    fi
  fi

  [[ -n "$github_msg" ]] || github_msg="$msg"

  if [[ "$github_only" -eq 0 ]]; then
    push_gitlab
  fi

  if [[ "$gitlab_only" -eq 0 ]]; then
    sync_github_branch_from_main "$github_msg"
    push_github
  fi

  if [[ "$gitlab_only" -eq 1 ]]; then
    verify_gitlab_remote
  else
    verify_trees
  fi
  log "双端发布完成"
}

usage() {
  cat <<'EOF'
双端发布脚本（GitLab 内网 + GitHub 外网）

  setup                         初始化 git 与 remote
  -m, --message MSG             提交说明（GitLab 提交用；GitHub 默认同 MSG）
  --github-message MSG          GitHub 侧单独提交说明
  --all                         提交前执行 git add -A
  sync                          不提交，仅把 main 的树同步并推送到 GitHub
  verify                        校验 main 与 public/main 的 tree 是否一致
  --gitlab-only                 只推 GitLab
  --github-only                 只同步并推 GitHub（不提交/不推 GitLab）

示例:
  ./scripts/publish-dual.sh setup
  ./scripts/publish-dual.sh -m "docs: 更新架构说明" --all
  ./scripts/publish-dual.sh -m "内网说明" --github-message "docs: update architecture"
  ./scripts/publish-dual.sh sync
EOF
}

# --- 参数解析 ---
MSG=""
GITHUB_MSG=""
COMMAND="publish"
PUBLISH_EXTRA=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    setup|sync|verify)
      COMMAND="$1"
      shift
      ;;
    help|-h|--help)
      COMMAND="help"
      shift
      ;;
    -m|--message)
      MSG="${2:?缺少 -m 的参数}"
      shift 2
      ;;
    --github-message)
      GITHUB_MSG="${2:?缺少 --github-message 的参数}"
      shift 2
      ;;
    --all|--gitlab-only|--github-only)
      PUBLISH_EXTRA+=("$1")
      shift
      ;;
    *)
      die "未知参数: $1（用 --help 查看用法）"
      ;;
  esac
done
case "$COMMAND" in
  setup) cmd_setup ;;
  sync) cmd_sync ;;
  verify) verify_trees ;;
  help) usage ;;
  publish) cmd_publish "${PUBLISH_EXTRA[@]}" ;;
  *) usage; exit 1 ;;
esac
