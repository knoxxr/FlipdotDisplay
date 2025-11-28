export const processText = (text, rows, cols) => {
    // Use a high-resolution canvas to avoid rasterization artifacts at small sizes
    const scale = 10;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = cols * scale;
    canvas.height = rows * scale;

    // Fill background with black
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    ctx.fillStyle = 'white';

    // Auto-size text to fit
    let fontSize = Math.floor(rows * scale); // Start with max height
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Measure and reduce size until it fits width
    const maxWidth = canvas.width * 0.95; // 95% of width
    while (ctx.measureText(text).width > maxWidth && fontSize > 1) {
        fontSize--;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    }

    // Also ensure it fits height (though starting at rows*scale usually covers this, 
    // some fonts might be tall)
    // We can just trust the width check mostly, but let's be safe.
    // Actually, starting at rows*scale is already the max height constraint.

    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const grid = new Array(rows * cols).fill(0);

    // Sample the grid points
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // Sample the center of each virtual grid cell
            const centerX = Math.floor(c * scale + scale / 2);
            const centerY = Math.floor(r * scale + scale / 2);

            const index = (centerY * canvas.width + centerX) * 4;

            // Check red channel
            // Threshold can be higher now since we have cleaner pixels
            if (data[index] > 128) {
                grid[r * cols + c] = 1;
            } else {
                grid[r * cols + c] = 0;
            }
        }
    }

    return grid;
};
