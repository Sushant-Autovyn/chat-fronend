import React, { useState, useEffect } from 'react';
import { settingsService, routingService, departmentService, SystemSettings, RoutingConfig, Department } from '../services/api';
import { Settings as SettingsIcon, Bell, GitMerge, Bot, ShieldCheck } from 'lucide-react';

const Settings: React.FC = () => {
  // Config states
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [routing, setRouting] = useState<RoutingConfig | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'bot' | 'notifications' | 'routing'>('bot');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states - Bot
  const [chatbotName, setChatbotName] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [autoReply, setAutoReply] = useState(false);

  // Form states - Notifications
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifSound, setNotifSound] = useState(false);
  const [notifDesktop, setNotifDesktop] = useState(false);

  // Form states - Routing
  const [routingRule, setRoutingRule] = useState<'round_robin' | 'least_busy' | 'manual'>('round_robin');
  const [defaultDept, setDefaultDept] = useState('');

  useEffect(() => {
    loadConfigData();
  }, []);

  const loadConfigData = () => {
    const sysSettings = settingsService.getSettings();
    const routeConfig = routingService.getConfig();
    const depts = departmentService.getDepartments();

    setSettings(sysSettings);
    setRouting(routeConfig);
    setDepartments(depts);

    // Populate forms
    if (sysSettings) {
      setChatbotName(sysSettings.chatbotName || '');
      setWelcomeMessage(sysSettings.welcomeMessage || '');
      setWorkingHours(sysSettings.workingHours || '');
      setAutoReply(!!sysSettings.autoReply);

      if (sysSettings.notifications) {
        setNotifEmail(!!sysSettings.notifications.email);
        setNotifSound(!!sysSettings.notifications.sound);
        setNotifDesktop(!!sysSettings.notifications.desktop);
      }
    }

    if (routeConfig) {
      setRoutingRule(routeConfig.rule);
      setDefaultDept(routeConfig.defaultDepartment || 'Support');
    }
  };

  const handleSaveBotSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    const updated: SystemSettings = {
      chatbotName,
      welcomeMessage,
      workingHours,
      autoReply,
      notifications: {
        email: notifEmail,
        sound: notifSound,
        desktop: notifDesktop
      }
    };

    settingsService.updateSettings(updated);
    setSuccessMessage('Chatbot preference settings updated.');
    loadConfigData();
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveNotificationSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    const updated: SystemSettings = {
      chatbotName,
      welcomeMessage,
      workingHours,
      autoReply,
      notifications: {
        email: notifEmail,
        sound: notifSound,
        desktop: notifDesktop
      }
    };

    settingsService.updateSettings(updated);
    setSuccessMessage('Alert and notification triggers updated.');
    loadConfigData();
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveRoutingSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routing) return;

    const updated: RoutingConfig = {
      rule: routingRule,
      defaultDepartment: defaultDept
    };

    routingService.updateConfig(updated);
    setSuccessMessage('Chat routing assignment engine rules updated.');
    loadConfigData();
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-xl font-bold text-foreground">System Preferences</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure real-time chatbot greeting triggers, notification alerts, and automated chat routing rules.
        </p>
      </div>

      {/* Success alert */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm animate-fade-in flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Settings Grid Layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Tabs (Left column) */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('bot')}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-left transition-all ${
              activeTab === 'bot'
                ? 'bg-primary text-white shadow-glow-primary'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Bot className="h-5 w-5" />
            <span>Chatbot Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-left transition-all ${
              activeTab === 'notifications'
                ? 'bg-primary text-white shadow-glow-primary'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Bell className="h-5 w-5" />
            <span>Notification Triggers</span>
          </button>

          <button
            onClick={() => setActiveTab('routing')}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-left transition-all ${
              activeTab === 'routing'
                ? 'bg-primary text-white shadow-glow-primary'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <GitMerge className="h-5 w-5" />
            <span>Chat Routing Engine</span>
          </button>
        </div>

        {/* Configurations Form (Right column) */}
        <div className="flex-1 rounded-2xl border border-border bg-card p-6 shadow-sm">
          {activeTab === 'bot' && (
            <form onSubmit={handleSaveBotSettings} className="space-y-5 animate-fade-in">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                <Bot className="h-5 w-5 text-primary" />
                <span>Chatbot Customization & Greetings</span>
              </h3>

              {/* Chatbot name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Chatbot Display Name</label>
                <input
                  type="text"
                  required
                  value={chatbotName}
                  onChange={(e) => setChatbotName(e.target.value)}
                  placeholder="e.g. EnterpriseBot"
                  className="w-full max-w-md px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground font-semibold"
                />
              </div>

              {/* Welcome message */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Welcome Greeting message</label>
                <textarea
                  required
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Hello! How can we help you today?"
                  rows={4}
                  className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground leading-relaxed"
                />
              </div>

              {/* Working Hours */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Company Office Hours</label>
                <input
                  type="text"
                  required
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  placeholder="e.g. 09:00 - 18:00"
                  className="w-full max-w-xs px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground"
                />
              </div>

              {/* Auto reply trigger */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="autoReply"
                  checked={autoReply}
                  onChange={(e) => setAutoReply(e.target.checked)}
                  className="accent-primary h-4.5 w-4.5 rounded cursor-pointer"
                />
                <label htmlFor="autoReply" className="text-sm font-semibold text-foreground cursor-pointer select-none">
                  Enable chatbot auto-replies when offline or busy
                </label>
              </div>

              <div className="border-t border-border/60 pt-4 mt-6">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary/95 transition-all shadow-glow-primary active:scale-[0.98]"
                >
                  Save Chatbot Settings
                </button>
              </div>
            </form>
          )}

          {activeTab === 'notifications' && (
            <form onSubmit={handleSaveNotificationSettings} className="space-y-5 animate-fade-in">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5 text-primary" />
                <span>Alert Triggers & System Notifications</span>
              </h3>

              <div className="space-y-4 max-w-md">
                {/* Email */}
                <div className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-muted/10">
                  <input
                    type="checkbox"
                    id="notifEmail"
                    checked={notifEmail}
                    onChange={(e) => setNotifEmail(e.target.checked)}
                    className="accent-primary h-4.5 w-4.5 rounded cursor-pointer mt-0.5"
                  />
                  <div className="cursor-pointer select-none">
                    <label htmlFor="notifEmail" className="block text-sm font-bold text-foreground cursor-pointer">
                      Email Dispatch Alerts
                    </label>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Send digest summaries to the administrator when chats are pending in queue.
                    </span>
                  </div>
                </div>

                {/* Sound */}
                <div className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-muted/10">
                  <input
                    type="checkbox"
                    id="notifSound"
                    checked={notifSound}
                    onChange={(e) => setNotifSound(e.target.checked)}
                    className="accent-primary h-4.5 w-4.5 rounded cursor-pointer mt-0.5"
                  />
                  <div className="cursor-pointer select-none">
                    <label htmlFor="notifSound" className="block text-sm font-bold text-foreground cursor-pointer">
                      Sound Chime Alerts
                    </label>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Play an acoustic sound notification when a new ticket is submitted in real-time.
                    </span>
                  </div>
                </div>

                {/* Desktop */}
                <div className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-muted/10">
                  <input
                    type="checkbox"
                    id="notifDesktop"
                    checked={notifDesktop}
                    onChange={(e) => setNotifDesktop(e.target.checked)}
                    className="accent-primary h-4.5 w-4.5 rounded cursor-pointer mt-0.5"
                  />
                  <div className="cursor-pointer select-none">
                    <label htmlFor="notifDesktop" className="block text-sm font-bold text-foreground cursor-pointer">
                      Desktop Browser Push Notifications
                    </label>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Trigger browser popups when a new customer chat is received.
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4 mt-6">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary/95 transition-all shadow-glow-primary active:scale-[0.98]"
                >
                  Save Alerts Preferences
                </button>
              </div>
            </form>
          )}

          {activeTab === 'routing' && (
            <form onSubmit={handleSaveRoutingSettings} className="space-y-5 animate-fade-in">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                <GitMerge className="h-5 w-5 text-primary" />
                <span>Ticket Assignment Routing engine Rules</span>
              </h3>

              {/* Assignment Rule Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Live Queue Routing Rule
                </label>
                <div className="space-y-3.5 max-w-md">
                  {/* Round robin */}
                  <label className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-muted/10 cursor-pointer hover:bg-muted/20 transition-all">
                    <input
                      type="radio"
                      name="routingRule"
                      value="round_robin"
                      checked={routingRule === 'round_robin'}
                      onChange={() => setRoutingRule('round_robin')}
                      className="accent-primary h-4.5 w-4.5 cursor-pointer mt-0.5"
                    />
                    <div>
                      <span className="block text-sm font-bold text-foreground">Round Robin Routing</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        Equally cycle incoming tickets through the list of active support agents.
                      </span>
                    </div>
                  </label>

                  {/* Least busy */}
                  <label className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-muted/10 cursor-pointer hover:bg-muted/20 transition-all">
                    <input
                      type="radio"
                      name="routingRule"
                      value="least_busy"
                      checked={routingRule === 'least_busy'}
                      onChange={() => setRoutingRule('least_busy')}
                      className="accent-primary h-4.5 w-4.5 cursor-pointer mt-0.5"
                    />
                    <div>
                      <span className="block text-sm font-bold text-foreground">Least Busy Routing</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        Automatically assign incoming tickets to the active agent with the fewest open chat sessions.
                      </span>
                    </div>
                  </label>

                  {/* Manual */}
                  <label className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-muted/10 cursor-pointer hover:bg-muted/20 transition-all">
                    <input
                      type="radio"
                      name="routingRule"
                      value="manual"
                      checked={routingRule === 'manual'}
                      onChange={() => setRoutingRule('manual')}
                      className="accent-primary h-4.5 w-4.5 cursor-pointer mt-0.5"
                    />
                    <div>
                      <span className="block text-sm font-bold text-foreground">Manual Routing (Hold Queue)</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        Keep incoming tickets unassigned. Administrators manually route/transfer tickets from the Live Monitor.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Default department */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Default Queue Fallback Department
                </label>
                <select
                  value={defaultDept}
                  onChange={(e) => setDefaultDept(e.target.value)}
                  className="w-full max-w-xs px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground cursor-pointer"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                  {departments.length === 0 && <option value="Support">Support</option>}
                </select>
                <span className="block text-[10px] text-muted-foreground mt-1.5">
                  The default department new incoming tickets are categorized under.
                </span>
              </div>

              <div className="border-t border-border/60 pt-4 mt-6">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary/95 transition-all shadow-glow-primary active:scale-[0.98]"
                >
                  Save Routing Configurations
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
