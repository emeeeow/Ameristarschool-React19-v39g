import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Page } from '../types';

interface NavigationProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const Navigation = ({ currentPage, onNavigate }: NavigationProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { page: Page.Home,    label: 'Home'     },
    { page: Page.About,   label: 'Founder'  },
    { page: Page.Courses, label: 'Courses'  },
    { page: Page.Roadmap, label: 'Roadmap'  },
    { page: Page.Contact, label: 'Contact'  },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 py-6 px-6 md:px-12 transition-all duration-700 border-b border-transparent group ${
        isScrolled
          ? 'bg-brand-navy/90 backdrop-blur-xl border-brand-gold/20 shadow-lg'
          : 'hover:bg-brand-navy/90 hover:backdrop-blur-xl hover:border-brand-gold/20'
      }`}
    >
      <div
        className={`max-w-7xl mx-auto w-full flex items-center justify-between transition-colors duration-500 ${
          isScrolled
            ? 'text-white'
            : 'text-brand-navy group-hover:text-white'
        }`}
      >
        {/* Brand / Logo */}
        <div
          onClick={() => onNavigate(Page.Home)}
          className="cursor-pointer select-none"
        >
          <span className="text-2xl lg:text-3xl font-display tracking-luxury uppercase">
            AMERISTAR{' '}
            <span className="text-brand-gold font-light italic capitalize">
              School
            </span>
          </span>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-10 text-sm uppercase tracking-widest font-semibold">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => onNavigate(link.page)}
              className={`transition-colors duration-300 hover:text-brand-gold ${
                currentPage === link.page ? 'text-brand-gold' : ''
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Enroll Now CTA + Mobile Toggle */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate(Page.Enrollment)}
            className="hidden md:inline-flex items-center bg-brand-gold text-brand-navy px-7 py-3 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-white transition-all shadow-xl hover:scale-105 active:scale-95"
          >
            Enroll Now
          </button>

          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="hover:text-brand-gold transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-brand-navy/95 backdrop-blur-xl border-t border-brand-gold/20 p-8 flex flex-col space-y-8 animate-fade-in shadow-2xl h-screen">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => {
                onNavigate(link.page);
                setIsMobileMenuOpen(false);
              }}
              className={`text-2xl font-serif text-left ${
                currentPage === link.page
                  ? 'text-brand-gold italic'
                  : 'text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => {
              onNavigate(Page.Enrollment);
              setIsMobileMenuOpen(false);
            }}
            className="bg-brand-gold text-brand-navy px-8 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-white transition-all shadow-xl w-full mt-4"
          >
            Enroll Now
          </button>
        </div>
      )}
    </header>
  );
};

export default Navigation;
