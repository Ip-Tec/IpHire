'use client';

import React, { useState, useEffect } from 'react';
import { dbManager, UserProfile } from '@/lib/db';
import { User, Mail, Phone, MapPin, DollarSign, Briefcase, Globe, GitBranch, Link, Save, CheckCircle } from 'lucide-react';

const DEFAULT_PROFILE: UserProfile = {
  name: 'Alex Rivera',
  email: 'alex@example.com',
  phone: '+1 (555) 123-4567',
  experience: 'Senior',
  education: 'B.S. Computer Science, UC Berkeley',
  skills: ['TypeScript', 'React', 'Next.js', 'Tailwind CSS', 'SQL'],
  preferredRoles: ['Senior Frontend Engineer', 'Full Stack Developer'],
  salaryExpectations: '$130,000 - $160,000',
  remotePreferences: 'remote',
  languages: ['English', 'Spanish'],
  location: 'San Francisco, CA',
  portfolio: 'alexr.dev',
  github: 'github.com/alexr',
  linkedin: 'linkedin.com/in/alex-rivera'
};

export const UserProfileStudio: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [skillsInput, setSkillsInput] = useState('');
  const [rolesInput, setRolesInput] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const savedProfile = await dbManager.getSetting<UserProfile>('user_profile', DEFAULT_PROFILE);
      setProfile(savedProfile);
      setSkillsInput(savedProfile.skills.join(', '));
      setRolesInput(savedProfile.preferredRoles.join(', '));
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedProfile: UserProfile = {
      ...profile,
      skills: skillsInput.split(',').map(s => s.trim()).filter(Boolean),
      preferredRoles: rolesInput.split(',').map(r => r.trim()).filter(Boolean)
    };

    await dbManager.setSetting('user_profile', updatedProfile);
    setSaved(true);
    
    // Trigger custom event so sidebar updates name instantly
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('profile_updated'));
    }

    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <User className="h-5 w-5 text-deepsea-600 dark:text-deepsea-400" />
          My Profile Studio
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your personal metadata, career targets, and online links. Used dynamically across all AI templates.
        </p>
      </div>

      <form onSubmit={handleSave} className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6 text-xs">
        
        {/* Personal Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1.5">Personal details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-muted-foreground">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={e => setProfile({ ...profile, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-muted-foreground">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={profile.email || ''}
                  onChange={e => setProfile({ ...profile, email: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-muted-foreground">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.phone || ''}
                  onChange={e => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-muted-foreground">Location (City, State / Country)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.location}
                  onChange={e => setProfile({ ...profile, location: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Career Preferences */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1.5">Career preferences</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-muted-foreground">Preferred Roles (comma separated)</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={rolesInput}
                  onChange={e => setRolesInput(e.target.value)}
                  placeholder="e.g. Frontend Engineer, React Developer"
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-muted-foreground">Target Salary Expectations</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.salaryExpectations}
                  onChange={e => setProfile({ ...profile, salaryExpectations: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-muted-foreground">Workplace Preference</label>
              <select
                value={profile.remotePreferences}
                onChange={e => setProfile({ ...profile, remotePreferences: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
              >
                <option value="remote">Remote Only</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-Site</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-muted-foreground">Experience Level</label>
              <select
                value={profile.experience}
                onChange={e => setProfile({ ...profile, experience: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
              >
                <option value="Entry">Entry Level / Intern</option>
                <option value="Mid">Mid-Level</option>
                <option value="Senior">Senior Level (3-6 years)</option>
                <option value="Lead">Lead / Management</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-semibold text-muted-foreground">Core Skills Tags (comma separated)</label>
            <input
              type="text"
              value={skillsInput}
              onChange={e => setSkillsInput(e.target.value)}
              placeholder="e.g. JavaScript, CSS, Project Management"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
            />
          </div>
        </div>

        {/* Links */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1.5">Social & Portfolio Links</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-muted-foreground">GitHub Profile</label>
              <div className="relative">
                <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.github}
                  onChange={e => setProfile({ ...profile, github: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-muted-foreground">LinkedIn Profile</label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.linkedin}
                  onChange={e => setProfile({ ...profile, linkedin: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-muted-foreground">Portfolio Website URL</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.portfolio}
                  onChange={e => setProfile({ ...profile, portfolio: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-deepsea-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-border pt-4">
          <button
            type="submit"
            className="btn-primary flex items-center gap-1.5 rounded-lg bg-deepsea-600 px-5 py-2.5 font-bold text-white shadow-sm hover:bg-deepsea-700 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            Save Profile
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle className="h-4 w-4" /> Profile saved!
            </span>
          )}
        </div>

      </form>

    </div>
  );
};
