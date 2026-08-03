import { ArrowLeft, Cloud, Globe, Laptop, WarningCircle, Wrench } from '@phosphor-icons/react';
import type { ProcessingType, ToolDefinition, ToolStatus } from '../types';

const STATUS_LABELS: Record<ToolStatus, string> = {
  functional: 'Functional',
  beta: 'Beta',
  'coming-soon': 'Coming Soon',
  disabled: 'Temporarily Unavailable',
};

export function ToolStatusBadge({ status }: { status: ToolStatus }) {
  const tone = status === 'functional'
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    : status === 'beta'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
      : status === 'coming-soon'
        ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
        : 'border-red-500/40 bg-red-500/10 text-red-300';

  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tone}`}>{STATUS_LABELS[status]}</span>;
}

const PROCESSING_COPY: Record<ProcessingType, string> = {
  browser: 'Processed locally in your browser.',
  server: 'This operation sends data to PanUtility’s server.',
  external: 'This operation sends data or URLs to a third-party provider.',
  none: 'Processing is not available for this tool.',
};

export function ProcessingPrivacyBadge({ tool }: { tool: ToolDefinition }) {
  const Icon = tool.processingType === 'browser' ? Laptop : tool.processingType === 'server' ? Cloud : tool.processingType === 'external' ? Globe : Wrench;
  return (
    <div data-testid="processing-privacy" className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-left">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
        <Icon className="h-4 w-4 text-emerald-400" />
        {PROCESSING_COPY[tool.processingType]}
      </div>
      {tool.privacyNotice && <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">{tool.privacyNotice}</p>}
    </div>
  );
}

function AvailabilityShell({ tool, onBack, disabled }: { tool: ToolDefinition; onBack: () => void; disabled: boolean }) {
  return (
    <section data-testid={disabled ? 'disabled-tool' : 'coming-soon-tool'} className="mx-auto max-w-2xl rounded-2xl border border-zinc-800 bg-[#0d0d0f] p-6 sm:p-10">
      <button onClick={onBack} className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300">
        <ArrowLeft className="h-4 w-4" /> Back to catalog
      </button>
      <div className="flex items-start gap-4">
        <div className={`rounded-xl p-3 ${disabled ? 'bg-red-500/10 text-red-300' : 'bg-blue-500/10 text-blue-300'}`}>
          {disabled ? <WarningCircle className="h-7 w-7" /> : <Wrench className="h-7 w-7" />}
        </div>
        <div>
          <ToolStatusBadge status={tool.status} />
          <h1 className="mt-4 text-3xl font-bold text-white">{tool.name}</h1>
          <p className="mt-3 leading-relaxed text-zinc-400">{tool.description}</p>
          <p className="mt-5 rounded-xl border border-zinc-800 bg-black/30 p-4 text-sm leading-relaxed text-zinc-300">
            {disabled ? tool.statusReason : 'Processing for this tool is not implemented yet. No file is uploaded and no output is created on this page.'}
          </p>
        </div>
      </div>
      <div className="mt-6"><ProcessingPrivacyBadge tool={tool} /></div>
    </section>
  );
}

export function ComingSoonTool(props: { tool: ToolDefinition; onBack: () => void }) {
  return <AvailabilityShell {...props} disabled={false} />;
}

export function DisabledTool(props: { tool: ToolDefinition; onBack: () => void }) {
  return <AvailabilityShell {...props} disabled />;
}

export function ToolNotFound({ onBack }: { onBack: () => void }) {
  return (
    <section data-testid="tool-not-found" className="mx-auto max-w-xl rounded-2xl border border-zinc-800 bg-[#0d0d0f] p-8 text-center">
      <WarningCircle className="mx-auto h-10 w-10 text-amber-300" />
      <h1 className="mt-4 text-3xl font-bold text-white">Tool not found</h1>
      <p className="mt-3 text-zinc-400">This route does not match a tool in the PanUtility catalog.</p>
      <button onClick={onBack} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-bold text-black">
        <ArrowLeft className="h-4 w-4" /> Back to catalog
      </button>
    </section>
  );
}
