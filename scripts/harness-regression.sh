#!/usr/bin/env bash
set -uo pipefail

CHANGE_NAME="${CHANGE_NAME:-lane-a-service-baseline}"

if [ "${CHANGE_NAME}" != "lane-a-service-baseline" ]; then
  echo "Unsupported CHANGE_NAME: ${CHANGE_NAME}" >&2
  echo "Use CHANGE_NAME=lane-a-service-baseline for the current Sartre role-collaboration candidate." >&2
  exit 2
fi

REPORT_DIR="${REPORT_DIR:-reports/${CHANGE_NAME}/regression}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
REPORT_PATH="${REPORT_DIR}/${TIMESTAMP}-regression-report.md"
LATEST_PATH="${REPORT_DIR}/latest.md"
mkdir -p "${REPORT_DIR}"

failures=0

{
  echo "# Regression Report: ${CHANGE_NAME}"
  echo
  echo "- Timestamp: ${TIMESTAMP}"
  echo "- Evidence levels: REAL_TEST, STRUCTURAL_CHECK"
  echo
} >"${REPORT_PATH}"

run_check() {
  local title="$1"
  local evidence="$2"
  shift 2
  local output_file
  output_file="$(mktemp "/tmp/sartre-harness-${title//[^A-Za-z0-9]/-}.XXXXXX")"

  {
    echo "## ${title}"
    echo
    echo "- Evidence: \`${evidence}\`"
    echo "- Command: \`$*\`"
    echo
  } >>"${REPORT_PATH}"

  "$@" >"${output_file}" 2>&1
  local status=$?

  if [ "${status}" -eq 0 ]; then
    echo "- Result: PASS" >>"${REPORT_PATH}"
  else
    echo "- Result: FAIL (exit ${status})" >>"${REPORT_PATH}"
    failures=$((failures + 1))
  fi

  {
    echo
    echo '```text'
    sed -n '1,220p' "${output_file}"
    echo '```'
    echo
  } >>"${REPORT_PATH}"
  rm -f "${output_file}"
}

finish_report() {
  {
    echo "## Summary"
    echo
    echo "- Failures: ${failures}"
  } >>"${REPORT_PATH}"

  cp "${REPORT_PATH}" "${LATEST_PATH}"

  if [ "${failures}" -ne 0 ]; then
    echo "Regression failed: ${failures} failure(s). Report: ${REPORT_PATH}" >&2
    exit 1
  fi

  local evidence_output
  evidence_output="$(mktemp "/tmp/sartre-harness-evidence-gate.XXXXXX")"
  pnpm harness:evidence -- --change "${CHANGE_NAME}" >"${evidence_output}" 2>&1
  local evidence_status=$?

  {
    echo "## Regression evidence gate"
    echo
    echo "- Evidence: \`STRUCTURAL_CHECK\`"
    echo "- Command: \`pnpm harness:evidence -- --change ${CHANGE_NAME}\`"
    if [ "${evidence_status}" -eq 0 ]; then
      echo "- Result: PASS"
    else
      echo "- Result: FAIL (exit ${evidence_status})"
    fi
    echo
    echo '```text'
    sed -n '1,220p' "${evidence_output}"
    echo '```'
    echo
  } >>"${REPORT_PATH}"

  cp "${REPORT_PATH}" "${LATEST_PATH}"
  rm -f "${evidence_output}"

  if [ "${evidence_status}" -ne 0 ]; then
    echo "Evidence gate failed. Report: ${REPORT_PATH}" >&2
    exit 1
  fi

  echo "Regression passed. Report: ${REPORT_PATH}"
}

for change_dir in openspec/changes/*; do
  if [ -d "${change_dir}" ]; then
    change_name="$(basename "${change_dir}")"
    if [ "${change_name}" = "archive" ]; then
      continue
    fi
    run_check "OpenSpec ${change_name}" "STRUCTURAL_CHECK" \
      pnpm exec openspec validate "${change_name}" --type change --strict --no-interactive
  fi
done

run_check "BDD acceptance and ledger structure" "STRUCTURAL_CHECK" \
  bash -lc 'test -d bdd/features && test -d acceptance/checklists && test -d reports/lane-a-service-baseline && test -f reports/lane-a-service-baseline/CANDIDATE-MANIFEST.md'

run_check "Domain tests" "REAL_TEST" pnpm --filter @sartre/domain test
run_check "Contracts tests" "REAL_TEST" pnpm --filter @sartre/contracts test
run_check "SDK tests" "REAL_TEST" pnpm --filter @sartre/sdk test
run_check "Connector Core tests" "REAL_TEST" pnpm --filter @sartre/connector-core test
run_check "Connector CLI tests" "REAL_TEST" pnpm --filter @sartre/connector-cli test
run_check "Hub API tests" "REAL_TEST" pnpm --filter @sartre/hub-api test
run_check "Web Console tests" "REAL_TEST" pnpm --filter @sartre/web-console test
run_check "Web Console Hub real smoke" "REAL_TEST" pnpm run web:smoke:hub

run_check "Domain build" "REAL_TEST" pnpm --filter @sartre/domain build
run_check "Contracts build" "REAL_TEST" pnpm --filter @sartre/contracts build
run_check "SDK build" "REAL_TEST" pnpm --filter @sartre/sdk build
run_check "Connector Core build" "REAL_TEST" pnpm --filter @sartre/connector-core build
run_check "Connector CLI build" "REAL_TEST" pnpm --filter @sartre/connector-cli build
run_check "Hub API build" "REAL_TEST" pnpm --filter @sartre/hub-api build
run_check "Web Console build" "REAL_TEST" pnpm --filter @sartre/web-console build

run_check "Lane A scoped lint" "REAL_TEST" pnpm run lint:lane-a
run_check "Architecture boundary check" "REAL_TEST" pnpm run architecture:check
run_check "Secret scan" "REAL_TEST" \
  bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *= *[A-Za-z0-9_-]{12,}|token *= *[A-Za-z0-9_-]{12,}'\'' apps packages .agents openspec bdd acceptance plan docs spec workflow scripts package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
run_check "Scoped diff check" "REAL_TEST" \
  git diff --check -- . ':!node_modules'

finish_report
