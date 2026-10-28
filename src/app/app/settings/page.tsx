'use client';

import React, { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { OrganizationSettings } from '@/components/settings/OrganizationSettings';
import { EventDefaultsSettings } from '@/components/settings/EventDefaultsSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { PlanBillingSettings } from '@/components/settings/PlanBillingSettings';
import { TeamSettings } from '@/components/settings/TeamSettings';

type SettingsTab = 'account' | 'organization' | 'team' | 'defaults' | 'notifications' | 'security' | 'billing';

interface TabItem {
  id: SettingsTab;
  label: string;
  icon: string;
  description: string;
}

const GROUPS: { label: string; tabs: TabItem[] }[] = [
  {
    label: 'Personal',
    tabs: [
      { id: 'account', label: 'Account', icon: 'person', description: 'Your profile and role in this workspace.' },
      { id: 'notifications', label: 'Notifications', icon: 'notifications', description: 'Choose which updates you receive.' },
      { id: 'security', label: 'Security', icon: 'shield', description: 'Password and signed-in sessions.' },
    ],
  },
  {
    label: 'Workspace',
    tabs: [
      { id: 'organization', label: 'Organization', icon: 'domain', description: 'Name, logo and contact details for your organization.' },
      { id: 'team', label: 'Team', icon: 'group', description: 'Invite people, set their roles and remove access.' },
      { id: 'defaults', label: 'Event defaults', icon: 'tune', description: 'Values pre-filled when you create a new event.' },
      { id: 'billing', label: 'Plan & billing', icon: 'credit_card', description: 'Your current plan and what it includes.' },
    ],
  },
];

const ALL_TABS = GROUPS.flatMap((g) => g.tabs);
const isTab = (value: string): value is SettingsTab => ALL_TABS.some((t) => t.id === value);

export default function SettingsPage() {
  const { currentUser } = useAppContext();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Keep the open section in the URL hash so refreshes and shared links land on it
  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.slice(1);
      if (isTab(hash)) setActiveTab(hash);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  const selectTab = (id: SettingsTab) => {
    setActiveTab(id);
    window.history.replaceState(null, '', `#${id}`);
  };

  const current = ALL_TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="h-full bg-ds-canvas text-ds-ink antialiased min-h-screen w-full">
      <div className="min-h-screen flex flex-row w-full">
        <Sidebar
          currentUser={currentUser}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 min-w-0 min-h-screen px-4 sm:px-6 lg:px-10 py-6 sm:py-8 w-full">
          <div className="w-full">
            {/* Page header */}
            <div className="flex items-start justify-between gap-4 border-b border-ds-line pb-5">
              <div>
                <h1 className="text-[24px] font-semibold tracking-tight text-ds-ink">Settings</h1>
                <p className="mt-1 text-[14px] text-ds-muted">
                  Manage your account and workspace preferences.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="ds-btn ds-btn-secondary ds-btn-sm md:hidden"
                aria-label="Open navigation menu"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">menu</span>
                Menu
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:gap-10">
              {/* Section navigation: grouped list on desktop, scrollable tabs on small screens */}
              <nav aria-label="Settings sections" className="lg:w-52 lg:shrink-0">
                <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden">
                  {ALL_TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => selectTab(tab.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                          isActive
                            ? 'bg-ds-ink/[0.06] font-medium text-ds-ink'
                            : 'text-ds-muted hover:bg-ds-ink/[0.04] hover:text-ds-ink'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="hidden lg:sticky lg:top-8 lg:block space-y-6">
                  {GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="mb-1.5 px-2.5 text-[12px] font-medium text-ds-muted">{group.label}</p>
                      <div className="space-y-0.5">
                        {group.tabs.map((tab) => {
                          const isActive = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => selectTab(tab.id)}
                              aria-current={isActive ? 'page' : undefined}
                              className={`flex w-full min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-left text-[14px] transition-colors ${
                                isActive
                                  ? 'bg-ds-ink/[0.06] font-medium text-ds-ink'
                                  : 'text-ds-body hover:bg-ds-ink/[0.04] hover:text-ds-ink'
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={`material-symbols-outlined text-[18px] ${isActive ? 'text-ds-ink' : 'text-ds-muted'}`}
                              >
                                {tab.icon}
                              </span>
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </nav>

              {/* Active section */}
              <div className="min-w-0 flex-1">
                <div className="mb-5">
                  <h2 className="text-[18px] font-semibold tracking-tight text-ds-ink">{current.label}</h2>
                  <p className="mt-0.5 text-[13px] text-ds-muted">{current.description}</p>
                </div>
                {activeTab === 'account' && <AccountSettings />}
                {activeTab === 'organization' && <OrganizationSettings />}
                {activeTab === 'team' && <TeamSettings />}
                {activeTab === 'defaults' && <EventDefaultsSettings />}
                {activeTab === 'notifications' && <NotificationSettings />}
                {activeTab === 'security' && <SecuritySettings />}
                {activeTab === 'billing' && <PlanBillingSettings />}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
