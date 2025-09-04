# W^3: a workflow wizard walkthrough

Instead of a document with a long list of directions and various steps
and choices to take along the way, here's a simple HTML page that walks
the user through the workflow -- like the classic installation "wizard".

Inspired by the [CS 127 VS Code install document](
https://docs.google.com/document/d/1RJuwG1kIlrMOu8zurt7vIXsyJJwpuaTZSJqE8J6R_sc/edit?tab=t.0#heading=h.8u25xpyazgt2).

## How to write the workflow

Should be straightforward, see the JSON file.

## Running/viewing

- https://dandrake.github.io/workflow-wizard-walkthrough/
- locally: the simplest way is likely to just do `python -m http.server
  8000` in this directory.

## Other notes

See [the instructor notes](instructor_notes.md) for things we've run
into and what to do about them. Add things there as you see fit.

### Choosing the platform

Eventually we'll have to think about ARM-based Windows machines -- think
-- the Surface Pro or Copilot PCs, etc.

### Installing Java

#### Linux

Ubuntu ships a super old version of gradle, and getting things to work
there from the terminal (that is, not in VS Code) is tricky.
