import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="sticky top-0 z-sticky bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-primary">Kidrove</Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/events" className="text-sm text-gray-600 hover:text-primary transition-colors">Events</Link>
            <Link to="/blog" className="text-sm text-gray-600 hover:text-primary transition-colors">Blog</Link>
            <Link to="/login" className="text-sm text-gray-600 hover:text-primary transition-colors">Sign In</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-3">Kidrove</h3>
            <p className="text-sm">Discover amazing kids activities, events, and courses.</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/events" className="hover:text-white transition-colors">Events</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-sm text-center">
          © {new Date().getFullYear()} Kidrove. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
