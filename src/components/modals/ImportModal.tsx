'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { X, Upload, Loader2, CheckSquare } from 'lucide-react';
import Papa from 'papaparse';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const utils = trpc.useUtils();
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload');
  const [importCount, setImportCount] = useState(0);

  const importMutation = trpc.opportunity.bulkImport.useMutation({
    onSuccess: (data) => {
      setImportCount(data.imported);
      setStep('done');
      utils.opportunity.list.invalidate();
    },
  });

  const handlePaste = (text: string) => {
    const result = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
    if (result.data.length > 0) {
      setCsvData(result.data as any[]);
      setHeaders(result.meta.fields || []);
      // Auto-map common column names
      const autoMap: Record<string, string> = {};
      const fields = result.meta.fields || [];
      fields.forEach(f => {
        const lower = f.toLowerCase().replace(/[_\s]/g, '');
        if (lower.includes('customer') || lower.includes('company') || lower.includes('account')) autoMap[f] = 'customerName';
        else if (lower.includes('opportunity') || lower.includes('project') || lower.includes('deal')) autoMap[f] = 'opportunityName';
        else if (lower.includes('status') || lower.includes('stage')) autoMap[f] = 'status';
        else if (lower.includes('tcv') || lower.includes('value') || lower.includes('amount')) autoMap[f] = 'tcv';
        else if (lower.includes('owner') || lower.includes('rep')) autoMap[f] = 'primaryOwner';
        else if (lower.includes('industry')) autoMap[f] = 'industry';
        else if (lower.includes('region')) autoMap[f] = 'region';
        else if (lower.includes('close') || lower.includes('expected')) autoMap[f] = 'expectedCloseDate';
        else if (lower.includes('start')) autoMap[f] = 'startDate';
        else if (lower.includes('source')) autoMap[f] = 'source';
        else if (lower.includes('margin')) autoMap[f] = 'margin';
        else if (lower.includes('duration')) autoMap[f] = 'dealDuration';
        else if (lower.includes('service')) autoMap[f] = 'serviceLine';
        else if (lower.includes('billing') || lower.includes('engagement')) autoMap[f] = 'billingModel';
      });
      setMapping(autoMap);
      setStep('map');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      handlePaste(text);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const opportunities = csvData.map(row => {
      const mapped: any = {};
      Object.entries(mapping).forEach(([csvCol, oppField]) => {
        let val: any = row[csvCol];
        if (oppField === 'tcv' || oppField === 'margin') val = Number(String(val).replace(/[^0-9.-]/g, '')) || 0;
        mapped[oppField] = val;
      });
      // Defaults
      if (!mapped.expectedCloseDate) mapped.expectedCloseDate = new Date(Date.now() + 90*24*60*60*1000).toISOString();
      if (!mapped.startDate) mapped.startDate = new Date().toISOString();
      if (!mapped.primaryOwner) mapped.primaryOwner = 'Unassigned';
      if (!mapped.customerName) mapped.customerName = 'Unknown';
      if (!mapped.opportunityName) mapped.opportunityName = 'Imported Deal';
      return mapped;
    }).filter((o: any) => o.customerName && o.customerName !== 'Unknown');

    importMutation.mutate({ opportunities });
  };

  if (!isOpen) return null;

  const targetFields = ['customerName', 'opportunityName', 'status', 'tcv', 'dealDuration', 'expectedCloseDate', 'startDate', 'primaryOwner', 'industry', 'region', 'source', 'serviceLine', 'billingModel', 'margin'];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-8 pb-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col g-surface rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--g-line)' }}>
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-[#7c3aed]" />
            <h2 className="text-base font-semibold text-foreground">Import Opportunities</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 'upload' && (
            <>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-[#7c3aed]/30 transition-colors relative">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-foreground mb-1">Drop a CSV file or click to upload</p>
                <p className="text-xs text-muted-foreground">Columns: Customer, Project, Stage, TCV, Owner, etc.</p>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <div className="text-center text-xs text-muted-foreground">or paste CSV data below</div>
              <textarea placeholder={"customer,opportunity,status,tcv,owner\nAcme Corp,AI Platform,Discovery,100000,Sreeram"} rows={6}
                className="w-full px-3 py-2 text-xs font-mono bg-card border border-border rounded-lg text-foreground"
                onBlur={e => { if (e.target.value) handlePaste(e.target.value); }} />
            </>
          )}

          {step === 'map' && (
            <>
              <p className="text-sm text-foreground">Map your CSV columns to opportunity fields:</p>
              <div className="space-y-2">
                {headers.map(h => (
                  <div key={h} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-40 truncate">{h}</span>
                    <span className="text-muted-foreground">&rarr;</span>
                    <select value={mapping[h] || ''} onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value }))}
                      className="flex-1 px-2 py-1 text-xs bg-card border border-border rounded-lg text-foreground">
                      <option value="">Skip</option>
                      {targetFields.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep('upload')} className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground">Back</button>
                <button onClick={() => setStep('preview')} className="px-3 py-1.5 text-xs bg-[#7c3aed] text-white rounded-lg">Preview ({csvData.length} rows)</button>
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              <p className="text-sm text-foreground">{csvData.length} opportunities ready to import:</p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead><tr className="border-b" style={{ borderColor: 'var(--g-line)' }}>
                    {Object.values(mapping).filter(Boolean).slice(0, 5).map(f => <th key={f} className="px-2 py-1.5 text-left g-section-label">{f}</th>)}
                  </tr></thead>
                  <tbody>
                    {csvData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b" style={{ borderColor: 'var(--g-line)' }}>
                        {Object.entries(mapping).filter(([,v]) => v).slice(0, 5).map(([csvCol, field]) => (
                          <td key={field} className="px-2 py-1.5 text-foreground">{row[csvCol]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvData.length > 5 && <p className="text-[10px] text-muted-foreground">...and {csvData.length - 5} more rows</p>}
              <div className="flex gap-2">
                <button onClick={() => setStep('map')} className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground">Back</button>
                <button onClick={handleImport} disabled={importMutation.isPending}
                  className="px-3 py-1.5 text-xs bg-[#7c3aed] text-white rounded-lg disabled:opacity-50">
                  {importMutation.isPending ? <><Loader2 className="h-3 w-3 animate-spin inline mr-1" />Importing...</> : `Import ${csvData.length} Opportunities`}
                </button>
              </div>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-8">
              <CheckSquare className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-lg font-semibold text-foreground">{importCount} opportunities imported!</p>
              <p className="text-sm text-muted-foreground mt-1">They are now visible in your pipeline.</p>
              <button onClick={onClose} className="mt-4 px-4 py-2 text-sm bg-[#7c3aed] text-white rounded-lg">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
