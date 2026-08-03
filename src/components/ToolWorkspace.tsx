import { lazy, Suspense, type ReactNode } from 'react';
import type { ToolDefinition } from '../types';
import { ComingSoonTool, DisabledTool, ProcessingPrivacyBadge, ToolStatusBadge } from './ToolAvailability';

const ImageConverter = lazy(() => import('./ImageConverter'));
const PdfCompiler = lazy(() => import('./PdfCompiler'));
const AudioTrimmer = lazy(() => import('./AudioTrimmer'));
const QrGenerator = lazy(() => import('./QrGenerator'));
const ColorExtractor = lazy(() => import('./ColorExtractor'));
const GenericUtilityWorkspace = lazy(() => import('./GenericUtilityWorkspace'));

interface ToolWorkspaceProps {
  tool: ToolDefinition;
  onBack: () => void;
  initialFile?: File;
}

function EnabledToolFrame({ tool, children }: { tool: ToolDefinition; children: ReactNode }) {
  return (
    <div data-testid="enabled-tool-workspace">
      <div className="mx-auto mb-4 flex max-w-4xl flex-wrap items-center gap-3 px-4">
        <ToolStatusBadge status={tool.status} />
        <div className="min-w-[260px] flex-1"><ProcessingPrivacyBadge tool={tool} /></div>
      </div>
      {children}
    </div>
  );
}

function renderEnabledTool(tool: ToolDefinition, onBack: () => void, initialFile?: File) {
  switch (tool.componentKey) {
    case 'image-converter': return <ImageConverter onBack={onBack} initialFile={initialFile} />;
    case 'pdf-compiler': return <PdfCompiler onBack={onBack} initialFile={initialFile} />;
    case 'audio-trimmer': return <AudioTrimmer onBack={onBack} initialFile={initialFile} />;
    case 'qr-generator': return <QrGenerator onBack={onBack} />;
    case 'color-extractor': return <ColorExtractor onBack={onBack} initialFile={initialFile} />;
    case 'generic': return <GenericUtilityWorkspace tool={tool} onBack={onBack} initialFile={initialFile} />;
    case undefined: throw new Error(`Enabled tool ${tool.id} is missing a component key.`);
  }
}

export default function ToolWorkspace({ tool, onBack, initialFile }: ToolWorkspaceProps) {
  if (tool.status === 'coming-soon') return <ComingSoonTool tool={tool} onBack={onBack} />;
  if (tool.status === 'disabled') return <DisabledTool tool={tool} onBack={onBack} />;

  return (
    <EnabledToolFrame tool={tool}>
      <Suspense fallback={<div role="status" className="p-10 text-center text-sm text-zinc-400">Loading tool workspace…</div>}>
        {renderEnabledTool(tool, onBack, initialFile)}
      </Suspense>
    </EnabledToolFrame>
  );
}
