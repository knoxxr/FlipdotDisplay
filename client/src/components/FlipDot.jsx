import React from 'react';
import './FlipDot.css';

const FlipDot = ({ active, colorFront, colorBack, size = 20, transitionDelay = 0 }) => {
    return (
        <div
            className={`flip-dot-container ${active ? 'active' : ''}`}
            style={{
                width: size,
                height: size
            }}
        >
            <div
                className="flip-dot-inner"
                style={{
                    transitionDelay: `${transitionDelay}ms`
                }}
            >
                <div
                    className="flip-dot-front"
                    style={{ backgroundColor: colorFront }}
                />
                <div
                    className="flip-dot-back"
                    style={{ backgroundColor: colorBack }}
                />
            </div>
        </div>
    );
};

export default React.memo(FlipDot);
