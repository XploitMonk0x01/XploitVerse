import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin, Mail, Terminal } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="border-t border-border bg-paper">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <Link to="/" className="flex items-center space-x-3 mb-6">
                            <div className="w-10 h-10 bg-ink border border-border flex items-center justify-center">
                                <Terminal className="w-5 h-5 text-paper" />
                            </div>
                            <span className="text-xl font-display font-bold text-ink uppercase tracking-wider">XploitVerse</span>
                        </Link>
                        <p className="text-muted text-sm max-w-md font-mono leading-relaxed">
                            {'> SYS_DESC: CYBERSECURITY METAVERSE TRAINING PLATFORM'}
                            <br />
                            {'> ENV: ISOLATED AWS INFRASTRUCTURE'}
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-ink font-mono font-bold uppercase tracking-widest mb-6 text-sm">Quick Links</h3>
                        <ul className="space-y-4">
                            <li>
                                <Link to="/dashboard" className="text-muted hover:text-ink hover:underline decoration-accent underline-offset-4 transition-all text-sm font-mono">
                                    {'> '}Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link to="/" className="text-muted hover:text-ink hover:underline decoration-accent underline-offset-4 transition-all text-sm font-mono">
                                    {'> '}Terminal_Home
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-ink font-mono font-bold uppercase tracking-widest mb-6 text-sm">Network</h3>
                        <div className="flex space-x-4">
                            <a href="#" className="p-2 border border-border text-muted hover:text-ink hover:border-ink hover:bg-surface transition-all">
                                <Github className="w-5 h-5" />
                            </a>
                            <a href="#" className="p-2 border border-border text-muted hover:text-ink hover:border-ink hover:bg-surface transition-all">
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a href="#" className="p-2 border border-border text-muted hover:text-ink hover:border-ink hover:bg-surface transition-all">
                                <Linkedin className="w-5 h-5" />
                            </a>
                            <a href="#" className="p-2 border border-border text-muted hover:text-ink hover:border-ink hover:bg-surface transition-all">
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border mt-12 pt-8 text-center flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-muted text-xs font-mono uppercase tracking-wider">
                        {`© [${new Date().getFullYear()}] XPLOITVERSE_SYSTEMS.`}
                    </p>
                    <div className="flex gap-2 text-xs font-mono text-subtle">
                        <span>STATUS: ONLINE</span>
                        <span>|</span>
                        <span>v2.0.0-IND</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
