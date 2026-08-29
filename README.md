# Civic DNA

Civic DNA is a hackathon project for building tools that make civic information easier to understand, connect, and use. This repository is the shared foundation for a multi-developer team; application features will be added in later iterations.

## Architecture

The project is organized as a modular system:

- A web client lives in `frontend/`.
- An API and server-side orchestration live in `backend/`.
- AI-specific prompts, evaluation assets, and integrations live in `ai/`.
- Reusable independently deployable capabilities live in `services/`.
- Source datasets and controlled local data assets live in `data/`.
- Cross-cutting code and assets live in `shared/`.
- Interface contracts and validation schemas live in `contracts/` and `schemas/`.
- Automated checks live in `tests/`.

## Directory guide

| Directory | Intended use |
| --- | --- |
| `backend/` | API, server configuration, and backend integrations. |
| `frontend/` | React/UI code, client assets, and browser tests. |
| `ai/` | AI workflows, prompts, model adapters, and evaluations. |
| `services/` | Domain services that can be developed or deployed independently. |
| `data/` | Documented source data, fixtures, and non-sensitive local datasets. |
| `shared/` | Shared utilities, constants, types, and design assets. |
| `contracts/` | API/event contracts shared between components. |
| `schemas/` | Validation and data-model schemas. |
| `tests/` | Cross-component, integration, and end-to-end test suites. |

## Local development setup

This initial scaffold has no runnable application or dependency manifests yet. To prepare a local copy:

```powershell
git clone <repository-url>
cd civic-dna
Copy-Item .env.example .env
```

Add the required values to `.env` locally. Individual component setup commands will be documented here once their package manifests are introduced.

## Git workflow

1. Start from an up-to-date `main` branch.
2. Create a focused branch, for example `feat/civic-search` or `fix/schema-validation`.
3. Make small, cohesive commits with clear messages.
4. Run the relevant checks before opening a pull request.
5. Open a pull request for review; merge only after approval and required checks pass.

Avoid committing secrets, generated files, local environment files, or unreviewed datasets.
