import { useState } from 'react';
import { X, Plus } from 'lucide-react';

export default function TieredKeywordEditor({ values = [], onChange }) {
  const [input, setInput] = useState('');
  const [tier, setTier] = useState('anchor');

  const anchors = values.map((v, i) => ({ ...v, _idx: i })).filter(v => v.tier !== 'modifier');
  const modifiers = values.map((v, i) => ({ ...v, _idx: i })).filter(v => v.tier === 'modifier');

  const add = () => {
    const phrase = input.toLowerCase().trim();
    if (!phrase) return;
    if (values.some(v => v.phrase === phrase)) return;
    onChange([...values, { phrase, tier }]);
    setInput('');
  };

  const remove = (idx) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[11px] font-semibold uppercase tracking-wider border border-emerald-100">
            Anchor
          </span>
          <span className="text-[11px] text-muted-foreground">{anchors.length} phrases — qualify a post as a candidate</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2.5">Incident-specific, injury-specific, problem-specific phrases that describe what happened to a person.</p>
        <div className="flex flex-wrap gap-1.5 min-h-[32px]">
          {anchors.map(v => (
            <span key={v._idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-100">
              {v.phrase}
              <button type="button" onClick={() => remove(v._idx)} className="hover:text-emerald-900 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {anchors.length === 0 && <span className="text-xs text-muted-foreground italic">No anchor phrases yet</span>}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[11px] font-semibold uppercase tracking-wider border border-amber-100">
            Modifier
          </span>
          <span className="text-[11px] text-muted-foreground">{modifiers.length} terms — add context, never qualify alone</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2.5">Generic professional or industry terms. These never qualify a post by themselves.</p>
        <div className="flex flex-wrap gap-1.5 min-h-[32px]">
          {modifiers.map(v => (
            <span key={v._idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium border border-amber-100">
              {v.phrase}
              <button type="button" onClick={() => remove(v._idx)} className="hover:text-amber-900 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {modifiers.length === 0 && <span className="text-xs text-muted-foreground italic">No modifier terms yet</span>}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          className="flex-1 px-3.5 py-2.5 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-accent/15 transition-all"
          placeholder="Type a phrase and press Enter..."
        />
        <select
          value={tier}
          onChange={e => setTier(e.target.value)}
          className="px-3 py-2.5 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-accent/15 transition-all"
        >
          <option value="anchor">Anchor</option>
          <option value="modifier">Modifier</option>
        </select>
        <button type="button" onClick={add} className="btn-secondary">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}