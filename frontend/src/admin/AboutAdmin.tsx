import { useState } from 'react';
import ResourceManager from './ResourceManager';
import { CONFIGS } from './configs';

const TABS = [['skillGroups', 'Skills'], ['experience', 'Experience'], ['education', 'Education'], ['certifications', 'Certifications']] as const;

export default function AboutAdmin() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('skillGroups');
  return (
    <>
      <p className="mb-4 text-sm text-mist">Everything on your public <strong className="text-bone">About me</strong> page. Changes appear within about 30 seconds.</p>
      <div role="tablist" aria-label="About page sections" className="mb-6 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-full border px-4 py-1.5 text-sm ${tab === id ? 'border-bone bg-bone text-ink' : 'border-bone/15 text-mist hover:text-bone'}`}>{label}</button>
        ))}
      </div>
      <ResourceManager key={tab} cfg={CONFIGS[tab]} />
    </>
  );
}
