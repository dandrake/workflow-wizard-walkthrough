# Instructor notes

This is a living document of notes for instructors. "Living" means you
should feel free to make any changes, additions, updates, or otherwise
to this -- either by editing it right on GitHub, making a fork and PR,
or just leaving an issue in the repo.

Think of this like a wiki -- something that gets frequently updated and
modified, and remember [Wikipedia's "be bold" editing
guideline](https://en.wikipedia.org/wiki/Wikipedia:Be_bold).

## Configuring VS Code

### Disabling inlay/parameter hints

VS Code may, by default, show "inlay hints" (also called parameter
hints): the slightly-dimmed text that the VS Code UI inserts to tell you
the name of the corresponding parameter's name.

This can be very confusing, especially because of the way the UI
displays those hints:

![VS Code screenshot](images/vs-code-parameter-hints.png)

Note the extremely easy-to-miss background highlighting for the hint.

If this is turned on, students will very likely run into these syntax
errors, and have no idea how to fix it, since it appears almost
identical to the first line that shows no syntax error.

**To turn off parameter hints:** open Settings (ctrl/cmd comma) and
search for "inlay" and turn off the inlay hints.

(In the command palette, there's "trigger parameter hints", but that's
different -- it shows a little popup with the function signature.)

### Turn off Copilot

Copilot is very eager to be helpful, and for a language like Java and
example like the Game of Life, there is so much training data that any
reasonable chatbot these days can write *everything* for the student.

If the student enabled GitHub Copilot (or VS Code did so for them), go
to the Extensions pane, search for "copilot" and uninstall the
extensions. (There's Copilot, and Copilot Chat).

But! Copilot Chat and such seems to be deeply baked into VS Code these
days. I followed [these
instructions](https://stackoverflow.com/a/79449364) and added these
settings to `defaultSettings.json`:

```
"github.copilot.enable": false,
"github.copilot.editor.enableAutoCompletions": false,
"github.copilot.editor.enableCodeActions": false,
"github.copilot.nextEditSuggestions.enabled": false,
"github.copilot.renameSuggestions.triggerAutomatically": false,
"chat.commandCenter.enabled": false,
"chat.agent.enabled": false
```

That seemed to truly turn off chat, though I *still* see an icon in the
lower right to set up Copilot, and clicking in there I can turn on the
chat even with the above setting, so it seems we can't truly lock this
down. But of course students can always just go to a browser and copy
and paste, so just making it a bit hard to find seems good enough.
