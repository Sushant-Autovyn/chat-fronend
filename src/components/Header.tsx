import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Menu, Sun, Moon, LogOut, User, ChevronRight } from 'lucide-react';

interface HeaderProps {
  onMenuToggle: () => void;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, title }) => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const initials = user?.name?.substring(0, 2).toUpperCase() ?? '??';

  // Build breadcrumb from path
  const segments = location.pathname.split('/').filter(Boolean);
  const breadcrumb = segments.map((s, i) => ({
    label: s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    isLast: i === segments.length - 1,
  }));

  return (
    <header className="sticky top-0 z-30 flex h-12 w-full items-center justify-between border-b border-border bg-background px-4 text-foreground">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <nav className="hidden sm:flex items-center gap-1 text-[12px] text-muted-foreground">
          {breadcrumb.map((seg, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
              <span className={seg.isLast ? 'text-foreground font-medium' : ''}>
                {seg.label}
              </span>
            </React.Fragment>
          ))}
        </nav>

        {/* Mobile: just the title */}
        {title && (
          <span className="sm:hidden text-[13px] font-semibold text-foreground truncate">{title}</span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleTheme}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-md border border-border/60 px-2.5 py-1.5 hover:bg-muted transition-colors"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[9px]">
              {initials}
            </div>
            <span className="hidden sm:block text-[12px] font-medium text-foreground max-w-[90px] truncate">{user?.name}</span>
            <span className="hidden sm:block text-[10px] text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded">
              {user?.role}
            </span>
          </button>

          {dropdownOpen && (
            <>
              <div onClick={() => setDropdownOpen(false)} className="fixed inset-0 z-40" />
              <div className="absolute right-0 mt-1.5 w-48 rounded-lg border border-border bg-card shadow-lg z-50 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-border/60 bg-muted/30">
                  <p className="text-[12px] font-semibold text-foreground">{user?.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user?.email}</p>
                </div>
                <div className="p-1">
                  <a
                    href={user?.role === 'admin' ? '/admin/dashboard' : '/agent/profile'}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-[12px] text-foreground hover:bg-muted transition-colors"
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Profile
                  </a>
                  <button
                    onClick={() => { setDropdownOpen(false); logout(); navigate('/login', { replace: true }); }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[12px] text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
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
