import { getApiBaseUrl } from "@/lib/api-client";

export function getCommunityPostImagePath(imageId: string): string {
  return `/api/community/images/${imageId}`;
}

export function getCommunityPostImageUrl(imageId: string): string {
  return `${getApiBaseUrl()}${getCommunityPostImagePath(imageId)}`;
}
