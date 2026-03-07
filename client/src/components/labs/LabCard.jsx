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
        color: "text-info border-info",
        icon: Zap,
    },
    Medium: {
        color: "text-accent border-accent",
        icon: Shield,
    },
    Hard: {
        color: "text-error border-error",
        icon: Target,
    },
};

const categoryConfig = {
    "Red Team": {
        color: "text-error border-error",
        icon: Target,
    },
    "Blue Team": {
        color: "text-info border-info",
        icon: Shield,
    },
    Mixed: {
        color: "text-muted border-muted",
        icon: Terminal,
    },
};

const LabCard = ({ lab, onStartLab, isStarting, disabled }) => {
    const difficulty = difficultyConfig[lab.difficulty] || difficultyConfig.Easy;
    const category = categoryConfig[lab.category] || categoryConfig.Mixed;
    const DifficultyIcon = difficulty.icon;
    const CategoryIcon = category.icon;

    return (
        <div className="bg-surface border border-border p-6 hover:-translate-y-1 hover:shadow-[4px_4px_0px_rgba(0,0,0,0.2)] transition-all duration-300 group flex flex-col h-full font-mono relative">
            <div className="absolute top-0 right-0 p-2 text-[10px] text-muted font-bold opacity-30">
                L-{lab._id.slice(-4).toUpperCase()}
            </div>

            {/* Header */}
            <div className="mb-4 pr-6">
                <h3 className="text-base font-bold text-ink group-hover:text-accent transition-colors uppercase tracking-wider mb-2 line-clamp-1">
                    {lab.title}
                </h3>
                <p className="text-muted text-xs leading-relaxed line-clamp-2">
                    {lab.description}
                </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
                <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border border-dashed ${difficulty.color}`}
                >
                    <DifficultyIcon className="w-3 h-3" />
                    {lab.difficulty}
                </span>
                <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border border-dashed ${category.color}`}
                >
                    <CategoryIcon className="w-3 h-3" />
                    {lab.category}
                </span>
            </div>

            {/* Duration and Tools */}
            <div className="flex items-center gap-6 text-xs text-muted mb-6 font-bold uppercase tracking-widest border-t border-border pt-4">
                <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{lab.estimatedDuration}m</span>
                </div>
                <div className="flex items-center gap-2">
                    <Terminal className="w-3 h-3" />
                    <span>{lab.tools?.length || 0} tls</span>
                </div>
            </div>

            <div className="flex-grow" />

            {/* Start Button */}
            <button
                onClick={() => onStartLab(lab._id)}
                disabled={isStarting || disabled}
                className={`w-full py-3 px-4 text-xs font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 border ${isStarting || disabled
                    ? "bg-surface text-muted border-border cursor-not-allowed border-dashed"
                    : "bg-paper text-ink border-border hover:bg-ink hover:text-paper shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
                    }`}
            >
                {isStarting ? (
                    <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        INITIATING...
                    </>
                ) : (
                    <>
                        <Play className="w-3 h-3" />
                        EXECUTE_LAB
                    </>
                )}
            </button>
        </div>
    );
};

export default LabCard;
