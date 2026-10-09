/**
 * KFC Pipeline Cockpit tests — Task 3.4, Phase 3.
 *
 * Focuses on the pure rendering logic (markdown block parsing, unified-diff
 * classification) plus the component's idle state and stage-rail a11y contract.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import {
  KFCPipelineCockpit,
  MarkdownView,
  MermaidBlock,
  DiffInspector,
  parseMarkdownBlocks,
  parseDiff,
} from '@/components/dashboard/KFCPipelineCockpit';

describe('parseMarkdownBlocks', () => {
  it('parses headings with their level', () => {
    const blocks = parseMarkdownBlocks('# Title\n## Sub');
    expect(blocks[0]).toMatchObject({ kind: 'heading', level: 1, content: 'Title' });
    expect(blocks[1]).toMatchObject({ kind: 'heading', level: 2, content: 'Sub' });
  });

  it('parses unordered lists into items', () => {
    const blocks = parseMarkdownBlocks('- one\n- two\n- three');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: 'list' });
    expect(blocks[0].items).toEqual(['one', 'two', 'three']);
  });

  it('classifies a ```mermaid fence as a mermaid block', () => {
    const blocks = parseMarkdownBlocks('```mermaid\ngraph TD\n  A-->B\n```');
    expect(blocks[0]).toMatchObject({ kind: 'mermaid' });
    expect(blocks[0].content).toContain('A-->B');
  });

  it('classifies a generic fence as a code block', () => {
    const blocks = parseMarkdownBlocks('```ts\nconst x = 1;\n```');
    expect(blocks[0]).toMatchObject({ kind: 'code', language: 'ts' });
    expect(blocks[0].content).toBe('const x = 1;');
  });

  it('joins wrapped lines into a single paragraph', () => {
    const blocks = parseMarkdownBlocks('line one\nline two');
    expect(blocks[0]).toMatchObject({ kind: 'paragraph', content: 'line one line two' });
  });
});

describe('parseDiff', () => {
  it('classifies add / remove / context / hunk lines', () => {
    const lines = parseDiff('@@ -1 +1 @@\n const a = 1;\n-const b = 2;\n+const b = 3;');
    expect(lines.map((l) => l.type)).toEqual(['hunk', 'context', 'remove', 'add']);
  });

  it('treats +++ and --- file headers as hunk markers, not add/remove', () => {
    const lines = parseDiff('--- a/file.ts\n+++ b/file.ts');
    expect(lines.every((l) => l.type === 'hunk')).toBe(true);
  });
});

describe('MarkdownView', () => {
  it('renders headings, list items and bold text', () => {
    render(<MarkdownView markdown={'# Report\n- **Alpha** item\n- Beta'} />);
    expect(screen.getByText('Report')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('renders a mermaid block with its labelled caption', () => {
    render(<MarkdownView markdown={'```mermaid\ngraph TD\n  X-->Y\n```'} />);
    expect(screen.getByText(/mermaid diagram/i)).toBeInTheDocument();
    expect(screen.getByText(/X-->Y/)).toBeInTheDocument();
  });
});

describe('MermaidBlock', () => {
  it('exposes the diagram source in a labelled figure', () => {
    render(<MermaidBlock source={'graph TD\n  A-->B'} />);
    expect(screen.getByRole('figure')).toBeInTheDocument();
    expect(screen.getByText(/A-->B/)).toBeInTheDocument();
  });
});

describe('DiffInspector', () => {
  it('summarizes additions and deletions', () => {
    render(<DiffInspector diff={' context\n-old\n+new\n+extra'} />);
    // One deletion, two additions.
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();
    expect(screen.getByText('Unified diff')).toBeInTheDocument();
  });
});

describe('KFCPipelineCockpit', () => {
  it('renders all five pipeline stages in the rail', () => {
    render(<KFCPipelineCockpit />);
    const rail = screen.getByRole('list', { name: /pipeline stages/i });
    expect(within(rail).getByText(/requirements/i)).toBeInTheDocument();
    expect(within(rail).getByText(/design/i)).toBeInTheDocument();
    expect(within(rail).getByText(/implementation/i)).toBeInTheDocument();
    expect(within(rail).getByText(/judgement/i)).toBeInTheDocument();
    expect(within(rail).getByText(/^test$/i)).toBeInTheDocument();
  });

  it('prompts the user to run the pipeline before any artifact exists', () => {
    render(<KFCPipelineCockpit />);
    expect(screen.getByText(/run the pipeline to generate stage artifacts/i)).toBeInTheDocument();
  });

  it('pre-fills the prompt from the initialPrompt prop (deep-link support)', () => {
    render(<KFCPipelineCockpit initialPrompt="Refactor the evidence fabric" />);
    expect(screen.getByLabelText('Prompt')).toHaveValue('Refactor the evidence fabric');
  });

  it('lets the user switch the selected stage', async () => {
    const user = userEvent.setup();
    render(<KFCPipelineCockpit />);

    await user.click(screen.getByRole('button', { name: /design/i }));
    expect(screen.getByRole('button', { name: /design/i })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });
});
