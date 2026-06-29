import { useState } from 'react';
import { X } from 'lucide-react';

export default function TagInput({ values = [], onChange, placeholder }) {
  const [input, setInput] = useState('');

  const add = () => {
    const val = input.trim();
    if (val && !values.includes(val)) {
      onChange([...values, val]);
    }
    setInput('');
  };

  const remove = (idx) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-wrap gap-1.5 px-2.5 py-2 border border-gray-200 rounded-lg bg-white min-h-[42px] focus-within:ring-2 focus-within:ring-slate-900/10">
      {values.map((v, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-sm text-slate-700">
          {v}
          <button type="button" onClick={() => remove(i)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={values.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[100px] outline-none text-sm bg-transparent"
      />
    </div>
  );
}