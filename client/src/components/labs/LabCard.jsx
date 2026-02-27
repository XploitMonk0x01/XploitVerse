import React from "react";
import {
    Clock,
    Shield,
    Target,
    Play,
    Loader2,
    Terminal,
    Zap,
} from "lucide-react";

const difficultyConfig = {
    Easy: {
        color: "bg-green-500/20 text-green-400 border-green-500/30",
        icon: Zap,
    },
    Medium: {
        color: "bg-cyber-orange/15 text-cyber-orange border-cyber-orange/30",
        icon: Shield,
    },
    Hard: {
        color: "bg-cyber-red/15 text-cyber-red border-cyber-red/30",
        icon: Target,
    },
};

const categoryConfig = {
    "Red Team": {
        color: "bg-cyber-red/10 text-red-300 border-cyber-red/30",
        icon: Target,
    },
    "Blue Team": {
        color: "bg-cyber-blue/10 text-gray-200 border-cyber-blue/30",
        icon: Shield,
    },
    Mixed: {
        color: "bg-gray-700/30 text-gray-200 border-gray-600/30",
        icon: Terminal,
    },
};

const LabCard = ({ lab, onStartLab, isStarting, disabled }) => {
    const difficulty = difficultyConfig[lab.difficulty] || difficultyConfig.Easy;
    const category = categoryConfig[lab.category] || categoryConfig.Mixed;
    const DifficultyIcon = difficulty.icon;
    const CategoryIcon = category.icon;

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors duration-200 group">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition-colors">
                        {lab.title}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                        {lab.description}
                    </p>
                </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
                <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${difficulty.color}`}
                >
                    <DifficultyIcon className="w-3 h-3" />
                    {lab.difficulty}
                </span>
                <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${category.color}`}
                >
                    <CategoryIcon className="w-3 h-3" />
                    {lab.category}
                </span>
            </div>

            {/* Duration and Tools */}
            <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{lab.estimatedDuration} min</span>
                </div>
                <div className="flex items-center gap-1">
                    <Terminal className="w-4 h-4" />
                    <span>{lab.tools?.length || 0} tools</span>
                </div>
            </div>

            {/* Objectives Preview */}
            {lab.objectives && lab.objectives.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Objectives:</p>
                    <ul className="space-y-1">
                        {lab.objectives.slice(0, 2).map((objective, index) => (
                            <li
                                key={index}
                                className="text-xs text-gray-400 flex items-start gap-2"
                            >
                                <span className="text-green-400 mt-0.5">•</span>
                                <span className="line-clamp-1">{objective}</span>
                            </li>
                        ))}
                        {lab.objectives.length > 2 && (
                            <li className="text-xs text-gray-500">
                                +{lab.objectives.length - 2} more objectives
                            </li>
                        )}
                    </ul>
                </div>
            )}

            {/* Tags */}
            {lab.tags && lab.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                    {lab.tags.slice(0, 4).map((tag, index) => (
                        <span
                            key={index}
                            className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Start Button */}
            <button
                onClick={() => onStartLab(lab._id)}
                disabled={isStarting || disabled}
                className={`w-full py-3 px-4 rounded-lg font-medium duration-200 flex items-center justify-center gap-2 ${isStarting || disabled
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600 text-white transition-colors"
                    }`}
            >
                {isStarting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Starting...
                    </>
                ) : (
                    <>
                        <Play className="w-4 h-4" />
                        Start Lab
                    </>
                )}
            </button>
        </div>
    );
};

export default LabCard;
