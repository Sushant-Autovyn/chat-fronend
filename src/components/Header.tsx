import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Menu, Sun, Moon, Shield, User, LogOut } from 'lucide-react';

interface HeaderProps {
  onMenuToggle: () => void;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, title }) => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-6 text-foreground shadow-sm">
      {/* Left section: Hamburger & Title */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 hover:bg-muted lg:hidden text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>
        {title && (
          <h2 className="text-lg font-bold font-sans tracking-tight text-foreground md:text-2xl truncate max-w-[140px] sm:max-w-none">
            {title}
          </h2>
        )}
      </div>

      {/* Right section: Theme, Profile */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-xl p-2.5 bg-muted/60 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted transition-all duration-200"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 text-amber-400 animate-pulse-subtle" />
          ) : (
            <Moon className="h-5 w-5 text-indigo-600" />
          )}
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 rounded-xl border border-border/40 p-1.5 pr-3 bg-muted/30 hover:bg-muted/70 transition-all duration-200 text-left"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 font-bold text-xs">
              {user?.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <span className="block text-xs font-semibold text-foreground max-w-[100px] truncate">{user?.name}</span>
              <span className="block text-[10px] text-muted-foreground capitalize leading-none mt-0.5">{user?.role}</span>
            </div>
          </button>

          {dropdownOpen && (
            <>
              {/* Backdrop to close dropdown */}
              <div
                onClick={() => setDropdownOpen(false)}
                className="fixed inset-0 z-40 bg-transparent"
              />
              <div className="absolute right-0 mt-2.5 w-56 rounded-2xl border border-border bg-card p-2.5 shadow-lg z-50 animate-fade-in text-foreground">
                <div className="border-b border-border/60 px-3.5 py-3 text-sm">
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
                </div>
                <div className="py-1.5">
                  <a
                    href={user?.role === 'admin' ? '/admin/dashboard' : '/agent/profile'}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm hover:bg-muted transition-colors"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>My Profile</span>
                  </a>
                </div>
                <div className="border-t border-border/60 pt-1.5">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                      navigate('/login', { replace: true });
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
