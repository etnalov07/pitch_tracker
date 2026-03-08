---
name: github
description: Interact with GitHub - manage PRs, issues, releases, and repo settings using the gh CLI.
allowed-tools: Bash(gh *), Read, Grep
argument-hint: [action] [args...]
---

# GitHub Operations

Use the `gh` CLI to interact with GitHub. Parse the user's request and execute the appropriate command(s).

## Pull Requests

| Action | Command |
|--------|---------|
| List open PRs | `gh pr list` |
| View PR details | `gh pr view <number>` |
| View PR diff | `gh pr diff <number>` |
| View PR checks | `gh pr checks <number>` |
| View PR comments | `gh api repos/{owner}/{repo}/pulls/<number>/comments` |
| Create PR | `gh pr create --title "..." --body "..."` |
| Comment on PR | `gh pr comment <number> --body "..."` |
| Merge PR | `gh pr merge <number> --merge` |
| Review PR | Fetch diff with `gh pr diff`, analyze, and summarize |

## Issues

| Action | Command |
|--------|---------|
| List open issues | `gh issue list` |
| View issue | `gh issue view <number>` |
| Create issue | `gh issue create --title "..." --body "..."` |
| Close issue | `gh issue close <number>` |
| Comment on issue | `gh issue comment <number> --body "..."` |

## Repository

| Action | Command |
|--------|---------|
| View repo info | `gh repo view` |
| List releases | `gh release list` |
| View release | `gh release view <tag>` |
| List workflow runs | `gh run list` |
| View workflow run | `gh run view <run-id>` |

## Notifications & Search

| Action | Command |
|--------|---------|
| List notifications | `gh api notifications` |
| Search issues/PRs | `gh search issues "<query>"` or `gh search prs "<query>"` |

## Guidelines

- When reviewing a PR, fetch the diff and provide structured feedback on code quality, bugs, and suggestions.
- When creating PRs or issues, ask the user for details if not provided.
- Always show the URL of created resources so the user can navigate to them.
- For destructive actions (closing, merging, deleting), confirm with the user first.
- If `$ARGUMENTS` is provided, interpret it as the action to perform.
