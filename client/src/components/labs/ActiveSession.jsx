import React, { useState, useEffect } from "react";
import {
    Server,
    Clock,
    Terminal,
    StopCircle,
    Copy,
    CheckCircle,
    Loader2,
    Globe,
    Cpu,
    HardDrive,
} from "lucide-react";

const ActiveSession = ({ session, lab, onStopSession, isStopping }) => {
    const [elapsed, setElapsed] = useState(0);
    const [copied, setCopied] = useState(false);

    // Timer effect
    useEffect(() => {
        if (!session?.startTime) return;

        const calculateElapsed = () => {
            const start = new Date(session.startTime);
            const now = new Date();
            return Math.floor((now - start) / 1000);
        };

        setElapsed(calculateElapsed());

        const interval = setInterval(() => {
            setElapsed(calculateElapsed());
        }, 1000);

        return () => clearInterval(interval);
    }, [session?.startTime]);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, "0")}:${mins
            .toString()
            .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isProvisioning = session?.status === "INITIALIZING";

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div
                        className={`p-3 rounded-xl ${isProvisioning
                            ? "bg-cyber-orange/15 animate-pulse"
                            : "bg-green-500/20"
                            }`}
                    >
                        <Server
                            className={`w-6 h-6 ${isProvisioning ? "text-cyber-orange" : "text-green-400"
                                }`}
                        />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {lab?.title || "Active Lab Session"}
                        </h2>
                        <p
                            className={`text-sm ${isProvisioning ? "text-cyber-orange" : "text-green-400"
                                }`}
                        >
                            {isProvisioning ? "⏳ Provisioning..." : "● Running"}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>Session Time</span>
                    </div>
                    <p className="text-2xl font-mono font-bold text-green-400">
                        {formatTime(elapsed)}
                    </p>
                </div>
            </div>

            {/* Provisioning State */}
            {isProvisioning && (
                <div className="bg-cyber-orange/10 border border-cyber-orange/30 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <Loader2 className="w-8 h-8 text-cyber-orange animate-spin" />
                        <div>
                            <h3 className="text-cyber-orange font-semibold">
                                Provisioning Cloud Environment
                            </h3>
                            <p className="text-gray-400 text-sm mt-1">
                                Spinning up your isolated lab environment. This usually takes
                                3-5 seconds...
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 w-full bg-gray-900 rounded-full h-2">
                        <div
                            className="bg-cyber-orange h-2 rounded-full animate-pulse"
                            style={{ width: "60%" }}
                        />
                    </div>
                </div>
            )}

            {/* Active State - Show instance details */}
            {!isProvisioning && (session?.publicIp || session?.instanceDetails) && (
                <>
                    {/* Instance Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {/* IP Address */}
                        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                                <Globe className="w-4 h-4" />
                                <span>IP Address</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="text-lg font-mono text-green-400">
                                    {session.publicIp || session.instanceDetails?.publicIp || "Pending..."}
                                </code>
                                <button
                                    onClick={() =>
                                        copyToClipboard(session.publicIp || session.instanceDetails?.publicIp)
                                    }
                                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                                >
                                    {copied ? (
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <Copy className="w-4 h-4 text-gray-400" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Instance Type */}
                        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                                <Cpu className="w-4 h-4" />
                                <span>Instance Type</span>
                            </div>
                            <p className="text-lg font-mono text-white">
                                {session.instanceType || session.instanceDetails?.instanceType || "t2.micro"}
                            </p>
                        </div>

                        {/* Region */}
                        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                                <HardDrive className="w-4 h-4" />
                                <span>Region</span>
                            </div>
                            <p className="text-lg font-mono text-white">
                                {session.region || session.instanceDetails?.region || "us-east-1"}
                            </p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6">
                        <p className="text-gray-400 text-sm mb-3">Quick Connect:</p>
                        <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-3 font-mono text-sm">
                            <Terminal className="w-4 h-4 text-green-400" />
                            <code className="text-green-400 flex-1 overflow-x-auto">
                                ssh student@{session.publicIp || session.instanceDetails?.publicIp || "10.0.0.x"}
                            </code>
                            <button
                                onClick={() =>
                                    copyToClipboard(
                                        `ssh student@${session.publicIp || session.instanceDetails?.publicIp || "10.0.0.x"}`
                                    )
                                }
                                className="p-1 hover:bg-gray-700 rounded transition-colors"
                            >
                                <Copy className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Lab Description */}
            {lab && (
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6">
                    <h3 className="text-white font-medium mb-2">Lab Objectives</h3>
                    <ul className="space-y-2">
                        {lab.objectives?.map((objective, index) => (
                            <li key={index} className="flex items-start gap-2 text-gray-400">
                                <span className="text-green-400 mt-1">•</span>
                                <span>{objective}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Stop Button */}
            <button
                onClick={onStopSession}
                disabled={isStopping || isProvisioning}
                className={`w-full py-4 px-6 rounded-xl font-semibold transition-colors duration-200 flex items-center justify-center gap-2 ${isStopping || isProvisioning
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-cyber-red hover:bg-cyber-red/90 text-white"
                    }`}
            >
                {isStopping ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Stopping Machine...
                    </>
                ) : (
                    <>
                        <StopCircle className="w-5 h-5" />
                        Stop Machine
                    </>
                )}
            </button>

            {/* Cost Warning */}
            <p className="text-center text-gray-500 text-xs mt-3">
                💡 Remember to stop your lab when you're done to save resources!
            </p>
        </div>
    );
};

export default ActiveSession;
