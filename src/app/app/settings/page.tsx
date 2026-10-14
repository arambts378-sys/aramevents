'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { OrganizationSettings } from '@/components/settings/OrganizationSettings';
import { EventDefaultsSettings } from '@/components/settings/EventDefaultsSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { PlanBillingSettings } from '@/components/settings/PlanBillingSettings';

type SettingsTab = 'account' | 'organization' | 'defaults' | 'notifications' | 'security' | 'billing';

interface TabItem {
  id: SettingsTab;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { id: 'account', label: 'Account', icon: 'person' },
  { id: 'organization', label: 'Organization', icon: 'domain' },
  { id: 'defaults', label: 'Event Defaults', icon: 'tune' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'billing', label: 'Plan & Billing', icon: 'credit_card' },
];

export default function SettingsPage() {
  const { currentUser, isHydrated } = useAppContext();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-full bg-[#F7F5FF] text-[#17152B] antialiased min-h-screen">
      <div className="min-h-screen flex flex-row w-full max-w-[1440px] mx-auto bg-[#F7F5FF]">
        {/* Left Persistent Sidebar (230px) */}
        <Sidebar
          currentUser={currentUser}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Right Main Workspace */}
        <main className="flex-1 bg-[#F7F5FF] min-h-screen px-4 sm:px-6 md:px-8 py-8 flex flex-col gap-6 overflow-y-auto w-full md:w-[calc(100%-230px)]">
          {/* Top Breadcrumb & Mobile Menu Toggle */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E6E2F0]">
            <div className="flex items-center gap-1.5 text-[12px] text-[#77738A] font-jakarta">
              <Link href="/app" className="hover:text-[#17152B] transition-colors">
                Home
              </Link>
              <span>&gt;</span>
              <span className="text-[#17152B] font-semibold">Settings</span>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#17152B] bg-white border border-[#E6E2F0] rounded-lg shadow-xs"
              aria-label="Open navigation menu"
            >
              <span className="material-symbols-outlined text-[16px]">menu</span>
              <span>Menu</span>
            </button>
          </div>

          {/* Centered Content Area */}
          <div className="w-full max-w-[840px] mx-auto space-y-6">
            {/* Page Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F6F1FF] border border-[#E6E2F0] text-[11px] font-mono font-medium text-[#7C5CFC] mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFC]"></span>
                <span>SYSTEM PREFERENCES</span>
              </div>
              <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[#17152B] leading-tight font-space">
                Settings
              </h1>
              <p className="text-[14px] text-[#77738A] mt-1 font-jakarta">
                Manage your personal profile, organization settings, and event defaults.
              </p>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="border-b border-[#E6E2F0] overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1 min-w-max pb-px">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-[13px] font-semibold transition-all border-b-2 cursor-pointer font-jakarta ${
                        isActive
                          ? 'border-[#7C5CFC] text-[#7C5CFC] bg-white shadow-xs'
                          : 'border-transparent text-[#77738A] hover:text-[#17152B] hover:bg-white/60'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Tab Panel */}
            <div className="transition-opacity duration-150">
              {activeTab === 'account' && <AccountSettings />}
              {activeTab === 'organization' && <OrganizationSettings />}
              {activeTab === 'defaults' && <EventDefaultsSettings />}
              {activeTab === 'notifications' && <NotificationSettings />}
              {activeTab === 'security' && <SecuritySettings />}
              {activeTab === 'billing' && <PlanBillingSettings />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
