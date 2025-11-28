export const processText = (text, rows, cols) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = cols;
    canvas.height = rows;

    // Fill background with black
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, cols, rows);

    // Draw text
    ctx.fillStyle = 'white';
    // Adjust font size to fit height roughly
    const fontSize = Math.floor(rows * 0.8);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(text, cols / 2, rows / 2);

    const imageData = ctx.getImageData(0, 0, cols, rows);
    const data = imageData.data;
    const grid = new Array(rows * cols).fill(0);

    for (let i = 0; i < data.length; i += 4) {
        // Check red channel (since it's white text on black bg)
        if (data[i] > 128) {
            grid[i / 4] = 1;
        } else {
            grid[i / 4] = 0;
        }
    }

    return grid;
};
