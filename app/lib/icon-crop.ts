import smartcrop from "smartcrop";

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);

    const img = new Image();

    img.onload = () => {
      // Keep object URL until after crop/draw — Firefox throws if revoked too early.
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht geladen werden"));
    };

    img.src = url;
  });
}

/**
 * Auto-detect a salient square hotspot with smartcrop and export as WebP.
 */
export async function autoCropSquareIcon(file: File, size = 128): Promise<Blob> {
  const image = await loadImageFromFile(file);
  const objectUrl = image.src;

  try {
    const result = await smartcrop.crop(image, { width: size, height: size });

    const crop = result.topCrop;

    const canvas = document.createElement("canvas");

    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Canvas nicht verfügbar");
    }

    ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, size, size);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/webp", 0.9);
    });

    if (!blob) {
      throw new Error("Icon konnte nicht erzeugt werden");
    }

    return blob;
  } finally {
    if (objectUrl.startsWith("blob:")) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
