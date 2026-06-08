import {
  extensionForMimeType,
  isAcceptedCommunityImage,
  isWithinCommunityImageSizeLimit,
  COMMUNITY_POST_IMAGE_MAX_BYTES,
} from "@/lib/community/image-validation";
import fs from "node:fs/promises";
import path from "node:path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "community");

export type SavedCommunityPostImage = Readonly<{
  imageId: string;
  mimeType: string;
  fileName: string;
  sortOrder: number;
}>;

function imageFilePath(imageId: string, mimeType: string): string {
  return path.join(UPLOAD_ROOT, `${imageId}${extensionForMimeType(mimeType)}`);
}

export async function saveCommunityPostImages(
  files: readonly Readonly<{ buffer: Buffer; mimeType: string; fileName: string }>[],
): Promise<SavedCommunityPostImage[]> {
  if (files.length === 0) {
    return [];
  }

  await fs.mkdir(UPLOAD_ROOT, { recursive: true });

  const saved: SavedCommunityPostImage[] = [];

  for (const [index, file] of files.entries()) {
    const mimeType = file.mimeType || "image/jpeg";
    const fileName = file.fileName || `image-${index + 1}`;

    if (!isAcceptedCommunityImage(fileName, mimeType)) {
      throw new Error(`Unsupported image type: ${fileName}`);
    }

    if (!isWithinCommunityImageSizeLimit(file.buffer.byteLength)) {
      throw new Error(
        `Image is too large. Max size is ${Math.floor(COMMUNITY_POST_IMAGE_MAX_BYTES / (1024 * 1024))} MB.`,
      );
    }

    const imageId = crypto.randomUUID();
    const targetPath = imageFilePath(imageId, mimeType);

    await fs.writeFile(targetPath, file.buffer);

    saved.push({
      imageId,
      mimeType,
      fileName,
      sortOrder: index,
    });
  }

  return saved;
}

export async function readCommunityPostImage(
  imageId: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
  const entries = await fs.readdir(UPLOAD_ROOT);

  const match = entries.find((entry) => entry.startsWith(`${imageId}.`));

  if (!match) {
    return null;
  }

  const filePath = path.join(UPLOAD_ROOT, match);
  const buffer = await fs.readFile(filePath);
  const extension = path.extname(match).toLowerCase();

  const mimeType =
    extension === ".png"
      ? "image/png"
      : extension === ".webp"
        ? "image/webp"
        : extension === ".heic"
          ? "image/heic"
          : extension === ".heif"
            ? "image/heif"
            : extension === ".gif"
              ? "image/gif"
              : extension === ".bmp"
                ? "image/bmp"
                : extension === ".tiff" || extension === ".tif"
                  ? "image/tiff"
                  : extension === ".svg"
                    ? "image/svg+xml"
                    : "image/jpeg";

  return { buffer, mimeType };
}
