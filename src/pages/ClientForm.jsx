import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, Loader2 } from 'lucide-react';
import { clients } from '@/services/db';
import { ai } from '@/services/ai';
import TagInput from '@/components/TagInput';

const categoryOptions = ['Personal Injury', 'Dental', 'Chiropractor', 'Medical', 'Legal', 'Real Estate', 'Home Services', 'Other'];

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: '', category: '', website: '', locations: [], services: [], keywords: [],
    expanded_keywords: [], subreddits: [], response_tone: '', notes: '', is_active: true,
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [aiName, setAiName] = useState('');
  const [aiWebsite, setAiWebsite] = useState('');
  const [aiIndustry, setAiIndustry] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const client = await clients.get(id);
        setForm(client);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleAiOnboard = async () => {
    const name = aiName.trim() || form.name;
    const website = aiWebsite.trim() || form.website;
    const industry = aiIndustry.trim() || form.category;
    if (!name || !industry) {
      setError('Please enter at least a business name and industry to use AI onboarding.');
      return;
    }
    setAiLoading(true);
    setError(null);
    try {
      const data = await ai.onboardClient({
        business_name: name,
        website: website || '',
        industry,
      });
      setForm(prev => ({
        ...prev,
        name: prev.name || name,
        website: prev.website || website,
        category: prev.category || data.category || industry,
        keywords: data.keywords || prev.keywords,
        expanded_keywords: data.expanded_keywords || prev.expanded_keywords,
        subreddits: data.subreddits || prev.subreddits,
        locations: data.locations || prev.locations,
        services: data.services || prev.services,
        response_tone: data.response_tone || prev.response_tone,
      }));
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'AI onboarding failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await clients.update(id, form);
      } else {
        await clients.create(form);
      }
      navigate('/');
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-7 h-7 border-[2.5px] border-border border-t-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  const inputCls = "w-full px-3.5 py-2.5 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-accent/15 transition-all";
  const labelCls = "block text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider";

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-[24px] font-semibold text-foreground tracking-tight">{isEdit ? 'Edit Client' : 'New Client'}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{isEdit ? 'Update client details' : 'Add a new client to monitor'}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-600 text-sm mb-5">{error}</div>}

      {!isEdit && (
        <div className="rounded-2xl border border-accent/20 p-6 mb-5 bg-gradient-to-br from-accent/5 to-accent/0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">AI Onboarding Assistant</h3>
          </div>
          <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">Enter your business details and let AI suggest keywords, subreddits, locations, services, and competitors. You can edit everything before saving.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <input value={aiName} onChange={e => setAiName(e.target.value)} className={inputCls} placeholder="Business name" />
            <input value={aiWebsite} onChange={e => setAiWebsite(e.target.value)} className={inputCls} placeholder="Website (optional)" />
            <input value={aiIndustry} onChange={e => setAiIndustry(e.target.value)} className={inputCls} placeholder="Industry (e.g. Personal Injury)" />
          </div>
          <button type="button" onClick={handleAiOnboard} disabled={aiLoading} className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all">
            {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Researching...</> : <><Sparkles className="w-4 h-4" /> Generate Suggestions</>}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card-premium p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Client Name</label>
            <input required value={form.name} onChange={e => update('name', e.target.value)} className={inputCls} placeholder="Charlotte Injury Lawyers" />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select required value={form.category} onChange={e => update('category', e.target.value)} className={inputCls}>
              <option value="">Select...</option>
              {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Website</label>
          <input value={form.website || ''} onChange={e => update('website', e.target.value)} className={inputCls} placeholder="https://example.com" />
        </div>
        <div>
          <label className={labelCls}>Locations Served</label>
          <TagInput values={form.locations || []} onChange={v => update('locations', v)} placeholder="Charlotte, NC — press Enter to add" />
        </div>
        <div>
          <label className={labelCls}>Services Offered</label>
          <TagInput values={form.services || []} onChange={v => update('services', v)} placeholder="Car accident claims — press Enter to add" />
        </div>
        <div>
          <label className={labelCls}>Keywords</label>
          <TagInput values={form.keywords || []} onChange={v => update('keywords', v)} placeholder="car accident — press Enter to add" />
        </div>
        <div>
          <label className={labelCls}>Relevant Subreddits</label>
          <TagInput values={form.subreddits || []} onChange={v => update('subreddits', v)} placeholder="Charlotte — press Enter to add" />
        </div>
        <div>
          <label className={labelCls}>Expanded Keywords (synonyms & natural phrases)</label>
          <TagInput values={form.expanded_keywords || []} onChange={v => update('expanded_keywords', v)} placeholder="hit my car — press Enter to add" />
          <p className="text-[11px] text-muted-foreground mt-1.5">Generated by AI onboarding. Used for deterministic monitoring matching — add any extra phrasings a real poster might use.</p>
        </div>
        <div>
          <label className={labelCls}>Preferred Response Tone</label>
          <input value={form.response_tone || ''} onChange={e => update('response_tone', e.target.value)} className={inputCls} placeholder="Professional, empathetic, helpful" />
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea value={form.notes || ''} onChange={e => update('notes', e.target.value)} rows={3} className={inputCls} placeholder="Internal notes about this client..." />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="active" checked={form.is_active} onChange={e => update('is_active', e.target.checked)} className="rounded w-4 h-4 accent-accent" />
          <label htmlFor="active" className="text-sm text-muted-foreground">Active (include in Reddit monitoring)</label>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Client'}
          </button>
          <button type="button" onClick={() => navigate('/')} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}