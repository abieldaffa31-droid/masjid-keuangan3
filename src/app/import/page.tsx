'use client'

import { useState } from 'react'
import { ImportCSV } from './ImportCSV'
import { SeedDataAwal } from './SeedDataAwal'
import { ImportWakaf } from './ImportWakaf'
import { Upload, Database, Heart } from 'lucide-react'

type Tab = 'csv' | 'wakaf' | 'seed'

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<Tab>('csv')

  const tabs: { id: Tab; label: string; icon: React.ReactNode; activeColor: string }[] = [
    { id: 'csv',   label: 'Import CSV BSI',  icon: <Upload className="w-4 h-4" />,   activeColor: 'text-green-700' },
    { id: 'wakaf', label: 'Import Wakaf',    icon: <Heart className="w-4 h-4" />,    activeColor: 'text-emerald-700' },
    { id: 'seed',  label: 'Data Awal',       icon: <Database className="w-4 h-4" />, activeColor: 'text-amber-700' },
  ]

  return (
    <div className="space-y-6">
      {/* Tab Nav */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? `bg-white ${tab.activeColor} shadow-sm`
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'csv'   && <ImportCSV />}
      {activeTab === 'wakaf' && <ImportWakaf />}
      {activeTab === 'seed'  && <SeedDataAwal />}
    </div>
  )
}
