import React from 'react';

interface RiskHeatmapProps {
    data?: {
        assets: string[];
        matrix: number[][];
    };
}

const RiskHeatmap: React.FC<RiskHeatmapProps> = ({ data }) => {
    // Default mock data representing a typical crypto portfolio correlation matrix
    // Values range from -1 (Negative Correlation) to 1 (Positive Correlation)
    const assets = data?.assets || ['ETH', 'BTC', 'SOL', 'MATIC'];
    const matrix = data?.matrix || [
        [1.00, 0.82, 0.65, 0.78],
        [0.82, 1.00, 0.55, 0.72],
        [0.65, 0.55, 1.00, 0.45],
        [0.78, 0.72, 0.45, 1.00],
    ];

    // Helper to determine cell color based on correlation value
    const getCellColor = (value: number) => {
        // 1.0 (Perfect Correlation) -> Bright Emerald
        // 0.0 (Uncorrelated) -> Transparent/Slate
        // -1.0 (Negative Correlation) -> Bright Rose/Red
        
        if (value >= 0) {
            // Positive correlation: Emerald scale
            // Opacity scales with strength (0.1 to 1.0)
            return `rgba(16, 185, 129, ${0.1 + (value * 0.9)})`; // emerald-500
        } else {
            // Negative correlation: Rose scale
            return `rgba(244, 63, 94, ${0.1 + (Math.abs(value) * 0.9)})`; // rose-500
        }
    };

    return (
        <div className="w-full p-4 bg-slate-900/80 border border-slate-800 rounded-xl backdrop-blur-sm shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Risk Correlation Matrix
                </h3>
                <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-[8px] text-slate-600 uppercase">Pos</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span className="text-[8px] text-slate-600 uppercase">Neg</span>
                    </div>
                </div>
            </div>

            <div 
                className="grid gap-1"
                style={{ 
                    gridTemplateColumns: `30px repeat(${assets.length}, 1fr)` 
                }}
            >
                {/* Header Row (Asset Names) */}
                <div className="col-span-1"></div> {/* Empty corner */}
                {assets.map((asset, idx) => (
                    <div key={`head-${idx}`} className="text-[10px] font-mono font-bold text-slate-500 text-center py-1">
                        {asset}
                    </div>
                ))}

                {/* Matrix Rows */}
                {matrix.map((row, rowIdx) => (
                    <React.Fragment key={`row-${rowIdx}`}>
                        {/* Row Label */}
                        <div className="text-[10px] font-mono font-bold text-slate-500 flex items-center justify-end pr-2">
                            {assets[rowIdx]}
                        </div>

                        {/* Data Cells */}
                        {row.map((value, colIdx) => (
                            <div
                                key={`cell-${rowIdx}-${colIdx}`}
                                className="aspect-square rounded-md flex items-center justify-center group relative cursor-pointer transition-all duration-200 hover:scale-105 hover:z-10 hover:ring-1 hover:ring-white/20"
                                style={{ backgroundColor: getCellColor(value) }}
                                title={`${assets[rowIdx]} vs ${assets[colIdx]}: ${value.toFixed(2)}`}
                            >
                                <span className="text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 drop-shadow-md select-none">
                                    {value.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </React.Fragment>
                ))}
            </div>

            <div className="mt-3 flex justify-between text-[9px] text-slate-600 font-mono border-t border-white/5 pt-2">
                <span>DIVERSIFICATION SCORE: 4.2/10</span>
                <span>UPDATED: LIVE</span>
            </div>
        </div>
    );
};

export default RiskHeatmap;