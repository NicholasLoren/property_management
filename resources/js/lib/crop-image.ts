export type PixelCrop = { x: number; y: number; width: number; height: number };

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', reject);
        image.src = src;
    });
}

/**
 * Draws the cropped region of `imageSrc` onto a square canvas at
 * `outputSize`, returning it as a File ready to submit like any other
 * picked file.
 */
export async function getCroppedImageFile(
    imageSrc: string,
    crop: PixelCrop,
    outputSize: number,
    fileName: string,
): Promise<File> {
    const image = await loadImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Could not get a 2D canvas context.');
    }

    ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        outputSize,
        outputSize,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
    );

    if (!blob) {
        throw new Error('Could not export the cropped image.');
    }

    const outName = fileName.replace(/\.[^.]+$/, '') + '.png';

    return new File([blob], outName, { type: 'image/png' });
}
