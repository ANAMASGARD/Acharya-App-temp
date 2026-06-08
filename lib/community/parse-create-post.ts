import {
  COMMUNITY_POST_IMAGE_MAX_COUNT,
  isAcceptedCommunityImage,
  isWithinCommunityImageSizeLimit,
} from "@/lib/community/image-validation";
import type { CreatePostInput } from "@/types/community";

export type ParsedCreatePostRequest = Readonly<{
  input: CreatePostInput;
  imageFiles: readonly Readonly<{
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  }>[];
}>;

function readFormString(formData: globalThis.FormData, key: string): string {
  const value = formData.get(key);
  return value === null ? "" : String(value).trim();
}

function readFormFiles(formData: globalThis.FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File);
}

export async function parseCreatePostRequest(
  request: Request,
): Promise<ParsedCreatePostRequest> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    const body = (await request.json()) as CreatePostInput;

    return {
      input: body,
      imageFiles: [],
    };
  }

  const formData = (await request.formData()) as unknown as globalThis.FormData;
  const imageFiles = readFormFiles(formData, "images");

  if (imageFiles.length > COMMUNITY_POST_IMAGE_MAX_COUNT) {
    throw new Error(
      `You can attach up to ${COMMUNITY_POST_IMAGE_MAX_COUNT} images per post.`,
    );
  }

  const parsedImages: ParsedCreatePostRequest["imageFiles"][number][] = [];

  for (const file of imageFiles) {
    const fileName = file.name || "image";
    const mimeType = file.type || "image/jpeg";

    if (!isAcceptedCommunityImage(fileName, mimeType)) {
      throw new Error(`Unsupported image type: ${fileName}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!isWithinCommunityImageSizeLimit(buffer.byteLength)) {
      throw new Error("One or more images are too large.");
    }

    parsedImages.push({
      buffer,
      mimeType,
      fileName,
    });
  }

  return {
    input: {
      title: readFormString(formData, "title"),
      body: readFormString(formData, "body"),
      subjectTag: readFormString(formData, "subjectTag") || "General",
      linkUrl: readFormString(formData, "linkUrl") || null,
      groupId: readFormString(formData, "groupId") || null,
      displayName: readFormString(formData, "displayName"),
      imageUrl: readFormString(formData, "imageUrl") || null,
    },
    imageFiles: parsedImages,
  };
}
