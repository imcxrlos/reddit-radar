import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import TagInput from '@/components/TagInput';

const categoryOptions = ['Personal Injury', 'Dental', 'Chiropractor', 'Medical', 'Legal', 'Real Estate', 'Home Services', 'Other'];

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: '', category: '', website: '', locations: [], services: [], keywords: [],
    subreddits: [], competitors: [], response_tone: '', notes: '', is_active: true,
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const client = await base44.entities.Client.get(id);
        setForm(client);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await base44.entities.Client.update(id, form);
      } else {
        await base44.entities.Client.create(form);
      }
      navigate('/clients');
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/clients')} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Client' : 'New Client'}</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Client Name *</label>
            <input required value={form.name} onChange={e => update('name', e.target.value)} className={inputCls} placeholder="Charlotte Injury Lawyers" />
          </div>
          <div>
            <label className={labelCls}>Category *</label>
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
          <label className={labelCls}>Competitors</label>
          <TagInput values={form.competitors || []} onChange={v => update('competitors', v)} placeholder="Competitor name — press Enter to add" />
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
          <input type="checkbox" id="active" checked={form.is_active} onChange={e => update('is_active', e.target.checked)} className="rounded" />
          <label htmlFor="active" className="text-sm text-gray-700">Active (include in Reddit monitoring)</label>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Client'}
          </button>
          <button type="button" onClick={() => navigate('/clients')} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}