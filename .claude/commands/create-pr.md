You are helping create a pull request for `@voxcape/nestjs-notifications`. Follow the steps below carefully and sequentially.

---

## Step 1: Gather context

Run these commands to understand the current state:

```
git branch --show-current
git status
git log --oneline -10
git diff HEAD --stat
```

---

## Step 2: Determine the starting situation

Based on the output above, identify which scenario applies:

### Scenario A — Already on a feature branch (not `main`)
Proceed to Step 4 to commit any pending changes and open the PR.

### Scenario B — On `main` with no staged/unstaged changes and no unpushed commits ahead of origin/main
There is nothing to put in a PR. Tell the user:
> "You're on `main` with a clean working tree. Make some changes first, or tell me what you're working on and I'll create a branch for you."
Then stop.

### Scenario C — On `main` with staged/unstaged changes (or commits not yet in a PR)
The user needs a feature branch. Proceed to Step 3.

---

## Step 3: Create a feature branch (only if on `main`)

**Determine the branch name:**

<% if ($ARGUMENTS) { %>
The user provided a hint: `$ARGUMENTS`

Use this to derive a branch name in conventional commit style:
- Format: `<type>/<short-kebab-description>`
- Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`
- Example: "add pusher adapter" → `feat/add-pusher-adapter`
- Example: "fix mail header injection" → `fix/mail-header-injection`

Propose the branch name to the user and ask them to confirm or modify before creating it.
<% } else { %>
No hint was provided. Inspect the staged/unstaged changes and recent git log to infer what's being worked on, then:
1. Propose a branch name in `<type>/<short-kebab-description>` format
2. Ask the user to confirm or suggest a different name before creating it
<% } %>

Once confirmed, create and switch to the branch:
```
git checkout -b <branch-name>
```

---

## Step 4: Commit any pending changes

If there are staged or unstaged changes that haven't been committed yet:

1. Show the user a summary of what will be committed (`git diff HEAD --stat`)
2. Draft a commit message using Conventional Commit format:
   - Format: `<type>(<scope>): <imperative short description>`
   - Scope examples: `queue`, `mail`, `broadcast`, `worker`, `module`, `adapter`
   - Example: `feat(queue): add delayed dispatch support`
3. Confirm the message with the user, then stage all relevant changes and commit:
```
git add <relevant files>
git commit -m "<confirmed message>"
```

If the working tree is already clean (all changes are committed), skip this step.

---

## Step 5: Push the branch

```
git push -u origin <branch-name>
```

If the push is rejected (e.g. branch already exists on remote with diverged history), tell the user and stop — do not force push without explicit instruction.

---

## Step 6: Generate and create the PR

Collect all commits on this branch that are not on `main`:
```
git log main..HEAD --oneline
git diff main...HEAD --stat
```

Use this to write the PR:

**Title:** One line, conventional commit style, under 70 characters.
`<type>(<scope>): <what this PR does>`

**Body:** Use this structure:
```
## Summary
- <bullet: what changed and why>
- <bullet: any new env vars, tokens, or breaking changes>

## Changes
- <bullet: files/modules touched>

## Test plan
- [ ] `npm test` passes
- [ ] <any specific scenario worth calling out>

## Notes
<optional: migration steps, reviewer hints, related issues>

🤖 Generated with [Claude Code](https://claude.ai/code)
```

Show the user the draft title and body and ask them to confirm or edit before creating the PR.

Once confirmed, create the PR targeting `main`:
```
gh pr create --title "<title>" --body "<body>" --base main
```

Return the PR URL to the user when done.
