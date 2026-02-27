import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-cyber-dark flex items-center justify-center px-4">
            <div className="text-center">
                {/* 404 Animation */}
                <div className="relative mb-8">
                    <h1 className="text-[150px] md:text-[200px] font-bold text-gray-800 select-none">
                        404
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-6xl md:text-8xl font-bold gradient-text animate-pulse">
                            404
                        </span>
                    </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                    Page Not Found
                </h2>
                <p className="text-gray-400 max-w-md mx-auto mb-8">
                    The page you're looking for doesn't exist or has been moved.
                    Let's get you back on track.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link to="/">
                        <Button variant="primary">
                            <Home className="w-4 h-4 mr-2" />
                            Go Home
                        </Button>
                    </Link>
                    <Button variant="outline" onClick={() => window.history.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
