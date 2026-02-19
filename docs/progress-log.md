# Progress Log

시간순 append-only 로그입니다. 최근 항목이 아래로 추가됩니다.

## Entry Template

```text
DateTime: YYYY-MM-DD HH:MM (KST)
Session Goal:
What changed:
-
Evidence:
- files:
- checks:
Risks/Blockers:
-
Next actions:
1.
2.
3.
```

---

## 2026-02-18 14:XX (KST)
Session Goal:
- TickTick/OpenClaw 설계 검토 및 세션 연속성 문서 체계 수립

What changed:
- 설계 검토 기준 정리(인증, API, 에러 처리, 테스트/게이트)
- 공식 문서 기반 제약사항 확정(rate limit 미문서, tag endpoint 미확인 등)
- `docs/` 기록 체계 구축 시작

Evidence:
- files: `docs/README.md`, `docs/current-status.md`, `docs/decisions.md`, `docs/progress-log.md`, `docs/next-session.md`
- checks: 워크스페이스에 구현 코드는 없고 `.catm` 메타파일만 존재함 확인

Risks/Blockers:
- TickTick 미문서 영역(refresh/rate limit/error schema)에 대한 런타임 검증 필요

Next actions:
1. 프로젝트 스캐폴딩 생성
2. Auth/API/Core 인터페이스 계약 파일 정의
3. MVP 유스케이스 5종 구현 및 기본 테스트 추가

## 2026-02-18 14:28 (KST)
Session Goal:
- 품질/문서 레이어 보강: Auth/API/Core 테스트 골격 및 상태 문서 최신화

What changed:
- `tests/unit/auth.unit.test.ts`에 auth 플로우 단위 테스트 골격(3개 TODO 시나리오) 추가
- `tests/unit/api.unit.test.ts`, `tests/unit/core.unit.test.ts` 추가로 API/Core 테스트 골격 확장
- `docs/current-status.md`를 스캐폴딩 반영 상태(게이트 진행 포함)로 업데이트

Evidence:
- files: `tests/unit/auth.unit.test.ts`, `tests/unit/api.unit.test.ts`, `tests/unit/core.unit.test.ts`, `docs/current-status.md`, `docs/progress-log.md`
- checks: `src/auth`, `src/api`, `src/core`, `src/shared`, `tests/unit` 디렉터리/파일 존재 확인

Risks/Blockers:
- 계약/구현 코드가 아직 비어 있어 테스트는 TODO 스켈레톤 단계에 머무름

Next actions:
1. Auth/API/Core 계약 타입 및 최소 구현 파일 생성
2. 테스트 TODO를 실제 assertion/mock 기반 테스트 본문으로 교체
3. `npm run typecheck && npm test`를 CI 체크리스트에 연결

## 2026-02-18 14:31 (KST)
Session Goal:
- 재시도 태스크 정렬: Vitest 실행 기준에 맞춘 테스트 골격 보정 및 문서 상태 동기화

What changed:
- `tests/unit/*.unit.test.ts`를 `vitest` import + `expect(true).toBe(true)` 형태로 정렬
- `docs/current-status.md`에 부분 계약 구현 상태(`src/common`, `src/config`, `src/auth`) 반영
- `docs/next-session.md`의 현재 상태/다음 3개 액션을 API/Core 확장 중심으로 재정의

Evidence:
- files: `tests/unit/auth.unit.test.ts`, `tests/unit/api.unit.test.ts`, `tests/unit/core.unit.test.ts`, `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md`
- checks: `npm test` 실행(통과), `npm run typecheck` 실행(실패: `src/api/ticktick-api-client.ts`, `src/auth/oauth2-contract.ts`, `src/config/ticktick-env.ts`의 pre-existing 타입/모듈 경로 이슈)

Risks/Blockers:
- `src/api/ticktick-api-client.ts`, `src/auth/oauth2-contract.ts`, `src/config/ticktick-env.ts`에서 ESM import 확장자 규칙 및 `exactOptionalPropertyTypes` 관련 타입 오류 존재

Next actions:
1. `src/config/ticktick-env.ts` 타입/모듈 경로 오류 정리로 typecheck 정상화
2. `src/api`, `src/core` 계약/구현 파일 보강
3. Unit 테스트를 실제 계약 검증 시나리오(assertion+mock)로 확장

## 2026-02-18 14:37 (KST)
Session Goal:
- Leader fallback 완료: 누락 계약 레이어 보강 + strict 검증 통과 + 작업 상태 정렬

What changed:
- NodeNext ESM 경로 규칙에 맞춰 `src/index.ts` 및 모듈 배럴 파일 import/export를 `.js` 확장자로 정렬
- `src/core/usecase-contracts.ts`, `src/core/index.ts`, `src/shared/index.ts` 추가로 MVP 5개 유스케이스 계약 인터페이스를 명시
- `src/shared/error-categories.ts`를 strict 옵션(`noImplicitOverride`, `exactOptionalPropertyTypes`)에 맞게 보정
- `docs/current-status.md`, `docs/next-session.md`를 typecheck 실패 상태에서 검증 통과 상태로 갱신

Evidence:
- files: `src/index.ts`, `src/core/usecase-contracts.ts`, `src/core/index.ts`, `src/shared/error-categories.ts`, `src/shared/index.ts`, `src/common/index.ts`, `src/config/index.ts`, `src/auth/index.ts`, `src/api/index.ts`, `src/domain/index.ts`, `docs/current-status.md`, `docs/progress-log.md`, `docs/next-session.md`
- checks: `npm run typecheck` 통과, `npm test` 통과, 변경 파일 LSP diagnostics clean

Risks/Blockers:
- 실 API 응답 스키마 편차(특히 optional 필드/alias) 검증을 위한 샘플 응답 캡처 필요

Next actions:
1. `src/core`에 실제 TickTick API 호출 기반 구현체 연결(현재는 계약 인터페이스 단계)
2. Unit 테스트를 mock/fake client 기반 assertion 테스트로 확장
3. 401/403/404/429/5xx 에러 매핑을 통합 경로에서 검증하는 통합 테스트 초안 추가

## 2026-02-18 16:20 (KST)
Session Goal:
- Gate 3 착수: Core 구현체 연결 + API/Core 테스트 본문 전환

What changed:
- `src/core/ticktick-usecases.ts` 추가로 create/list/update/complete task, list projects usecase 구현 및 API 에러 -> Domain 에러 매핑 도입
- `src/core/index.ts`에 usecase 구현 export 추가
- `tests/unit/api.unit.test.ts`를 실제 mock fetch 기반 인증 헤더/재시도/typed error assertion 테스트로 교체
- `tests/unit/core.unit.test.ts`를 mock client 기반 payload 변환/업데이트 호출/카테고리 매핑 assertion 테스트로 교체
- `docs/current-status.md`, `docs/next-session.md`를 Gate 3 진행 상태로 동기화

Evidence:
- files: `src/core/ticktick-usecases.ts`, `src/core/index.ts`, `tests/unit/api.unit.test.ts`, `tests/unit/core.unit.test.ts`, `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md`
- checks: `npm run typecheck` 통과, `npm test` 통과, 변경 파일 LSP diagnostics clean

Risks/Blockers:
- `completeTask` 엔드포인트(`/task/{taskId}/complete`)는 문서/실계정 샘플로 추가 확인 필요

Next actions:
1. 실제 TickTick sandbox 호출로 endpoint/payload alias 검증
2. `tests/unit/auth.unit.test.ts` assertion 테스트 본문 전환
3. 통합 에러 매핑 테스트(401/403/404/429/5xx + timeout/network) 분리 추가

## 2026-02-18 16:28 (KST)
Session Goal:
- 프로젝트 완성도 상향: OAuth 런타임 클라이언트 + Runtime Factory + README step-by-step 가이드 마무리

What changed:
- `src/auth/ticktick-oauth2-client.ts` 추가로 authorization code 교환/refresh token 갱신 런타임 구현
- `src/core/ticktick-runtime.ts` 추가로 env 기반 runtime 조립 경로(`oauth2Client`, `apiClient`, `gateway`, `useCases`) 제공
- `src/api/index.ts`, `src/auth/index.ts`, `src/core/index.ts` 배럴 export 확장
- `tests/unit/auth.unit.test.ts`에 OAuth runtime client 성공/실패 assertion 시나리오 추가
- 루트 `README.md`를 시작 가이드 중심(step-by-step)으로 전면 재작성

Evidence:
- files: `src/auth/ticktick-oauth2-client.ts`, `src/core/ticktick-runtime.ts`, `src/api/index.ts`, `src/auth/index.ts`, `src/core/index.ts`, `tests/unit/auth.unit.test.ts`, `README.md`, `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md`
- checks: `npm run typecheck` 통과, `npm test` 통과(11 tests), 변경 파일 LSP diagnostics clean

Risks/Blockers:
- 실 API sandbox 호출 검증 전까지는 문서 기반 endpoint 가정(`/task/{taskId}/complete`)에 대한 확증 부족

Next actions:
1. TickTick sandbox smoke script 추가 및 실제 응답 샘플 캡처
2. 통합 에러 매핑 테스트 파일 추가(401/403/404/429/5xx + timeout/network)
3. 운영 가이드(토큰 저장/회전 정책) README 보강

## 2026-02-19 16:58 (KST)
Session Goal:
- 제공된 레퍼런스 URL의 `SKILL.md`를 기준으로 루트 `SKILL.md` 내용 정규화

What changed:
- MCP Playwright로 `https://clawhub.ai/pskoett/self-improving-agent` 페이지를 렌더링하고 원문 다운로드 링크를 확보
- 다운로드 zip에서 원본 `SKILL.md`를 추출해 구조/섹션을 분석하고, TickTick 도메인에 맞춰 루트 `SKILL.md`를 전면 개편
- `SKILL.md`를 Quick Reference, Capabilities, OpenClaw Setup, CLI/Programmatic Workflow, Error Mapping, Verification Gates, Troubleshooting 중심으로 정렬
- 세션 연속성 유지를 위해 `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md`를 최신 상태로 동기화

Evidence:
- files: `SKILL.md`, `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md`
- checks: `npm install` 실행(로컬 devDependencies 복원), `npm run typecheck` 통과, `npm test` 통과(3 files, 12 tests)
- refs: `https://clawhub.ai/pskoett/self-improving-agent`, `/tmp/self-improving-agent/SKILL.md`

Risks/Blockers:
- 실 TickTick sandbox smoke 검증 및 통합 에러 매핑 테스트는 아직 미완료

Next actions:
1. TickTick sandbox 계정 기반 smoke 호출로 endpoint/payload alias 런타임 샘플 확정
2. 401/403/404/429/5xx + timeout/network 통합 에러 매핑 테스트 추가
3. 배포/운영 전 점검 스크립트와 문서(`README.md`, `SKILL.md`)의 운영 절차 동기화
## 2026-02-19 17:36 (KST)
Session Goal:
- 기존 저장소 연속성 문서를 반영해 `ticktick:smoke` 이슈를 수정하고 문서/테스트로 증빙

분석:
- README에는 `ticktick:smoke`가 문서상 존재하나 실제 구현 파일/스크립트가 없어 `--dryRun`이 필수 env 미존재 시 하드 실패할 수 있다는 점 확인
- `gh issue`에서 #1이 동일한 고장 보고로 열려 있는 상태 확인

목표:
- `--dryRun`에서 필수 env 하드 실패를 제거하고 설정점검 메시지 후 코드 0으로 종료
- smoke 진입점(`ticktick:smoke`)를 추가해 라이브 실행 시 create -> update -> complete 점검 흐름을 제공

결과:
- `scripts/ticktick-smoke.mjs` 신규 추가 및 `package.json`에 `ticktick:smoke` 스크립트 등록
- docs(`docs/current-status.md`, `docs/next-session.md`)를 세션 상태 기준으로 동기화
- `npm run ticktick:smoke -- --dryRun --env /tmp/does-not-exist.env` 실행 시 필수 env 미설정 안내 후 종료 코드 0 확인

달성:
- 검증 커맨드: `npm run typecheck`, `npm test`, `npm run ticktick:smoke -- --dryRun --env /tmp/does-not-exist.env` 모두 PASS
- 실 API 토큰 미보유 상태에서는 reauth 안내 메시지 동작은 유지되어 운영 가시성 확보

What changed:
- `scripts/ticktick-smoke.mjs`
- `package.json`
- `docs/current-status.md`
- `docs/next-session.md`

Evidence:
- files: `scripts/ticktick-smoke.mjs`, `package.json`, `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md`
- checks: `npm run typecheck`, `npm test`, `npm run ticktick:smoke -- --dryRun --env /tmp/does-not-exist.env`

Risks/Blockers:
- 실 API 토큰 보유 환경에서 `ticktick:smoke`의 종료 코드/메시지 정책을 추가 정합 필요

Next actions:
1. `ticktick:smoke` 실 API 런 검증(샘플 토큰 기반)
2. 종료 코드 정책 정리 및 문서 반영
3. Issue #1 클로즈 및 PR 작성

## 2026-02-19 18:37 (KST)
Session Goal:
- TickTick smoke CLI의 회귀 방지 테스트를 추가하고 문서·로그를 최신화

분석:
- 기존에 smoke 스크립트는 동작 확인이 있었으나, CLI 헬프/`--dryRun` 동작은 단위 검증이 없어서 실수 가능성 존재
- 실 API 없이도 검증 가능한 안정적 회귀 테스트가 필요

목표:
- `ticktick-smoke.mjs`의 핵심 사용자 동작(도움말/--dryRun 누락 env 경고)을 자동 테스트로 보강
- 작업 로그를 4단계(분석/목표/결과/달성) 형식으로 증빙

결과:
- `tests/unit/ticktick-smoke.unit.test.ts` 신규 추가
  - `--help` 호출 시 사용법 출력 확인
  - 빈 `.env` 사용 `--dryRun`에서 필수 env 누락 메시지와 종료 코드 0 확인
- 테스트 실행으로 CLI 동작을 비실환경에서도 검증 가능해짐

달성:
- `npm run typecheck`, `npm test` 모두 PASS
- `ticktick:smoke` 스크립트의 실행 전 가드 동작 회귀 방지 기준 확보

What changed:
- `tests/unit/ticktick-smoke.unit.test.ts`
- `docs/progress-log.md`

Evidence:
- files: `tests/unit/ticktick-smoke.unit.test.ts`, `docs/progress-log.md`
- checks: `npm run typecheck`, `npm test`

Risks/Blockers:
- 실 TickTick 토큰 환경에서의 live smoke 실행 결과 검증은 별도 스텝으로 남음

Next actions:
1. 실 토큰 환경에서 `npm run ticktick:smoke -- --projectId <id>` smoke flow 실행
2. live 실행 결과를 바탕으로 docs/openclaw-skill-guide.md의 스모크 절차 보강
3. 필요 시 종료 코드 정책(특히 성공/실패 메시지)을 명시적으로 문서화

## 2026-02-19 19:38 (KST)
Session Goal:
- usecase/gateway 통합 에러 매핑 테스트를 추가해 핵심 실패 경로 회귀를 방지

분석:
- 다음 세션 액션에 통합 에러 매핑 테스트(401/403/404/429/5xx + network) 필요가 남아 있었음
- 현재 테스트는 API 단위/코어 단위 위주로, usecase 경계에서의 매핑 회귀 방어가 제한적이었음

목표:
- usecase 경계에서 API/timeout/unknown 에러가 domain category로 안정 변환되는지 자동 검증
- 세션 문서를 최신 상태로 동기화

결과:
- `tests/unit/integration-error-mapping.unit.test.ts` 신규 추가
  - 429 API 에러 -> `rate_limit_429` + retriable/status/responseBody 검증
  - timeout 에러 -> `network` + retriable 검증
  - unknown throw 값 -> `unknown` + non-retriable 검증
- `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md` 동기화

달성:
- `npm run typecheck`, `npm test` 모두 PASS (5 files, 17 tests)
- 통합 경계에서 에러 분류 회귀 감시 범위 확대

What changed:
- `tests/unit/integration-error-mapping.unit.test.ts`
- `docs/current-status.md`
- `docs/next-session.md`
- `docs/progress-log.md`

Evidence:
- files: `tests/unit/integration-error-mapping.unit.test.ts`, `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md`
- checks: `npm run typecheck`, `npm test`

Risks/Blockers:
- 실 API 기반 샘플 응답 캡처(필드 alias/complete endpoint 응답 형태)는 여전히 미완료

Next actions:
1. 실 TickTick 토큰 환경에서 `ticktick:smoke` live 실행 및 결과 캡처
2. 통합 에러 매핑 테스트를 401/403/404/5xx 케이스로 확장
3. 운영 문서에 live 검증 결과 반영

## 2026-02-19 20:37 (KST)
Session Goal:
- 통합 에러 매핑 커버리지를 4xx/5xx 축까지 확장해 usecase 경계 회귀 방지를 강화

분석:
- 이전 런에서 통합 테스트는 429/timeout/unknown 중심이었고, auth/not-found/server 계열 분류 검증이 부족했음
- 다음 세션 액션 항목에 401/403/404/5xx 보강 필요가 명시되어 있었음

목표:
- usecase 경계에서 상태코드별 category/retriable/status/responseBody 매핑을 자동 검증
- 문서 상태(현재/다음 세션 계획)를 최신 테스트 범위에 맞춰 갱신

결과:
- `tests/unit/integration-error-mapping.unit.test.ts` 확장
  - 401 -> `auth_401`
  - 403 -> `auth_403`
  - 404 -> `not_found_404`
  - 502 -> `server_5xx`
  - 기존 429/timeout/unknown 시나리오 유지
- 문서 동기화: `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md`

달성:
- `npm run typecheck`, `npm test` 모두 PASS (5 files, 21 tests)
- 상태코드 기반 분류 회귀 감시 범위를 auth/not-found/server까지 확대

What changed:
- `tests/unit/integration-error-mapping.unit.test.ts`
- `docs/current-status.md`
- `docs/next-session.md`
- `docs/progress-log.md`

Evidence:
- files: `tests/unit/integration-error-mapping.unit.test.ts`, `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md`
- checks: `npm run typecheck`, `npm test`

Risks/Blockers:
- 실 API 응답 샘플 캡처(필드 alias 및 complete endpoint 실응답)는 미완료

Next actions:
1. 실 TickTick 토큰 환경에서 `ticktick:smoke` live 실행 및 응답 샘플 저장
2. 네트워크 예외(ECONNRESET/fetch reject) 통합 매핑 테스트 보강
3. 운영 문서(README/SKILL)에 live 검증 결과 반영

## 2026-02-19 21:37 (KST)
Session Goal:
- 네트워크 예외(ECONNRESET/fetch reject) 경로를 통합 에러 매핑 테스트에 추가해 회귀 방지 강화

분석:
- 이전까지 상태코드(401/403/404/429/5xx)와 timeout/unknown은 커버되었지만, 일반 Error/TypeError 기반 네트워크 예외 케이스는 누락
- 다음 세션 액션에서 네트워크 예외 보강이 남아 있었음

목표:
- usecase 경계에서 네트워크 계열 throw(Error/TypeError)가 `network` + retriable로 일관 매핑되는지 검증
- 문서 상태를 최신 테스트 범위에 맞춰 동기화

결과:
- `tests/unit/integration-error-mapping.unit.test.ts` 확장
  - `Error("socket hang up ECONNRESET")` -> `network` + retriable
  - `TypeError("fetch failed")` -> `network` + retriable
  - 기존 401/403/404/429/5xx/timeout/unknown 시나리오 유지
- 문서 동기화: `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md`

달성:
- `npm run typecheck`, `npm test` 모두 PASS (5 files, 23 tests)
- 통합 경계 에러 매핑 회귀 감시가 HTTP 상태코드 + 네트워크 예외까지 확장됨

What changed:
- `tests/unit/integration-error-mapping.unit.test.ts`
- `docs/current-status.md`
- `docs/next-session.md`
- `docs/progress-log.md`

Evidence:
- files: `tests/unit/integration-error-mapping.unit.test.ts`, `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md`
- checks: `npm run typecheck`, `npm test`

Risks/Blockers:
- 실 API sandbox 기반 live smoke 실행/샘플 응답 캡처는 여전히 미완료

Next actions:
1. 실 TickTick 토큰 환경에서 `ticktick:smoke` live 실행 및 응답 샘플 저장
2. gateway 레벨 재시도/회복(일시 실패 후 성공) 시나리오 테스트 추가
3. 운영 문서(README/SKILL)에 live 검증 결과 반영

## 2026-02-19 22:37 (KST)
Session Goal:
- gateway 경계에서 retryable 5xx 회복(첫 실패 후 성공) 동작을 통합 테스트로 검증

분석:
- 기존 통합 테스트는 에러 분류 자체는 폭넓게 커버하지만, 실제 API client 재시도 후 성공 회복 시나리오 검증은 없었음
- 다음 세션 액션에 gateway 레벨 재시도/회복 assertion 보강 항목이 남아 있었음

목표:
- usecase -> gateway -> apiClient 경로에서 첫 5xx 실패 후 재시도로 성공하는 흐름을 자동 검증
- 문서 상태를 최신 테스트 범위로 동기화

결과:
- `tests/unit/integration-error-mapping.unit.test.ts` 확장
  - mock fetch 첫 호출 502, 두 번째 호출 200 응답 구성
  - `listProjects`가 최종 성공하고 fetch 호출 횟수 2회임을 검증
  - 기존 401/403/404/429/timeout/network/unknown 시나리오 유지
- 문서 동기화: `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md`

달성:
- `npm run typecheck`, `npm test` 모두 PASS (5 files, 24 tests)
- 통합 경계 테스트가 에러 분류 + 재시도 회복 동작까지 커버

What changed:
- `tests/unit/integration-error-mapping.unit.test.ts`
- `docs/current-status.md`
- `docs/next-session.md`
- `docs/progress-log.md`

Evidence:
- files: `tests/unit/integration-error-mapping.unit.test.ts`, `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md`
- checks: `npm run typecheck`, `npm test`

Risks/Blockers:
- 실 API sandbox 기반 live smoke 실행/응답 샘플 캡처는 여전히 미완료

Next actions:
1. 실 TickTick 토큰 환경에서 `ticktick:smoke` live 실행 및 응답 샘플 저장
2. 비재시도 4xx에서 재호출 미발생 assertion 보강
3. 운영 문서(README/SKILL)에 live 검증 결과 반영

## 2026-02-19 23:36 (KST)
Session Goal:
- non-retriable 4xx에서 재시도가 발생하지 않음을 통합 테스트로 검증

분석:
- 이전 런에서 retryable 5xx 회복 테스트는 추가됐지만, 반대로 비재시도 4xx 무재시도 보장은 명시적으로 검증되지 않았음
- 다음 세션 액션에 해당 보강이 남아 있었음

목표:
- usecase -> gateway -> apiClient 경로에서 404 발생 시 재시도가 일어나지 않음을 자동 검증
- 문서 상태를 최신 테스트 범위와 동기화

결과:
- `tests/unit/integration-error-mapping.unit.test.ts` 확장
  - mock fetch 1회차 404, 2회차 성공 응답을 준비한 뒤 실제 호출은 1회만 발생함을 assertion
  - 결과적으로 `not_found_404` + non-retriable 매핑 및 no-retry 정책 동시 검증
  - 기존 5xx 복구/네트워크 예외/상태코드 매핑 시나리오 유지
- 문서 동기화: `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md`

달성:
- `npm run typecheck`, `npm test` 모두 PASS (5 files, 25 tests)
- 통합 경계 테스트가 retry와 no-retry 정책을 모두 검증하도록 강화됨

What changed:
- `tests/unit/integration-error-mapping.unit.test.ts`
- `docs/current-status.md`
- `docs/next-session.md`
- `docs/progress-log.md`

Evidence:
- files: `tests/unit/integration-error-mapping.unit.test.ts`, `docs/current-status.md`, `docs/next-session.md`, `docs/progress-log.md`
- checks: `npm run typecheck`, `npm test`

Risks/Blockers:
- 실 API sandbox 기반 live smoke 실행/응답 샘플 캡처는 여전히 미완료

Next actions:
1. 실 TickTick 토큰 환경에서 `ticktick:smoke` live 실행 및 응답 샘플 저장
2. 401/403의 빈 바디/텍스트 바디 에러 응답 매핑 케이스 테스트 보강
3. 운영 문서(README/SKILL)에 live 검증 결과 반영
