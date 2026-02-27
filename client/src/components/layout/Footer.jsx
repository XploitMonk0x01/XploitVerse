import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin, Mail, Terminal } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-gray-900 border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <Link to="/" className="flex items-center space-x-2 mb-4">
                            <div className="w-8 h-8 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
                                <Terminal className="w-5 h-5 text-green-400" />
                            </div>
                            <span className="text-xl font-bold gradient-text">XploitVerse</span>
                        </Link>
                        <p className="text-gray-400 text-sm max-w-md">
                            The cybersecurity metaverse where Red and Blue teams practice on real,
                            isolated AWS environments. Pay only for what you use.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Quick Links</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/dashboard" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                                    Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link to="/" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                                    Home
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Connect</h3>
                        <div className="flex space-x-4">
                            <a href="#" className="text-gray-400 hover:text-green-400 transition-colors">
                                <Github className="w-5 h-5" />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-green-400 transition-colors">
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-green-400 transition-colors">
                                <Linkedin className="w-5 h-5" />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-green-400 transition-colors">
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-800 mt-8 pt-8 text-center">
                    <p className="text-gray-500 text-sm">
                        © {new Date().getFullYear()} XploitVerse. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
