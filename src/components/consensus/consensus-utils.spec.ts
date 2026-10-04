import { describe, it, expect } from 'vitest';
import { buildFieldTree, collectBranchNotes } from './consensus-utils';

const ans = (annotatorId: string, value: unknown, submitted = true) => ({
  annotatorId,
  annotatorName: `Dr ${annotatorId}`,
  value,
  submitted,
});

const field = (fieldName: string, extra: any = {}) => ({ fieldName, annotatorAnswers: [], ...extra });

const rootOf = (fields: any[]) => buildFieldTree(fields)[0];

describe('collectBranchNotes', () => {
  it('returns notes from a LOSING_BRANCH child', () => {
    const root = rootOf([
      field('q1'),
      field('q1_child', { parentPath: 'q1', question: 'Further questions?', branchStatus: 'LOSING_BRANCH', annotatorAnswers: [ans('a', 'ask about fever')] }),
    ]);
    expect(collectBranchNotes(root)).toEqual([
      { question: 'Further questions?', fieldName: 'q1_child', notes: [{ annotatorId: 'a', annotatorName: 'Dr a', value: 'ask about fever' }] },
    ]);
  });

  it('skips empty and unsubmitted answers', () => {
    const root = rootOf([
      field('q1'),
      field('c', {
        parentPath: 'q1',
        branchStatus: 'LOSING_BRANCH',
        annotatorAnswers: [ans('a', ''), ans('b', '  '), ans('c', '[]'), ans('d', []), ans('e', null), ans('f', 'real', false), ans('g', 'kept')],
      }),
    ]);
    const res = collectBranchNotes(root);
    expect(res[0].notes.map((n) => n.annotatorId)).toEqual(['g']);
  });

  it('omits children with no usable notes and does not include active children', () => {
    const root = rootOf([
      field('q1'),
      field('active', { parentPath: 'q1', annotatorAnswers: [ans('a', 'x')] }),
      field('dead', { parentPath: 'q1', branchStatus: 'LOSING_BRANCH', annotatorAnswers: [ans('a', '')] }),
    ]);
    expect(collectBranchNotes(root)).toEqual([]);
  });

  it('includes a grandchild under an inactive child, falling back to fieldName', () => {
    const root = rootOf([
      field('q1'),
      field('child', { parentPath: 'q1', branchStatus: 'LOSING_BRANCH', annotatorAnswers: [ans('a', 'c')] }),
      field('grand', { parentPath: 'child', annotatorAnswers: [ans('a', 'g')] }),
    ]);
    const res = collectBranchNotes(root);
    expect(res.map((r) => r.fieldName)).toEqual(['child', 'grand']);
    expect(res[1].question).toBe('grand');
  });

  it('drops excluded annotators', () => {
    const root = rootOf([
      field('q1'),
      field('c', { parentPath: 'q1', branchStatus: 'LOSING_BRANCH', annotatorAnswers: [ans('a', 'x'), ans('b', 'y')] }),
    ]);
    expect(collectBranchNotes(root, ['a'])[0].notes.map((n) => n.annotatorId)).toEqual(['b']);
    expect(collectBranchNotes(root, ['a', 'b'])).toEqual([]);
  });
});
