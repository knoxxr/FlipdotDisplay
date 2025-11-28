import React, { useMemo, useEffect } from 'react';
import FlipDot from './FlipDot';
import { soundManager } from '../utils/SoundManager';
import './DisplayGrid.css';

const DisplayGrid = ({
    rows,
    cols,
    data,
    colorFront,
    colorBack,
    columnDelay = 20
}) => {

    // Play sound effect when data changes
    useEffect(() => {
        // Only play if there is data
        if (!data || data.length === 0) return;

        // Schedule clicks for each column
        for (let c = 0; c < cols; c++) {
            // Play sound with delay matching the visual transition delay
            soundManager.playColumnFlip(c * columnDelay);
        }
    }, [data, cols, columnDelay]);

    // Generate grid items
    const gridItems = useMemo(() => {
        const items = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const index = r * cols + c;
                const isActive = data[index] === 1;

                items.push(
                    <FlipDot
                        key={`${r}-${c}`}
                        active={isActive}
                        colorFront={colorFront}
                        colorBack={colorBack}
                        transitionDelay={c * columnDelay} // Cascade effect
                    />
                );
            }
        }
        return items;
    }, [rows, cols, data, colorFront, colorBack, columnDelay]);

    return (
        <div
            className="display-grid"
            style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                width: '100%',
                maxWidth: '100%',
                margin: '0 auto'
            }}
        >
            {gridItems}
        </div>
    );
};

export default DisplayGrid;
