export const processImage = (imageUrl, rows, cols) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Resize to grid dimensions
            canvas.width = cols;
            canvas.height = rows;

            // Draw image to canvas
            ctx.drawImage(img, 0, 0, cols, rows);

            const imageData = ctx.getImageData(0, 0, cols, rows);
            const data = imageData.data;
            const grid = new Array(rows * cols).fill(0);

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                // Simple brightness threshold
                // 0.299R + 0.587G + 0.114B
                const brightness = (0.299 * r + 0.587 * g + 0.114 * b);

                // If transparent, treat as off. If bright, treat as on (1).
                if (a > 128 && brightness > 128) {
                    grid[i / 4] = 1; // White/Bright = ON (Flipped to colored side)
                } else {
                    grid[i / 4] = 0; // Dark = OFF (Black side)
                }
            }

            resolve(grid);
        };

        img.onerror = (err) => reject(err);
    });
};
