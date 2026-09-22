# Task: T02 Azure Deployment

## Status: in_progress

## Goal

Next.js 앱을 Azure App Service에 배포하고, Key Vault와 App Service Managed Identity를 통해 Entra·Cosmos 설정을 안전하게 주입한다. 운영 환경에서 callback URL, CORS/보안 헤더, Cosmos 권한을 검증한다.

## Decision Summary

- Azure App Service에 배포한다.
- Azure Key Vault + App Service Managed Identity로 비밀값을 관리한다.
- Cosmos DB API for NoSQL을 사용한다.
- 사용 가능한 Entra 테넌트와 Azure 구독이 이미 있다.

## Implementation

### I01. 배포 설정과 runtime configuration

- Related Files:
  - `vibe_game/azure/app-service.md` :: 리소스·환경변수·권한 절차; new
  - `vibe_game/azure/key-vault.md` :: secret 이름과 access policy/RBAC; new
  - `vibe_game/next.config.ts` :: production runtime 설정; modify
  - `vibe_game/src/server/config/runtimeConfig.ts` :: 서버 환경 검증; new
  - `vibe_game/.github/workflows/deploy.yml` :: CI/CD 정의; new

#### Details

- Key Vault secret names는 `Cosmos--Endpoint`, `Cosmos--Database`, `Entra--ClientId`, `Entra--TenantId`처럼 일관된 명명 규칙을 사용한다.
- App Service Managed Identity에는 Key Vault secrets read와 Cosmos DB data contributor에 필요한 최소 권한만 부여한다.
- production redirect URI는 정확한 HTTPS origin으로만 등록한다.
- build-time public config와 runtime server secret을 분리한다.
- production logs에 token, raw input payload, Cosmos key를 출력하지 않는다.

### I02. 배포 smoke test

- Related Files:
  - `vibe_game/scripts/smoke-test.ts` :: health/authenticated API smoke test; new
  - `vibe_game/src/app/api/health/route.ts` :: `GET`; new
  - `vibe_game/azure/rollback.md` :: 이전 배포 복구 절차; new

#### Details

- `/api/health`는 secret을 노출하지 않고 app version, build id, dependency availability만 반환한다.
- 배포 후 비로그인 landing, Entra login callback, active session GET, leaderboard GET을 순서대로 확인한다.
- Cosmos 장애 시 landing과 로그인은 가능한 한 유지하고, gameplay save/leaderboard에는 명확한 degraded 상태를 표시한다.

## Acceptance Criteria

- [ ] App Service에서 production build가 실행된다.
- [ ] App Service identity로 Key Vault와 Cosmos에 접근하고 정적 secret을 배포 파일에 넣지 않는다.
- [ ] Entra redirect URI가 production origin과 일치한다.
- [ ] health endpoint와 배포 smoke test가 통과한다.
- [ ] 롤백 절차와 필요한 Azure 권한이 문서화되어 있다.

## Validation

- `cd vibe_game; npm run build`
- `cd vibe_game; npm run start`
- Azure App Service 배포 후 `npm run smoke-test -- --base-url https://<app-service-host>`
- Azure Portal에서 Managed Identity의 Key Vault/Cosmos 접근 로그 확인

## Commit Message

```text
chore(deploy): configure azure app service release

Plan: 2026-09-21-office-rhythm-game
Phase: P04-azure-release
Task: T02-azure-deployment

- Document App Service, Key Vault and managed identity setup
- Add production health and deployment smoke checks
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

### Progress Notes (2026-09-22)

- Implemented App Service, Key Vault, rollback, standalone Next.js, security headers, runtime metadata, health endpoint, smoke-test runner, and manual OIDC deployment workflow.
- Local validation: lint completed with 0 errors (one pre-existing warning); typecheck, all 67 tests, and production build passed. Standalone server started; local landing check passed.
- Created `Vibe-Coding-Game-Jun` in West US 2, a Linux F1 Node 24 App Service (`vibe-game-jun-rhythm-260922.azurewebsites.net`), and Cosmos DB NoSQL account `vibe-coding-game-jun-cosmos` with free tier enabled and a strict 1,000 RU/s account throughput limit. Created `office-rhythm` with shared 1,000 RU/s and the `gameSessions` / `gameResults` containers; the latter has the leaderboard composite index. App Service system identity has database-scoped Cosmos Built-in Data Contributor; HTTPS-only is enabled.
- Added the Azure HTTPS origin to the existing Entra SPA redirect list while preserving localhost redirects. Production deployment and hosted smoke test remain to be completed.
- Local health smoke returned HTTP 503 because no production Cosmos Managed Identity connection is configured here; this is expected locally. Azure hosted health and authenticated API checks remain unverified.
- Current design has no production secret: Entra SPA IDs and Cosmos endpoint/database are configuration, while Cosmos uses Managed Identity. No empty Key Vault was provisioned; public IDs and Cosmos keys were not misclassified as vault secrets. The guide documents least-privilege Key Vault references for a future genuine server secret.
- Remaining: deploy the current verified source to the F1 web app, confirm hosted Cosmos health and Entra sign-in, then complete the task and advance the pointer.
