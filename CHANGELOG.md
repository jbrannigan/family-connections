# Changelog

All notable changes to Family Connections will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-02-05

### Added
- Initial project scaffold with Next.js 16, TypeScript, Tailwind CSS 4
- Supabase authentication with password-based login
- Family graph creation with invite codes for sharing
- Person and relationship management (6 relationship types)
- TreeDown bulk import with preview and gender-based surname inference
- Interactive tree visualization (SimpleTreeView with couple nodes, pan/zoom)
- List view with person cards and inline relationship management
- Kinship calculator (BFS pathfinding for relationship labels)
- ISO 8601 reduced-precision date support (year, year-month, full date)
- CI pipeline with lint, type check, and build (GitHub Actions)
- Project documentation (CLAUDE.md, SETUP.md, NEXT-STEPS.md, README.md)
- Database schema with Row-Level Security policies
- 241 people and 403 relationships imported (Brannigan/McGinty family tree)
