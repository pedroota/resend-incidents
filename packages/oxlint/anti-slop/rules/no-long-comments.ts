import { defineRule } from "@oxlint/plugins";

import type { ESTree, SourceCode } from "@oxlint/plugins";

const MAX_COMMENT_LINES = 3;

/** Opt a single long comment out of the rule by writing this marker inside it. */
const ALLOW_MARKER = "lint-allow-long-comment";

/** Tooling pragmas carry behaviour, not prose, so they never count toward a run. */
const DIRECTIVE = /^\s*(oxlint-|eslint-|@ts-|prettier-ignore|biome-ignore|c8 |v8 |istanbul )/u;

function lineSpan(comment: ESTree.Comment): number {
  return comment.loc.end.line - comment.loc.start.line + 1;
}

function isAllowed(comment: ESTree.Comment): boolean {
  return comment.value.includes(ALLOW_MARKER);
}

function startsOwnLine(sourceCode: SourceCode, comment: ESTree.Comment): boolean {
  const tokenBefore = sourceCode.getTokenBefore(comment);
  return tokenBefore === null || tokenBefore.loc.end.line < comment.loc.start.line;
}

/** Flag comments longer than three lines so long explanations become docs or shorter code. */
export const noLongCommentsRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow comments longer than three lines, counting both block comments and glued runs of single-line comments.",
    },
    messages: {
      tooLong:
        `This comment spans {{lines}} lines (max ${MAX_COMMENT_LINES}). Shorten it, turn it into real documentation, or add the \`${ALLOW_MARKER}\` marker for a justified exception.`,
    },
  },
  createOnce(context) {
    return {
      Program(program) {
        const { sourceCode } = context;

        let runStart: ESTree.Comment | null = null;
        let runEnd: ESTree.Comment | null = null;
        let runAllowed = false;

        const flushRun = () => {
          if (runStart !== null && runEnd !== null) {
            const lines = runEnd.loc.end.line - runStart.loc.start.line + 1;
            if (lines > MAX_COMMENT_LINES && !runAllowed) {
              context.report({
                loc: runStart.loc.start,
                messageId: "tooLong",
                data: { lines: String(lines) },
              });
            }
          }
          runStart = null;
          runEnd = null;
          runAllowed = false;
        };

        for (const comment of program.comments) {
          if (comment.type === "Shebang" || DIRECTIVE.test(comment.value)) {
            flushRun();
            continue;
          }

          // A multi-line block stands on its own; report it directly.
          if (lineSpan(comment) > 1) {
            flushRun();
            if (lineSpan(comment) > MAX_COMMENT_LINES && !isAllowed(comment)) {
              context.report({
                loc: comment.loc.start,
                messageId: "tooLong",
                data: { lines: String(lineSpan(comment)) },
              });
            }
            continue;
          }

          // Single-line comment (`//` or `/* */`): glue contiguous ones into a run.
          if (!startsOwnLine(sourceCode, comment)) {
            flushRun();
            continue;
          }

          const gluedToRun =
            runEnd !== null && comment.loc.start.line === runEnd.loc.end.line + 1;
          if (!gluedToRun) flushRun();

          runStart ??= comment;
          runEnd = comment;
          runAllowed = runAllowed || isAllowed(comment);
        }

        flushRun();
      },
    };
  },
});
